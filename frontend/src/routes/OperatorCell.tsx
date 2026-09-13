import React, { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Download, Gauge, Mic, Play, Radio, RotateCcw, ShieldCheck, Terminal } from "lucide-react";
import { analyzeSpectrum, measuredReductionDb, PersistenceWindow, SpectrumMetrics } from "../audio/governor";
import { LaptopMicAnalyzer } from "../audio/mic_analyzer";
import { ReplayFixtureGenerator } from "../audio/replay_fixture";
import { LivenessMeter } from "../components/LivenessMeter";
import { PhonePairing } from "../components/PhonePairing";
import { SpectrumCanvas } from "../components/SpectrumCanvas";
import { CommandAckMessage, PROTOCOL_VERSION, SystemState, WebSocketMessage } from "../protocol/types";
import { sha256Hex } from "../proof/integrity";
import { apiUrl, websocketUrl } from "../backend";

interface Props { roomCode: string; initialReplay?: boolean; }
interface EventItem { at: string; message: string; tone: "info" | "success" | "danger"; }
interface ProofResult { runId: string | null; seed: number; offExposureMs: number; onExposureMs: number; reductionDb: number | null; outcome: "PENDING" | "RECOVERED" | "UNRESOLVED"; }
interface StoredProof {
  run_id: string; room_id: string; created_at: string; source: "REPLAY_FIXTURE" | "LIVE_MIC";
  seed: number; outcome: "RECOVERED" | "UNRESOLVED"; off_exposure_ms: number;
  on_exposure_ms: number; reduction_db: number | null; previous_digest: string | null; digest: string;
}

const SEED = 2026;
const EMPTY: SpectrumMetrics = { dominantHz: 0, targetPower: 1e-12, targetDb: -120, prominenceDb: 0, baselineDeltaDb: 0, instabilityScore: 0, candidate: false };

