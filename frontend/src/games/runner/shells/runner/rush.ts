import Phaser from 'phaser';
import {
  SessionEngine,
  type LaneIndex,
  type LevelConfig,
  type PromptWave,
  type SessionStats,
} from '../../engine';
import type { Hud } from '../../ui/hud';
import type { SessionComplete } from '../../ui/sessionComplete';
import { BiomeRenderer } from './biomeRenderer';
import { LaneInput } from './input';
import type { AudioBackend, RunnerSoundscape } from './audio';
import type { RunnerMode } from './mode';
import { decisionThresholdY, laneCenterX, perspectivePoint, runnerLaneX } from './perspective';
import { createPostOverlay, paintPostOverlay } from './postFx';
import {
  cardArtKeyForIndex,
  cardFrame,
  loadProductionAssets,
  productionParticleKeys,
  spiritSheet,
  spiritStill,
} from './productionAssets';
import { levelForStats, runScriptedSession, type RunnerSceneInitData } from './runnerSession';
import { SpiritController } from './SpiritController';
import type { PauseContext } from './types';

type RunnerCard = {
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Image;
  prompt: PromptWave;
  lane: LaneIndex;
  depth: number;
  resolved: boolean;
};

export class RushRunnerScene extends Phaser.Scene {
  private engine!: SessionEngine;
  private hud!: Hud;
  private completeUi!: SessionComplete;
  private audio!: AudioBackend;
  private soundscape!: RunnerSoundscape;
  private levels!: LevelConfig[];
  private mode!: RunnerMode;
  private onSceneReady?: (mode: RunnerMode) => void;
  private onSessionComplete?: (stats: SessionStats) => void;
  private onRestart!: () => void;
  private biome!: BiomeRenderer;
  private post!: Phaser.GameObjects.Graphics;
  private spirit!: SpiritController;
  private runnerLane = 1 as LaneIndex;
  private lanePosition = 1;
  private laneShiftStart = 1;
  private laneShiftElapsed = 0;
  private readonly laneShiftDuration = 305;
  private isLaneShifting = false;
  private cards: RunnerCard[] = [];
  private activePrompt: PromptWave | null = null;
  private cardsSpawned = false;
  private thresholdResolved = false;
  private spawnTimer = 0;
  private missFlash = 0;
  private echoGlow: Phaser.GameObjects.Graphics | null = null;
  private thresholdArc: Phaser.GameObjects.Graphics | null = null;
  private debugVisualLevelIndex: number | null = null;

  constructor() {
    super('RushRunnerScene');
  }

  init(data?: RunnerSceneInitData): void {
    if (!data?.engine) return;
    this.engine = data.engine;
    this.hud = data.hud;
    this.completeUi = data.sessionComplete;
    this.audio = data.audio;
    this.soundscape = data.soundscape;
    this.levels = data.levels;
    this.mode = data.mode;
    this.onSceneReady = data.onSceneReady;
    this.onSessionComplete = data.onSessionComplete;
    this.onRestart = data.onRestart;
  }

  preload(): void {
    loadProductionAssets(this);
  }

  create(): void {
    if (!this.engine || !this.hud || !this.completeUi || !this.audio || !this.soundscape) {
      throw new Error('RushRunnerScene requires injected runner services.');
    }
    this.biome = new BiomeRenderer(this);
    this.biome.create(this.currentLevel());
    this.post = createPostOverlay(this);
    this.createRunner();
    new LaneInput(
      this,
      (lane) => this.selectLane(lane),
      () => {
        this.spawnTimer = Math.max(0, this.spawnTimer - 280);
        this.soundscape.play('footstep');
      },
    ).create();
    this.registry.set('lane', this.runnerLane);
    this.hud.update(this.engine.stats, this.currentLevel().title);
    this.time.delayedCall(700, () => {
      if (!this.activePrompt && !this.engine.stats.complete) {
        this.spawnPrompt();
      }
    });
    this.onSceneReady?.(this.mode);
  }

  async unlockAudio(): Promise<void> {
    await Promise.all([this.audio.prime(), this.soundscape.prime()]);
    this.soundscape.startAmbient(this.engine ? this.currentLevel() : this.levels[0]);
  }

