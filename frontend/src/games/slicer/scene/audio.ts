export class SlicerAudio {
  private context?: AudioContext;
  private onSlotPlayed?: (slot: string) => void;

  setTelemetry(callback: (slot: string) => void): void {
    this.onSlotPlayed = callback;
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  sliceReward(): void {
    this.playSlot('slice_reward');
    this.tone(1175, 0.1, 0.028, 'sine');
    window.setTimeout(() => this.tone(1568, 0.08, 0.018, 'triangle'), 36);
  }

  roundComplete(): void {
    this.playSlot('round_complete');
    this.tone(740, 0.16, 0.024, 'triangle');
    window.setTimeout(() => this.tone(988, 0.18, 0.02, 'sine'), 80);
  }

  miss(): void {
    this.playSlot('miss');
    this.noiseSweep(360, 0.18);
  }

  bomb(): void {
    this.playSlot('bomb');
    this.tone(96, 0.22, 0.08, 'sawtooth');
    this.noiseSweep(180, 0.22);
  }

  sessionComplete(): void {
    this.playSlot('session_complete');
    [262, 330, 392, 523].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.7, 0.035, 'sine'), index * 70);
    });
  }

  private playSlot(slot: string): void {
    this.onSlotPlayed?.(slot);
  }

  private tone(frequency: number, duration: number, gainValue: number, type: OscillatorType): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }

  private noiseSweep(filterFrequency: number, duration: number): void {
    const context = this.context;
    if (!context) return;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.value = 0.045;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  }
}
