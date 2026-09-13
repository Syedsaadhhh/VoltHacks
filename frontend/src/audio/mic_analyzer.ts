import { MicSettings } from "../protocol/types";

export class LaptopMicAnalyzer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private freqData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;

  public sampleRate = 0;
  public grantedSettings: MicSettings = { sampleRate: 0 };
  public isLive = false;
  public errorMessage: string | null = null;

  public async start(): Promise<boolean> {
    try {
      this.errorMessage = null;

      // Request microphone permission with processing constraints disabled where supported
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = this.stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }

      this.sampleRate = this.ctx.sampleRate;
      this.grantedSettings = {
        sampleRate: this.sampleRate,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        channelCount: settings.channelCount,
        deviceId: settings.deviceId,
      };

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.75;

      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyserNode);

      this.freqData = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyserNode.fftSize);
      this.isLive = true;
      return true;
    } catch (err: unknown) {
      this.isLive = false;
      const error = err as Error;
      this.errorMessage = error.message || "Microphone access denied or unsupported.";
      return false;
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode || !this.freqData) {
      return new Uint8Array(1024);
    }
    this.analyserNode.getByteFrequencyData(this.freqData as any);
    return this.freqData;
  }

  public getLivenessLevel(): number {
    if (!this.analyserNode || !this.timeData) return 0.0;
    this.analyserNode.getByteTimeDomainData(this.timeData as any);

    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const val = (this.timeData[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / this.timeData.length);
    return Math.min(1.0, rms * 3.5);
  }

  public stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
      this.ctx = null;
    }
    this.isLive = false;
  }
}