  pauseForMenu(): void {
    this.audio.pause();
    this.soundscape.pause();
  }

  resumeFromMenu(): void {
    this.audio.resume();
    this.soundscape.resume(this.currentLevel());
  }

  getPauseContext(): PauseContext {
    const prompt = this.activePrompt;
    return {
      word: prompt?.target.word ?? 'Between Words',
      translation: prompt?.target.translation ?? 'The next Card is forming.',
      context:
        prompt?.target.exampleGloss ??
        prompt?.target.example ??
        'The path will wait where you left it.',
      levelTitle: this.currentLevel().title,
    };
  }

  update(time: number, delta: number): void {
    const level = this.currentLevel();
    this.biome.update(level, time);
    this.updateRunner(delta, time);
    this.updateCards(delta, time);
    this.updateThresholdArc();
    this.updateProgression();
    this.spawnTimer -= delta;
    this.missFlash = Math.max(0, this.missFlash - delta / 420);
    paintPostOverlay(this.post, this.scale.width, this.scale.height, this.missFlash);

    if (!this.engine.stats.complete && this.spawnTimer <= 0 && !this.activePrompt) {
      this.spawnPrompt();
    }
  }

  private createRunner(): void {
    if (!spiritSheet) {
      throw new Error('Missing production spirit-sheet.png.');
    }
    this.spirit = new SpiritController(
      this,
      spiritSheet.key,
      spiritStill?.key,
      runnerLaneX(this.runnerLane, this.scale.width, this.currentLevel(), this.time.now),
      this.spiritBaseY(),
    );
    this.spirit.idle();
  }

  private spawnPrompt(): void {
    const prompt = {
      ...this.engine.nextPrompt(),
      level: this.currentLevel(),
    };
    this.activePrompt = prompt;
    this.cardsSpawned = false;
    this.thresholdResolved = false;
    this.soundscape.startAmbient(prompt.level);
    void this.audio.speak(prompt.target.word, prompt.target.audioUrl, prompt.target.languageCode);
    this.hud.update(this.engine.stats, prompt.level.title);
    this.spirit.idle();
    this.time.delayedCall(prompt.level.audioToSpawnDelay, () => {
      if (this.activePrompt?.id === prompt.id && !this.cardsSpawned) {
        this.spawnCardsForPrompt(prompt);
      }
    });
  }

  private spawnCardsForPrompt(prompt: PromptWave): void {
    this.cardsSpawned = true;
    this.thresholdResolved = false;
    this.thresholdArc = this.add.graphics();
    this.thresholdArc.setDepth(55);
    prompt.cards.forEach((card) => {
      const container = this.createCard(card.word, prompt.index * 3 + card.lane, prompt.isBluff);
      container.setDepth(18 + card.lane);
      this.cards.push({
        container,
        frame: container.getByName('frame') as Phaser.GameObjects.Image,
        prompt,
        lane: card.lane,
        depth: 1,
        resolved: false,
      });
    });
    if (
      !prompt.isBluff &&
      this.engine.stats.upgrades.some((upgrade) => upgrade.id === 'echo_sense')
    ) {
      this.paintEcho(prompt.correctLane);
    }
  }

  private updateCards(delta: number, time: number): void {
    this.cards.forEach((card) => {
      card.depth -= delta / Math.max(1200, card.prompt.level.cardTravelDuration);
      const point = perspectivePoint(
        card.lane,
        card.depth,
        this.scale.width,
        this.scale.height,
        card.prompt.level,
        time,
      );
      const responsive = Phaser.Math.Clamp(
        Math.min(this.scale.width / 1100, this.scale.height / 780),
        0.42,
        1,
      );
      card.container.setPosition(point.x, point.y);
      card.container.setScale(point.scale * responsive * 0.86);
      card.container.setRotation(
        card.prompt.level.mechanics.tileRotation ? Math.sin(time / 600 + card.lane) * 0.035 : 0,
      );
      card.container.setAlpha(Phaser.Math.Clamp(0.35 + (1 - card.depth) * 1.2, 0.35, 1));
      if (
        card.depth <= 0 &&
        !this.thresholdResolved &&
        !card.resolved &&
        this.activePrompt?.id === card.prompt.id
      ) {
        this.thresholdResolved = true;
        this.resolveAtThreshold();
        card.resolved = true;
      }
      if (card.depth < -0.15) {
        card.container.destroy();
      }
    });
    this.cards = this.cards.filter((card) => card.container.active && card.depth >= -0.15);
  }

