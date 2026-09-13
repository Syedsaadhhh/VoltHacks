/**
 * Bench Node Audio Engine
 *
 * Simulates machine cutting proxy audio (nominal spindle/tooth-pass proxy + friction noise,
 * and seeded narrowband chatter instability with 15 Hz AM flutter).
 *
 * TRUTH BOUNDARY: This is a bench audio proxy, NOT a real CNC machine.
 */

export interface SynthTelemetry {
  armed: boolean;
  activeProfile: "IDLE" | "NOMINAL" | "INSTABILITY" | "MITIGATED" | "SAFE_HOLD";
  incidentId: string | null;
  seed: number;
  lastHeartbeatAgeMs: number;
  watchdogRemainingMs: number;
  safeHoldTriggered: boolean;
}

/**
 * Mulberry32 deterministic 32-bit PRNG.
 * Produces float in [0, 1) with uniform distribution for a given seed.
 */
export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic noise samples for friction texture buffer.
 */
export function generateDeterministicNoiseSamples(
  length: number,
  seed: number,
  amplitude: number = 0.05
): Float32Array {
  const data = new Float32Array(length);
  const rng = mulberry32(seed);
  for (let i = 0; i < length; i++) {
    data[i] = (rng() * 2 - 1) * amplitude;
  }
  return data;
}

