import React, { useState } from "react";
import { Play, RotateCcw, ShieldCheck, Activity, Radio, Cpu } from "lucide-react";

interface Props {
  onStartRoom: (roomId: string, isReplay: boolean) => void;
}

export const OpeningView: React.FC<Props> = ({ onStartRoom }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLive = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create room on server");
      const data = await res.json();
      onStartRoom(data.room_id, false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Could not reach backend");
      onStartRoom("HUSH-LOCAL", false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReplay = () => {
    onStartRoom("HUSH-REPLAY", true);
  };

  return (
    <div className="opening-container">
      <div className="opening-card">
        <div className="brand-badge">
          <Activity size={16} className="text-cyan" />
          <span>VOLTHACKS 2026 • LIVE CONTROL PROOF</span>
        </div>

        <h1 className="opening-title">
          A machine should not wait for a person to hear it failing.
        </h1>

        <p className="opening-subtitle">
          CutHush closes a real loop from sound in the room, to a machine decision,
          to a physical response, to measured recovery.
        </p>

        <div className="truth-card">
          <div className="truth-header">
            <ShieldCheck size={16} className="text-amber" />
            <span className="font-semibold text-xs text-amber">TRUTH & BOUNDARY NOTICE</span>
          </div>
          <ul className="truth-list text-xs text-secondary">
            <li>• Phone is labeled <strong className="text-amber">BENCH MACHINE NODE</strong> (audio simulator proxy, not a real CNC machine).</li>
            <li>• Laptop microphone is labeled <strong className="text-cyan">LIVE_MIC</strong> with true unadorned hardware settings.</li>
            <li>• Recovery appears only after measured target-band reduction; replay remains explicitly labeled.</li>
          </ul>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <div className="opening-actions">
          <button
            onClick={handleStartLive}
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            <Play size={18} />
            {loading ? "Creating Test Cell..." : "Start a live test cell"}
          </button>

          <button
            onClick={handleStartReplay}
            className="btn btn-secondary btn-lg"
          >
            <RotateCcw size={18} />
            Run the same-seed judge proof (REPLAY_FIXTURE)
          </button>
        </div>

        <div className="loop-diagram">
          <div className="diagram-step">
            <Radio size={16} />
            <span>Phone Speaker</span>
          </div>
          <span className="diagram-arrow">→</span>
          <div className="diagram-step">
            <span>Air</span>
          </div>
          <span className="diagram-arrow">→</span>
          <div className="diagram-step">
            <Cpu size={16} />
            <span>Laptop Mic</span>
          </div>
          <span className="diagram-arrow">→</span>
          <div className="diagram-step">
            <span>Spectrum</span>
          </div>
          <span className="diagram-arrow">→</span>
          <div className="diagram-step">
            <span>WS Command</span>
          </div>
          <span className="diagram-arrow">→</span>
          <div className="diagram-step">
            <span>Speaker Mitigation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
