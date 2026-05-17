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
  mastered?: boolean;
  languageCode: string;
};

export type DeckMode = 'audio_to_image' | 'audio_to_text';

export type CardContent =
  | { kind: 'text'; text: string; imageRole: 'placeholder' }
  | { kind: 'image'; url: string; label?: string };

export type GameDeck = {
  id: string;
  name: string;
  languageCode: string;
  cards: GameCard[];
};

export type DeckWord = {
  id: string;
  word: string;
  translation?: string;
  imageUrl?: string;
  audioUrl?: string;
  mastered?: boolean;
};

export type DeckDefinition = {
  id: string;
  title: string;
  mode?: DeckMode;
  target_language: string;
  base_language: string;
  words_per_round?: number;
  words: DeckWord[];
};

export type BiomeName =
  | 'stillwater'
  | 'rainfall'
  | 'aurora'
  | 'driftwood'
  | 'tideline'
  | 'geode'
  | 'embers'
  | 'mistwood'
  | 'solstice'
  | 'reverie';

export type LevelPalette = {
  background: string;
  horizon: string;
  accent: string;
  accent2: string;
  warm: string;
  text: string;
};

export type LevelConfig = {
  id: string;
  unlockIndex: number;
  name: string;
  biome: BiomeName;
  palette: LevelPalette;
  arc: {
    speed: number;
    gravity: number;
    cardsPerArc: number;
    distractorCount: number;
    audioLeadMs: number;
  };
  rules: {
    roundsToComplete: number;
    bluffChance: number;
    simultaneousTargets: number;
    comboRequirement: number;
    fogPulseMs?: number;
  };
  particles: {
    kind: 'motes' | 'rain' | 'ribbons' | 'embers' | 'fog' | 'crystals' | 'spray' | 'debris';
    density: number;
    drift: number;
  };
  ambientDrone: {
    baseFrequency: number;
    detune: number;
    filterCutoff: number;
  };
};

export type PromptRound = {
  id: string;
  levelId: string;
  promptWord: string;
  promptAudioUrl?: string;
  isBluff: boolean;
  targetCard?: GameCard;
  cards: GameCard[];
};

export type UpgradeId = 'slow_time' | 'double_slice' | 'echo_sense';

export type EngineEventName =
  | 'card_correct'
  | 'card_missed'
  | 'card_skipped'
  | 'bluff_resisted'
  | 'bluff_failed'
  | 'level_complete'
  | 'session_complete'
  | 'life_lost'
  | 'upgrade_earned';

export type EngineEvent = {
  name: EngineEventName;
  at: number;
  payload: Record<string, unknown>;
};

export type EventListener = (event: EngineEvent) => void;

export type EventBus = {
  emit(name: EngineEventName, payload?: Record<string, unknown>): void;
  on(name: EngineEventName, listener: EventListener): () => void;
  onAny(listener: EventListener): () => void;
};

export type DistractorStrategy = {
  selectDistractors(target: GameCard, pool: GameCard[], count: number): GameCard[];
};

export type PromptSource = {
  playPrompt(round: PromptRound): Promise<void>;
  stop(): void;
};

export type AssetLoader = {
  loadDeck(url: string): Promise<GameDeck>;
  resolveCardImage(card: GameCard): string;
  resolveCardAudio(card: GameCard): string | undefined;
};

export type LifeLossReason = 'wrong_slice' | 'bomb_hit' | 'missed_target' | 'bluff_failed';

export type SessionStats = {
  correct: number;
  missed: number;
  skipped: number;
  bluffsResisted: number;
  bluffsFailed: number;
  livesLost: number;
  upgradesEarned: UpgradeId[];
  completedLevels: string[];
};