export class BenchNodeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Nominal oscillators
  private fundamentalOsc: OscillatorNode | null = null;
  private toothPassOsc: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  // Instability tone & AM modulator
  private chatterOsc: OscillatorNode | null = null;
  private chatterGain: GainNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Watchdog & state
  public armed = false;
  public activeProfile: "IDLE" | "NOMINAL" | "INSTABILITY" | "MITIGATED" | "SAFE_HOLD" = "IDLE";
  public incidentId: string | null = null;
  public activeSeed: number = 2026;
  private lastHeartbeatTime: number = 0;
  private watchdogInterval: number | null = null;
  private readonly WATCHDOG_TIMEOUT_MS = 1200;
  private onSafeHoldCallback?: (reason: string) => void;

  constructor(onSafeHold?: (reason: string) => void) {
    this.onSafeHoldCallback = onSafeHold;
  }

  public async arm(): Promise<void> {
    if (this.armed && this.ctx && this.ctx.state === "running") {
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.armed = true;
    this.activeProfile = "IDLE";
    this.lastHeartbeatTime = performance.now();

    this.startWatchdogLoop();
  }

  public feedHeartbeat(): void {
    this.lastHeartbeatTime = performance.now();
    // In SAFE_HOLD: watchdog timer is refreshed so it won't immediately re-trip upon user action,
    // but audio remains silenced and activeProfile stays SAFE_HOLD until explicit user action!
  }

  public getWatchdogTelemetry(): {
    lastHeartbeatAgeMs: number;
    watchdogRemainingMs: number;
    safeHoldTriggered: boolean;
  } {
    const now = performance.now();
    const age = this.lastHeartbeatTime > 0 ? Math.max(0, now - this.lastHeartbeatTime) : 0;
    const remaining = Math.max(0, this.WATCHDOG_TIMEOUT_MS - age);
    return {
      lastHeartbeatAgeMs: Math.round(age),
      watchdogRemainingMs: Math.round(remaining),
      safeHoldTriggered: this.activeProfile === "SAFE_HOLD",
    };
  }

  private startWatchdogLoop(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }
    this.watchdogInterval = window.setInterval(() => {
      if (!this.armed) return;
      const now = performance.now();
      const age = now - this.lastHeartbeatTime;

      // If no heartbeat for > 1200ms while running audio, trigger node-local safe hold
      if (
        age > this.WATCHDOG_TIMEOUT_MS &&
        this.activeProfile !== "SAFE_HOLD" &&
        this.activeProfile !== "IDLE"
      ) {
        this.triggerSafeHold("HEARTBEAT_TIMEOUT_EXCEEDED_1200MS");
      }
    }, 100);
  }

  public startNominal(seed: number = 2026): void {
    if (!this.ctx || !this.masterGain || !this.armed) return;

    this.stopAllVoices();
    this.activeSeed = seed;
    const now = this.ctx.currentTime;

    // 1. Fundamental rotational proxy (200 Hz)
    this.fundamentalOsc = this.ctx.createOscillator();
    this.fundamentalOsc.type = "sine";
    this.fundamentalOsc.frequency.setValueAtTime(200, now);
    const fundGain = this.ctx.createGain();
    fundGain.gain.setValueAtTime(0.3, now);
    this.fundamentalOsc.connect(fundGain);
    fundGain.connect(this.masterGain);
    this.fundamentalOsc.start(now);

    // 2. Tooth-pass proxy harmonic (400 Hz)
    this.toothPassOsc = this.ctx.createOscillator();
    this.toothPassOsc.type = "triangle";
    this.toothPassOsc.frequency.setValueAtTime(400, now);
    const toothGain = this.ctx.createGain();
    toothGain.gain.setValueAtTime(0.25, now);
    this.toothPassOsc.connect(toothGain);
    toothGain.connect(this.masterGain);
    this.toothPassOsc.start(now);

    // 3. Broadband cutting friction texture (deterministic filtered PRNG noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    const noiseSamples = generateDeterministicNoiseSamples(bufferSize, seed, 0.05);
    channelData.set(noiseSamples);

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.Q.setValueAtTime(1.5, now);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.15, now);

    this.noiseSource.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseSource.start(now);

    // Ramp master gain up cleanly
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.5, now + 0.1);

    this.activeProfile = "NOMINAL";
    this.incidentId = null;
  }

  public injectInstability(
    incidentId: string = "INC-BENCH-001",
    targetFreqHz: number = 2400,
    seed: number = 2026
  ): void {
    if (!this.ctx || !this.masterGain || !this.armed) return;
    if (this.activeProfile === "IDLE") {
      this.startNominal(seed);
    }
    this.incidentId = incidentId;
    this.activeSeed = seed;
    const now = this.ctx.currentTime;

    // Stop prior chatter voices if active
    if (this.chatterOsc) {
      try {
        this.chatterOsc.stop();
      } catch {}
      this.chatterOsc.disconnect();
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch {}
      this.lfoOsc.disconnect();
    }

    // Narrowband chatter tone (target frequency, default 2400 Hz)
    this.chatterOsc = this.ctx.createOscillator();
    this.chatterOsc.type = "sawtooth";
    this.chatterOsc.frequency.setValueAtTime(targetFreqHz, now);

    // Chatter gain with AM flutter (15 Hz LFO)
    this.chatterGain = this.ctx.createGain();
    this.chatterGain.gain.setValueAtTime(0.0, now);

    // LFO modulator
    this.lfoOsc = this.ctx.createOscillator();
    this.lfoOsc.type = "sine";
    this.lfoOsc.frequency.setValueAtTime(15, now);

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(0.15, now);

    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.chatterGain.gain);

    this.chatterOsc.connect(this.chatterGain);
    this.chatterGain.connect(this.masterGain);

    this.chatterOsc.start(now);
    this.lfoOsc.start(now);

    // Ramp chatter up smoothly
    this.chatterGain.gain.cancelScheduledValues(now);
    this.chatterGain.gain.setValueAtTime(0.0, now);
    this.chatterGain.gain.linearRampToValueAtTime(0.4, now + 0.2);

    this.activeProfile = "INSTABILITY";
  }

  public applyMitigation(
    reductionRatio: number = 0.5,
    rampMs: number = 250,
    ditherHz: number = 40
  ): { applied: boolean; latencyMs: number } {
    const startTime = performance.now();
    if (!this.ctx || !this.masterGain || !this.armed) {
      return { applied: false, latencyMs: 0 };
    }

    const now = this.ctx.currentTime;
    const rampSec = Math.max(0.05, rampMs / 1000);

    // 1. Smoothly attenuate the chatter gain
    if (this.chatterGain) {
      const currentGain = 0.4;
      const targetGain = Math.max(0.02, currentGain * (1.0 - reductionRatio));
      this.chatterGain.gain.cancelScheduledValues(now);
      this.chatterGain.gain.setValueAtTime(this.chatterGain.gain.value, now);
      this.chatterGain.gain.exponentialRampToValueAtTime(targetGain, now + rampSec);
    }

    // 2. Frequency dither proxy (bench SSV proxy)
    if (this.chatterOsc) {
      const currentFreq = this.chatterOsc.frequency.value;
      this.chatterOsc.frequency.cancelScheduledValues(now);
      this.chatterOsc.frequency.setValueAtTime(currentFreq, now);
      this.chatterOsc.frequency.linearRampToValueAtTime(currentFreq - ditherHz, now + rampSec);
    }

    this.activeProfile = "MITIGATED";
    const latencyMs = performance.now() - startTime;
    return { applied: true, latencyMs };
  }

  public triggerSafeHold(reason: string = "WATCHDOG_TIMEOUT"): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Fail-safe: ramp master gain to zero in 80ms
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.08);

    this.activeProfile = "SAFE_HOLD";
    if (this.onSafeHoldCallback) {
      this.onSafeHoldCallback(reason);
    }
  }

  public stopAllVoices(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.05);

    // Capture the old graph before clearing fields. startNominal may create a
    // new graph immediately; the delayed cleanup must never stop those nodes.
    const oldFundamental = this.fundamentalOsc;
    const oldToothPass = this.toothPassOsc;
    const oldNoise = this.noiseSource;
    const oldChatter = this.chatterOsc;
    const oldLfo = this.lfoOsc;

    this.fundamentalOsc = null;
    this.toothPassOsc = null;
    this.noiseSource = null;
    this.chatterOsc = null;
    this.lfoOsc = null;

    setTimeout(() => {
      try {
        oldFundamental?.stop();
      } catch {}
      try {
        oldToothPass?.stop();
      } catch {}
      try {
        oldNoise?.stop();
      } catch {}
      try {
        oldChatter?.stop();
      } catch {}
      try {
        oldLfo?.stop();
      } catch {}
    }, 60);

    this.activeProfile = "IDLE";
  }

  public dispose(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }
    this.stopAllVoices();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
    }
    this.armed = false;
  }
}
