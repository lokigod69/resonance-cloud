import Phaser from 'phaser';
import {
  SessionEngine,
  type LaneIndex,
  type LevelConfig,
  type PromptCard,
  type PromptWave,
  type SessionStats,
} from '../../engine';
import type { Hud } from '../../ui/hud';
import type { SessionComplete } from '../../ui/sessionComplete';
import type { AudioBackend, RunnerSoundscape } from './audio';
import { BiomeRenderer } from './biomeRenderer';
import { isTextEntryKeyTarget } from './input';
import { glideDecisionTimerMs, type RunnerMode } from './mode';
import { decisionThresholdY, laneCenterFromEdgesX, laneCenterX, runnerLaneX } from './perspective';
import { createPostOverlay, paintPostOverlay } from './postFx';
import {
  cardArtKeyForIndex,
  cardFrame,
  loadProductionAssets,
  productionParticleKeys,
  spiritSheet,
  spiritStill,
} from './productionAssets';
import {
  levelForStats,
  runScriptedSession,
  type RunnerCardDisplayMode,
  type RunnerSceneInitData,
} from './runnerSession';
import { SpiritController } from './SpiritController';
import type { PauseContext } from './types';

type GlidePhase =
  | 'waiting'
  | 'audio'
  | 'travelling'
  | 'parked'
  | 'committing'
  | 'resolving'
  | 'complete';

type GlideCard = {
  glow: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Graphics;
  maskShape: Phaser.GameObjects.Graphics;
  mask?: Phaser.Display.Masks.GeometryMask;
  art?: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  frame?: Phaser.GameObjects.Image;
  promptCard: PromptCard;
  prompt: PromptWave;
  lane: LaneIndex;
  progress: number;
  parked: boolean;
  selected: boolean;
  committed: boolean;
  correct: boolean;
  wrong: boolean;
  feedbackStartedAt: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
};

const CARD_SPAWN_DELAY = 1000;
const CARD_TRAVEL_MS = 1750;
const CARD_PARK_PROGRESS = 0.78;
const CARD_PARK_Y = 0.58;
const POST_WAVE_DELAY = 1500;
const GLIDE_EASY_DECISION_TIMER_MS = 60 * 60 * 1000;
const RESOLUTION_HOLD_MS = 850;

export class GlideRunnerScene extends Phaser.Scene {
  private engine!: SessionEngine;
  private hud!: Hud;
  private completeUi!: SessionComplete;
  private audio!: AudioBackend;
  private soundscape!: RunnerSoundscape;
  private levels!: LevelConfig[];
  private mode!: RunnerMode;
  private displayMode: RunnerCardDisplayMode = 'image';
  private onSceneReady?: (mode: RunnerMode) => void;
  private onSessionComplete?: (stats: SessionStats) => void;
  private onRestart!: () => void;
  private biome!: BiomeRenderer;
  private post!: Phaser.GameObjects.Graphics;
  private spirit!: SpiritController;
  private activePrompt: PromptWave | null = null;
  private cards: GlideCard[] = [];
  private phase: GlidePhase = 'waiting';
  private selectedLane = 1 as LaneIndex;
  private spawnTimer = 0;
  private decisionTimerMs = 0;
  private decisionRemainingMs = 0;
  private missFlash = 0;
  private debugVisualLevelIndex: number | null = null;
  private keyboardHandler?: (event: KeyboardEvent) => void;
  private spiritLanePosition = 1;
  private spiritLaneShiftStart = 1;
  private spiritLaneShiftElapsed = 0;
  private readonly spiritLaneShiftDuration = 260;
  private isSpiritLaneShifting = false;

  constructor() {
    super('GlideRunnerScene');
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
    this.displayMode = data.displayMode ?? 'image';
    this.onSceneReady = data.onSceneReady;
    this.onSessionComplete = data.onSessionComplete;
    this.onRestart = data.onRestart;
  }

