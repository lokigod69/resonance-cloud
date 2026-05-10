import Phaser from 'phaser';
import { deckMode, resolveCardContent, resolvePrompt, type ResolvedPrompt } from '../engine/cardContent';
import type { CardContent, DeckDefinition, DeckMode, DeckWord, LevelConfig, SessionStats } from '../engine/types';
import type { GameEventBus } from '../../shared/GameEventBus';
import { allLevels } from './levels';
import {
  EMBER_ASSET_KEYS,
  getAmbientParticleTiers,
  getEmberFxConfig,
  listEmberPreloadAssets,
  type AmbientParticleTier,
} from './emberAssets';
import { SlicerAudio } from './audio';
import { BackgroundLayer } from './BackgroundLayer';
import { segmentIntersectsRect } from './slicePhysics';

type FallingCard = Phaser.GameObjects.Container & {
  id: string;
  word?: DeckWord;
  isTarget: boolean;
  isBomb: boolean;
  resolved: boolean;
  frame: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  content?: CardContent;
  labelMetrics?: { fontSize: number; width: number; height: number; lines: number };
  moteEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  fallTween?: Phaser.Tweens.Tween;
};

type SlicerSceneData = {
  deck: DeckDefinition;
  bus: GameEventBus;
  primeAudioOnGesture: () => Promise<void>;
  onExit?: () => void;
  onSceneReady?: () => void;
};

export type SceneHost = SlicerSceneData;

type SliceFxContext = {
  point: Phaser.Math.Vector2;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  mastered: boolean;
};

type RoundDifficulty = {
  spawnEveryMs: number;
  fallMs: number;
  bombs: number;
};

type AttemptCardKind = 'target' | 'distractor' | 'bomb';

type DebugState = {
  deckId: string;
  roundNumber: number;
  biome: string;
  wordsPerRound: number;
  resolvedWords: number;
  currentTarget?: string;
  lives: number;
  score: number;
  combo: number;
  isComplete: boolean;
  rendererDpr: number;
  deckMode: DeckMode;
  cardProgress: string;
  visibleBiome: string;
  lastPointerBurst?: { x: number; y: number; count: number };
  lastSpoken?: { text: string; lang: string; voice?: string };
  inputSuppressed: boolean;
  activeTrailCount: number;
  ambientTiers: AmbientParticleTier[];
  activeCards: Array<{
    id: string;
    word?: string;
    content?: CardContent;
    labelMetrics?: { fontSize: number; width: number; height: number; lines: number };
    y: number;
    x: number;
    width: number;
    height: number;
    isTarget: boolean;
    isBomb: boolean;
  }>;
};

const ROUND_DIFFICULTY: RoundDifficulty[] = [
  { spawnEveryMs: 3500, fallMs: 6000, bombs: 0 },
  { spawnEveryMs: 3500, fallMs: 6000, bombs: 0 },
  { spawnEveryMs: 3500, fallMs: 6000, bombs: 0 },
  { spawnEveryMs: 2800, fallMs: 5500, bombs: 1 },
  { spawnEveryMs: 2800, fallMs: 5500, bombs: 1 },
  { spawnEveryMs: 2800, fallMs: 5500, bombs: 1 },
  { spawnEveryMs: 2200, fallMs: 4500, bombs: 2 },
  { spawnEveryMs: 2200, fallMs: 4500, bombs: 2 },
  { spawnEveryMs: 2200, fallMs: 4500, bombs: 2 },
  { spawnEveryMs: 1800, fallMs: 4000, bombs: 3 },
];

