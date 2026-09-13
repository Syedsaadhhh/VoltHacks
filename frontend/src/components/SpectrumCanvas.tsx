import React, { useEffect, useRef } from "react";

interface Props {
  getFrequencyData: () => Uint8Array;
  sampleRate: number;
  isReplay: boolean;
}

export const SpectrumCanvas: React.FC<Props> = ({ getFrequencyData, sampleRate, isReplay }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const freqData = getFrequencyData();
      const width = canvas.width;
      const height = canvas.height;

      // Clear with deep dark slate
      ctx.fillStyle = "#121316";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = "#22252d";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Max frequency to display: up to 3500 Hz to highlight target 2400 Hz and 400 Hz harmonic
      const maxDisplayHz = 3500;
      const nyquist = (sampleRate || 48000) / 2;
      const totalBins = freqData.length || 1024;
      const displayBins = Math.min(totalBins, Math.floor((maxDisplayHz / nyquist) * totalBins));

      const barWidth = width / displayBins;

      // Draw FFT bars
      for (let i = 0; i < displayBins; i++) {
        const val = freqData[i] || 0;
        const barHeight = (val / 255) * (height - 30);
        const x = i * barWidth;
        const y = height - barHeight - 20;

        const binHz = (i / totalBins) * nyquist;

        // Color coding
        if (Math.abs(binHz - 2400) < 60) {
          // Instability target band
          ctx.fillStyle = "#06b6d4"; // signal cyan
        } else if (Math.abs(binHz - 400) < 40) {
          // Rotational tooth pass proxy
          ctx.fillStyle = "#f59e0b"; // safety amber
        } else {
          ctx.fillStyle = isReplay ? "#52525b" : "#3b82f6";
        }

        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      }

      // Draw markers
      const drawMarker = (hz: number, label: string, color: string) => {
        const binIndex = (hz / nyquist) * totalBins;
        if (binIndex <= displayBins) {
          const markerX = binIndex * barWidth;
          ctx.strokeStyle = color;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(markerX, 0);
          ctx.lineTo(markerX, height - 20);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = color;
          ctx.font = "10px monospace";
          ctx.fillText(`${label} (${hz}Hz)`, Math.min(markerX + 4, width - 110), 18);
        }
      };

      drawMarker(400, "HARMONIC", "#f59e0b");
      drawMarker(2400, "TARGET CHATTER", "#06b6d4");

      // Draw baseline axis
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "10px monospace";
      ctx.fillText("0 Hz", 6, height - 6);
      ctx.fillText("1000 Hz", (1000 / maxDisplayHz) * width - 20, height - 6);
      ctx.fillText("2000 Hz", (2000 / maxDisplayHz) * width - 20, height - 6);
      ctx.fillText("3000 Hz", (3000 / maxDisplayHz) * width - 20, height - 6);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [getFrequencyData, sampleRate, isReplay]);

  return (
    <div className="spectrum-card">
      <div className="spectrum-header">
        <div className="spectrum-title">
          <span>LIVE FREQUENCY SPECTRUM</span>
          <span className="text-mono text-secondary text-xs">0 – 3.5 kHz</span>
        </div>
        <div className="spectrum-legend">
          <span className="legend-item"><span className="legend-dot dot-amber"></span> 400 Hz Tooth-Pass</span>
          <span className="legend-item"><span className="legend-dot dot-cyan"></span> 2400 Hz Instability</span>
        </div>
      </div>
      <canvas ref={canvasRef} width={680} height={220} className="spectrum-canvas" />
    </div>
  );
};