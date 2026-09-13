import React, { useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Zap,
  AlertOctagon,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { BenchNodeAudioEngine } from "../audio/bench_node_synth";
import { PROTOCOL_VERSION, WebSocketMessage } from "../protocol/types";

interface Props {
  roomCode: string;
}

export const NodeView: React.FC<Props> = ({ roomCode }) => {
  const [armed, setArmed] = useState(false);
  const [profile, setProfile] = useState<"IDLE" | "NOMINAL" | "INSTABILITY" | "MITIGATED" | "SAFE_HOLD">("IDLE");
  const [wsConnected, setWsConnected] = useState(false);
  const [heartbeatAge, setHeartbeatAge] = useState(0);
  const [watchdogRemaining, setWatchdogRemaining] = useState(1200);
  const [lastCommandTime, setLastCommandTime] = useState<string | null>(null);

  const engineRef = useRef<BenchNodeAudioEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    engineRef.current = new BenchNodeAudioEngine((reason) => {
      setProfile("SAFE_HOLD");
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            version: PROTOCOL_VERSION,
            type: "SAFE_HOLD",
            room_id: roomCode,
            reason,
            last_heartbeat_age_ms: 1200,
            timestamp: Date.now() / 1000,
          })
        );
      }
    });

    const telemetryInterval = setInterval(() => {
      if (engineRef.current) {
        const tel = engineRef.current.getWatchdogTelemetry();
        setHeartbeatAge(tel.lastHeartbeatAgeMs);
        setWatchdogRemaining(tel.watchdogRemainingMs);
        if (tel.safeHoldTriggered && profile !== "SAFE_HOLD") {
          setProfile("SAFE_HOLD");
        }
      }
    }, 100);

    return () => {
      clearInterval(telemetryInterval);
      engineRef.current?.dispose();
    };
  }, [roomCode, profile]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          version: PROTOCOL_VERSION,
          type: "HELLO",
          room_id: roomCode,
          client_id: `node-${Math.random().toString(36).substring(2, 7)}`,
          role: "node",
          timestamp: Date.now() / 1000,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.type === "HEARTBEAT") {
          engineRef.current?.feedHeartbeat();
        } else if (msg.type === "MITIGATION_COMMAND") {
          if (engineRef.current) {
            const res = engineRef.current.applyMitigation(
              msg.reduction_ratio,
              msg.ramp_ms,
              msg.dither_hz
            );
            setProfile("MITIGATED");
            setLastCommandTime(new Date().toLocaleTimeString());

            ws.send(
              JSON.stringify({
                version: PROTOCOL_VERSION,
                type: "COMMAND_ACK",
                room_id: roomCode,
                command_id: msg.command_id,
                applied: res.applied,
                state_after: "MITIGATED",
                latency_ms: res.latencyMs,
                timestamp: Date.now() / 1000,
              })
            );
          }
        }
      } catch (err) {
        console.error("Node WS error:", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomCode]);

  const handleArmNode = async () => {
    if (!engineRef.current) return;
    await engineRef.current.arm();
    setArmed(true);
    setProfile("IDLE");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          version: PROTOCOL_VERSION,
          type: "NODE_READY",
          room_id: roomCode,
          armed: true,
          label: "BENCH MACHINE NODE",
          timestamp: Date.now() / 1000,
        })
      );
    }
  };

  const handleStartNominal = () => {
    engineRef.current?.startNominal();
    setProfile("NOMINAL");
  };

  const handleInjectInstability = () => {
    engineRef.current?.injectInstability("INC-BENCH-001", 2400);
    setProfile("INSTABILITY");
  };

  const handleStop = () => {
    engineRef.current?.stopAllVoices();
    setProfile("IDLE");
  };

  return (
    <div className="node-container">
      <header className="node-header">
        <div className="flex-col">
          <span className="badge badge-amber text-xs font-bold">BENCH MACHINE NODE</span>
          <span className="text-secondary text-xs mt-1">Room: {roomCode}</span>
        </div>
        <div className="flex-center gap-2">
          <span className={`status-dot ${wsConnected ? "dot-green" : "dot-red"}`} />
          <span className="text-mono text-xs">{wsConnected ? "LINKED" : "OFFLINE"}</span>
        </div>
      </header>

      <div className="truth-card-sm">
        <ShieldCheck size={14} className="text-amber" />
        <span className="text-xs text-secondary">
          Bench simulation proxy. Not a real CNC machine. Emits calibrated audio into room.
        </span>
      </div>

      {!armed ? (
        <div className="arm-gesture-card">
          <Zap size={32} className="text-amber animate-pulse" />
          <h2 className="text-lg font-bold mt-2">Explicit Audio Unlock Required</h2>
          <p className="text-xs text-secondary text-center mt-1">
            Web Audio policy requires a physical user touch before the bench node can synthesize sound.
          </p>
          <button onClick={handleArmNode} className="btn btn-primary btn-lg mt-4 w-full">
            Arm Machine Node
          </button>
        </div>
      ) : (
        <div className="armed-controls">
          <div className="node-status-card">
            <span className="text-xs text-secondary font-semibold">ACTUATOR STATUS</span>
            <div className="status-word-container">
              <span
                className={`status-word ${
                  profile === "INSTABILITY"
                    ? "text-red"
                    : profile === "MITIGATED"
                    ? "text-green"
                    : profile === "SAFE_HOLD"
                    ? "text-amber"
                    : "text-cyan"
                }`}
              >
                {profile}
              </span>
            </div>
            {lastCommandTime && (
              <span className="text-mono text-xs text-secondary mt-1">
                Last Mitigation: {lastCommandTime}
              </span>
            )}
          </div>

          <div className="profile-buttons-grid mt-4">
            <button
              onClick={handleStartNominal}
              className={`btn btn-profile ${profile === "NOMINAL" ? "btn-profile-active" : ""}`}
            >
              <Volume2 size={20} />
              <span>Nominal Machine (400 Hz)</span>
            </button>

            <button
              onClick={handleInjectInstability}
              className={`btn btn-profile btn-danger ${profile === "INSTABILITY" ? "btn-danger-active" : ""}`}
            >
              <AlertOctagon size={20} />
              <span>Inject Instability (2.4 kHz)</span>
            </button>

            <button onClick={handleStop} className="btn btn-secondary w-full">
              <VolumeX size={18} />
              <span>Stop Audio Output</span>
            </button>
          </div>

          <div className="watchdog-card mt-4">
            <div className="flex-between text-xs font-semibold">
              <div className="flex-center gap-1">
                <Clock size={14} className="text-amber" />
                <span>WATCHDOG HEARTBEAT TIMER</span>
              </div>
              <span className="text-mono text-amber">{watchdogRemaining} ms</span>
            </div>

            <div className="watchdog-track mt-2">
              <div
                className="watchdog-bar"
                style={{ width: `${Math.min(100, (watchdogRemaining / 1200) * 100)}%` }}
              />
            </div>

            <div className="flex-between text-xs text-secondary text-mono mt-1">
              <span>Last HB: {heartbeatAge}ms ago</span>
              <span>Trip: &gt;1200ms</span>
            </div>

            {profile === "SAFE_HOLD" && (
              <div className="safe-hold-alert mt-2">
                <AlertOctagon size={16} />
                <span>SAFE HOLD ACTIVE: Heartbeats expired. Audio ramped to 0.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};