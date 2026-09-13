import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Link2, Smartphone } from "lucide-react";

interface Props { roomCode: string; }

function isLoopback(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
}

function validateOrigin(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) && !isLoopback(parsed.hostname) ? parsed.origin : null;
  } catch { return null; }
}

export const PhonePairing: React.FC<Props> = ({ roomCode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const automatic = isLoopback(window.location.hostname) ? null : window.location.origin;
  const stored = validateOrigin(window.localStorage.getItem("cuthush-phone-origin") ?? "");
  const [origin, setOrigin] = useState<string | null>(stored ?? automatic);
  const [draft, setDraft] = useState(stored ?? automatic ?? "http://192.168.1.10:5173");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nodeUrl = useMemo(() => origin ? `${origin}/?room=${encodeURIComponent(roomCode)}&role=node` : null, [origin, roomCode]);

  useEffect(() => {
    if (!canvasRef.current || !nodeUrl) return;
    QRCode.toCanvas(canvasRef.current, nodeUrl, { width: 180, margin: 2, color: { dark: "#151513", light: "#f2eedf" } })
      .catch(() => setError("Could not render pairing code."));
  }, [nodeUrl]);

  const saveOrigin = () => {
    const validated = validateOrigin(draft);
    if (!validated) { setError("Use the laptop LAN address, for example http://192.168.1.42:5173"); return; }
    window.localStorage.setItem("cuthush-phone-origin", validated);
    setOrigin(validated);
    setDraft(validated);
    setError(null);
  };

  const copy = async () => {
    if (!nodeUrl) return;
    await navigator.clipboard.writeText(nodeUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return <section className="card pairing-card">
    <div className="card-header"><div className="flex-center gap-2"><Smartphone size={16} className="text-amber" /><span className="card-title">PAIR PHYSICAL NODE</span></div><span className="badge badge-amber">{roomCode}</span></div>
    {!nodeUrl ? <div className="pairing-setup">
      <p className="pairing-warning">localhost cannot open on your phone. Enter the LAN URL printed by the launcher.</p>
      <label className="field-label" htmlFor="phone-origin">PHONE-REACHABLE ORIGIN</label>
      <div className="origin-row"><input id="phone-origin" value={draft} onChange={event => setDraft(event.target.value)} className="origin-input" inputMode="url" /><button onClick={saveOrigin} className="btn btn-primary btn-sm"><Link2 size={14} /> Save</button></div>
      {error && <p className="field-error">{error}</p>}
    </div> : <>
      <div className="qr-wrapper"><canvas ref={canvasRef} className="qr-canvas" /></div>
      <p className="pairing-url text-mono">{nodeUrl}</p>
      <div className="qr-actions"><button onClick={copy} className="btn btn-secondary btn-sm">{copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}{copied ? "Copied" : "Copy link"}</button><button onClick={() => setOrigin(null)} className="btn btn-ghost btn-sm">Change address</button></div>
      <p className="pairing-footnote">Phone and laptop must share the same network.</p>
    </>}
  </section>;
};
