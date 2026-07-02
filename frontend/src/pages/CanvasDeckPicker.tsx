import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { filterLemmaStatesForQueue, isStudyQueue } from '@/hooks/useStudySession'
import { useWordStates } from '@/hooks/useWordStates'
import { supabase } from '@/lib/supabase'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { canonicalizeLanguageValue, languagesMatch } from '@/lib/languages'
import canvasIcon from '@/assets/study-mode-icons/canvas.webp'

const LAST_DECK_STORAGE_PREFIX = 'resonance-canvas-last-deck'
const ALL_WORDS_KEY = 'all'

type DeckRow = {
  id: string
  name: string | null
  target_language: string
  word_count: number | null
}

type CanvasModeOption = {
  id: 'ember' | 'frost' | 'syndicate' | 'zen' | 'wave'
  label: string
}

const CANVAS_MODE_OPTIONS: CanvasModeOption[] = [
  { id: 'wave', label: 'Wave' },
  { id: 'ember', label: 'Ember' },
  { id: 'frost', label: 'Frost' },
  { id: 'syndicate', label: 'Syndicate' },
  { id: 'zen', label: 'Zen' },
]

function loadLastDeckKey(language: string | null): string | null {
  if (!language) return null
  try {
    return localStorage.getItem(`${LAST_DECK_STORAGE_PREFIX}-${language}`)
  } catch {
    return null
  }
}

function saveLastDeckKey(language: string | null, value: string) {
  if (!language) return
  try {
    localStorage.setItem(`${LAST_DECK_STORAGE_PREFIX}-${language}`, value)
  } catch {
    // localStorage unavailable; non-fatal
  }
}

