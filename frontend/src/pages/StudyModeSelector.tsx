import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { filterLemmaStatesForQueue, isStudyQueue, type StudyQueue } from '@/hooks/useStudySession'
import { useWordStates } from '@/hooks/useWordStates'
import { supabase } from '@/lib/supabase'
import { canonicalizeLanguageValue } from '@/lib/languages'
import imageIcon from '@/assets/study-mode-icons/video.webp'
import cardsIcon from '@/assets/study-mode-icons/cards.webp'
import audioIcon from '@/assets/study-mode-icons/audio.webp'
import canvasIcon from '@/assets/study-mode-icons/canvas.webp'
import { GAMES } from '@/games/shared/registry'
import { ComingSoonOverlay } from '@/components/games/ComingSoonOverlay'
import { FirstStudyNewWordsPrompt } from '@/components/study/FirstStudyNewWordsPrompt'

type ModeConfig = {
  key: string
  iconSrc: string
  titleKey: string
  route: string
  enabled: boolean
}

// Video is discontinued (hidden from the selector); its study pages remain for the
// Image mode to clone. Each remaining mode is shown only when the words carry what it
// needs — Text is text-only so it is always available; Image needs images; Audio needs
// a Suno song; Canvas is out of scope and always offered.
const MODES: ModeConfig[] = [
  { key: 'text', iconSrc: cardsIcon, titleKey: 'study.mode.text', route: '/study/flashcard', enabled: true },
  { key: 'image', iconSrc: imageIcon, titleKey: 'study.mode.image', route: '/study/image', enabled: true },
  { key: 'audio', iconSrc: audioIcon, titleKey: 'study.mode.audio', route: '/study/audio', enabled: true },
  { key: 'canvas', iconSrc: canvasIcon, titleKey: 'study.mode.canvas', route: '/study/canvas/select', enabled: true },
]

const QUEUE_LABEL_KEYS: Record<StudyQueue, string> = {
  review: 'study.queue.review',
  learn: 'study.queue.learn',
  strengthen: 'study.queue.strengthen',
  mastered: 'study.queue.mastered',
}

export default function StudyModeSelector() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const queueParam = searchParams.get('queue')
  const langParam = searchParams.get('lang')
  const queue = isStudyQueue(queueParam) ? queueParam : null
  const { t, tp } = useTranslation()
  const { user } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()

  const [allDecks, setAllDecks] = useState<{ id: string; name: string | null; target_language: string; deck_type: string | null }[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('decks')
      .select('id, name, target_language, deck_type')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setAllDecks(data) })
  }, [user])

  const availableLanguages = useMemo(() =>
    Array.from(new Set(allDecks.map((deck) => canonicalizeLanguageValue(deck.target_language)))).filter(Boolean),
    [allDecks],
  )

  const selectedDeck = useMemo(
    () => deckParam ? allDecks.find((item) => item.id === deckParam) ?? null : null,
    [deckParam, allDecks],
  )

  const deckName = selectedDeck?.name ?? null
  const isImagelessDeck = selectedDeck?.deck_type === 'card_text'

  // The decks a session here would draw from: the selected deck, or every deck in the
  // active language. Used to gate modes on the words' real assets.
  const scopeDeckIds = useMemo(() => {
    if (deckParam) return [deckParam]
    if (!activeLanguage) return []
    return allDecks
      .filter((deck) => canonicalizeLanguageValue(deck.target_language) === activeLanguage)
      .map((deck) => deck.id)
  }, [deckParam, activeLanguage, allDecks])

  // Real asset presence across the scope. Two cheap existence probes (limit 1) so the
  // selector can hide Image/Audio when no word carries them.
  const [hasImages, setHasImages] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  useEffect(() => {
    // Reset on every scope change so a stale flag from the previous deck/language can't
    // briefly offer Image/Audio for a scope that doesn't have them.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset-on-key pattern; cleared before the async probes resolve
    setHasImages(false)
    setHasAudio(false)
    if (!user || scopeDeckIds.length === 0) return
    let cancelled = false

    void supabase
      .from('words')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .in('deck_id', scopeDeckIds)
      .not('thumbnail_url', 'is', null)
      .limit(1)
      .then(({ data }) => { if (!cancelled) setHasImages((data?.length ?? 0) > 0) })

    void supabase
      .from('words')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .in('deck_id', scopeDeckIds)
      .or('suno_storage_url.not.is.null,suno_audio_url.not.is.null')
      .limit(1)
      .then(({ data }) => { if (!cancelled) setHasAudio((data?.length ?? 0) > 0) })

    return () => { cancelled = true }
  }, [user, scopeDeckIds])

  const visibleModes = MODES.filter((mode) => {
    if (mode.key === 'text' || mode.key === 'canvas') return true
    if (mode.key === 'image') return hasImages
    if (mode.key === 'audio') return hasAudio
    return false
  })

  const { data: wordStates, counts } = useWordStates(activeLanguage ?? '', { deckId: deckParam })
  const queueLabel = queue ? t(QUEUE_LABEL_KEYS[queue]) : null
  // Words this session would study: the queue's set when a queue is chosen, otherwise
  // everything due now (new-due + learning + reviewing/mastered-due) — the same buckets
  // the study session draws from.
  const sessionWordCount = queue
    ? filterLemmaStatesForQueue(wordStates, queue).length
    : counts.newDue + counts.totalDue

  useEffect(() => {
    if (selectedDeck?.target_language) {
      setActiveLanguage(canonicalizeLanguageValue(selectedDeck.target_language))
    }
  }, [selectedDeck?.target_language, setActiveLanguage])

  useEffect(() => {
    const canonicalLangParam = canonicalizeLanguageValue(langParam)
    if (!canonicalLangParam || activeLanguage === canonicalLangParam) return
    setActiveLanguage(canonicalLangParam)
  }, [activeLanguage, langParam, setActiveLanguage])

  useEffect(() => {
    if (availableLanguages.length === 0) return
    if (langParam) return
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, langParam, setActiveLanguage])

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
      <FirstStudyNewWordsPrompt />
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
          {queue && queueLabel ? (
            <p className="mt-3 inline-flex rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {t('study.queue.header', { label: queueLabel, count: sessionWordCount })}
            </p>
          ) : sessionWordCount > 0 ? (
            <p className="mt-3 inline-flex rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {tp('study.session.words', sessionWordCount)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {visibleModes.map((mode) => {
            const title = t(mode.titleKey)

            return (
              <button
                key={mode.key}
                onClick={() => selectMode(mode)}
                disabled={!mode.enabled}
                className={`
                  study-mode-card
                  relative flex min-h-[180px] w-[160px] flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center
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

        {!isImagelessDeck && (
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
        )}
      </div>
    </div>
  )
}
