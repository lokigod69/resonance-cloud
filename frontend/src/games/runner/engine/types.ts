export type LaneIndex = 0 | 1 | 2;

export type GameCard = {
  id: string;
  word: string;
  translation: string;
  imageUrl: string;
  audioUrl?: string;
  ipa?: string;
  example?: string;
  exampleGloss?: string;
  pos?: string;
  article?: string;
  languageCode: string;
  tags?: string[];
};

export type GameDeck = {
  id: string;
  name: string;
  languageCode: string;
  cards: GameCard[];
};

export type RawDeck = {
  id: string;
  name: string;
  languageCode: string;
  cards: Array<Omit<GameCard, 'languageCode'> & { languageCode?: string }>;
};

export type BiomeConfig = {
  name: string;
  sky: [string, string, string];
  horizon: string;
  lane: string;
  cardGlow: string;
  particle: 'rain' | 'motes' | 'aurora' | 'leaves' | 'foam' | 'crystal' | 'embers' | 'fog' | 'gold' | 'dream';
  ambient: {
    root: number;
    color: string;
    cutoff: number;
  };
  parallax: string[];
};

export type LevelParticleConfig = {
  snowDensity: number;
  mistOpacity: number;
  breathRingOnLanding: boolean;
  rainDensity?: number;
  auroraIntensity?: number;
  crystalDensity?: number;
};

export type LevelMechanics = {
  variableLaneWidth?: boolean;
  tileRotation?: boolean;
  fogBursts?: boolean;
  doublePrompts?: boolean;
  rotatingMechanics?: boolean;
};

export type LevelConfig = {
  id: string;
  order: number;
  title: string;
  backgroundPlate: string;
  laneTint: string;
  particleConfig: LevelParticleConfig;
  ambientAudioPath: string;
  runnerSpeed: number;
  tempo: number;
  forwardSpeed: number;
  audioToSpawnDelay: number;
  cardTravelDuration: number;
  postWaveDelay: number;
  audioToTileMs: number;
  timingWindowMs: number;
  distractorCount: 2;
  bluffFrequency: number;
  decisionDistance: number;
  biome: BiomeConfig;
  mechanics: LevelMechanics;
};

export type UpgradeId = 'slow_time' | 'echo_sense' | 'glide';

export type Upgrade = {
  id: UpgradeId;
  label: string;
  earnedAtCombo: number;
  uses: number;
};

export type EventType =
  | 'prompt_spawned'
  | 'card_correct'
  | 'card_missed'
  | 'card_skipped'
  | 'bluff_resisted'
  | 'bluff_failed'
  | 'level_complete'
  | 'session_complete'
  | 'life_lost'
  | 'upgrade_earned';

export type LexiconPathEvent = {
  type: EventType;
  payload: Record<string, unknown>;
  at: number;
};

export type PromptCard = GameCard & {
  lane: LaneIndex;
  isCorrect: boolean;
};

export type PromptWave = {
  id: string;
  index: number;
  level: LevelConfig;
  target: GameCard;
  cards: PromptCard[];
  correctLane: LaneIndex;
  isBluff: boolean;
  startedAt: number;
  decisionAt: number;
  timingWindowMs: number;
};

export type SessionStats = {
  score: number;
  lives: number;
  combo: number;
  multiplier: number;
  correct: number;
  missed: number;
  skipped: number;
  bluffsResisted: number;
  bluffsFailed: number;
  levelIndex: number;
  promptsResolved: number;
  upgrades: Upgrade[];
  complete: boolean;
};

export type ResolutionKind =
  | 'correct'
  | 'missed'
  | 'skipped'
  | 'bluff_resisted'
  | 'bluff_failed'
  | 'session_complete';

export type Resolution = {
  kind: ResolutionKind;
  stats: SessionStats;
  prompt: PromptWave;
};

export type DistractorContext = {
  deck: GameDeck;
  target: GameCard;
  count: number;
  levelId: string;
};

export type DistractorStrategy = {
  id: 'random-from-deck' | 'semantic-neighbor';
  select(context: DistractorContext): GameCard[];
};