export default function CanvasDeckPicker() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const [searchParams] = useSearchParams()
  const forwardedDeck = searchParams.get('deck')
  const forwardedQueue = searchParams.get('queue')
  const queue = isStudyQueue(forwardedQueue) ? forwardedQueue : null
  const forwardedLanguage = searchParams.get('lang')

  const [decks, setDecks] = useState<DeckRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (!user) {
        setDecks([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)

      supabase
        .from('decks')
        .select('id, name, target_language, word_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error: decksError }) => {
          if (cancelled) return
          if (decksError) {
            setError(decksError.message)
            setDecks([])
          } else {
            setDecks((data ?? []) as DeckRow[])
          }
          setLoading(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const canonicalForwardedLanguage = canonicalizeLanguageValue(forwardedLanguage)
    if (!queue || !canonicalForwardedLanguage || activeLanguage === canonicalForwardedLanguage) return
    setActiveLanguage(canonicalForwardedLanguage)
  }, [activeLanguage, forwardedLanguage, queue, setActiveLanguage])

  const availableLanguages = useMemo(
    () => Array.from(new Set(decks.map((deck) => canonicalizeLanguageValue(deck.target_language)).filter(Boolean))),
    [decks],
  )

  // If activeLanguage isn't in the user's decks, fall back to the first available.
  useEffect(() => {
    if (loading || availableLanguages.length === 0) return
    const canonicalForwardedLanguage = canonicalizeLanguageValue(forwardedLanguage)
    if (canonicalForwardedLanguage && availableLanguages.includes(canonicalForwardedLanguage)) {
      setActiveLanguage(canonicalForwardedLanguage)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, forwardedLanguage, loading, activeLanguage, setActiveLanguage])

  const filteredDecks = useMemo(() => {
    if (!activeLanguage) return []
    return decks.filter((deck) => languagesMatch(deck.target_language, activeLanguage))
  }, [decks, activeLanguage])

  const languageLabel = activeLanguage ? t(`langName.${activeLanguage}`) : null
  const heading = queue
    ? t('study.mode.canvas')
    : languageLabel
    ? t('study.canvas.deckPicker.heading', { language: languageLabel })
    : t('study.canvas.deckPicker.chooseDeck')

  const allWordsCount = useMemo(
    () => filteredDecks.reduce((total, deck) => total + (deck.word_count ?? 0), 0),
    [filteredDecks],
  )
  const { data: wordStates, loading: wordStatesLoading } = useWordStates(queue ? activeLanguage ?? '' : '', {
    deckId: queue ? forwardedDeck : null,
  })
  const queueCount = queue ? filterLemmaStatesForQueue(wordStates, queue).length : 0
  const queueLabel = queue ? t(`study.queue.${queue}`) : null

  // Last-picked highlight: forwarded ?deck= takes precedence; otherwise localStorage.
  const lastDeckKey = useMemo(() => {
    if (forwardedDeck && filteredDecks.some((d) => d.id === forwardedDeck)) {
      return forwardedDeck
    }
    return loadLastDeckKey(activeLanguage)
  }, [activeLanguage, forwardedDeck, filteredDecks])

  function goToCanvas(deckId: string | null, mode?: CanvasModeOption['id']) {
    if (!queue) saveLastDeckKey(activeLanguage, deckId ?? ALL_WORDS_KEY)
    const params = new URLSearchParams()
    const language = canonicalizeLanguageValue(forwardedLanguage ?? activeLanguage)
    if (deckId) params.set('deck', deckId)
    if (queue) params.set('queue', queue)
    if (language) params.set('lang', language)
    if (mode) params.set('mode', mode)
    params.set('returnTo', '/study/canvas/select')
    navigate(`/study/canvas?${params.toString()}`)
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center px-6 py-6">
      <div className="w-full max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/study')}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground/80 transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {t('study.canvas.deckPicker.back')}
        </button>

        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src={canvasIcon}
            alt=""
            aria-hidden="true"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-2xl object-contain shadow-[0_0_24px_rgba(59,130,246,0.18)]"
          />
          <h1 className="text-2xl font-bold">{heading}</h1>
        </div>

        {queue ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
            <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
              {queueLabel
                ? t('study.queue.header', { label: queueLabel, count: wordStatesLoading ? '...' : queueCount })
                : null}
            </div>
            <h2 className="text-lg font-semibold">{t('study.queue.canvasChooseAesthetic')}</h2>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {CANVAS_MODE_OPTIONS.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => goToCanvas(forwardedDeck, mode.id)}
                  className="study-mode-card min-h-[112px] rounded-2xl border border-border bg-card p-5 text-center text-lg font-semibold transition-all duration-200 hover:scale-[1.02] hover:border-accent hover:bg-accent active:scale-[0.98]"
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>

        {availableLanguages.length > 1 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {availableLanguages.map((lang) => {
              const isActive = lang === activeLanguage
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLanguage(lang)}
                  className={`min-h-[40px] rounded-full border px-3 py-2 text-sm transition-all ${
                    isActive
                      ? 'border-foreground/40 bg-foreground/15 text-foreground shadow-sm'
                      : 'border-foreground/10 text-foreground/60 hover:border-foreground/25 hover:text-foreground/90'
                  }`}
                >
                  {t(`langName.${lang}`)}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
          <LingwaveLoader size={80} className="py-0" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-base font-medium text-foreground/80">
              {t('study.canvas.deckPicker.emptyTitle')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/generate')}
              className="min-h-[44px] rounded-full border border-foreground/20 bg-foreground/5 px-5 text-sm font-semibold text-foreground transition hover:bg-foreground/15"
            >
              {t('study.canvas.deckPicker.emptyAction')}
            </button>
          </div>
        ) : (
          <>
            {/* Hero row — Phase 1 holds only "All words"; Phase 2 (Suggested, Review wrong,
                Continue last session) can slot in as additional flex children without restructure. */}
            <div className="mb-6 flex flex-wrap gap-4">
              {(() => {
                const isLastPicked = lastDeckKey === ALL_WORDS_KEY
                return (
                  <button
                    type="button"
                    onClick={() => goToCanvas(null)}
                    className={`group relative flex-1 basis-full overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-200 hover:scale-[1.01] hover:bg-accent active:scale-[0.99] ${
                      isLastPicked
                        ? 'border-foreground/50 bg-foreground/10 shadow-[0_0_24px_rgba(59,130,246,0.15)]'
                        : 'border-foreground/25 bg-foreground/[0.04] hover:border-foreground/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold">
                          {t('study.canvas.deckPicker.allWords')}
                        </h3>
                        {languageLabel && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('study.canvas.deckPicker.allWordsSubtitle', { language: languageLabel })}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/70">
                        {t('study.canvas.deckPicker.wordCount', { count: allWordsCount })}
                      </span>
                    </div>
                  </button>
                )
              })()}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDecks.map((deck) => {
                const isLastPicked = lastDeckKey === deck.id
                const name = deck.name ?? t('study.canvas.deckPicker.untitledDeck')
                return (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => goToCanvas(deck.id)}
                    className={`study-mode-card relative flex min-h-[140px] flex-col items-start justify-between gap-3 rounded-2xl border p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:border-accent hover:bg-accent active:scale-[0.98] ${
                      isLastPicked
                        ? 'border-foreground/40 bg-foreground/[0.06] shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                        : 'border-border bg-card'
                    }`}
                  >
                    <h3 className="text-base font-semibold leading-tight">{name}</h3>
                    <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {t('study.canvas.deckPicker.wordCount', { count: deck.word_count ?? 0 })}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
          </>
        )}
      </div>
    </div>
  )
}