  private selectLane(lane: LaneIndex): void {
    const previousLane = this.runnerLane;
    this.runnerLane = lane;
    this.registry.set('lane', lane);
    if (lane !== previousLane) {
      this.startLaneShift(previousLane, lane);
      this.spirit.shift(lane < previousLane ? 'left' : 'right');
      this.paintLaneBreath(lane);
    }
    if (!this.activePrompt || !this.activePrompt.isBluff) return;
    if (lane !== previousLane) {
      this.resolveBluffFail();
    }
  }

  private resolveAtThreshold(): void {
    if (!this.activePrompt) return;
    const x = laneCenterX(this.runnerLane, this.scale.width, this.currentLevel(), this.time.now);
    const y = decisionThresholdY(this.scale.height);
    if (this.activePrompt.isBluff) {
      if (this.runnerLane === 1) {
        this.holdBluff(x, y);
      } else {
        this.resolveBluffFail();
      }
      return;
    }
    if (this.runnerLane === this.activePrompt.correctLane) {
      this.resolveCorrect(x, y);
      return;
    }
    this.resolveWrongLane(x, y);
  }

  private resolveCorrect(x = this.spirit.container.x, y = this.spirit.container.y): void {
    if (!this.activePrompt) return;
    const resolution = this.engine.resolveLane(this.activePrompt.correctLane, this.activePrompt.id);
    this.soundscape.play(resolution.stats.combo % 3 === 0 ? 'combo' : 'correct');
    this.spirit.land();
    this.landingFx(x, y, this.activePrompt.correctLane);
    this.clearPrompt();
    this.afterResolution(resolution.stats);
  }

  private resolveWrongLane(x: number, y: number): void {
    if (!this.activePrompt) return;
    const resolution = this.engine.resolveLane(this.runnerLane, this.activePrompt.id);
    this.soundscape.play('miss');
    this.spirit.fall();
    this.missFlash = 1;
    this.landingFx(x, y, this.runnerLane);
    this.clearPrompt();
    this.afterResolution(resolution.stats);
  }

  private resolveBluffFail(): void {
    if (!this.activePrompt) return;
    const resolution = this.engine.resolveLane(this.runnerLane, this.activePrompt.id);
    this.soundscape.play('miss');
    this.spirit.fall();
    this.missFlash = 1;
    this.clearPrompt();
    this.afterResolution(resolution.stats);
  }

  private holdBluff(x = this.scale.width / 2, y = decisionThresholdY(this.scale.height)): void {
    if (!this.activePrompt) return;
    const resolution = this.engine.resolveBluffHold(this.activePrompt.id);
    this.soundscape.play('bluff');
    this.landingFx(x, y, 1);
    this.clearPrompt();
    this.afterResolution(resolution.stats);
  }

  private afterResolution(stats: SessionStats): void {
    const level = this.currentLevel();
    this.hud.update(stats, level.title);
    this.spawnTimer = stats.complete ? 999999 : level.postWaveDelay;
    this.time.delayedCall(320, () => {
      if (!this.activePrompt && !stats.complete) this.spirit.idle();
    });
    if (stats.complete) {
      this.soundscape.play('complete');
      this.completeUi.show(stats, this.onRestart);
      this.onSessionComplete?.(stats);
    }
  }

  async runScriptedSession(): Promise<void> {
    await runScriptedSession({
      engine: this.engine,
      levels: this.levels,
      hud: this.hud,
      soundscape: this.soundscape,
      sessionComplete: this.completeUi,
      resetVisualState: () => this.clearPrompt(),
      getCurrentLevel: () => this.currentLevel(),
      onRestart: this.onRestart,
      onSessionComplete: this.onSessionComplete,
    });
  }