export const OperatorCell: React.FC<Props> = ({ roomCode, initialReplay = false }) => {
  const micRef = useRef(new LaptopMicAnalyzer());
  const replayRef = useRef(new ReplayFixtureGenerator());
  const wsRef = useRef<WebSocket | null>(null);
  const sourceRef = useRef<"live" | "replay">(initialReplay ? "replay" : "live");
  const stateRef = useRef<SystemState>("UNPAIRED");
  const governorRef = useRef(true);
  const persistenceRef = useRef(new PersistenceWindow(6, 4));
  const baselineSamplesRef = useRef<number[]>([]);
  const baselinePowerRef = useRef(1e-12);
  const commandSentAtRef = useRef(0);
  const commandPendingRef = useRef(false);
  const prePowerRef = useRef(1e-12);
  const verifyFramesRef = useRef(0);
  const recoveryHitsRef = useRef(0);
  const proofPhaseRef = useRef<"NONE" | "OFF" | "ON">("NONE");
  const phaseStartedRef = useRef(0);
  const offPeakRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const savedRunRef = useRef<string | null>(null);

  const [source, setSource] = useState<"live" | "replay">(initialReplay ? "replay" : "live");
  const [systemState, setSystemState] = useState<SystemState>("UNPAIRED");
  const [governorEnabled, setGovernorEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [nodePaired, setNodePaired] = useState(false);
  const [heartbeatSeq, setHeartbeatSeq] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [liveness, setLiveness] = useState(0);
  const [metrics, setMetrics] = useState<SpectrumMetrics>(EMPTY);
  const [persistenceLabel, setPersistenceLabel] = useState("0/6");
  const [reductionDb, setReductionDb] = useState<number | null>(null);
  const [lastAck, setLastAck] = useState<CommandAckMessage | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [proof, setProof] = useState<ProofResult>({ runId: null, seed: SEED, offExposureMs: 0, onExposureMs: 0, reductionDb: null, outcome: "PENDING" });
  const [capsule, setCapsule] = useState<StoredProof | null>(null);
  const [micSettings, setMicSettings] = useState({ sampleRate: 48000, echoCancellation: undefined as boolean | undefined });

  const addEvent = useCallback((message: string, tone: EventItem["tone"] = "info") => {
    setEvents(previous => [{ at: new Date().toLocaleTimeString(), message, tone }, ...previous].slice(0, 24));
  }, []);

  const transition = useCallback((next: SystemState, reason: string) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setSystemState(next);
    addEvent(`${next} · ${reason}`, next === "RECOVERED" ? "success" : next === "UNRESOLVED" || next === "SAFE_HOLD" ? "danger" : "info");
  }, [addEvent]);

  const setMode = useCallback((next: "live" | "replay") => {
    sourceRef.current = next;
    setSource(next);
    persistenceRef.current.reset();
    setPersistenceLabel("0/6");
  }, []);

  const setGovernor = useCallback((enabled: boolean) => {
    governorRef.current = enabled;
    setGovernorEnabled(enabled);
  }, []);

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let reconnectTimer: number | undefined;
    const connect = () => {
      if (disposed) return;
      const ws = new WebSocket(websocketUrl(`/ws/${roomCode}`));
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setWsConnected(true);
        ws.send(JSON.stringify({ version: PROTOCOL_VERSION, type: "HELLO", room_id: roomCode, client_id: `op-${Date.now().toString(36)}`, role: "operator", timestamp: Date.now() / 1000 }));
        addEvent("Operator link established");
      };
      ws.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === "PAIR") {
            const paired = message.peers.includes("node");
            setNodePaired(paired);
            if (paired && stateRef.current === "UNPAIRED") transition("READY", "physical node paired");
            if (!paired && stateRef.current !== "SAFE_HOLD" && sourceRef.current === "live") transition("UNPAIRED", "physical node disconnected");
          } else if (message.type === "HEARTBEAT") setHeartbeatSeq(message.seq);
          else if (message.type === "COMMAND_ACK") {
            commandPendingRef.current = false;
            setLastAck(message);
            addEvent(`Command acknowledged · ${Math.round(performance.now() - commandSentAtRef.current)} ms RTT`, "success");
            verifyFramesRef.current = 0;
            recoveryHitsRef.current = 0;
            transition("VERIFYING", "node applied bounded mitigation");
          } else if (message.type === "SAFE_HOLD") transition("SAFE_HOLD", message.reason);
          else if (message.type === "NODE_READY") addEvent("Bench node armed", "success");
          else if (message.type === "START_PROFILE") transition("NOMINAL", "physical nominal profile started");
          else if (message.type === "INJECT_INSTABILITY") addEvent(`Physical incident ${message.incident_id} injected`);
          else if (message.type === "ERROR") addEvent(`${message.code}: ${message.message}`, "danger");
        } catch { addEvent("Rejected malformed server message", "danger"); }
      };
      ws.onclose = () => {
        setWsConnected(false);
        setNodePaired(false);
        if (sourceRef.current === "live" && stateRef.current !== "SAFE_HOLD") transition("UNPAIRED", "operator link lost");
        if (!disposed && attempt < 4) {
          const delay = Math.min(4000, 500 * 2 ** attempt++);
          addEvent(`Link retry ${attempt}/4 in ${delay} ms`);
          reconnectTimer = window.setTimeout(connect, delay);
        } else if (!disposed) addEvent("Link retry budget exhausted", "danger");
      };
    };
    connect();
    return () => { disposed = true; if (reconnectTimer) window.clearTimeout(reconnectTimer); wsRef.current?.close(); wsRef.current = null; };
  }, [addEvent, roomCode, transition]);

  useEffect(() => {
    if (proof.outcome === "PENDING" || !proof.runId || savedRunRef.current === proof.runId) return;
    savedRunRef.current = proof.runId;
    const finalOutcome: "RECOVERED" | "UNRESOLVED" = proof.outcome;
    const persist = async () => {
      const previousDigest = window.localStorage.getItem("cuthush-proof-head");
      const unsigned = {
        run_id: proof.runId!, room_id: roomCode, created_at: new Date().toISOString(),
        source: sourceRef.current === "replay" ? "REPLAY_FIXTURE" as const : "LIVE_MIC" as const,
        seed: proof.seed, outcome: finalOutcome, off_exposure_ms: proof.offExposureMs,
        on_exposure_ms: proof.onExposureMs, reduction_db: proof.reductionDb,
        previous_digest: previousDigest,
      };
      const digest = await sha256Hex(unsigned);
      const artifact: StoredProof = { ...unsigned, digest };
      setCapsule(artifact);
      window.localStorage.setItem("cuthush-latest-proof", JSON.stringify(artifact));
      window.localStorage.setItem("cuthush-proof-head", digest);
      window.history.replaceState({}, "", `/?room=${encodeURIComponent(roomCode)}&source=${sourceRef.current}`);
      try {
        const response = await fetch(apiUrl("/api/proofs"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(artifact) });
        addEvent(response.ok ? `Proof persisted · ${digest.slice(0, 10)}…` : "Proof saved locally; server persistence unavailable", response.ok ? "success" : "danger");
      } catch { addEvent("Proof saved locally; server persistence unavailable", "danger"); }
    };
    void persist();
  }, [addEvent, proof, roomCode]);

  useEffect(() => () => {
    micRef.current.stop();
    timersRef.current.forEach(timer => window.clearTimeout(timer));
  }, []);

  const getFrequencyData = useCallback((): Uint8Array => sourceRef.current === "replay" ? replayRef.current.getReplayFrequencyData() : micRef.current.getFrequencyData(), []);

  const dispatchMitigation = useCallback(() => {
    if (commandPendingRef.current) return;
    if (sourceRef.current === "live" && (!nodePaired || wsRef.current?.readyState !== WebSocket.OPEN)) {
      transition("UNRESOLVED", "physical node unavailable");
      return;
    }
    commandPendingRef.current = true;
    commandSentAtRef.current = performance.now();
    const commandId = `cmd-${Date.now()}`;
    transition("MITIGATING", "4-of-6 persistence threshold crossed");
    if (sourceRef.current === "replay") {
      replayRef.current.isMitigated = true;
      timersRef.current.push(window.setTimeout(() => {
        commandPendingRef.current = false;
        setLastAck({ version: PROTOCOL_VERSION, type: "COMMAND_ACK", room_id: roomCode, command_id: commandId, applied: true, state_after: "MITIGATED", latency_ms: performance.now() - commandSentAtRef.current, timestamp: Date.now() / 1000 });
        verifyFramesRef.current = 0;
        recoveryHitsRef.current = 0;
        transition("VERIFYING", "REPLAY_FIXTURE applied mitigation");
      }, 180));
      return;
    }
    wsRef.current?.send(JSON.stringify({ version: PROTOCOL_VERSION, type: "MITIGATION_COMMAND", room_id: roomCode, command_id: commandId, reduction_ratio: 0.65, ramp_ms: 250, dither_hz: 40, reason: "AUTO_PERSISTENCE_4_OF_6", timestamp: Date.now() / 1000 }));
  }, [nodePaired, roomCode, transition]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const frame = getFrequencyData();
      const sampleRate = sourceRef.current === "live" ? micRef.current.sampleRate || 48000 : 48000;
      const next = analyzeSpectrum(frame, sampleRate, baselinePowerRef.current);
      setMetrics(next);
      setLiveness(sourceRef.current === "replay" ? replayRef.current.getReplayLiveness() : micRef.current.getLivenessLevel());
      if (stateRef.current === "CALIBRATING") { baselineSamplesRef.current.push(next.targetPower); return; }

      if ((stateRef.current === "NOMINAL" || stateRef.current === "SUSPECT") && next.candidate) {
        if (stateRef.current !== "SUSPECT") transition("SUSPECT", "target band exceeds adaptive baseline");
        const triggered = persistenceRef.current.push(true);
        setPersistenceLabel(persistenceRef.current.label);
        if (proofPhaseRef.current === "OFF") offPeakRef.current = Math.max(offPeakRef.current, next.baselineDeltaDb);
        if (triggered && governorRef.current && proofPhaseRef.current !== "OFF") { prePowerRef.current = next.targetPower; dispatchMitigation(); }
      } else if (stateRef.current === "NOMINAL" || stateRef.current === "SUSPECT") {
        persistenceRef.current.push(false);
        setPersistenceLabel(persistenceRef.current.label);
        if (stateRef.current === "SUSPECT" && !next.candidate) transition("NOMINAL", "transient rejected");
      }

      if (stateRef.current === "VERIFYING") {
        const measured = measuredReductionDb(prePowerRef.current, next.targetPower);
        setReductionDb(measured);
        verifyFramesRef.current += 1;
        recoveryHitsRef.current = measured >= 6 ? recoveryHitsRef.current + 1 : 0;
        if (recoveryHitsRef.current >= 8) {
          const onExposureMs = Math.round(performance.now() - phaseStartedRef.current);
          transition("RECOVERED", `${measured.toFixed(1)} dB reduction sustained`);
          setProof(previous => ({ ...previous, runId: `run-${Date.now().toString(36)}`, onExposureMs, reductionDb: measured, outcome: "RECOVERED" }));
          proofPhaseRef.current = "NONE";
        } else if (verifyFramesRef.current >= 32) {
          const onExposureMs = Math.round(performance.now() - phaseStartedRef.current);
          transition("UNRESOLVED", "6 dB recovery requirement not sustained");
          setProof(previous => ({ ...previous, runId: `run-${Date.now().toString(36)}`, onExposureMs, reductionDb: measured, outcome: "UNRESOLVED" }));
          proofPhaseRef.current = "NONE";
        }
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [dispatchMitigation, getFrequencyData, transition]);

  const calibrate = useCallback(() => {
    baselineSamplesRef.current = [];
    persistenceRef.current.reset();
    setPersistenceLabel("0/6");
    transition("CALIBRATING", "measuring three-second local baseline");
    timersRef.current.push(window.setTimeout(() => {
      const samples = baselineSamplesRef.current;
      baselinePowerRef.current = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 1e-12;
      transition("NOMINAL", `baseline locked from ${samples.length} frames`);
    }, 3000));
  }, [transition]);

  const enableMic = async () => {
    const ok = await micRef.current.start();
    if (!ok) { setMicError(micRef.current.errorMessage); return; }
    setMode("live");
    setMicActive(true);
    setMicError(null);
    setMicSettings({ sampleRate: micRef.current.sampleRate, echoCancellation: micRef.current.grantedSettings.echoCancellation });
    addEvent(`LIVE_MIC active at ${micRef.current.sampleRate} Hz`, "success");
    transition(nodePaired ? "READY" : "UNPAIRED", "microphone granted");
  };

  const injectReplay = () => { setMode("replay"); replayRef.current.hasInstability = true; transition("NOMINAL", "seeded incident started"); };

  const runProof = () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
    setMode("replay");
    setGovernor(false);
    replayRef.current.reset(SEED);
    savedRunRef.current = null;
    setCapsule(null);
    setProof({ runId: null, seed: SEED, offExposureMs: 0, onExposureMs: 0, reductionDb: null, outcome: "PENDING" });
    setReductionDb(null);
    proofPhaseRef.current = "NONE";
    offPeakRef.current = 0;
    calibrate();
    const startOff = window.setTimeout(() => {
      replayRef.current.hasInstability = true;
      proofPhaseRef.current = "OFF";
      phaseStartedRef.current = performance.now();
      transition("NOMINAL", "A/B phase A · governor OFF · seed 2026");
    }, 3150);
    const startOn = window.setTimeout(() => {
      const offExposureMs = Math.round(performance.now() - phaseStartedRef.current);
      setProof(previous => ({ ...previous, offExposureMs }));
      replayRef.current.reset(SEED);
      replayRef.current.hasInstability = true;
      proofPhaseRef.current = "ON";
      phaseStartedRef.current = performance.now();
      persistenceRef.current.reset();
      setPersistenceLabel("0/6");
      setGovernor(true);
      transition("NOMINAL", `A/B phase B · governor ON · identical seed · OFF peak +${offPeakRef.current.toFixed(1)} dB`);
    }, 4750);
    timersRef.current.push(startOff, startOn);
  };

  const exportCapsule = async () => {
    if (!capsule) { addEvent("Complete Judge Mode before exporting evidence", "danger"); return; }
    const payload = { product: "CutHush", protocol: PROTOCOL_VERSION, ...capsule, integrity: { algorithm: "SHA-256", claim: "hash-chained, tamper-evident export" }, metrics: { dominantHz: metrics.dominantHz, baselineDeltaDb: Number(metrics.baselineDeltaDb.toFixed(2)), prominenceDb: Number(metrics.prominenceDb.toFixed(2)) } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cuthush-${capsule.run_id}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const stateTone = systemState === "RECOVERED" ? "state-recovered" : ["UNRESOLVED", "SAFE_HOLD", "SUSPECT"].includes(systemState) ? "state-danger" : ["MITIGATING", "VERIFYING", "CALIBRATING"].includes(systemState) ? "state-amber" : "state-live";

  return <main className="operator-dashboard">
    <header className="dash-header"><div className="header-left"><div className="logo-badge">CUT/HUSH</div><span className="header-kicker">ACOUSTIC GOVERNOR</span><span className="badge badge-amber">{roomCode}</span></div><div className="header-right"><span className={`link-pill ${wsConnected ? "is-online" : "is-offline"}`}><Radio size={13} /> LINK {wsConnected ? "ONLINE" : "OFFLINE"}</span><span className={`link-pill ${nodePaired ? "is-online" : "is-waiting"}`}>NODE {nodePaired ? "PAIRED" : "WAITING"}</span><span className="text-mono text-xs text-secondary">HB {heartbeatSeq}</span></div></header>
    <section className="hero-strip"><div><p className="eyebrow">LIVE TEST CELL / BROWSER HARDWARE-IN-THE-LOOP</p><h1>The machine hears itself.</h1><p>Sound → decision → bounded response → measured recovery.</p></div><div className={`state-monolith ${stateTone}`}><span>GOVERNOR STATE</span><strong>{systemState}</strong><small>{source === "replay" ? "REPLAY_FIXTURE" : micActive ? "LIVE_MIC" : "MIC_STANDBY"}</small></div></section>
    <section className="instrument-grid"><div className="instrument-main">
      <div className="control-rail"><button onClick={enableMic} className="btn btn-secondary btn-md"><Mic size={16} /> {micActive ? "Live mic active" : "Enable live mic"}</button><button onClick={calibrate} disabled={source === "live" && !micActive} className="btn btn-secondary btn-md"><Gauge size={16} /> Calibrate 3s</button><button onClick={injectReplay} className="btn btn-secondary btn-md"><AlertTriangle size={16} /> Inject replay incident</button><button onClick={runProof} className="btn btn-primary btn-md"><Play size={16} /> Run same-seed proof</button><button onClick={() => setGovernor(!governorEnabled)} className={`toggle-control ${governorEnabled ? "is-enabled" : ""}`}>Governor {governorEnabled ? "ON" : "OFF"}</button></div>
      {micError && <div className="error-alert"><AlertTriangle size={15} />{micError}</div>}
      <SpectrumCanvas getFrequencyData={getFrequencyData} sampleRate={source === "live" ? micSettings.sampleRate : 48000} isReplay={source === "replay"} />
      <div className="metric-band"><div><span>DOMINANT</span><strong>{metrics.dominantHz} Hz</strong></div><div><span>BASELINE Δ</span><strong>{metrics.baselineDeltaDb.toFixed(1)} dB</strong></div><div><span>PROMINENCE</span><strong>{metrics.prominenceDb.toFixed(1)} dB</strong></div><div><span>PERSISTENCE</span><strong>{persistenceLabel}</strong></div><div><span>INSTABILITY</span><strong>{metrics.instabilityScore.toFixed(0)}/100</strong></div><div><span>RECOVERY</span><strong>{reductionDb === null ? "—" : `${reductionDb.toFixed(1)} dB`}</strong></div></div>
      <div className="proof-surface"><div className="proof-heading"><div><p className="eyebrow">JUDGE MODE / COUNTERFACTUAL PROOF</p><h2>Same incident. Different outcome.</h2></div><div className="proof-actions"><button onClick={exportCapsule} disabled={!capsule} className="btn btn-ghost btn-sm"><Download size={14} /> Export Run Capsule</button>{capsule && <a href={`/?proof=${encodeURIComponent(capsule.run_id)}`} className="btn btn-secondary btn-sm">Open proof</a>}</div></div><div className="proof-columns"><div className="proof-column"><span>GOVERNOR OFF</span><strong>{proof.offExposureMs ? `${proof.offExposureMs} ms` : "WAITING"}</strong><small>instability exposure · seed #{proof.seed}</small></div><div className={`proof-column proof-outcome ${proof.outcome === "RECOVERED" ? "is-recovered" : ""}`}><span>GOVERNOR ON</span><strong>{proof.outcome}</strong><small>{proof.reductionDb === null ? "measurement pending" : `${proof.reductionDb.toFixed(1)} dB measured reduction · ${proof.onExposureMs} ms exposure`}</small></div></div>{capsule && <p className="proof-hash">SHA-256 {capsule.digest}</p>}</div>
    </div><aside className="instrument-side"><PhonePairing roomCode={roomCode} /><section className="card source-card"><div className="card-header"><span className="card-title">SIGNAL SOURCE</span><ShieldCheck size={15} className="text-amber" /></div><LivenessMeter level={liveness} sourceLabel={source === "replay" ? "REPLAY_FIXTURE" : micActive ? "LIVE_MIC" : "DISCONNECTED"} isLive={source === "replay" || micActive} /><div className="source-facts"><span>Sample rate <b>{source === "replay" ? 48000 : micSettings.sampleRate} Hz</b></span><span>Echo cancel <b>{micSettings.echoCancellation === undefined ? "reported on grant" : micSettings.echoCancellation ? "browser forced" : "requested off"}</b></span><span>Seed <b>#{SEED}</b></span></div></section><section className="card event-card"><div className="card-header"><div className="flex-center gap-2"><Terminal size={14} className="text-cyan" /><span className="card-title">EVIDENCE TIMELINE</span></div>{lastAck && <CheckCircle2 size={15} className="text-green" />}</div><div className="event-list">{events.length === 0 && <p className="empty-state">Awaiting a measured event.</p>}{events.map((item, index) => <div className={`event-row event-${item.tone}`} key={`${item.at}-${index}`}><span className="event-time">{item.at}</span><span>{item.message}</span></div>)}</div></section></aside></section>
    <footer className="truth-footer"><Activity size={14} /><span>Bench audio proxy—not field validation on a CNC machine. Green appears only after measured recovery.</span><a href="/?page=methodology" className="btn btn-ghost btn-xs">Method</a><button onClick={() => { replayRef.current.reset(SEED); setReductionDb(null); savedRunRef.current = null; setCapsule(null); setProof({ runId: null, seed: SEED, offExposureMs: 0, onExposureMs: 0, reductionDb: null, outcome: "PENDING" }); transition(nodePaired ? "READY" : "UNPAIRED", "test cell reset"); }} className="btn btn-ghost btn-xs"><RotateCcw size={12} /> Reset</button></footer>
  </main>;
};
