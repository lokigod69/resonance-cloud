import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import videoIcon from '@/assets/study-mode-icons/video.webp'
import cardsIcon from '@/assets/study-mode-icons/cards.webp'
import audioIcon from '@/assets/study-mode-icons/audio.webp'
import canvasIcon from '@/assets/study-mode-icons/canvas.webp'

const STORAGE_KEY = 'resonance-study-mode'

type ModeConfig = {
  key: string
  iconSrc: string
  titleKey: string
  route: string
  enabled: boolean
}

const MODES: ModeConfig[] = [
  { key: 'video', iconSrc: videoIcon, titleKey: 'study.mode.video', route: '/study/video', enabled: true },
  { key: 'flashcard', iconSrc: cardsIcon, titleKey: 'study.mode.flashcard', route: '/study/flashcard', enabled: true },
  { key: 'audio', iconSrc: audioIcon, titleKey: 'study.mode.audio', route: '/study/audio', enabled: true },
  { key: 'canvas', iconSrc: canvasIcon, titleKey: 'study.mode.canvas', route: '/study/canvas', enabled: true },
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
  const [lastUsed, setLastUsed] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  })

  useEffect(() => {
    if (!user) return
    supabase
      .from('decks')
      .select('id, name, target_language')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setAllDecks(data) })
  }, [user])

  const availableLanguages = useMemo(() =>
    Array.from(new Set(allDecks.map((deck) => deck.target_language))).filter(Boolean),
    [allDecks],
  )

  useEffect(() => {
    if (!deckParam || allDecks.length === 0) return
    const deck = allDecks.find((item) => item.id === deckParam)
    if (deck) {
      setDeckName(deck.name)
      if (deck.target_language) setActiveLanguage(deck.target_language)
    }
  }, [deckParam, allDecks, setActiveLanguage])

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{t('study.chooseMode')}</h1>
          {activeLanguage && (
            <p className="mt-2 text-sm font-medium text-muted-foreground">{activeLanguage}</p>
          )}
          {deckParam && deckName && (
            <p className="mt-1 text-xs text-muted-foreground/80">
              {t('study.studyingDeck', { name: deckName })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((mode) => {
            const isLastUsed = lastUsed === mode.key
            const title = t(mode.titleKey)

            return (
              <button
                key={mode.key}
                onClick={() => selectMode(mode)}
                disabled={!mode.enabled}
                className={`
                  study-mode-card
                  relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center
                  transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30
                  ${mode.enabled
                    ? 'cursor-pointer border-border bg-card backdrop-blur hover:scale-[1.03] hover:border-accent hover:bg-accent active:scale-[0.98]'
                    : 'cursor-not-allowed border-border/40 bg-card/40 opacity-40'
                  }
                `}
              >
                {!mode.enabled && (
                  <span className="absolute right-3 top-3 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('study.comingSoon')}
                  </span>
                )}

                <img
                  src={mode.iconSrc}
                  alt={title}
                  width={88}
                  height={88}
                  loading="eager"
                  decoding="sync"
                  className="h-[88px] w-[88px] rounded-2xl object-contain shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                />

                <h3 className="text-lg font-semibold">{title}</h3>

                {isLastUsed && mode.enabled && (
                  <span className="text-[11px] text-gray-500">
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
