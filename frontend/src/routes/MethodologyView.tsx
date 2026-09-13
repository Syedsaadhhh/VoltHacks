import React from "react";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";

export const MethodologyView: React.FC = () => <main className="editorial-page">
  <a href="/" className="back-link"><ArrowLeft size={14} /> CutHush</a>
  <p className="eyebrow">METHOD / LIMITS / REPRODUCTION</p>
  <h1>Physics-guided, visibly bounded.</h1>
  <p className="editorial-lede">CutHush listens for persistent narrowband energy that rises above a freshly measured local baseline and sits outside the nominal 400 Hz tooth-pass marker.</p>
  <section className="method-grid">
    <article><Activity className="text-cyan" /><h2>Detect</h2><p>4096-point FFT at the browser’s granted sample rate. Target-band power is derived from analyser dB bins, compared with a three-second baseline and neighbouring bands.</p></article>
    <article><ShieldCheck className="text-amber" /><h2>Decide</h2><p>A candidate must exceed 6 dB over baseline, show 7 dB prominence, and persist in at least four of six frames. A transient is rejected.</p></article>
    <article><Activity className="text-green" /><h2>Verify</h2><p>Green is earned only when post-command target-band power falls by at least 6 dB for eight consecutive frames. Otherwise the result is UNRESOLVED.</p></article>
  </section>
  <section className="boundary-panel"><h2>Truth boundary</h2><p>The phone is a deterministic bench audio proxy, not a CNC machine. The laptop microphone and WebSocket command path are real. Replay data is always labeled REPLAY_FIXTURE. Results demonstrate the control architecture, not certified industrial performance.</p></section>
</main>;