  setVisualLevel(levelOrder: number): void {
    this.debugVisualLevelIndex = Phaser.Math.Clamp(levelOrder - 1, 0, this.levels.length - 1);
    this.hud.update(this.engine.stats, this.currentLevel().title);
    this.biome.applyLevel(this.currentLevel(), true);
  }

  spawnPromptDebug(): void {
    this.clearPrompt();
    this.spawnTimer = 999999;
    this.spawnPrompt();
  }

  spawnCardsDebug(): void {
    if (this.activePrompt) this.spawnCardsForPrompt(this.activePrompt);
  }

  resolveCorrectDebug(): void {
    this.resolveCorrect();
  }

  holdBluffDebug(): void {
    this.holdBluff();
  }

  stats(): SessionStats {
    return this.engine.stats;
  }

  private clearPrompt(): void {
    this.activePrompt = null;
    this.cardsSpawned = false;
    this.thresholdResolved = false;
    this.echoGlow?.destroy();
    this.echoGlow = null;
    this.thresholdArc?.destroy();
    this.thresholdArc = null;
    this.cards.forEach((card) => {
      this.tweens.add({
        targets: card.container,
        alpha: 0,
        scale: card.container.scale * 0.9,
        duration: 320,
        onComplete: () => card.container.destroy(),
      });
    });
    this.cards = [];
  }

  private updateRunner(delta: number, time: number): void {
    if (this.isLaneShifting) {
      this.laneShiftElapsed += delta;
      const progress = Phaser.Math.Clamp(this.laneShiftElapsed / this.laneShiftDuration, 0, 1);
      const eased = Phaser.Math.Easing.Sine.InOut(progress);
      this.lanePosition = Phaser.Math.Linear(this.laneShiftStart, this.runnerLane, eased);
      if (progress >= 1) {
        this.lanePosition = this.runnerLane;
        this.isLaneShifting = false;
      }
    }
    const level = this.currentLevel();
    const x = runnerLaneX(this.lanePosition, this.scale.width, level, time);
    this.spirit.container.setPosition(x, this.spiritBaseY() + Math.sin(time / 190) * 3);
    this.spirit.update(time);
  }

  private startLaneShift(previousLane: LaneIndex, lane: LaneIndex): void {
    this.laneShiftStart = this.lanePosition;
    this.laneShiftElapsed = 0;
    this.isLaneShifting = true;
    [0, 38, 76, 114, 152].forEach((delay) => {
      this.time.delayedCall(delay, () => {
        if (this.isLaneShifting || this.runnerLane === lane) {
          this.spirit.createAfterimage(this.spirit.container.x, this.spirit.container.y);
        }
      });
    });
    this.lanePosition = Phaser.Math.Clamp(
      this.lanePosition,
      Math.min(previousLane, lane),
      Math.max(previousLane, lane),
    );
  }

  private updateProgression(): void {
    const correct = this.engine.stats.correct;
    this.spirit.setMastery(correct);
  }

  private updateThresholdArc(): void {
    if (!this.thresholdArc || !this.activePrompt || this.cards.length === 0) return;
    const level = this.currentLevel();
    const y = decisionThresholdY(this.scale.height);
    const left = laneCenterX(0, this.scale.width, level, this.time.now);
    const right = laneCenterX(2, this.scale.width, level, this.time.now);
    const width = Math.max(220, right - left + this.scale.width * 0.08);
    this.thresholdArc.clear();
    this.strokeThresholdCurve(this.thresholdArc, width, y, level.laneTint, 5, 0.12);
    this.strokeThresholdCurve(this.thresholdArc, width, y, '#d0f0ff', 1.5, 0.46);
    this.thresholdArc.setAlpha(Phaser.Math.Clamp((1 - this.cards[0].depth) * 1.5, 0.24, 0.82));
  }

