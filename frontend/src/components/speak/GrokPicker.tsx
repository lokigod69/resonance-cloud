import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Check,
  Heart,
  Home,
  Loader2,
  MessageCircle,
  Newspaper,
  Palette,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { GROK_CATEGORIES, type GrokCategory } from '@/data/grokCategories'
import { GROK_VOICES, type GrokVoice } from '@/data/grokVoices'
import { useTranslation } from '@/hooks/useTranslation'
import type { GrokLevel } from '@/lib/grokPedagogy'

export type GrokPickerStep = 'voice' | 'mode' | 'level'

interface GrokPickerProps {
  language: string
  languageName: string
  step: GrokPickerStep
  selectedVoice: GrokVoice | null
  selectedCategory: GrokCategory | 'free_chat' | null
  selectedLevel: GrokLevel | null
  onSelectVoice: (v: GrokVoice) => void
  onSelectCategory: (c: GrokCategory | 'free_chat') => void
  onSelectLevel: (level: GrokLevel) => void
  onStart: () => void
  isStarting: boolean
}

const SECTION_LABEL_CLASS = 'text-xs font-semibold text-slate-400 uppercase tracking-[0.22em]'
const LEVEL_VALUES: GrokLevel[] = ['zero', 'beginner', 'intermediate', 'advanced']

const CATEGORY_VISUALS: Record<GrokCategory, { description: string }> = {
  travel: {
    description: 'speak.grok.category.travelDescription',
  },
  business: {
    description: 'speak.grok.category.businessDescription',
  },
  romance: {
    description: 'speak.grok.category.romanceDescription',
  },
  philosophy: {
    description: 'speak.grok.category.philosophyDescription',
  },
  daily_life: {
    description: 'speak.grok.category.daily_lifeDescription',
  },
  food: {
    description: 'speak.grok.category.foodDescription',
  },
  arts: {
    description: 'speak.grok.category.artsDescription',
  },
  news: {
    description: 'speak.grok.category.newsDescription',
  },
}

const VOICE_ACCENTS: Record<GrokVoice, string> = {
  eve: 'from-indigo-200/90 to-cyan-200/70',
  ara: 'from-rose-200/90 to-indigo-200/70',
  rex: 'from-cyan-200/90 to-blue-300/70',
  sal: 'from-violet-200/90 to-slate-200/70',
  leo: 'from-amber-200/90 to-indigo-200/70',
}

const LEVEL_VISUALS: Record<GrokLevel, { badge: string; accent: string }> = {
  zero: { badge: 'L0', accent: 'from-emerald-300/25 to-cyan-400/10' },
  beginner: { badge: 'L1', accent: 'from-sky-300/25 to-indigo-400/10' },
  intermediate: { badge: 'L2', accent: 'from-violet-300/25 to-indigo-400/10' },
  advanced: { badge: 'L3', accent: 'from-amber-300/25 to-indigo-400/10' },
}

const cardBase =
  'speak-glass-card relative overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 disabled:cursor-not-allowed disabled:opacity-50'
const cardIdle = 'hover:-translate-y-0.5 hover:border-indigo-200/30 hover:bg-slate-800/65'
const cardSelected =
  'border-indigo-200/55 bg-indigo-950/35 shadow-[0_0_0_1px_rgba(165,180,252,0.25),0_18px_45px_rgba(79,70,229,0.22)]'
const levelCardSelected =
  'border-cyan-200/65 bg-cyan-400/[0.10] shadow-[0_0_0_1px_rgba(125,211,252,0.28),0_18px_45px_rgba(14,165,233,0.22)]'

function VoiceWaveIcon({ voice, selected }: { voice: GrokVoice; selected: boolean }) {
  const heights = voice === 'eve'
    ? ['h-3', 'h-6', 'h-4', 'h-7', 'h-5']
    : voice === 'ara'
      ? ['h-4', 'h-5', 'h-7', 'h-5', 'h-3']
      : voice === 'rex'
        ? ['h-6', 'h-4', 'h-7', 'h-4', 'h-6']
        : voice === 'sal'
          ? ['h-3', 'h-5', 'h-6', 'h-5', 'h-4']
          : ['h-7', 'h-5', 'h-4', 'h-6', 'h-3']

  return (
    <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-indigo-100/45 bg-indigo-200/15' : 'border-white/10 bg-white/[0.06]'}`}>
      <span className={`absolute inset-1 rounded-full bg-gradient-to-br ${VOICE_ACCENTS[voice]} opacity-10`} />
      <span className="relative flex items-center gap-1">
        {heights.map((height, index) => (
          <span
            key={`${voice}-${index}`}
            className={`speak-wave-bar ${height} w-1 rounded-full bg-gradient-to-t ${VOICE_ACCENTS[voice]} shadow-[0_0_14px_rgba(165,180,252,0.24)]`}
          />
        ))}
      </span>
    </span>
  )
}

