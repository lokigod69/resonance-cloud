import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { filterLemmaStatesForQueue, isStudyQueue, type StudyQueue } from '@/hooks/useStudySession'
import { useWordStates } from '@/hooks/useWordStates'
import { supabase } from '@/lib/supabase'
import videoIcon from '@/assets/study-mode-icons/video.webp'
import cardsIcon from '@/assets/study-mode-icons/cards.webp'
import audioIcon from '@/assets/study-mode-icons/audio.webp'
import canvasIcon from '@/assets/study-mode-icons/canvas.webp'
import { GAMES } from '@/games/shared/registry'
import { ComingSoonOverlay } from '@/components/games/ComingSoonOverlay'

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
  { key: 'canvas', iconSrc: canvasIcon, titleKey: 'study.mode.canvas', route: '/study/canvas/select', enabled: true },
]

const QUEUE_LABELS: Record<StudyQueue, string> = {
  review: 'Review due',
  learn: 'Learn new',
  strengthen: 'Strengthen',
  mastered: 'Mastered',
}

export default function StudyModeSelector() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const queueParam = searchParams.get('queue')
  const langParam = searchParams.get('lang')
  const queue = isStudyQueue(queueParam) ? queueParam : null
  const { t } = useTranslation()
  const { user } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()

  const [allDecks, setAllDecks] = useState<{ id: string; name: string | null; target_language: string }[]>([])

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

  const selectedDeck = useMemo(
    () => deckParam ? allDecks.find((item) => item.id === deckParam) ?? null : null,
    [deckParam, allDecks],
  )

  const deckName = selectedDeck?.name ?? null
  const { data: wordStates } = useWordStates(activeLanguage ?? '', { deckId: deckParam })
  const queueCount = queue ? filterLemmaStatesForQueue(wordStates, queue).length : 0

  useEffect(() => {
    if (selectedDeck?.target_language) {
      setActiveLanguage(selectedDeck.target_language)
    }
  }, [selectedDeck?.target_language, setActiveLanguage])

  useEffect(() => {
    if (!langParam || !availableLanguages.includes(langParam)) return
    setActiveLanguage(langParam)
  }, [availableLanguages, langParam, setActiveLanguage])

  useEffect(() => {
    if (availableLanguages.length === 0) return
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, setActiveLanguage])

  function selectMode(mode: ModeConfig) {
    if (!mode.enabled) return
    const params = new URLSearchParams()
    if (deckParam) params.set('deck', deckParam)
    if (queue) params.set('queue', queue)
    if ((queue || langParam) && activeLanguage) params.set('lang', activeLanguage)
    const query = params.toString()
    navigate(`${mode.route}${query ? `?${query}` : ''}`)
  }

  function selectGame(route: string) {
    const params = new URLSearchParams()
    params.set('returnTo', '/study')
    if (deckParam) params.set('deck', deckParam)
    if (queue) params.set('queue', queue)
    if (activeLanguage) params.set('lang', activeLanguage)
    navigate(`${route}?${params.toString()}`)
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
          {queue && (
            <p className="mt-3 inline-flex rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Queue: {QUEUE_LABELS[queue]} ({queueCount} words)
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((mode) => {
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
              </button>
            )
          })}
        </div>

        <div className="mt-10 border-t border-border/60 pt-8">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('study.games.section')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {GAMES.filter((game) => game.enabled).map((game) => {
              const isComingSoon = game.comingSoon === true

              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    if (isComingSoon) return
                    selectGame(game.route)
                  }}
                  aria-disabled={isComingSoon}
                  className={`
                    study-mode-card relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6 text-center backdrop-blur transition-all duration-200
                    ${isComingSoon
                      ? 'cursor-not-allowed opacity-75'
                      : 'hover:scale-[1.03] hover:border-accent hover:bg-accent active:scale-[0.98]'
                    }
                  `}
                >
                  {isComingSoon && <ComingSoonOverlay />}
                  <img
                    src={game.iconSrc}
                    alt={t(game.titleKey)}
                    width={88}
                    height={88}
                    loading="eager"
                    decoding="sync"
                    className="h-[88px] w-[88px] rounded-2xl object-contain shadow-[0_0_24px_rgba(255,107,53,0.18)]"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">{t(game.titleKey)}</h3>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