  private strokeThresholdCurve(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    y: number,
    color: string,
    thickness: number,
    alpha: number,
  ): void {
    const centerX = this.scale.width / 2;
    const colorValue = Phaser.Display.Color.HexStringToColor(color).color;
    graphics.lineStyle(thickness, colorValue, alpha);
    let previousX = centerX - width / 2;
    let previousY = y + 10;
    for (let step = 1; step <= 32; step += 1) {
      const t = step / 32;
      const x = centerX - width / 2 + width * t;
      const arch = Math.sin(t * Math.PI);
      const nextY = y + 10 - arch * 20;
      graphics.lineBetween(previousX, previousY, x, nextY);
      previousX = x;
      previousY = nextY;
    }
  }

  private createCard(_word: string, index: number, isBluff: boolean): Phaser.GameObjects.Container {
    if (!cardFrame) {
      throw new Error('Missing production card-frame.png.');
    }
    const art = this.add.image(0, 0, cardArtKeyForIndex(index));
    art.setDisplaySize(560, 306);
    art.setAlpha(isBluff ? 0.82 : 0.94);
    const frame = this.add.image(0, 0, cardFrame.key);
    frame.name = 'frame';
    frame.setDisplaySize(640, 360);
    frame.setBlendMode(Phaser.BlendModes.SCREEN);
    const container = this.add.container(this.scale.width / 2, this.scale.height * 0.35, [
      art,
      frame,
    ]);
    container.setAlpha(0.35);
    return container;
  }

  private landingFx(x: number, y: number, lane: LaneIndex): void {
    if (
      productionParticleKeys.breathRing &&
      this.currentLevel().particleConfig.breathRingOnLanding
    ) {
      const ring = this.add.image(x, y + 10, productionParticleKeys.breathRing);
      ring.setDepth(76);
      ring.setAlpha(0.72);
      ring.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: ring,
        scale: 1.8,
        alpha: 0,
        duration: 920,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
    this.spawnSnowflakes(x, y - 20, 8);
    this.paintLaneBreath(lane);
  }

  private spawnSnowflakes(x: number, y: number, count: number): void {
    const key = productionParticleKeys.snowflake;
    if (!key) return;
    for (let index = 0; index < count; index += 1) {
      const flake = this.add.image(x + (Math.random() - 0.5) * 64, y, key);
      flake.setDepth(82);
      flake.setAlpha(0.78);
      flake.setScale(0.18 + Math.random() * 0.28);
      flake.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: flake,
        x: flake.x + (Math.random() - 0.5) * 60,
        y: flake.y + 170 + Math.random() * 35,
        rotation: flake.rotation + Math.PI * (0.7 + Math.random()),
        alpha: 0,
        duration: 2000,
        ease: 'Sine.easeOut',
        onComplete: () => flake.destroy(),
      });
    }
  }

  private paintLaneBreath(lane: LaneIndex): void {
    const level = this.currentLevel();
    const x = laneCenterX(lane, this.scale.width, level, this.time.now);
    const glow = this.add.graphics();
    glow.setDepth(14);
    glow.fillStyle(Phaser.Display.Color.HexStringToColor(level.laneTint).color, 0.14);
    glow.fillEllipse(
      x,
      decisionThresholdY(this.scale.height),
      this.scale.width * 0.2,
      this.scale.height * 0.28,
    );
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 1.25,
      duration: 360,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    });
  }

  private paintEcho(lane: LaneIndex): void {
    this.echoGlow?.destroy();
    this.echoGlow = this.add.graphics();
    this.echoGlow.setDepth(3);
    const x = laneCenterX(lane, this.scale.width, this.currentLevel(), this.time.now);
    this.echoGlow.fillStyle(
      Phaser.Display.Color.HexStringToColor(this.currentLevel().laneTint).color,
      0.12,
    );
    this.echoGlow.fillEllipse(
      x,
      decisionThresholdY(this.scale.height),
      this.scale.width * 0.16,
      this.scale.height * 0.22,
    );
    this.tweens.add({ targets: this.echoGlow, alpha: 0, duration: 900 });
  }

  private currentLevel() {
    return levelForStats(this.levels, this.engine?.stats, this.debugVisualLevelIndex);
  }

  private spiritBaseY(): number {
    return this.spirit?.baseAlignedY(this.scale.height) ?? this.scale.height * 0.56;
  }
}
