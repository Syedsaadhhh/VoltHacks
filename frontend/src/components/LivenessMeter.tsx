import React from "react";

interface Props {
  level: number; // 0.0 to 1.0
  sourceLabel: "LIVE_MIC" | "REPLAY_FIXTURE" | "DISCONNECTED";
  isLive: boolean;
}

export const LivenessMeter: React.FC<Props> = ({ level, sourceLabel, isLive }) => {
  const percentage = Math.min(100, Math.round(level * 100));
  const isReactive = level > 0.08;

  return (
    <div className="liveness-meter-container">
      <div className="liveness-header">
        <div className="liveness-label-group">
          <span className="text-xs font-semibold text-secondary">AUDIO INPUT LIVENESS</span>
          <span className={`badge ${sourceLabel === "LIVE_MIC" ? "badge-cyan" : "badge-gray"}`}>
            {sourceLabel}
          </span>
        </div>
        <span className="text-mono text-xs">
          {isLive ? (isReactive ? "SIGNAL DETECTED (TAP/VOICE OK)" : "LISTENING (TRY TAPPING)") : "MIC INACTIVE"}
        </span>
      </div>

      <div className="meter-track">
        <div
          className={`meter-bar ${isReactive ? "meter-active" : "meter-idle"}`}
          style={{ width: `${isLive ? percentage : 0}%` }}
        />
      </div>

      <div className="meter-labels text-mono text-xs text-secondary">
        <span>-60 dB</span>
        <span>-30 dB</span>
        <span>-12 dB</span>
        <span>0 dB (PEAK)</span>
      </div>
    </div>
  );
};