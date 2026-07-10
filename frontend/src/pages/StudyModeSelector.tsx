import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { filterLemmaStatesForQueue, isStudyQueue, type StudyQueue } from '@/hooks/useStudySession'
import { useWordStates } from '@/hooks/useWordStates'
import { supabase } from '@/lib/supabase'
import { canonicalizeLanguageValue } from '@/lib/languages'
import { getScriptsForLanguage } from '@/lib/scriptlab/registry'
import imageIcon from '@/assets/study-mode-icons/video.webp'
import cardsIcon from '@/assets/study-mode-icons/cards.webp'
import audioIcon from '@/assets/study-mode-icons/audio.webp'
import canvasIcon from '@/assets/study-mode-icons/canvas.webp'
import { GAMES } from '@/games/shared/registry'
import { FirstStudyNewWordsPrompt } from '@/components/study/FirstStudyNewWordsPrompt'

type ModeConfig = {
  key: string
  iconSrc?: string
  emblem?: string
  titleKey: string
  route: string
  enabled: boolean
}

// Video is discontinued (hidden from the selector); its study pages remain for the
// Image mode to clone. Each remaining mode is shown only when the words carry what it
// needs — Text and Write are text-only so they are always available; Image needs
// images; Audio needs a Suno song; Canvas is out of scope and always offered.
const MODES: ModeConfig[] = [
  { key: 'text', iconSrc: cardsIcon, titleKey: 'study.mode.text', route: '/study/flashcard', enabled: true },
  { key: 'type', emblem: '✍️', titleKey: 'study.mode.type', route: '/study/type', enabled: true },
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

  const { data: wordStates, counts } = useWordStates(activeLanguage ?? '', { deckId: deckParam })

  // When a queue drove us here (home practice tiles), gate Image/Audio on the words
  // that queue will actually serve — not the whole language scope. Otherwise "Train →
  // Audio" offers a mode whose session draws entirely different words than the tile
  // advertised. Falls back to scope-wide probing for very large queues, where the id
  // list would blow up the query URL and the mismatch risk is negligible anyway.
  const queueWordIds = useMemo(() => {
    if (!queue) return null
    const ids = filterLemmaStatesForQueue(wordStates, queue).flatMap((lemma) => lemma.wordIds)
    return ids.length <= 150 ? ids : null
  }, [queue, wordStates])

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
    // Queue known and empty → nothing this session could show; keep Image/Audio hidden.
    if (queueWordIds !== null && queueWordIds.length === 0) return
    let cancelled = false

    const probeBase = () => {
      const query = supabase
        .from('words')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'complete')
      return queueWordIds !== null
        ? query.in('id', queueWordIds)
        : query.in('deck_id', scopeDeckIds)
    }

    void probeBase()
      .not('thumbnail_url', 'is', null)
      .limit(1)
      .then(({ data }) => { if (!cancelled) setHasImages((data?.length ?? 0) > 0) })

    void probeBase()
      .or('suno_storage_url.not.is.null,suno_audio_url.not.is.null')
      .limit(1)
      .then(({ data }) => { if (!cancelled) setHasAudio((data?.length ?? 0) > 0) })

    return () => { cancelled = true }
  }, [user, scopeDeckIds, queueWordIds])

  const visibleModes = MODES.filter((mode) => {
    if (mode.key === 'text' || mode.key === 'type' || mode.key === 'canvas') return true
    if (mode.key === 'image') return hasImages
    if (mode.key === 'audio') return hasAudio
    return false
  })
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

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 [&>*:last-child:nth-child(odd)]:justify-self-center [&>*:last-child:nth-child(odd)]:w-[calc(50%-0.375rem)] sm:[&>*:last-child:nth-child(odd)]:w-[160px]">
          {visibleModes.map((mode) => {
            const title = t(mode.titleKey)

            return (
              <button
                key={mode.key}
                onClick={() => selectMode(mode)}
                disabled={!mode.enabled}
                className={`
                  study-mode-card
                  relative flex min-h-[150px] w-full sm:min-h-[180px] sm:w-[160px] flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center
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

                {mode.iconSrc ? (
                  <img
                    src={mode.iconSrc}
                    alt={title}
                    width={88}
                    height={88}
                    loading="eager"
                    decoding="sync"
                    className="h-[88px] w-[88px] rounded-2xl object-contain shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl text-5xl shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                  >
                    {mode.emblem}
                  </span>
                )}

                <h3 className="text-lg font-semibold">{title}</h3>
              </button>
            )
          })}

          {/* Script Lab: offered whenever the active language has a registered
              writing system (e.g. Korean → Hangul). Static content, no deck
              or asset gating needed. */}
          {getScriptsForLanguage(activeLanguage).map((entry) => (
            <button
              key={entry.id}
              onClick={() => navigate(`/alphabet/${entry.id}`)}
              className="study-mode-card relative flex min-h-[150px] w-full sm:min-h-[180px] sm:w-[160px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6 text-center backdrop-blur transition-all duration-200 hover:scale-[1.03] hover:border-accent hover:bg-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              <span
                aria-hidden="true"
                className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl text-5xl font-bold text-[var(--accent)] shadow-[0_0_24px_var(--accent-glow)]"
              >
                {entry.emblem}
              </span>
              <h3 className="text-lg font-semibold">{t('study.mode.script')}</h3>
            </button>
          ))}
        </div>

        {!isImagelessDeck && (
        <div className="mt-10 border-t border-border/60 pt-8">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('study.games.section')}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {GAMES.filter((game) => game.enabled).map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => selectGame(game.route)}
                className="study-mode-card relative flex min-h-[180px] w-[160px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6 text-center backdrop-blur transition-all duration-200 hover:scale-[1.03] hover:border-accent hover:bg-accent active:scale-[0.98]"
              >
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
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
