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

const SECTION_LABEL_CLASS = 'text-xs font-semibold text-gray-400 uppercase tracking-wider'
const LEVEL_VALUES: GrokLevel[] = ['zero', 'beginner', 'intermediate', 'advanced']

const CATEGORY_LABELS: Record<GrokCategory, string> = {
  travel: 'Travel',
  business: 'Business',
  romance: 'Romance',
  philosophy: 'Philosophy',
  daily_life: 'Daily Life',
  food: 'Food',
  arts: 'Arts',
  news: 'News',
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

  const levelOptions = LEVEL_VALUES.map((level) => ({
    level,
    emoji: level === 'zero' ? '🌱' : level === 'beginner' ? '📗' : level === 'intermediate' ? '📘' : '📕',
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
      <div>
        <p className={`${SECTION_LABEL_CLASS} mb-3`}>Voice</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {GROK_VOICES.map((voice) => {
            const selected = selectedVoice === voice.id
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => onSelectVoice(voice.id)}
                disabled={isStarting}
                className={`flex flex-col items-start gap-1 px-3 py-4 rounded-2xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-violet-900/30 border-violet-500/40 shadow-lg shadow-violet-950/30'
                    : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
                }`}
              >
                <span className="text-sm font-medium text-white">{voice.displayName}</span>
                <span className="text-xs text-violet-200/80">{voice.tone}</span>
                <span className="text-xs text-gray-400 leading-snug">{voice.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (step === 'mode') {
    return (
      <div>
        <p className={`${SECTION_LABEL_CLASS} mb-3`}>Mode</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onSelectCategory('free_chat')}
            disabled={isStarting}
            className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedCategory === 'free_chat'
                ? 'bg-violet-900/30 border-violet-500/40 shadow-lg shadow-violet-950/30'
                : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
            }`}
          >
            <div>
              <p className="text-sm font-medium text-white">Free Chat</p>
              <p className="text-xs text-gray-400">Open conversation with no fixed scenario.</p>
            </div>
            <span className="text-xl">💬</span>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GROK_CATEGORIES.map((category) => {
              const selected = selectedCategory === category.id
              const translated = t(category.displayKey)
              const label = translated === category.displayKey ? CATEGORY_LABELS[category.id] : translated
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(category.id)}
                  disabled={isStarting}
                  className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selected
                      ? 'bg-violet-900/30 border-violet-500/40 shadow-lg shadow-violet-950/30'
                      : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
                  }`}
                >
                  <span className="text-2xl">{category.emoji}</span>
                  <span className="text-sm font-medium text-white leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {t('speak.howMuch', { language: languageName })}
        </h2>
        <p className="text-sm text-gray-400">{t('speak.levelHint')}</p>
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
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                selected
                  ? 'bg-violet-900/30 border-violet-500/40 shadow-lg shadow-violet-950/30'
                  : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="text-sm font-medium text-white">{opt.title}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!selectedVoice || !selectedCategory || !selectedLevel || isStarting}
        className="w-full px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isStarting ? 'Starting…' : 'Start conversation'}
      </button>
    </div>
  )
}
