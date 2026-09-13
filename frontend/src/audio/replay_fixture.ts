export class ReplayFixtureGenerator {
  private binCount = 1024;
  private sampleRate = 48000;
  private timeStep = 0;
  private seed = 2026;
  private randomState = 2026;

  public hasInstability = false;
  public isMitigated = false;

  constructor(binCount: number = 1024, sampleRate: number = 48000) {
    this.binCount = binCount;
    this.sampleRate = sampleRate;
  }

  public reset(seed: number = 2026): void {
    this.seed = seed >>> 0;
    this.randomState = this.seed;
    this.timeStep = 0;
    this.hasInstability = false;
    this.isMitigated = false;
  }

  public get activeSeed(): number {
    return this.seed;
  }

  private random(): number {
    let value = (this.randomState += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  public getReplayFrequencyData(): Uint8Array {
    this.timeStep += 0.05;
    const data = new Uint8Array(this.binCount);
    const binHz = this.sampleRate / (this.binCount * 2);

    // Baseline ambient noise floor (~40-60 on 0-255 scale)
    for (let i = 0; i < this.binCount; i++) {
      const noise = 35 + Math.sin(i * 0.1 + this.timeStep) * 5 + this.random() * 8;
      data[i] = Math.min(255, Math.floor(noise));
    }

    // Nominal rotational proxy peak at 200 Hz
    const fundBin = Math.round(200 / binHz);
    if (fundBin < this.binCount) {
      data[fundBin] = Math.max(data[fundBin], 150 + Math.floor(this.random() * 10));
      if (fundBin > 0) data[fundBin - 1] = Math.max(data[fundBin - 1], 110);
      if (fundBin + 1 < this.binCount) data[fundBin + 1] = Math.max(data[fundBin + 1], 110);
    }

    // Tooth-pass harmonic peak at 400 Hz
    const toothBin = Math.round(400 / binHz);
    if (toothBin < this.binCount) {
      data[toothBin] = Math.max(data[toothBin], 175 + Math.floor(this.random() * 8));
      if (toothBin > 0) data[toothBin - 1] = Math.max(data[toothBin - 1], 120);
      if (toothBin + 1 < this.binCount) data[toothBin + 1] = Math.max(data[toothBin + 1], 120);
    }

    // Second harmonic at 800 Hz
    const harmBin = Math.round(800 / binHz);
    if (harmBin < this.binCount) {
      data[harmBin] = Math.max(data[harmBin], 130 + Math.floor(this.random() * 6));
    }

    // Instability peak at 2400 Hz
    if (this.hasInstability) {
      const chatterBin = Math.round((this.isMitigated ? 2360 : 2400) / binHz);
      const flutter = Math.sin(this.timeStep * 15) * 15;
      const baseAmp = this.isMitigated ? 95 : 215;
      const amp = Math.max(40, Math.min(255, baseAmp + flutter + this.random() * 10));

      if (chatterBin < this.binCount) {
        data[chatterBin] = Math.floor(amp);
        if (chatterBin > 0) data[chatterBin - 1] = Math.floor(amp * 0.75);
        if (chatterBin + 1 < this.binCount) data[chatterBin + 1] = Math.floor(amp * 0.75);
        if (chatterBin > 1) data[chatterBin - 2] = Math.floor(amp * 0.4);
        if (chatterBin + 2 < this.binCount) data[chatterBin + 2] = Math.floor(amp * 0.4);
      }
    }

    return data;
  }

  public getReplayLiveness(): number {
    return 0.35 + Math.sin(this.timeStep * 4) * 0.15 + this.random() * 0.05;
  }
}
