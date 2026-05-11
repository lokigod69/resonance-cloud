import type { LevelConfig } from '../../engine';
import { productionAudio, resolveProductionAssetUrl } from './productionAssets';

export interface AudioBackend {
  prime(): Promise<void>;
  speak(word: string, audioUrl?: string, language?: string): Promise<void>;
  cancel(): void;
  pause(): void;
  resume(): void;
}

export class BrowserSpeechAudio implements AudioBackend {
  private primePromise: Promise<void> = Promise.resolve();

  async prime(): Promise<void> {
    this.primePromise = Promise.resolve();
    await this.primePromise;
  }

  async speak(word: string, audioUrl?: string, language?: string): Promise<void> {
    void audioUrl;
    await this.primePromise;
    this.cancel();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.82;
      utterance.pitch = 0.96;
      if (language) utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }

  cancel(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  pause(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }
}

export class RunnerSoundscape {
  private context: AudioContext | null = null;
  private active: AudioBufferSourceNode | OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientElement: HTMLAudioElement | null = null;

  async prime(): Promise<void> {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextCtor();
    }
    if (this.context.state !== 'running') {
      await this.context.resume();
    }
  }

  startAmbient(level: LevelConfig): void {
    const ambientUrl = resolveProductionAssetUrl(level.ambientAudioPath, productionAudio);
    if (ambientUrl) {
      if (!this.ambientElement) {
        this.ambientElement = new Audio();
        this.ambientElement.loop = true;
        this.ambientElement.volume = 0.18;
      }
      if (this.ambientElement.src !== new URL(ambientUrl, window.location.href).href) {
        this.ambientElement.pause();
        this.ambientElement.src = ambientUrl;
      }
      void this.ambientElement.play().catch(() => {
        // Browser autoplay policy may require a later user gesture; prompt speech remains unchanged.
      });
      return;
    }
    if (!this.context) return;
    this.ambientGain?.disconnect();
    const gain = this.context.createGain();
    gain.gain.value = 0.028;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = level.biome.ambient.cutoff;
    filter.connect(gain);
    gain.connect(this.context.destination);
    [0, 7, 12].forEach((offset, index) => {
      const oscillator = this.context!.createOscillator();
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = level.biome.ambient.root * Math.pow(2, offset / 12);
      oscillator.detune.value = index * 4 - 3;
      oscillator.connect(filter);
      oscillator.start();
    });
    this.ambientGain = gain;
  }

  pause(): void {
    this.ambientElement?.pause();
    void this.context?.suspend();
  }

  resume(level: LevelConfig): void {
    void this.context?.resume();
    this.startAmbient(level);
  }

  play(kind: 'footstep' | 'correct' | 'miss' | 'combo' | 'bluff' | 'complete'): void {
    if (!this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const frequencies = {
      footstep: [92, 0.08],
      correct: [740, 0.26],
      miss: [82, 0.45],
      combo: [920, 0.18],
      bluff: [560, 0.36],
      complete: [392, 0.9],
    } satisfies Record<string, [number, number]>;
    const [freq, duration] = frequencies[kind];
    osc.type = kind === 'miss' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (kind === 'combo') {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'miss' ? 0.08 : 0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
    this.active = osc;
  }

  destroy(): void {
    this.stopActive();
    this.ambientElement?.pause();
    this.ambientElement?.removeAttribute('src');
    this.ambientGain?.disconnect();
    this.ambientGain = null;
    this.ambientElement = null;
    void this.context?.close();
    this.context = null;
  }

  private stopActive(): void {
    try {
      this.active?.stop();
    } catch {
      // Oscillators can only be stopped once.
    }
    this.active = null;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
