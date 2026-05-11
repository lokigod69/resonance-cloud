import type { AudioBackend } from '../shells/runner/audio';

type SpeechSynthesisWindow = Window & {
  speechSynthesis?: SpeechSynthesis;
};

export class RunnerAudio implements AudioBackend {
  private context: AudioContext | null = null;
  private primePromise: Promise<void> | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  async prime(): Promise<void> {
    if (this.context?.state === 'running') return;
    if (this.primePromise) {
      await this.primePromise;
      return;
    }

    this.primePromise = this.createOrResumeContext().finally(() => {
      this.primePromise = null;
    });
    await this.primePromise;
  }

  async speak(word: string, audioUrl?: string, language?: string): Promise<void> {
    await this.prime();
    this.cancel();

    if (audioUrl) {
      const played = await this.playAudioUrl(audioUrl).catch(() => false);
      if (played) return;
    }

    await this.speakWithSynthesis(word, language);
  }

  cancel(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio.load();
      this.currentAudio = null;
    }

    const speechWindow = window as SpeechSynthesisWindow;
    speechWindow.speechSynthesis?.cancel();
    this.currentUtterance = null;
  }

  pause(): void {
    this.currentAudio?.pause();
    const speechWindow = window as SpeechSynthesisWindow;
    speechWindow.speechSynthesis?.pause();
  }

  resume(): void {
    if (this.currentAudio?.paused) {
      void this.currentAudio.play().catch(() => undefined);
    }
    const speechWindow = window as SpeechSynthesisWindow;
    speechWindow.speechSynthesis?.resume();
  }

  private async createOrResumeContext(): Promise<void> {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextCtor();
    }

    if (this.context.state !== 'running') {
      await this.context.resume();
    }
  }

  private async playAudioUrl(audioUrl: string): Promise<boolean> {
    const player = new Audio(audioUrl);
    this.currentAudio = player;
    player.preload = 'auto';

    try {
      await player.play();
    } catch {
      if (this.currentAudio === player) this.currentAudio = null;
      return false;
    }

    return new Promise<boolean>((resolve) => {
      player.onended = () => {
        if (this.currentAudio === player) this.currentAudio = null;
        resolve(true);
      };
      player.onerror = () => {
        if (this.currentAudio === player) this.currentAudio = null;
        resolve(false);
      };
    });
  }

  private async speakWithSynthesis(word: string, language?: string): Promise<void> {
    if (!('SpeechSynthesisUtterance' in window)) return;

    const speechWindow = window as SpeechSynthesisWindow;
    if (!speechWindow.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = language || 'en-US';
    this.currentUtterance = utterance;

    await new Promise<void>((resolve) => {
      utterance.onend = () => {
        if (this.currentUtterance === utterance) this.currentUtterance = null;
        resolve();
      };
      utterance.onerror = () => {
        if (this.currentUtterance === utterance) this.currentUtterance = null;
        resolve();
      };
      speechWindow.speechSynthesis?.speak(utterance);
    });
  }
}