function VoiceCard({
  voice,
  selected,
  disabled,
  onSelect,
}: {
  voice: (typeof GROK_VOICES)[number]
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`${cardBase} ${selected ? cardSelected : cardIdle} flex min-h-[190px] flex-col items-start gap-4 p-4 text-left`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="flex w-full items-start justify-between gap-3">
        <VoiceWaveIcon voice={voice.id} selected={selected} />
        {selected && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-200/15 text-indigo-100">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      <div>
        <p className="text-base font-semibold text-white">{voice.displayName}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100/75">{voice.tone}</p>
      </div>
      <p className="text-sm leading-relaxed text-slate-400">{voice.description}</p>
    </button>
  )
}

function TravelGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17.5c4.5 2.6 9.7 2 13.4-1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="1.5 3" />
      <path d="M7 10.6 19.4 5.8c.8-.3 1.5.5 1.1 1.2l-2.1 3.9 2.2 3.8c.4.7-.3 1.5-1.1 1.2L7 11.4c-.4-.1-.4-.7 0-.8Z" fill="currentColor" opacity="0.92" />
      <path d="m9 11 3.5 3.2M9 10.9l3.3-3.3" stroke="rgba(15,23,42,0.58)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ModeGlyph({ kind, large = false }: { kind: GrokCategory | 'free_chat'; large?: boolean }) {
  const className = large ? 'h-8 w-8' : 'h-6 w-6'

  switch (kind) {
    case 'free_chat':
      return <MessageCircle className={className} />
    case 'travel':
      return <TravelGlyph className={className} />
    case 'business':
      return <BriefcaseBusiness className={className} />
    case 'romance':
      return <Heart className={className} />
    case 'philosophy':
      return <Brain className={className} />
    case 'daily_life':
      return <Home className={className} />
    case 'food':
      return <Utensils className={className} />
    case 'arts':
      return <Palette className={className} />
    case 'news':
      return <Newspaper className={className} />
  }
}

function ModeVisual({
  kind,
  selected,
  large = false,
}: {
  kind: GrokCategory | 'free_chat'
  selected: boolean
  large?: boolean
}) {
  return (
    <span className={`speak-mode-emblem ${large ? 'speak-mode-emblem-lg' : ''} ${selected ? 'is-selected' : ''}`} data-kind={kind}>
      <span className="speak-mode-emblem-glow" />
      <span className="speak-mode-emblem-orbit" />
      <ModeGlyph kind={kind} large={large} />
    </span>
  )
}

