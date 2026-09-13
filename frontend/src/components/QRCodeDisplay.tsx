import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, ExternalLink } from "lucide-react";

interface Props {
  url: string;
  roomCode: string;
}

export const QRCodeDisplay: React.FC<Props> = ({ url, roomCode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 180,
        margin: 2,
        color: {
          dark: "#121316",
          light: "#e2e8f0",
        },
      }).catch((err) => console.error("QR Code Error:", err));
    }
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card qr-container">
      <div className="card-header">
        <span className="card-title">BENCH NODE PAIRING</span>
        <span className="badge badge-amber">{roomCode}</span>
      </div>
      <div className="qr-wrapper">
        <canvas ref={canvasRef} className="qr-canvas" />
      </div>
      <div className="qr-instructions">
        <p className="text-sm text-secondary">
          Scan with phone to load <strong className="text-amber">BENCH MACHINE NODE</strong>.
        </p>
        <div className="qr-actions">
          <button onClick={handleCopy} className="btn btn-secondary btn-sm">
            {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy Node Link"}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> Open 2nd Tab
          </a>
        </div>
      </div>
    </div>
  );
};