export interface SpectrumMetrics {
  dominantHz: number;
  targetPower: number;
  targetDb: number;
  prominenceDb: number;
  baselineDeltaDb: number;
  instabilityScore: number;
  candidate: boolean;
}

const MIN_DB = -100;
const MAX_DB = -30;
const EPSILON = 1e-12;

function byteToPower(value: number): number {
  const db = MIN_DB + (Math.max(0, Math.min(255, value)) / 255) * (MAX_DB - MIN_DB);
  return Math.pow(10, db / 10);
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : EPSILON;
}

export function analyzeSpectrum(
  data: Uint8Array,
  sampleRate: number,
  baselinePower: number = EPSILON,
  targetHz: number = 2400
): SpectrumMetrics {
  const nyquist = sampleRate / 2;
  const binHz = nyquist / Math.max(1, data.length);
  const target: number[] = [];
  const neighbours: number[] = [];
  let dominantValue = -1;
  let dominantHz = 0;

  for (let index = 1; index < data.length; index += 1) {
    const hz = index * binHz;
    if (hz > 3500) break;
    if (data[index] > dominantValue) {
      dominantValue = data[index];
      dominantHz = hz;
    }
    const power = byteToPower(data[index]);
    if (Math.abs(hz - targetHz) <= 90) target.push(power);
    if ((hz >= 1800 && hz <= 2150) || (hz >= 2650 && hz <= 3000)) neighbours.push(power);
  }

  const targetPower = Math.max(EPSILON, mean(target));
  const neighbourPower = Math.max(EPSILON, mean(neighbours));
  const safeBaseline = Math.max(EPSILON, baselinePower);
  const targetDb = 10 * Math.log10(targetPower);
  const prominenceDb = 10 * Math.log10(targetPower / neighbourPower);
  const baselineDeltaDb = 10 * Math.log10(targetPower / safeBaseline);
  const score = Math.max(
    0,
    Math.min(100, (Math.max(0, baselineDeltaDb) / 14) * 55 + (Math.max(0, prominenceDb) / 20) * 45)
  );

  return {
    dominantHz: Math.round(dominantHz),
    targetPower,
    targetDb,
    prominenceDb,
    baselineDeltaDb,
    instabilityScore: score,
    candidate: baselineDeltaDb >= 6 && prominenceDb >= 7,
  };
}

export function measuredReductionDb(prePower: number, currentPower: number): number {
  return 10 * Math.log10(Math.max(EPSILON, prePower) / Math.max(EPSILON, currentPower));
}

export class PersistenceWindow {
  private readonly values: boolean[] = [];

  constructor(private readonly size = 6, private readonly required = 4) {}

  push(value: boolean): boolean {
    this.values.push(value);
    if (this.values.length > this.size) this.values.shift();
    return this.values.length === this.size && this.values.filter(Boolean).length >= this.required;
  }

  reset(): void {
    this.values.length = 0;
  }

  get label(): string {
    return `${this.values.filter(Boolean).length}/${this.size}`;
  }
}