function ModeCard({
  category,
  selected,
  disabled,
  onSelect,
}: {
  category: (typeof GROK_CATEGORIES)[number]
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const visual = CATEGORY_VISUALS[category.id]

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`${cardBase} ${selected ? cardSelected : cardIdle} flex min-h-[150px] flex-col items-start gap-3 p-4 text-left`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <ModeVisual kind={category.id} selected={selected} />
        {selected && <Check className="h-4 w-4 text-indigo-100" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{t(category.displayKey)}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{t(visual.description)}</p>
      </div>
    </button>
  )
}

function LevelBadge({ level, selected }: { level: GrokLevel; selected: boolean }) {
  const visual = LEVEL_VISUALS[level]

  return (
    <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${selected ? 'border-indigo-100/45 bg-indigo-200/15' : 'border-white/10 bg-white/[0.06]'}`}>
      <span className={`absolute inset-0 bg-gradient-to-br ${visual.accent}`} />
      <span className="relative text-xs font-black tracking-[0.18em] text-white/90">{visual.badge}</span>
    </span>
  )
}

function StartConversationButton({
  disabled,
  isStarting,
  onStart,
}: {
  disabled: boolean
  isStarting: boolean
  onStart: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="speak-start-button inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-indigo-500 px-6 py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200/80 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        {isStarting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('speak.grok.starting')}
          </>
        ) : (
          <>
            {t('speak.grok.startConversation')}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  )
}

export function GrokPicker({
  language,
  languageName,
  step,
  selectedVoice,
  selectedCategory,
  selectedLevel,
  onSelectVoice,
  onSelectCategory,
  onSelectLevel,
  onStart,
  isStarting,
}: GrokPickerProps) {
  const { t } = useTranslation()
  void language
  const freeChatSelected = selectedCategory === 'free_chat'

  const levelOptions = LEVEL_VALUES.map((level) => ({
    level,
    title: level === 'zero'
      ? t('speak.levelZero')
      : level === 'beginner'
        ? t('speak.levelBeginner')
        : level === 'intermediate'
          ? t('speak.levelIntermediate')
          : t('speak.levelAdvanced'),
    desc: level === 'zero'
      ? t('speak.levelZeroDesc')
      : level === 'beginner'
        ? t('speak.levelBeginnerDesc')
        : level === 'intermediate'
          ? t('speak.levelIntermediateDesc')
          : t('speak.levelAdvancedDesc'),
  }))

  if (step === 'voice') {
    return (
      <section className="relative isolate mx-auto w-full max-w-5xl space-y-6 px-1">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className={`${SECTION_LABEL_CLASS} pl-1`}>{t('speak.grok.voiceLabel')}</p>
            <p className="mt-1 text-sm text-slate-400">{t('speak.grok.voiceHint')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {GROK_VOICES.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              selected={selectedVoice === voice.id}
              disabled={isStarting}
              onSelect={() => onSelectVoice(voice.id)}
            />
          ))}
        </div>
      </section>
    )
  }

  if (step === 'mode') {
    return (
      <section className="relative isolate mx-auto w-full max-w-6xl space-y-6 px-1">
        <div>
          <p className={`${SECTION_LABEL_CLASS} mb-3 pl-1`}>{t('speak.grok.modeLabel')}</p>
          <button
            type="button"
            onClick={() => onSelectCategory('free_chat')}
            disabled={isStarting}
            aria-pressed={freeChatSelected}
            className={`${cardBase} ${freeChatSelected ? cardSelected : cardIdle} mb-3 flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6`}
          >
            <div className="flex min-w-0 items-center gap-4">
              <ModeVisual kind="free_chat" selected={freeChatSelected} large />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-white">{t('speak.grok.freeChat')}</p>
                  <Sparkles className="h-4 w-4 text-indigo-200/80" />
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {t('speak.grok.freeChatDescription')}
                </p>
              </div>
            </div>
            {freeChatSelected && <Check className="hidden h-5 w-5 shrink-0 text-indigo-100 sm:block" />}
          </button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GROK_CATEGORIES.map((category) => (
              <ModeCard
                key={category.id}
                category={category}
                selected={selectedCategory === category.id}
                disabled={isStarting}
                onSelect={() => onSelectCategory(category.id)}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative isolate mx-auto w-full max-w-md space-y-6 px-1">
      <div className="px-1">
        <h2 className="text-xl font-semibold text-white mb-2">
          {t('speak.howMuch', { language: languageName })}
        </h2>
        <p className="text-sm text-slate-400">{t('speak.levelHint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {levelOptions.map((opt) => {
          const selected = selectedLevel === opt.level
          return (
            <button
              key={opt.level}
              type="button"
              onClick={() => onSelectLevel(opt.level)}
              disabled={isStarting}
              aria-pressed={selected}
              className={`${cardBase} ${selected ? levelCardSelected : cardIdle} flex items-center gap-4 p-4 text-left`}
            >
              {selected && <span className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-cyan-200/70 shadow-[0_0_16px_rgba(125,211,252,0.55)]" />}
              <LevelBadge level={opt.level} selected={selected} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{opt.title}</p>
                <p className="text-xs text-slate-400">{opt.desc}</p>
              </div>
              {selected && (
                <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-200/15 text-cyan-100">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <StartConversationButton
        disabled={!selectedVoice || !selectedCategory || !selectedLevel || isStarting}
        isStarting={isStarting}
        onStart={onStart}
      />
    </section>
  )
}