  preload(): void {
    loadProductionAssets(this);
  }

  create(): void {
    if (!this.engine || !this.hud || !this.completeUi || !this.audio || !this.soundscape) {
      throw new Error('GlideRunnerScene requires injected runner services.');
    }
    this.biome = new BiomeRenderer(this);
    this.biome.create(this.currentLevel());
    this.post = createPostOverlay(this);
    this.createRunner();
    this.registerInput();
    this.hud.update(this.engine.stats, this.currentLevel().title);
    this.hud.updateDecisionTimer(1, false);
    this.time.delayedCall(700, () => {
      if (!this.activePrompt && !this.engine.stats.complete) this.spawnPrompt();
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
    this.updateSpirit(time, delta);
    this.updateCards(delta, time);
    this.updateWaveTimers(delta);
    this.missFlash = Math.max(0, this.missFlash - delta / 420);
    paintPostOverlay(this.post, this.scale.width, this.scale.height, this.missFlash);

    if (!this.activePrompt && this.spawnTimer > 0) {
      this.spawnTimer -= delta;
    }
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
      runnerLaneX(1, this.scale.width, this.currentLevel(), this.time.now),
      this.scale.height * 0.56,
    );
    this.spirit.container.setPosition(
      runnerLaneX(1, this.scale.width, this.currentLevel(), this.time.now),
      this.spiritBaseY(),
    );
    this.spirit.idle();
  }

  private registerInput(): void {
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (isTextEntryKeyTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') {
        event.preventDefault();
        this.shiftSelection(-1);
        return;
      }
      if (key === 'd' || key === 'arrowright') {
        event.preventDefault();
        this.shiftSelection(1);
        return;
      }
      if (key === ' ' || key === 'w') {
        event.preventDefault();
        this.commitSelectedLane();
      }
    };
    window.addEventListener('keydown', this.keyboardHandler, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) {
        window.removeEventListener('keydown', this.keyboardHandler, true);
        this.keyboardHandler = undefined;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'parked') return;
      const point = this.pointerCanvasPoint(pointer);
      const target = this.cardAtPoint(point.x, point.y);
      if (!target) return;
      this.commitLane(target.lane);
    });
  }

  private spawnPrompt(): void {
    const prompt = {
      ...this.engine.nextPrompt(),
      level: this.currentLevel(),
    };
    this.activePrompt = prompt;
    this.phase = 'audio';
    this.selectedLane = 1;
    this.resetSpiritLane();
    this.decisionTimerMs = this.mode === 'glide'
      ? GLIDE_EASY_DECISION_TIMER_MS
      : glideDecisionTimerMs(prompt.level);
    this.decisionRemainingMs = this.decisionTimerMs;
    this.soundscape.startAmbient(prompt.level);
    void this.audio.speak(prompt.target.word, prompt.target.audioUrl, prompt.target.languageCode);
    this.hud.update(this.engine.stats, prompt.level.title);
    this.hud.updateDecisionTimer(1, false);
    this.time.delayedCall(CARD_SPAWN_DELAY, () => {
      if (this.activePrompt?.id === prompt.id && this.phase === 'audio') {
        this.spawnCardsForPrompt(prompt);
      }
    });
  }

  private spawnCardsForPrompt(prompt: PromptWave): void {
    this.phase = 'travelling';
    this.clearCards();
    prompt.cards.forEach((promptCard) => {
      const card = this.createCardObject(prompt.index * 3 + promptCard.lane, promptCard);
      this.cards.push({
        ...card,
        promptCard,
        prompt,
        lane: promptCard.lane,
        progress: 0,
        parked: false,
        selected: false,
        committed: false,
        correct: false,
        wrong: false,
        feedbackStartedAt: null,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    });
  }

  private createCardObject(
    index: number,
    promptCard: PromptCard,
  ): Pick<GlideCard, 'glow' | 'shadow' | 'maskShape' | 'mask' | 'art' | 'label' | 'frame'> {
    const lane = promptCard.lane;
    const depth = 34 + lane;
    const glow = this.add.graphics();
    glow.setDepth(depth + 0.1);
    const shadow = this.add.graphics();
    shadow.setDepth(depth);
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    const isImageMode = this.displayMode === 'image';
    let mask: Phaser.Display.Masks.GeometryMask | undefined;
    let art: Phaser.GameObjects.Image | undefined;
    if (isImageMode) {
      mask = maskShape.createGeometryMask();
      art = this.add.image(0, 0, cardArtKeyForIndex(index));
      art.setDepth(depth + 0.2);
      art.setOrigin(0.5);
      art.setMask(mask);
    }
    const label = !isImageMode
      ? this.add.text(0, 0, promptCard.word, {
        align: 'center',
        color: '#d0f0ff',
        fontFamily: 'Outfit, Inter, sans-serif',
        fontStyle: '700',
        stroke: '#071827',
        strokeThickness: 5,
      })
      : undefined;
    label?.setDepth(depth + 0.35);
    label?.setOrigin(0.5);
    const frame = cardFrame ? this.add.image(0, 0, cardFrame.key) : undefined;
    if (frame) {
      frame.setDepth(depth + 0.3);
      frame.setOrigin(0.5);
      frame.setBlendMode(Phaser.BlendModes.SCREEN);
    }
    return { glow, shadow, maskShape, mask, art, label, frame };
  }

  private updateCards(delta: number, time: number): void {
    if (this.cards.length === 0) return;
    let allParked = true;
    this.cards.forEach((card) => {
      if (!card.parked) {
        card.progress = Math.min(1, card.progress + delta / CARD_TRAVEL_MS);
        if (card.progress >= 1) card.parked = true;
      }
      allParked = allParked && card.parked;
      this.positionCard(card, time);
    });
    if (allParked && this.phase === 'travelling') {
      this.phase = 'parked';
      this.decisionRemainingMs = this.decisionTimerMs;
      this.updateSelectionStyles();
      this.hud.updateDecisionTimer(1, true);
    }
  }

  private positionCard(card: GlideCard, time: number): void {
    const eased = Phaser.Math.Easing.Cubic.Out(card.progress);
    const trackProgress = CARD_PARK_PROGRESS * eased;
    const level = this.currentLevel();
    const x = laneCenterFromEdgesX(card.lane, trackProgress, this.scale.width, level, time);
    const horizonY = this.scale.height * 0.35;
    const parkY = this.scale.width < 640 ? 0.56 : CARD_PARK_Y;
    const y = horizonY + (this.scale.height * parkY - horizonY) * eased;
    const responsive = Phaser.Math.Clamp(
      Math.min(this.scale.width / 1100, this.scale.height / 780),
      0.45,
      1,
    );
    const cardFinalWidth = this.scale.width < 640
      ? Phaser.Math.Clamp(this.scale.width * 0.2, 64, 84)
      : Math.min(this.scale.width * 0.135, this.scale.height * 0.25) * responsive;
    const perspectiveScale = 0.18 + eased * 0.82;
    const cardWidth = cardFinalWidth * perspectiveScale;
    const cardHeight = cardWidth * 0.5625;
    const feedbackAge = card.feedbackStartedAt === null ? null : time - card.feedbackStartedAt;
    const shake = card.wrong && feedbackAge !== null && feedbackAge < 440
      ? Math.sin(feedbackAge / 28) * 8 * (1 - feedbackAge / 440)
      : 0;
    const dissolve = card.correct && feedbackAge !== null
      ? Phaser.Math.Clamp((feedbackAge - 120) / 460, 0, 1)
      : 0;
    const selectionPulse =
      card.selected && this.phase === 'parked' ? 1.035 + Math.sin(time / 175) * 0.015 : 1;
    const commitPulse = card.committed && this.phase === 'committing'
      ? 1.04 + Math.sin(time / 70) * 0.018
      : 1;
    card.x = x + shake;
    card.y = y;
    card.width = cardWidth * selectionPulse * commitPulse * (1 + dissolve * 0.08);
    card.height = cardHeight * selectionPulse * commitPulse * (1 + dissolve * 0.08);
    const alpha = card.wrong ? 0.72 : 0.38 + eased * 0.62;
    const resolvedAlpha = card.correct ? 1 - dissolve : alpha;
    card.art?.setPosition(card.x, y);
    card.art?.setDisplaySize(card.width, card.height);
    card.art?.setAlpha(card.wrong ? 0.92 : card.committed ? resolvedAlpha : alpha);
    if (card.label) {
      card.label.setPosition(card.x, y);
      card.label.setFontSize(Math.max(18, Math.round(card.height * 0.28)));
      card.label.setWordWrapWidth(card.width * 0.78);
      card.label.setAlpha(card.wrong ? 0.92 : card.committed ? resolvedAlpha : alpha);
    }
    card.frame?.setPosition(card.x, y);
    card.frame?.setDisplaySize(card.width * 1.08, card.height * 1.08);
    card.frame?.setAlpha(card.wrong ? 0.96 : (card.committed ? resolvedAlpha : alpha) * 0.95);
    this.setCardDepth(card, card.committed ? 68 + card.lane : 34 + card.lane);
    this.drawCardShape(card, card.width, card.height);
  }

  private setCardDepth(card: GlideCard, depth: number): void {
    card.shadow.setDepth(depth);
    card.glow.setDepth(depth + 0.1);
    card.art?.setDepth(depth + 0.2);
    card.frame?.setDepth(depth + 0.35);
    card.label?.setDepth(depth + 0.45);
  }

  private drawCardShape(
    card: GlideCard,
    width: number,
    height: number,
  ): void {
    const topWidth = width;
    const topShift = 0;
    const points = {
      bottomLeft: new Phaser.Math.Vector2(-width / 2, height / 2),
      bottomRight: new Phaser.Math.Vector2(width / 2, height / 2),
      topLeft: new Phaser.Math.Vector2(-topWidth / 2 + topShift, -height / 2),
      topRight: new Phaser.Math.Vector2(topWidth / 2 + topShift, -height / 2),
    };
    card.maskShape.clear();
    card.maskShape.fillStyle(0xffffff, 1);
    card.maskShape.beginPath();
    card.maskShape.moveTo(card.x + points.topLeft.x, card.y + points.topLeft.y);
    card.maskShape.lineTo(card.x + points.topRight.x, card.y + points.topRight.y);
    card.maskShape.lineTo(card.x + points.bottomRight.x, card.y + points.bottomRight.y);
    card.maskShape.lineTo(card.x + points.bottomLeft.x, card.y + points.bottomLeft.y);
    card.maskShape.closePath();
    card.maskShape.fillPath();
    this.drawCardGraphics(card, points);
  }

  private drawCardGraphics(
    card: GlideCard,
    points: {
      bottomLeft: Phaser.Math.Vector2;
      bottomRight: Phaser.Math.Vector2;
      topLeft: Phaser.Math.Vector2;
      topRight: Phaser.Math.Vector2;
    },
  ): void {
    card.shadow.clear();
    card.shadow.fillStyle(0x0f2337, card.wrong ? 0.74 : 0.46);
    card.shadow.lineStyle(1, card.wrong ? 0xcf6c89 : 0xa8d8ea, card.selected ? 0.72 : 0.34);
    card.shadow.beginPath();
    card.shadow.moveTo(card.x + points.topLeft.x, card.y + points.topLeft.y);
    card.shadow.lineTo(card.x + points.topRight.x, card.y + points.topRight.y);
    card.shadow.lineTo(card.x + points.bottomRight.x, card.y + points.bottomRight.y);
    card.shadow.lineTo(card.x + points.bottomLeft.x, card.y + points.bottomLeft.y);
    card.shadow.closePath();
    card.shadow.fillPath();
    card.shadow.strokePath();

    card.glow.clear();
    if (card.selected || card.committed || card.correct || card.wrong) {
      const color = card.wrong ? 0xcf6c89 : 0xd0f0ff;
      const alpha = card.selected ? 0.28 : card.correct ? 0.34 : 0.2;
      card.glow.fillStyle(color, alpha);
      card.glow.lineStyle(2, color, card.selected ? 0.7 : 0.42);
      card.glow.fillPoints(
        [
          new Phaser.Math.Vector2(card.x + points.topLeft.x, card.y + points.topLeft.y),
          new Phaser.Math.Vector2(card.x + points.topRight.x, card.y + points.topRight.y),
          new Phaser.Math.Vector2(card.x + points.bottomRight.x, card.y + points.bottomRight.y),
          new Phaser.Math.Vector2(card.x + points.bottomLeft.x, card.y + points.bottomLeft.y),
        ],
        true,
        true,
      );
      card.glow.strokePoints(
        [
          new Phaser.Math.Vector2(card.x + points.topLeft.x, card.y + points.topLeft.y),
          new Phaser.Math.Vector2(card.x + points.topRight.x, card.y + points.topRight.y),
          new Phaser.Math.Vector2(card.x + points.bottomRight.x, card.y + points.bottomRight.y),
          new Phaser.Math.Vector2(card.x + points.bottomLeft.x, card.y + points.bottomLeft.y),
        ],
        true,
        true,
      );
    }
  }

  private updateWaveTimers(delta: number): void {
    if (this.phase !== 'parked' || !this.activePrompt) return;
    this.decisionRemainingMs = Math.max(0, this.decisionRemainingMs - delta);
    this.hud.updateDecisionTimer(this.decisionRemainingMs / this.decisionTimerMs, true);
    if (this.decisionRemainingMs <= 0) {
      this.resolveTimeout();
    }
  }

  private shiftSelection(delta: -1 | 1): void {
    if (this.phase !== 'parked') return;
    const previousLane = this.selectedLane;
    this.selectedLane = Phaser.Math.Clamp(this.selectedLane + delta, 0, 2) as LaneIndex;
    if (this.selectedLane === previousLane) return;
    this.startSpiritLaneShift(previousLane, this.selectedLane);
    this.spirit.shift(this.selectedLane < previousLane ? 'left' : 'right');
    this.updateSelectionStyles();
    this.paintLaneBreath(this.selectedLane);
  }

  private updateSelectionStyles(): void {
    this.cards.forEach((card) => {
      card.selected = card.lane === this.selectedLane && this.phase === 'parked';
    });
  }

  private commitLane(lane: LaneIndex): void {
    this.selectedLane = lane;
    this.updateSelectionStyles();
    this.commitSelectedLane();
  }

  private cardAtPoint(x: number, y: number): GlideCard | undefined {
    return this.cards.find((card) => (
      x >= card.x - card.width / 2 &&
      x <= card.x + card.width / 2 &&
      y >= card.y - card.height / 2 &&
      y <= card.y + card.height / 2
    ));
  }

  private pointerCanvasPoint(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const event = pointer.event;
    if (event instanceof PointerEvent || event instanceof MouseEvent) {
      const rect = this.game.canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
    return { x: pointer.x, y: pointer.y };
  }

  private startSpiritLaneShift(previousLane: LaneIndex, lane: LaneIndex): void {
    this.spiritLaneShiftStart = this.spiritLanePosition;
    this.spiritLaneShiftElapsed = 0;
    this.isSpiritLaneShifting = true;
    this.spiritLanePosition = Phaser.Math.Clamp(
      this.spiritLanePosition,
      Math.min(previousLane, lane),
      Math.max(previousLane, lane),
    );
  }

  private resetSpiritLane(): void {
    this.spiritLanePosition = 1;
    this.spiritLaneShiftStart = 1;
    this.spiritLaneShiftElapsed = 0;
    this.isSpiritLaneShifting = false;
  }

  private commitSelectedLane(): void {
    if (this.phase !== 'parked' || !this.activePrompt) return;
    const target = this.cards.find((card) => card.lane === this.selectedLane);
    if (!target) return;
    this.phase = 'committing';
    this.hud.updateDecisionTimer(0, false);
    this.cards.forEach((card) => {
      card.committed = card === target;
      card.selected = false;
    });
    const targetX = target.x;
    const targetY = target.y + target.height * 0.56;
    this.spirit.run();
    [90, 180, 270, 360].forEach((delay) => {
      this.time.delayedCall(delay, () => {
        if (this.phase === 'committing') {
          this.spirit.createAfterimage(this.spirit.container.x, this.spirit.container.y);
        }
      });
    });
    this.tweens.add({
      targets: this.spirit.container,
      x: targetX,
      y: targetY,
      scale: 1.04,
      duration: 620,
      ease: 'Cubic.easeInOut',
      onComplete: () => this.resolveCommittedLane(target),
    });
  }

  private resolveCommittedLane(target: GlideCard): void {
    if (!this.activePrompt) return;
    this.phase = 'resolving';
    target.feedbackStartedAt = this.time.now;
    const resolution = this.engine.resolveLane(this.selectedLane, this.activePrompt.id);
    if (target.promptCard.isCorrect && !target.prompt.isBluff) {
      this.soundscape.play(resolution.stats.combo % 3 === 0 ? 'combo' : 'correct');
      this.spirit.land();
      this.cardBurst(target);
    } else {
      this.soundscape.play('miss');
      this.spirit.fall();
      this.missFlash = 1;
      target.wrong = true;
    }
    this.finishWave(resolution.stats);
  }

  private resolveTimeout(): void {
    if (!this.activePrompt || this.phase !== 'parked') return;
    this.phase = 'resolving';
    const resolution = this.engine.resolveMissedTiming(this.activePrompt.id);
    this.soundscape.play('miss');
    this.missFlash = 1;
    this.finishWave(resolution.stats);
  }

  private resolveBluffHold(): void {
    if (!this.activePrompt) return;
    const resolution = this.engine.resolveBluffHold(this.activePrompt.id);
    this.soundscape.play('bluff');
    this.finishWave(resolution.stats);
  }

  resolveCorrectDebug(): void {
    if (!this.activePrompt) return;
    this.selectedLane = this.activePrompt.correctLane;
    this.updateSelectionStyles();
    this.commitSelectedLane();
  }

  private finishWave(stats: SessionStats): void {
    this.hud.update(stats, this.currentLevel().title);
    if (stats.complete) {
      this.phase = 'complete';
      this.soundscape.play('complete');
      this.completeUi.show(stats, this.onRestart);
      this.onSessionComplete?.(stats);
      return;
    }
    this.time.delayedCall(RESOLUTION_HOLD_MS, () => {
      this.returnSpiritToCenter();
      this.clearCards();
      this.activePrompt = null;
      this.phase = 'waiting';
      this.spawnTimer = POST_WAVE_DELAY;
      this.spirit.idle();
    });
  }

  private returnSpiritToCenter(): void {
    this.resetSpiritLane();
    this.tweens.add({
      targets: this.spirit.container,
      x: runnerLaneX(1, this.scale.width, this.currentLevel(), this.time.now),
      y: this.spiritBaseY(),
      scale: 1,
      duration: 420,
      ease: 'Sine.easeInOut',
    });
  }

  async runScriptedSession(): Promise<void> {
    await runScriptedSession({
      engine: this.engine,
      levels: this.levels,
      hud: this.hud,
      soundscape: this.soundscape,
      sessionComplete: this.completeUi,
      resetVisualState: () => this.clearCards(),
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
    this.clearCards();
    this.spawnTimer = 999999;
    this.spawnPrompt();
  }

  spawnCardsDebug(): void {
    if (this.activePrompt) this.spawnCardsForPrompt(this.activePrompt);
  }

  commitSelectedDebug(): void {
    this.commitSelectedLane();
  }

  holdBluffDebug(): void {
    this.resolveBluffHold();
  }

  stats(): SessionStats {
    return this.engine.stats;
  }

  private clearCards(): void {
    this.cards.forEach((card) => {
      card.art?.clearMask(true);
      card.frame?.clearMask(false);
      card.maskShape.destroy();
      card.shadow.destroy();
      card.glow.destroy();
      card.art?.destroy();
      card.label?.destroy();
      card.frame?.destroy();
    });
    this.cards = [];
    this.hud?.updateDecisionTimer(0, false);
  }

  private updateSpirit(time: number, delta: number): void {
    if (this.phase === 'committing' || this.phase === 'resolving') return;
    if (this.phase === 'parked' && this.isSpiritLaneShifting) {
      this.spiritLaneShiftElapsed += delta;
      const progress = Phaser.Math.Clamp(this.spiritLaneShiftElapsed / this.spiritLaneShiftDuration, 0, 1);
      const eased = Phaser.Math.Easing.Sine.InOut(progress);
      this.spiritLanePosition = Phaser.Math.Linear(this.spiritLaneShiftStart, this.selectedLane, eased);
      if (progress >= 1) {
        this.spiritLanePosition = this.selectedLane;
        this.isSpiritLaneShifting = false;
      }
    } else if (this.phase !== 'parked') {
      this.resetSpiritLane();
    }
    const lanePosition = this.phase === 'parked' ? this.spiritLanePosition : 1;
    const x = runnerLaneX(lanePosition, this.scale.width, this.currentLevel(), time);
    this.spirit.container.setPosition(x, this.spiritBaseY() + Math.sin(time / 230) * 3);
    this.spirit.update(time);
  }

  private cardBurst(card: GlideCard): void {
    const x = card.x;
    const y = card.y;
    card.correct = true;
    this.spawnSnowflakes(x, y, 12);
    if (productionParticleKeys.breathRing) {
      const ring = this.add.image(x, y, productionParticleKeys.breathRing);
      ring.setDepth(78);
      ring.setAlpha(0.66);
      ring.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: ring,
        scale: 1.55,
        alpha: 0,
        duration: 760,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private spawnSnowflakes(x: number, y: number, count: number): void {
    const key = productionParticleKeys.snowflake;
    if (!key) return;
    for (let index = 0; index < count; index += 1) {
      const flake = this.add.image(x + (Math.random() - 0.5) * 76, y, key);
      flake.setDepth(82);
      flake.setAlpha(0.82);
      flake.setScale(0.18 + Math.random() * 0.28);
      flake.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: flake,
        x: flake.x + (Math.random() - 0.5) * 70,
        y: flake.y + 150 + Math.random() * 40,
        rotation: flake.rotation + Math.PI * (0.7 + Math.random()),
        alpha: 0,
        duration: 1800,
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
    glow.fillStyle(Phaser.Display.Color.HexStringToColor(level.laneTint).color, 0.12);
    glow.fillEllipse(
      x,
      decisionThresholdY(this.scale.height),
      this.scale.width * 0.18,
      this.scale.height * 0.22,
    );
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 1.2,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    });
  }

  private spiritBaseY(): number {
    return this.spirit?.baseAlignedY(this.scale.height) ?? this.scale.height * 0.56;
  }

  private currentLevel() {
    return levelForStats(this.levels, this.engine?.stats, this.debugVisualLevelIndex);
  }
}
