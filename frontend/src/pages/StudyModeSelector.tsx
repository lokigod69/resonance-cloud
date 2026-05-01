import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Play, Layers, Headphones } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'resonance-study-mode'

type ModeConfig = {
  key: string
  icon: typeof Play
  titleKey: string
  descKey: string
  route: string
  enabled: boolean
}

const MODES: ModeConfig[] = [
  { key: 'video', icon: Play, titleKey: 'study.mode.video', descKey: 'study.mode.video.desc', route: '/study/video', enabled: true },
  { key: 'flashcard', icon: Layers, titleKey: 'study.mode.flashcard', descKey: 'study.mode.flashcard.desc', route: '/study/flashcard', enabled: true },
  { key: 'audio', icon: Headphones, titleKey: 'study.mode.audio', descKey: 'study.mode.audio.desc', route: '/study/audio', enabled: true },
]

export default function StudyModeSelector() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const { t } = useTranslation()
  const { user } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()

  const [deckName, setDeckName] = useState<string | null>(null)
  const [allDecks, setAllDecks] = useState<{ id: string; name: string | null; target_language: string }[]>([])
  const [decksLoaded, setDecksLoaded] = useState(false)
  const [lastUsed, setLastUsed] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  })

  // Fetch all user decks for language derivation
  useEffect(() => {
    if (!user) return
    supabase
      .from('decks')
      .select('id, name, target_language')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setAllDecks(data); setDecksLoaded(true) })
  }, [user])

  // Derive available languages
  const availableLanguages = useMemo(() =>
    Array.from(new Set(allDecks.map(d => d.target_language))).filter(Boolean),
    [allDecks],
  )

  // Auto-detect language from ?deck= param
  useEffect(() => {
    if (!deckParam || allDecks.length === 0) return
    const deck = allDecks.find(d => d.id === deckParam)
    if (deck) {
      setDeckName(deck.name)
      if (deck.target_language) setActiveLanguage(deck.target_language)
    }
  }, [deckParam, allDecks, setActiveLanguage])

  // Guard: if activeLanguage has no decks, auto-correct
  useEffect(() => {
    if (availableLanguages.length === 0) return
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, setActiveLanguage])

  function selectMode(mode: ModeConfig) {
    if (!mode.enabled) return
    localStorage.setItem(STORAGE_KEY, mode.key)
    setLastUsed(mode.key)
    const params = deckParam ? `?deck=${deckParam}` : ''
    navigate(`${mode.route}${params}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="w-full max-w-2xl">
        {/* Language selector — only render once loaded and multi-language */}
        {!deckParam && decksLoaded && availableLanguages.length > 1 && (
          <div className="flex justify-center mb-4">
            <Select value={activeLanguage ?? ''} onValueChange={setActiveLanguage}>
              <SelectTrigger
                size="sm"
                className="w-[200px] bg-card border-border text-foreground hover:bg-accent focus-visible:ring-0 focus-visible:border-accent"
              >
                <SelectValue placeholder={t('study.language')} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-gray-200">
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang} className="focus:bg-white/10 focus:text-white">
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Deck context — only show when studying a specific deck (language is already in dropdown) */}
        {deckParam && deckName && (
          <p className="text-center text-sm text-gray-400 mb-2">
            {t('study.studyingDeck', { name: deckName })}
          </p>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-8">{t('study.chooseMode')}</h1>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODES.map((mode) => {
            const Icon = mode.icon
            const isLastUsed = lastUsed === mode.key

            return (
              <button
                key={mode.key}
                onClick={() => selectMode(mode)}
                disabled={!mode.enabled}
                className={`
                  study-mode-card
                  relative flex flex-col items-center gap-3 p-6 rounded-2xl border text-center
                  transition-all duration-200 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none
                  ${mode.enabled
                    ? 'border-border bg-card backdrop-blur hover:bg-accent hover:border-accent hover:scale-[1.03] cursor-pointer active:scale-[0.98]'
                    : 'border-border/40 bg-card/40 opacity-40 cursor-not-allowed'
                  }
                `}
              >
                {/* Coming soon badge */}
                {!mode.enabled && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-foreground/10 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t('study.comingSoon')}
                  </span>
                )}

                {/* Icon */}
                <div className={`
                  w-14 h-14 rounded-xl flex items-center justify-center
                  ${mode.enabled ? 'bg-foreground/10' : 'bg-foreground/5'}
                `}>
                  <Icon className={`h-7 w-7 ${mode.enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
                </div>

                {/* Title + description */}
                <div>
                  <h3 className="text-lg font-semibold mb-1">{t(mode.titleKey)}</h3>
                  <p className="text-sm text-gray-400 leading-snug">{t(mode.descKey)}</p>
                </div>

                {/* Last used indicator */}
                {isLastUsed && mode.enabled && (
                  <span className="text-[11px] text-gray-500 mt-1">
                    {t('study.lastUsed')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