export class SlicerScene extends Phaser.Scene {
  private deck!: DeckDefinition;
  private bus!: GameEventBus;
  private primeAudioOnGesture: () => Promise<void> = () => Promise.resolve();
  private onExit?: () => void;
  private onSceneReady?: () => void;
  private readonly audio = new SlicerAudio();
  private readonly voicesReady = SlicerScene.loadVoices();
  private htmlAudio?: HTMLAudioElement;
  private activeCards: FallingCard[] = [];
  private ambientEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private backgroundLayer?: BackgroundLayer;
  private trailImages: Phaser.GameObjects.Image[] = [];
  private trailPoints: Phaser.Math.Vector2[] = [];
  private lastPointer?: Phaser.Math.Vector2;
  private lastSliceFx?: SliceFxContext;
  private currentTarget?: DeckWord;
  private currentRoundWords: DeckWord[] = [];
  private roundNumber = 1;
  private roundWordIndex = 0;
  private bombsRemaining = 0;
  private lives = 3;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private stats: SessionStats = SlicerScene.emptyStats();
  private isComplete = false;
  private testMode = false;
  private reducedMotion = false;
  private paused = false;
  private transitioning = false;
  private rendererDpr = 1;
  private visibleBiome = '';
  private lastPointerBurst?: { x: number; y: number; count: number };
  private lastSpoken?: { text: string; lang: string; voice?: string };
  private spawnTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('slicer');
  }

  init(data: SlicerSceneData): void {
    this.deck = data.deck;
    this.bus = data.bus;
    this.primeAudioOnGesture = data.primeAudioOnGesture;
    this.onExit = data.onExit;
    this.onSceneReady = data.onSceneReady;
  }

  preload(): void {
    for (const [key, path] of listEmberPreloadAssets()) {
      if (key === EMBER_ASSET_KEYS.cardCutSheet) {
        this.load.spritesheet(key, path, { frameWidth: 640, frameHeight: 360 });
      } else if (key === EMBER_ASSET_KEYS.sparkBurstSheet) {
        this.load.spritesheet(key, path, { frameWidth: 256, frameHeight: 256 });
      } else if (key === EMBER_ASSET_KEYS.bombExplosionSheet) {
        this.load.spritesheet(key, path, { frameWidth: 512, frameHeight: 512 });
      } else {
        this.load.image(key, path);
      }
    }

    const deckImageUrls = new Set<string>();
    for (const word of this.deck.words) {
      if (word.imageUrl) deckImageUrls.add(word.imageUrl);
    }
    for (const url of deckImageUrls) {
      if (!this.textures.exists(url)) {
        this.load.image(url, url);
      }
    }
  }

  create(): void {
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', (event) => {
      this.reducedMotion = event.matches;
      this.redrawBiome();
    });
    this.createAnimations();
    this.backgroundLayer = new BackgroundLayer(this);
    this.audio.setTelemetry(() => undefined);
    this.rendererDpr = Math.max(1, window.devicePixelRatio || 1);
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => void this.beginSwipe(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveSwipe(pointer));
    this.input.on('pointerup', () => this.endSwipe());
    this.input.keyboard?.on('keydown-ESC', () => this.onExit?.());
    this.scale.on('resize', () => this.resizeScene());
    this.startSession();
    this.onSceneReady?.();
  }

  isReadyForScriptedSession(): boolean {
    return Boolean(this.deck && !this.isComplete);
  }

  pauseSession(): void {
    if (this.paused) return;
    this.paused = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    this.ambientEmitters.forEach((emitter) => emitter.pause());
  }

  resumeSession(): void {
    if (!this.paused) return;
    this.paused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.ambientEmitters.forEach((emitter) => emitter.resume());
  }

  debugPause(): void {
    this.pauseSession();
  }

  debugResume(): void {
    this.resumeSession();
  }

  debugSliceCurrentTarget(): void {
    const target = this.activeCards.find((card) => card.isTarget);
    if (!target) return;
    this.lastSliceFx = {
      point: new Phaser.Math.Vector2(target.x, target.y),
      cardX: target.x,
      cardY: target.y,
      cardWidth: target.width,
      cardHeight: target.height,
      mastered: Boolean(target.word?.mastered),
    };
    this.resolveCard(target, 'slice');
  }

  async debugWaitForActiveCards(count: number): Promise<void> {
    const started = performance.now();
    while (performance.now() - started < 7000) {
      if (this.activeCards.length >= count) return;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${count} active Cards.`);
  }

  async debugCompleteSession(): Promise<void> {
    while (!this.isComplete) {
      if (this.paused) this.resumeSession();
      if (this.transitioning) {
        await new Promise((resolve) => window.setTimeout(resolve, 25));
        continue;
      }
      if (this.activeCards.length === 0) this.spawnCurrentTargetSet();
      this.debugSliceCurrentTarget();
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    }
  }

  debugState(): DebugState {
    return {
      deckId: this.deck.id,
      roundNumber: this.roundNumber,
      biome: this.currentLevel().name,
      wordsPerRound: this.wordsPerRound(),
      resolvedWords: this.roundWordIndex,
      currentTarget: this.currentTarget?.word,
      lives: this.lives,
      score: this.score,
      combo: this.combo,
      isComplete: this.isComplete,
      rendererDpr: this.rendererDpr,
      deckMode: deckMode(this.deck),
      cardProgress: this.cardProgress(),
      visibleBiome: this.visibleBiome,
      lastPointerBurst: this.lastPointerBurst,
      lastSpoken: this.lastSpoken,
      inputSuppressed: this.transitioning || this.paused || this.isComplete,
      activeTrailCount: this.trailImages.filter((trail) => trail.active).length,
      ambientTiers: getAmbientParticleTiers(getEmberFxConfig(this.currentLevel(), this.reducedMotion)),
      activeCards: this.activeCards.map((card) => ({
        id: card.id,
        word: card.word?.word,
        content: card.content,
        labelMetrics: card.labelMetrics,
        y: card.y,
        x: card.x,
        width: card.width,
        height: card.height,
        isTarget: card.isTarget,
        isBomb: card.isBomb,
      })),
    };
  }

  private startSession(): void {
    this.roundNumber = 1;
    this.roundWordIndex = 0;
    this.lives = 3;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.isComplete = false;
    this.transitioning = false;
    this.lastPointerBurst = undefined;
    this.lastSpoken = undefined;
    this.stats = SlicerScene.emptyStats();
    this.startRound();
  }

  private startRound(): void {
    if (this.isComplete) return;
    this.transitioning = false;
    this.clearCards();
    this.spawnTimer?.remove(false);
    this.roundWordIndex = 0;
    this.bombsRemaining = this.difficulty().bombs;
    this.currentRoundWords = this.wordsForRound();
    this.redrawBiome();
    this.showRoundOverlay(`Round ${this.roundNumber} · ${this.currentLevel().name}`);
    this.spawnCurrentTargetSet();
  }

  private spawnCurrentTargetSet(): void {
    if (this.isComplete || this.paused || this.transitioning) return;
    const target = this.currentRoundWords[this.roundWordIndex];
    if (!target) {
      this.completeRound();
      return;
    }
    this.clearCards();
    this.currentTarget = target;
    const cards = this.cardsForTarget(target);
    const width = this.scale.width;
    const height = this.scale.height;
    const cardWidth = Phaser.Math.Clamp(width * (width < height ? 0.38 : 0.2), 150, 260);
    const cardHeight = cardWidth * 0.5625;
    const lanes = [width * 0.2, width * 0.5, width * 0.8];
    const laneWidth = width / 3;
    const jitter = laneWidth * 0.1;
    const yGap = Math.min(64, cardHeight * 0.45);
    const shuffled = Phaser.Utils.Array.Shuffle(cards);
    shuffled.forEach((card, index) => {
      const x = lanes[index] + Phaser.Math.FloatBetween(-jitter, jitter);
      const y = -cardHeight - index * yGap;
      this.createFallingCard(card, x, y, cardWidth, cardHeight, height + cardHeight);
    });
    void this.speakTarget(target);
  }

  private cardsForTarget(target: DeckWord): Array<{ word?: DeckWord; isTarget: boolean; isBomb: boolean }> {
    const distractors = this.deck.words
      .filter((word) => word.word !== target.word)
      .slice(this.roundWordIndex, this.roundWordIndex + 8);
    while (distractors.length < 2) {
      distractors.push(this.deck.words[Phaser.Math.Between(0, this.deck.words.length - 1)]);
    }
    const output: Array<{ word?: DeckWord; isTarget: boolean; isBomb: boolean }> = [
      { word: target, isTarget: true, isBomb: false },
      { word: distractors[0], isTarget: false, isBomb: false },
    ];
    if (this.bombsRemaining > 0) {
      this.bombsRemaining -= 1;
      output.push({ isTarget: false, isBomb: true });
    } else {
      output.push({ word: distractors[1], isTarget: false, isBomb: false });
    }
    return output;
  }

  private createFallingCard(
    cardData: { word?: DeckWord; isTarget: boolean; isBomb: boolean },
    x: number,
    y: number,
    width: number,
    height: number,
    exitY: number,
  ): FallingCard {
    const frameKey = cardData.isBomb ? EMBER_ASSET_KEYS.bombIdle : EMBER_ASSET_KEYS.frameDefault;
    const frame = this.add.image(0, 0, frameKey).setDisplaySize(width, height);
    const card = this.add.container(x, y, [frame]) as FallingCard;
    card.id = `${cardData.word?.word ?? 'bomb'}-${this.roundNumber}-${this.roundWordIndex}-${Math.random()}`;
    card.word = cardData.word;
    card.isTarget = cardData.isTarget;
    card.isBomb = cardData.isBomb;
    card.resolved = false;
    card.frame = frame;
    card.setSize(width, height);
    card.setDepth(40);
    if (cardData.word) {
      card.content = resolveCardContent(this.deck, cardData.word);
      this.addCardContent(card, card.content, width, height);
    }
    card.moteEmitter = this.createCardMotes(card);
    card.fallTween = this.tweens.add({
      targets: card,
      y: exitY,
      duration: this.difficulty().fallMs,
      ease: 'Linear',
      onComplete: () => this.resolveCard(card, 'exit'),
    });
    this.activeCards.push(card);
    return card;
  }

  private async beginSwipe(pointer: Phaser.Input.Pointer): Promise<void> {
    if (this.paused || this.transitioning || this.isComplete) return;
    await this.primeAudioOnGesture().catch(() => undefined);
    await this.audio.unlock().catch(() => undefined);
    const point = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.spawnPointerBurst(point);
    this.lastPointer = point;
    this.trailPoints = [point.clone()];
    this.fadeTrail(80);
  }

  private moveSwipe(pointer: Phaser.Input.Pointer): void {
    if (this.paused || !pointer.isDown || !this.lastPointer) return;
    const current = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.trailPoints.push(current.clone());
    this.drawTrail(this.lastPointer, current);
    for (const card of [...this.activeCards]) {
      if (card.resolved) continue;
      if (segmentIntersectsRect(this.lastPointer, current, card.getBounds())) {
        this.lastSliceFx = {
          point: current.clone(),
          cardX: card.x,
          cardY: card.y,
          cardWidth: card.width,
          cardHeight: card.height,
          mastered: Boolean(card.word?.mastered),
        };
        this.resolveCard(card, 'slice');
        break;
      }
    }
    this.lastPointer = current;
  }

  private endSwipe(): void {
    this.lastPointer = undefined;
    this.fadeTrail(120);
  }

  private resolveCard(card: FallingCard, reason: 'slice' | 'exit'): void {
    if (card.resolved || this.isComplete) return;
    card.resolved = true;
    card.fallTween?.stop();
    if (reason === 'slice') this.fadeTrail(120);
    this.removeActiveCard(card);
    if (card.isBomb) {
      if (reason === 'slice') {
        this.combo = 0;
        this.stats.bluffsFailed += 1;
        this.emitAttempt(this.currentTarget, false, 'bomb', true);
        this.loseLife();
        this.audio.bomb();
        this.playBombFx(card);
        this.queueNextTarget();
        return;
      }

      this.stats.bluffsResisted += 1;
      this.emitAttempt(this.currentTarget, true, 'bomb', true);
      return;
    }
    if (card.isTarget) {
      this.roundWordIndex += 1;
      if (reason === 'slice') {
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 100 * Math.max(1, Math.min(4, this.combo));
        this.stats.correct += 1;
        this.stats.score = this.score;
        this.stats.maxCombo = this.maxCombo;
        this.audio.sliceReward();
        this.playCorrectSliceFx();
        this.emitAttempt(card.word, true, 'target', false);
      } else {
        this.combo = 0;
        this.stats.skipped += 1;
        this.emitAttempt(card.word, false, 'target', false);
        this.loseLife();
        this.audio.miss();
        this.playMissFx();
      }
      this.clearCards();
      this.updateHud();
      this.queueNextTarget();
      return;
    }
    if (reason === 'slice') {
      this.combo = 0;
      this.stats.missed += 1;
      this.emitAttempt(card.word, false, 'distractor', false);
      this.loseLife();
      this.audio.miss();
      this.playMissFx();
      this.clearCards();
      this.updateHud();
      this.queueNextTarget();
    }
  }

  private queueNextTarget(): void {
    if (this.transitioning || this.isComplete) return;
    if (this.lives <= 0) {
      this.completeSession();
      return;
    }
    if (this.roundWordIndex >= this.currentRoundWords.length) {
      this.completeRound();
      return;
    }
    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.delayedCall(this.testMode ? 250 : this.difficulty().spawnEveryMs, () => this.spawnCurrentTargetSet());
  }

  private completeRound(): void {
    if (this.transitioning || this.isComplete) return;
    this.transitioning = true;
    this.spawnTimer?.remove(false);
    this.stats.completedLevels.push(this.currentLevel().id);
    this.bus.emit({
      type: 'round_complete',
      gameId: 'slicer',
      timestamp: Date.now(),
      payload: {
        round: this.roundNumber,
        biome: this.currentLevel().biome,
        stats: { ...this.stats, completedLevels: [...this.stats.completedLevels], upgradesEarned: [...this.stats.upgradesEarned] },
      },
    });
    this.audio.roundComplete();
    this.showRoundOverlay(`Round ${this.roundNumber} Complete`);
    if (this.roundNumber >= 10) {
      this.time.delayedCall(1200, () => this.completeSession());
      return;
    }
    this.roundNumber += 1;
    this.time.delayedCall(1200, () => this.startRound());
  }

  private completeSession(): void {
    if (this.isComplete) return;
    this.isComplete = true;
    this.transitioning = true;
    this.clearCards();
    this.ambientEmitters.forEach((emitter) => emitter.stop());
    this.stats.livesLost = 3 - this.lives;
    this.bus.emit({
      type: 'session_complete',
      gameId: 'slicer',
      timestamp: Date.now(),
      payload: { stats: { ...this.stats, completedLevels: [...this.stats.completedLevels], upgradesEarned: [...this.stats.upgradesEarned] } },
    });
    this.audio.sessionComplete();
  }

  private loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.stats.livesLost = 3 - this.lives;
  }

  private emitAttempt(word: DeckWord | undefined, passed: boolean, cardKind: AttemptCardKind, isBluff: boolean): void {
    const wordId = word?.id ?? this.currentTarget?.id;
    if (!wordId) return;

    this.bus.emit({
      type: 'game_attempt',
      gameId: 'slicer',
      wordId,
      passed,
      timestamp: Date.now(),
      metadata: {
        mode: deckMode(this.deck),
        biome: this.currentLevel().biome,
        combo: this.combo,
        isBluff,
        cardKind,
      },
    });
  }

  private redrawBiome(): void {
    const level = this.currentLevel();
    const config = getEmberFxConfig(level, this.reducedMotion);
    this.backgroundLayer?.redraw(level, config);
    this.visibleBiome = level.name;
    this.rebuildParticles(level, config);
  }

  private rebuildParticles(level: LevelConfig, config = getEmberFxConfig(level, this.reducedMotion)): void {
    this.ambientEmitters.forEach((emitter) => emitter.destroy());
    this.ambientEmitters = [];
    for (const tier of getAmbientParticleTiers(config)) {
      const lifespan = tier.name === 'far' ? { min: 9000, max: 15000 } : tier.name === 'mid' ? { min: 6500, max: 12000 } : { min: 4200, max: 9000 };
      const baseConfig = {
        x: { min: -50, max: this.scale.width + 50 },
        y: { min: -50, max: this.scale.height + 50 },
        lifespan,
        speed: { min: tier.speed.min, max: tier.speed.max },
        angle: { min: 205, max: 335 },
        scale: { start: tier.scale.min, end: tier.scale.max },
        alpha: { start: tier.alpha.min, end: 0 },
        frequency: tier.frequency,
        quantity: 1,
        maxParticles: tier.maxParticles,
        blendMode: Phaser.BlendModes.ADD,
      } satisfies Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
      const emberEmitter = this.add.particles(0, 0, EMBER_ASSET_KEYS.particleEmber, baseConfig).setDepth(tier.name === 'near' ? 7 : tier.name === 'mid' ? -4 : -6);
      const sparkEmitter = this.add.particles(0, 0, EMBER_ASSET_KEYS.particleSpark, {
        ...baseConfig,
        frequency: Math.max(tier.frequency * 3, config.sparkFrequency),
        maxParticles: Math.max(1, Math.round(tier.maxParticles * 0.25)),
        scale: { start: tier.scale.min * 0.75, end: tier.scale.max * 0.5 },
        alpha: { start: Math.min(1, tier.alpha.max), end: 0 },
      }).setDepth(tier.name === 'near' ? 8 : tier.name === 'mid' ? -3 : -5);
      if (tier.blurred) {
        this.applyParticleBlur(emberEmitter);
        this.applyParticleBlur(sparkEmitter);
      }
      this.ambientEmitters.push(emberEmitter, sparkEmitter);
    }
    if (config.diagonalSpark) {
      this.ambientEmitters.push(
        this.add.particles(0, 0, EMBER_ASSET_KEYS.particleSpark, {
          x: { min: -80, max: this.scale.width + 80 },
          y: { min: -80, max: this.scale.height * 0.7 },
          lifespan: { min: 1200, max: 2400 },
          speedX: { min: -45, max: 10 },
          speedY: { min: 210, max: 360 },
          scale: { start: 0.18, end: 0 },
          alpha: { start: 0.76, end: 0 },
          rotate: { min: 70, max: 82 },
          frequency: 95,
          maxParticles: 20,
          blendMode: Phaser.BlendModes.ADD,
        }).setDepth(-3),
      );
    }
    if (config.signature.emitterAccent === 'gold-glints') {
      this.ambientEmitters.push(
        this.add.particles(0, 0, EMBER_ASSET_KEYS.particleSpark, {
          x: { min: -40, max: this.scale.width + 40 },
          y: { min: -20, max: this.scale.height * 0.72 },
          lifespan: { min: 900, max: 1800 },
          speed: { min: 18, max: 52 },
          scale: { start: 0.12, end: 0 },
          alpha: { start: 0.86, end: 0 },
          tint: [0xffd700, 0xfff1a0],
          frequency: 520,
          maxParticles: 12,
          blendMode: Phaser.BlendModes.ADD,
        }).setDepth(-2),
      );
    }
    if (config.smoke) {
      this.ambientEmitters.push(
        this.add.particles(0, 0, EMBER_ASSET_KEYS.particleSmoke, {
          x: { min: -60, max: this.scale.width + 60 },
          y: { min: this.scale.height * 0.15, max: this.scale.height + 40 },
          lifespan: { min: 6000, max: 11000 },
          speedY: { min: -24, max: -8 },
          speedX: { min: -16, max: 16 },
          scale: { start: 0.18, end: 0.7 },
          alpha: { start: 0.08, end: 0 },
          frequency: config.signature.name === 'mistwood' ? 280 : 560,
          maxParticles: config.signature.name === 'mistwood' ? 28 : 18,
          blendMode: Phaser.BlendModes.NORMAL,
        }).setDepth(-4),
      );
    }
  }

  private spawnPointerBurst(point: Phaser.Math.Vector2): void {
    const quantity = Phaser.Math.Between(8, 14);
    this.lastPointerBurst = { x: point.x, y: point.y, count: quantity };
    const emitter = this.add.particles(0, 0, EMBER_ASSET_KEYS.particleEmber, {
      lifespan: { min: 1000, max: 2000 },
      speed: { min: 80, max: 200 },
      scale: { start: 0.4, end: 1.0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 1,
      frequency: -1,
      emitting: false,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(75);
    emitter.emitParticleAt(point.x, point.y, quantity);
    this.time.delayedCall(2100, () => emitter.destroy());
  }

  private drawTrail(start: Phaser.Math.Vector2, end: Phaser.Math.Vector2): void {
    const length = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    if (length < 5) return;
    const angle = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const tier = this.combo >= 4 ? 'combo' : this.combo >= 2 ? 'medium' : 'thin';
    const outer = this.add
      .image(midX, midY, EMBER_ASSET_KEYS.sliceTrailBrush)
      .setDepth(86)
      .setOrigin(0.5)
      .setRotation(angle)
      .setDisplaySize(length + 30, tier === 'combo' ? 34 : tier === 'medium' ? 25 : 17)
      .setAlpha(tier === 'thin' ? 0.48 : 0.62)
      .setTint(0xff7a25)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.trailImages.push(outer);
    if (tier === 'combo') {
      this.trailImages.push(
        this.add
          .image(midX, midY, EMBER_ASSET_KEYS.sliceTrailBrush)
          .setDepth(87)
          .setOrigin(0.5)
          .setRotation(angle)
          .setDisplaySize(length + 18, 12)
          .setAlpha(0.82)
          .setTint(0xffd700)
          .setBlendMode(Phaser.BlendModes.ADD),
      );
    }
  }

  private playCorrectSliceFx(): void {
    const fx = this.lastSliceFx;
    if (!fx) return;
    const goldBiased = this.combo >= 4 || fx.mastered;
    if (this.reducedMotion) {
      this.smallFlash(fx.point, 0xffd700);
    } else {
      const cut = this.add
        .sprite(fx.cardX, fx.cardY, EMBER_ASSET_KEYS.cardCutSheet)
        .setDepth(44)
        .setDisplaySize(fx.cardWidth, fx.cardHeight);
      cut.play('ember-card-cut');
      cut.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => cut.destroy());
    }
    const burst = this.makeImpactEmberBurst(fx.point, goldBiased);
    void burst;
    this.lastSliceFx = undefined;
  }

  private playMissFx(): void {
    const points = this.trailPoints.length ? this.trailPoints : [this.lastSliceFx?.point].filter(Boolean) as Phaser.Math.Vector2[];
    points.filter((_, index) => index % 2 === 0).forEach((point) => {
      const soot = this.add.particles(point.x, point.y, EMBER_ASSET_KEYS.particleSoot, {
        lifespan: { min: 380, max: 760 },
        speed: { min: 12, max: 72 },
        speedY: { min: -42, max: 36 },
        scale: { start: 0.16, end: 0.02 },
        alpha: { start: 0.5, end: 0 },
        quantity: 2,
      });
      this.time.delayedCall(780, () => soot.destroy());
    });
    this.warmEdgeRipple();
    this.lastSliceFx = undefined;
  }

  private playBombFx(card: FallingCard): void {
    if (this.reducedMotion) {
      const still = this.add.image(card.x, card.y, EMBER_ASSET_KEYS.bombExplosionSheet, 0).setDepth(94).setDisplaySize(card.width, card.height);
      this.tweens.add({ targets: still, alpha: 0, duration: 220, onComplete: () => still.destroy() });
    } else {
      const explosion = this.add.sprite(card.x, card.y, EMBER_ASSET_KEYS.bombExplosionSheet).setDepth(94).setDisplaySize(card.width * 1.5, card.height * 1.5);
      explosion.play('ember-bomb-explosion');
      explosion.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => explosion.destroy());
    }
    const smoke = this.add.particles(card.x, card.y, EMBER_ASSET_KEYS.particleSmoke, {
      lifespan: { min: 520, max: 900 },
      speed: { min: 30, max: 140 },
      speedY: { min: -120, max: -20 },
      scale: { start: 0.35, end: 0.04 },
      alpha: { start: 0.48, end: 0 },
      quantity: 18,
    });
    this.time.delayedCall(850, () => smoke.destroy());
    this.warmBloom();
  }

  private makeImpactEmberBurst(point: Phaser.Math.Vector2, goldBiased: boolean): { total: number; ember: number; spark: number; goldBiased: boolean } {
    const total = goldBiased ? 46 : 40;
    const emberCount = goldBiased ? 18 : 30;
    const sparkCount = total - emberCount;
    const common = {
      lifespan: { min: 1200, max: 2000 },
      speed: { min: 150, max: 350 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 1.4 },
      alpha: { start: 0.94, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: -1,
      emitting: false,
    } satisfies Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
    const embers = this.add.particles(0, 0, EMBER_ASSET_KEYS.particleEmber, {
      ...common,
      tint: goldBiased ? [0xffd700, 0xfff1a0, 0xff8a35] : [0xff8a35, 0xff6b35, 0xffd3a1],
    }).setDepth(93);
    const sparks = this.add.particles(0, 0, EMBER_ASSET_KEYS.particleSpark, {
      ...common,
      scale: { start: 0.45, end: 1.1 },
      tint: goldBiased ? [0xffd700, 0xfff1a0] : [0xffd3a1, 0xff8a35],
    }).setDepth(94);
    embers.emitParticleAt(point.x, point.y, emberCount);
    sparks.emitParticleAt(point.x, point.y, sparkCount);
    this.time.delayedCall(2100, () => {
      embers.destroy();
      sparks.destroy();
    });
    return { total, ember: emberCount, spark: sparkCount, goldBiased };
  }

  private addCardContent(card: FallingCard, content: CardContent, width: number, height: number): void {
    if (content.kind === 'image' && this.textures.exists(content.url)) {
      const image = this.add.image(0, 0, content.url).setDisplaySize(width * 0.76, height * 0.76);
      card.add(image);
      if (content.label) this.addTextContent(card, content.label, width, height, 0.1);
      return;
    }
    const text = content.kind === 'text' ? content.text : content.label ?? '';
    this.addTextContent(card, text, width, height, 0);
  }

  private addTextContent(card: FallingCard, text: string, width: number, height: number, yOffsetRatio: number): void {
    const safeWidth = width * 0.76;
    const safeHeight = height * 0.76;
    const maxFontSize = width * 0.15;
    const minFontSize = 18;
    const formatted = this.fitCardText(text, safeWidth, maxFontSize, minFontSize);
    card.labelMetrics = {
      fontSize: formatted.fontSize,
      width: safeWidth,
      height: formatted.lines * formatted.fontSize * 1.02,
      lines: formatted.lines,
    };
    card.label = this.add
      .text(0, height * yOffsetRatio, formatted.text, {
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontSize: `${Math.round(formatted.fontSize)}px`,
        color: '#fff1d0',
        align: 'center',
        fixedWidth: safeWidth,
        fixedHeight: Math.min(safeHeight, card.labelMetrics.height + 8),
        lineSpacing: Math.round(formatted.fontSize * -0.08),
        wordWrap: { width: safeWidth, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 'rgba(255,215,0,0.5)', 14, false, true);
    card.add(card.label);
  }

  private fitCardText(text: string, safeWidth: number, maxFontSize: number, minFontSize: number): { text: string; fontSize: number; lines: number } {
    const singleLineSize = Math.min(maxFontSize, safeWidth / Math.max(1, text.length * 0.48));
    if (singleLineSize >= minFontSize) {
      return { text, fontSize: Math.max(minFontSize, singleLineSize), lines: 1 };
    }
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      return { text, fontSize: minFontSize, lines: 1 };
    }
    let bestSplit = 1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 1; index < words.length; index += 1) {
      const left = words.slice(0, index).join(' ');
      const right = words.slice(index).join(' ');
      const score = Math.abs(left.length - right.length) + Math.max(left.length, right.length) * 0.1;
      if (score < bestScore) {
        bestScore = score;
        bestSplit = index;
      }
    }
    const lines = [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
    const longest = Math.max(...lines.map((line) => line.length));
    const wrappedSize = Math.min(maxFontSize, safeWidth / Math.max(1, longest * 0.5));
    return { text: lines.join('\n'), fontSize: Math.max(minFontSize, wrappedSize), lines: 2 };
  }

  private createCardMotes(card: FallingCard): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.add.particles(0, 0, EMBER_ASSET_KEYS.particleEmber, {
      follow: card,
      lifespan: { min: 900, max: 1800 },
      speed: { min: 4, max: 24 },
      speedY: { min: -32, max: -8 },
      scale: { start: 0.06, end: 0 },
      alpha: { start: 0.22, end: 0 },
      frequency: this.reducedMotion ? 900 : 420,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(39);
  }

  private clearCards(): void {
    this.activeCards.splice(0).forEach((card) => this.destroyCard(card));
  }

  private removeActiveCard(card: FallingCard): void {
    this.activeCards = this.activeCards.filter((item) => item !== card);
    this.destroyCard(card);
  }

  private destroyCard(card: FallingCard): void {
    card.moteEmitter?.destroy();
    card.fallTween?.stop();
    card.destroy();
  }

  private fadeTrail(duration: number): void {
    const trails = this.trailImages.splice(0);
    trails.forEach((trail) => {
      this.tweens.add({ targets: trail, alpha: 0, duration, onComplete: () => trail.destroy() });
    });
  }

  private applyParticleBlur(emitter: Phaser.GameObjects.Particles.ParticleEmitter): void {
    const filterTarget = emitter as unknown as {
      filters?: { external?: { addBlur?: (quality?: number, x?: number, y?: number, strength?: number) => unknown } };
    };
    filterTarget.filters?.external?.addBlur?.(1, 1.5, 1.5, 0.6);
  }

  private warmEdgeRipple(): void {
    const edge = this.add.graphics().setDepth(96);
    edge.lineStyle(22, 0xff6b35, 0.16);
    edge.strokeRect(0, 0, this.scale.width, this.scale.height);
    edge.fillStyle(0x1a0a00, 0.1);
    edge.fillRect(0, 0, this.scale.width, this.scale.height);
    this.tweens.add({ targets: edge, alpha: 0, duration: 240, onComplete: () => edge.destroy() });
  }

  private warmBloom(): void {
    const bloom = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff6b35, 0.12)
      .setOrigin(0)
      .setDepth(96)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: bloom, alpha: 0, duration: 260, onComplete: () => bloom.destroy() });
  }

  private smallFlash(point: Phaser.Math.Vector2, color: number): void {
    const flash = this.add.circle(point.x, point.y, 18, color, 0.34).setDepth(94).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
  }

  private showRoundOverlay(label: string): void {
    void label;
    // React owns overlays in the cloud host.
  }

  private resizeScene(): void {
    this.rendererDpr = Math.max(1, window.devicePixelRatio || 1);
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.redrawBiome();
  }

  private updateHud(): void {
    // React owns HUD state in the cloud host.
  }

  private currentLevel(): LevelConfig {
    return allLevels[this.roundNumber - 1] ?? allLevels[allLevels.length - 1];
  }

  private difficulty(): RoundDifficulty {
    return ROUND_DIFFICULTY[this.roundNumber - 1] ?? ROUND_DIFFICULTY[ROUND_DIFFICULTY.length - 1];
  }

  private wordsPerRound(): number {
    return this.deck.words_per_round ?? 5;
  }

  private wordsForRound(): DeckWord[] {
    const count = this.wordsPerRound();
    return Array.from({ length: count }, (_, index) => this.deck.words[((this.roundNumber - 1) * count + index) % this.deck.words.length])
      .map((word) => ({ ...word, translation: word.translation ?? word.word }));
  }

  private cardProgress(): string {
    const total = Math.max(1, this.currentRoundWords.length || this.wordsPerRound());
    const current = Phaser.Math.Clamp(this.roundWordIndex + 1, 1, total);
    return `${current} / ${total}`;
  }

  private async speakTarget(target: DeckWord): Promise<void> {
    const prompt = resolvePrompt(this.deck, target);
    if (prompt.mode === 'audio_to_image' && target.audioUrl) {
      this.htmlAudio?.pause();
      const audio = new Audio(target.audioUrl);
      this.htmlAudio = audio;
      let didFallback = false;
      const fallback = (): void => {
        if (didFallback) return;
        didFallback = true;
        void this.fallbackToSpeechSynthesis(prompt);
      };
      audio.addEventListener('error', fallback, { once: true });
      await audio.play().catch(fallback);
      return;
    }

    await this.fallbackToSpeechSynthesis(prompt);
  }

  private async fallbackToSpeechSynthesis(prompt: ResolvedPrompt): Promise<void> {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    const { text, lang } = prompt;
    const voices = await this.voicesReady;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = this.selectVoice(voices, lang);
    if (!voice && voices.length > 0 && lang.toLowerCase().startsWith('en')) {
      console.warn(`No ${lang} speech synthesis voice available for Deck ${this.deck.id}.`);
      return;
    }
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    this.lastSpoken = { text, lang, voice: voice?.name };
  }

  private selectVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
    const normalized = lang.toLowerCase();
    return voices.find((candidate) => candidate.lang.toLowerCase().startsWith(normalized))
      ?? voices.find((candidate) => normalized.startsWith('en') && candidate.lang.toLowerCase().startsWith('en-'));
  }

  private static loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!('speechSynthesis' in window)) return Promise.resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) return Promise.resolve(voices);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        resolve(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
      window.setTimeout(finish, 750);
    });
  }

  private createAnimations(): void {
    if (!this.anims.exists('ember-spark-burst')) {
      this.anims.create({
        key: 'ember-spark-burst',
        frames: this.anims.generateFrameNumbers(EMBER_ASSET_KEYS.sparkBurstSheet, { start: 0, end: 5 }),
        frameRate: 24,
        repeat: 0,
      });
    }
    if (!this.anims.exists('ember-card-cut')) {
      this.anims.create({
        key: 'ember-card-cut',
        frames: this.anims.generateFrameNumbers(EMBER_ASSET_KEYS.cardCutSheet, { start: 0, end: 5 }),
        frameRate: 24,
        repeat: 0,
      });
    }
    if (!this.anims.exists('ember-bomb-explosion')) {
      this.anims.create({
        key: 'ember-bomb-explosion',
        frames: this.anims.generateFrameNumbers(EMBER_ASSET_KEYS.bombExplosionSheet, { start: 0, end: 7 }),
        frameRate: 20,
        repeat: 0,
      });
    }
  }

  private static emptyStats(): SessionStats {
    return {
      score: 0,
      correct: 0,
      missed: 0,
      skipped: 0,
      bluffsResisted: 0,
      bluffsFailed: 0,
      maxCombo: 0,
      livesLost: 0,
      upgradesEarned: [],
      completedLevels: [],
    };
  }
}
