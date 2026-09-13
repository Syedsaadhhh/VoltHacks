import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  Send,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Terminal,
} from "lucide-react";
import { LaptopMicAnalyzer } from "../audio/mic_analyzer";
import { ReplayFixtureGenerator } from "../audio/replay_fixture";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { SpectrumCanvas } from "../components/SpectrumCanvas";
import { LivenessMeter } from "../components/LivenessMeter";
import {
  PROTOCOL_VERSION,
  WebSocketMessage,
  CommandAckMessage,
} from "../protocol/types";
import { websocketUrl } from "../backend";

interface Props {
  roomCode: string;
  initialReplay?: boolean;
}

export const OperatorView: React.FC<Props> = ({ roomCode, initialReplay = false }) => {
  const [isReplay, setIsReplay] = useState(initialReplay);
  const [wsConnected, setWsConnected] = useState(false);
  const [nodePaired, setNodePaired] = useState(false);
  const [heartbeatSeq, setHeartbeatSeq] = useState(0);

  const micRef = useRef<LaptopMicAnalyzer | null>(null);
  const replayRef = useRef<ReplayFixtureGenerator | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [micSettings, setMicSettings] = useState<{
    sampleRate: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
  }>({ sampleRate: 0 });
  const [micError, setMicError] = useState<string | null>(null);
  const [liveness, setLiveness] = useState(0);

  const [commandPending, setCommandPending] = useState(false);
  const [lastAck, setLastAck] = useState<CommandAckMessage | null>(null);
  const [commandSentTime, setCommandSentTime] = useState<number | null>(null);
  const [events, setEvents] = useState<Array<{ time: string; msg: string; type: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const nodeUrl = `${window.location.protocol}//${window.location.host}/?room=${roomCode}&role=node`;

  const addEvent = (msg: string, type: string = "info") => {
    const time = new Date().toLocaleTimeString();
    setEvents((prev) => [{ time, msg, type }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    const wsUrl = websocketUrl(`/ws/${roomCode}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      addEvent("Connected to CutHush server room", "success");
      ws.send(
        JSON.stringify({
          version: PROTOCOL_VERSION,
          type: "HELLO",
          room_id: roomCode,
          client_id: `op-${Math.random().toString(36).substring(2, 7)}`,
          role: "operator",
          timestamp: Date.now() / 1000,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.type === "PAIR") {
          setNodePaired(msg.peers.includes("node"));
          addEvent(`Peers updated: ${msg.peers.join(", ")}`, "info");
        } else if (msg.type === "HEARTBEAT") {
          setHeartbeatSeq(msg.seq);
        } else if (msg.type === "COMMAND_ACK") {
          setCommandPending(false);
          setLastAck(msg);
          const roundTrip = commandSentTime ? Math.round(performance.now() - commandSentTime) : 0;
          addEvent(`Mitigation ACK received from node (${roundTrip}ms RTT)`, "success");
        } else if (msg.type === "NODE_READY") {
          addEvent("Bench node armed and ready", "success");
        } else if (msg.type === "SAFE_HOLD") {
          addEvent(`Node entered SAFE_HOLD: ${msg.reason}`, "error");
        }
      } catch (err) {
        console.error("WS Parse error:", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      setNodePaired(false);
      addEvent("Disconnected from server", "error");
    };

    return () => {
      ws.close();
    };
  }, [roomCode, commandSentTime]);

  useEffect(() => {
    micRef.current = new LaptopMicAnalyzer();
    replayRef.current = new ReplayFixtureGenerator();

    const meterInterval = setInterval(() => {
      if (isReplay && replayRef.current) {
        setLiveness(replayRef.current.getReplayLiveness());
      } else if (micRef.current && micRef.current.isLive) {
        setLiveness(micRef.current.getLivenessLevel());
      } else {
        setLiveness(0);
      }
    }, 50);

    return () => {
      clearInterval(meterInterval);
      micRef.current?.stop();
    };
  }, [isReplay]);

  const handleRequestMic = async () => {
    if (!micRef.current) return;
    setMicError(null);
    const ok = await micRef.current.start();
    if (ok) {
      setMicActive(true);
      setMicSettings(micRef.current.grantedSettings);
      setIsReplay(false);
      addEvent(`Live mic active @ ${micRef.current.sampleRate} Hz`, "success");
    } else {
      setMicActive(false);
      setMicError(micRef.current.errorMessage);
      addEvent(`Mic error: ${micRef.current.errorMessage}`, "error");
    }
  };

  const getFreqData = (): Uint8Array => {
    if (isReplay && replayRef.current) {
      return replayRef.current.getReplayFrequencyData();
    }
    if (micRef.current && micRef.current.isLive) {
      return micRef.current.getFrequencyData();
    }
    return new Uint8Array(1024);
  };

  const handleSendManualMitigation = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addEvent("Cannot send: WebSocket disconnected", "error");
      return;
    }

    const commandId = `cmd-${Date.now()}`;
    setCommandPending(true);
    setCommandSentTime(performance.now());

    if (isReplay && replayRef.current) {
      replayRef.current.isMitigated = true;
      setTimeout(() => {
        setCommandPending(false);
        setLastAck({
          version: PROTOCOL_VERSION,
          type: "COMMAND_ACK",
          room_id: roomCode,
          command_id: commandId,
          applied: true,
          state_after: "MITIGATED",
          latency_ms: 5.2,
          timestamp: Date.now() / 1000,
        });
        addEvent("Replay fixture acknowledged mitigation", "success");
      }, 150);
    }

    wsRef.current.send(
      JSON.stringify({
        version: PROTOCOL_VERSION,
        type: "MITIGATION_COMMAND",
        room_id: roomCode,
        command_id: commandId,
        reduction_ratio: 0.5,
        ramp_ms: 250,
        dither_hz: 40.0,
        reason: "MANUAL_OPERATOR_RUN_1",
        timestamp: Date.now() / 1000,
      })
    );
    addEvent(`Sent MITIGATION_COMMAND (${commandId}) to node`, "info");
  };

  return (
    <div className="operator-dashboard">
      <header className="dash-header">
        <div className="header-left">
          <div className="logo-badge">CUTHUSH</div>
          <span className="text-secondary text-sm">OPERATOR TEST CELL</span>
          <span className="badge badge-amber">{roomCode}</span>
          {isReplay && <span className="badge badge-cyan">REPLAY_FIXTURE</span>}
        </div>
        <div className="header-right">
          <div className="status-indicator">
            <span className={`status-dot ${wsConnected ? "dot-green" : "dot-red"}`} />
            <span className="text-mono text-xs">WS: {wsConnected ? "ONLINE" : "DISCONNECTED"}</span>
          </div>
          <div className="status-indicator">
            <span className={`status-dot ${nodePaired ? "dot-green" : "dot-amber"}`} />
            <span className="text-mono text-xs">NODE: {nodePaired ? "PAIRED" : "WAITING"}</span>
          </div>
          <div className="status-indicator">
            <span className="text-mono text-xs text-secondary">HB: #{heartbeatSeq}</span>
          </div>
          <button
            onClick={() => setIsReplay(!isReplay)}
            className="btn btn-secondary btn-sm"
          >
            <RotateCcw size={14} />
            {isReplay ? "Switch to Live Mic" : "Simulate (REPLAY_FIXTURE)"}
          </button>
        </div>
      </header>

      <div className="dash-grid">
        <div className="col-main">
          <div className="card">
            <div className="card-header">
              <div className="flex-center gap-2">
                <Mic size={16} className={micActive ? "text-cyan" : "text-secondary"} />
                <span className="card-title">LIVE MICROPHONE SENSING</span>
                <span className={`badge ${micActive ? "badge-cyan" : "badge-gray"}`}>
                  {isReplay ? "REPLAY_FIXTURE" : micActive ? "LIVE_MIC" : "MIC_STANDBY"}
                </span>
              </div>
              {!micActive && !isReplay && (
                <button onClick={handleRequestMic} className="btn btn-primary btn-sm">
                  Enable Microphone
                </button>
              )}
            </div>

            {micError && (
              <div className="error-alert mt-2">
                <AlertTriangle size={14} />
                <span>{micError}</span>
                <button onClick={() => setIsReplay(true)} className="btn btn-secondary btn-xs ml-auto">
                  Use Replay Fixture
                </button>
              </div>
            )}

            <div className="settings-grid mt-3">
              <div className="setting-item">
                <span className="setting-key">Sample Rate</span>
                <span className="setting-val text-mono">{micSettings.sampleRate || 48000} Hz</span>
              </div>
              <div className="setting-item">
                <span className="setting-key">Echo Cancellation</span>
                <span className="setting-val text-mono">
                  {micSettings.echoCancellation ? "Enabled (Browser forced)" : "Disabled (Raw audio)"}
                </span>
              </div>
              <div className="setting-item">
                <span className="setting-key">Noise Suppression</span>
                <span className="setting-val text-mono">
                  {micSettings.noiseSuppression ? "Enabled (Browser forced)" : "Disabled (Raw audio)"}
                </span>
              </div>
              <div className="setting-item">
                <span className="setting-key">Auto Gain Control</span>
                <span className="setting-val text-mono">
                  {micSettings.autoGainControl ? "Enabled (Browser forced)" : "Disabled (Raw audio)"}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <LivenessMeter
                level={liveness}
                sourceLabel={isReplay ? "REPLAY_FIXTURE" : micActive ? "LIVE_MIC" : "DISCONNECTED"}
                isLive={micActive || isReplay}
              />
            </div>
          </div>

          <SpectrumCanvas
            getFrequencyData={getFreqData}
            sampleRate={micSettings.sampleRate || 48000}
            isReplay={isReplay}
          />

          <div className="card mitigation-card">
            <div className="card-header">
              <div className="flex-center gap-2">
                <Sliders size={16} className="text-amber" />
                <span className="card-title">MANUAL MITIGATION DISPATCH (RUN 1 ONLY)</span>
              </div>
              <span className="badge badge-amber">CLOSED LOOP TEST</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Test sending a typed <code className="text-amber">MITIGATION_COMMAND</code> to the paired machine node.
              The phone speaker will audibly attenuate and frequency-dither the chatter tone.
            </p>

            <div className="mitigation-controls mt-3">
              <button
                onClick={handleSendManualMitigation}
                disabled={commandPending || (!nodePaired && !isReplay)}
                className="btn btn-primary btn-md"
              >
                <Send size={16} />
                {commandPending ? "Dispatching..." : "Send Manual Mitigation Command"}
              </button>

              {lastAck && (
                <div className="ack-box">
                  <CheckCircle2 size={16} className="text-green" />
                  <div className="ack-details text-xs">
                    <div>
                      <strong>ACK Received:</strong> Command <code>{lastAck.command_id}</code> applied!
                    </div>
                    <div className="text-secondary text-mono">
                      State After: {lastAck.state_after} | Internal Node Latency: {lastAck.latency_ms?.toFixed(1) ?? "—"} ms
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-side">
          <QRCodeDisplay url={nodeUrl} roomCode={roomCode} />

          <div className="card event-card">
            <div className="card-header">
              <div className="flex-center gap-2">
                <Terminal size={14} className="text-cyan" />
                <span className="card-title">PROTOCOL EVENT LOG</span>
              </div>
              <span className="text-mono text-xs text-secondary">{events.length} events</span>
            </div>
            <div className="event-list">
              {events.length === 0 && (
                <div className="text-xs text-secondary py-3 text-center">Waiting for room events...</div>
              )}
              {events.map((ev, idx) => (
                <div key={idx} className={`event-row event-${ev.type}`}>
                  <span className="event-time text-mono">{ev.time}</span>
                  <span className="event-msg">{ev.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};