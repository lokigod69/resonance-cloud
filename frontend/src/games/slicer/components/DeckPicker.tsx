import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { canonicalizeLanguageValue, languagesMatch } from '@/lib/languages'
import type { DeckMode } from '../engine/types'
import styles from '../styles.module.css'

export type SlicerDeckChoice = {
  id: string
  title: string
  targetLanguage: string
  mode: DeckMode
  isPlayAll?: boolean
}

type DeckRow = {
  id: string
  name: string | null
  target_language: string
  word_count: number | null
}

type DeckPickerProps = {
  onSelect: (choice: SlicerDeckChoice) => void
  easyMode: boolean
  selectedLanguage: string | null
  onEasyModeChange: (enabled: boolean) => void
  onLanguageChange: (language: string | null) => void
}

const MODES: Array<{ value: DeckMode; labelKey: 'imageMode' | 'textMode' }> = [
  { value: 'audio_to_image', labelKey: 'imageMode' },
  { value: 'audio_to_text', labelKey: 'textMode' },
]

export function DeckPicker({ easyMode, selectedLanguage, onEasyModeChange, onLanguageChange, onSelect }: DeckPickerProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Leave the game toward wherever it was launched from (home dive-in passes
  // /dashboard, the study configurator /study) — same contract GameShell uses.
  const returnTo = searchParams.get('returnTo') || '/games'
  const { user } = useAuth()
  const { t } = useTranslation()
  const [decks, setDecks] = useState<DeckRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<DeckMode>('audio_to_image')
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

  const availableLanguages = useMemo(() => (
    Array.from(new Set(decks.map((deck) => canonicalizeLanguageValue(deck.target_language)).filter(Boolean)))
  ), [decks])

  useEffect(() => {
    if (loading || availableLanguages.length === 0) return
    if (!selectedLanguage || !availableLanguages.includes(selectedLanguage)) {
      onLanguageChange(availableLanguages[0])
    }
  }, [availableLanguages, loading, onLanguageChange, selectedLanguage])

  const filteredDecks = useMemo(() => {
    if (!selectedLanguage) return []
    return decks.filter((deck) => languagesMatch(deck.target_language, selectedLanguage))
  }, [decks, selectedLanguage])

  const languageLabel = selectedLanguage ? t(`langName.${selectedLanguage}`) : null

  const title = useMemo(() => {
    if (!languageLabel) return t('slicer.deckPicker.chooseDeck')
    return t('slicer.deckPicker.heading', { language: languageLabel })
  }, [languageLabel, t])

  const isGerman = languagesMatch(selectedLanguage, 'German')
  const playAllTitle = isGerman ? 'Alle Wörter' : 'All Words'
  const playAllLabel = isGerman ? 'Alle Wörter spielen' : 'Play all words'
  const untitledDeck = t('slicer.deckPicker.untitledDeck')
  const playAllWordCount = useMemo(() => (
    filteredDecks.reduce((total, deck) => total + (deck.word_count ?? 0), 0)
  ), [filteredDecks])

  return (
    <section
      className={`pointer-events-auto absolute inset-0 z-30 overflow-y-auto bg-black/45 px-4 pt-[max(0.25rem,var(--app-safe-top))] pb-4 text-[#fff1d0] backdrop-blur-sm sm:px-6 sm:pt-6 sm:pb-6 ${styles.deckScroll}`}
      data-body-scroll-lock-scrollable="true"
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <button
          type="button"
          onClick={() => navigate(returnTo)}
          className="mb-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/30 px-4 text-sm text-[#fff1d0] transition hover:bg-white/10 sm:mb-3"
        >
          <ArrowLeft size={16} />
          {t('slicer.deckPicker.back')}
        </button>
        <div className="mb-3 flex shrink-0 justify-center">
          <img
            src="/games/slicer/branding/slicer-header.png"
            alt="Slicer"
            width={1600}
            height={400}
            className="h-auto w-[min(540px,72vw)] object-contain sm:w-[min(720px,94vw)]"
          />
        </div>
        {availableLanguages.length > 1 && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {availableLanguages.map((language) => {
              const active = language === selectedLanguage
              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => onLanguageChange(language)}
                  className={`min-h-11 rounded-full border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-[rgba(255,215,0,0.55)] bg-[#ff6b35]/20 text-[#ffd700] shadow-[0_0_18px_rgba(255,215,0,0.12)]'
                      : 'border-[rgba(255,107,53,0.2)] bg-black/25 text-[#ffd2a5]/70 hover:border-[rgba(255,107,53,0.38)] hover:text-[#fff1d0]'
                  }`}
                >
                  {t(`langName.${language}`)}
                </button>
              )
            })}
          </div>
        )}
        <div className="mb-3 flex shrink-0 flex-col items-center gap-3 text-center">
          <h1 className="font-serif text-2xl leading-none sm:text-4xl">{title}</h1>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="inline-flex min-h-12 items-center gap-3 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 px-4 text-sm text-[#fff1d0]/80">
              <span>{t('slicer.deckPicker.easyMode')}</span>
              <input
                type="checkbox"
                checked={easyMode}
                onChange={(event) => onEasyModeChange(event.currentTarget.checked)}
                className="h-4 w-4 accent-[#ff6b35]"
              />
            </label>
            <div className="inline-flex rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-1">
              {MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMode(item.value)}
                  className={`min-h-11 rounded-md px-4 text-sm transition ${mode === item.value ? 'bg-[#ff6b35]/25 text-[#ffd700]' : 'text-[#fff1d0]/70 hover:text-[#fff1d0]'}`}
                >
                  {t(`slicer.deckPicker.${item.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {selectedLanguage && !loading && !error && filteredDecks.length > 0 && (
          <div className="mb-4 shrink-0 text-center">
            <button
              type="button"
              onClick={() => onSelect({
                id: `play-all-${selectedLanguage}`,
                title: playAllTitle,
                targetLanguage: selectedLanguage,
                mode,
                isPlayAll: true,
              })}
              className="group relative min-h-20 w-full overflow-hidden rounded-xl bg-[url('/games/slicer/branding/play-all-frame.png')] bg-[length:100%_100%] bg-center px-6 py-3 text-center transition duration-200 hover:scale-[1.01] hover:brightness-110 sm:min-h-24 sm:px-10"
            >
              <span className="relative z-10 flex h-full items-center justify-center">
                <img
                  src="/games/slicer/branding/play-all-wordmark.png"
                  alt={playAllLabel}
                  width={1200}
                  height={320}
                  className="mx-auto h-auto w-[min(420px,76vw)] object-contain sm:w-[min(560px,68vw)]"
                />
              </span>
            </button>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#ffd2a5]/62">
              {t('slicer.deckPicker.wordCount', { count: playAllWordCount })}
            </div>
          </div>
        )}

        <div className="flex-1">
          {loading ? (
            <div className="rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-8 text-center text-[#ffd2a5]/80">
              {t('slicer.deckPicker.loading')}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-8 text-center text-red-100">{error}</div>
          ) : filteredDecks.length === 0 ? (
            <div className="rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-8 text-center text-[#ffd2a5]/80">
              {t('slicer.deckPicker.empty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-[max(1.5rem,calc(var(--app-safe-bottom)+0.5rem))] sm:grid-cols-2 lg:grid-cols-3">
              {filteredDecks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => onSelect({
                    id: deck.id,
                    title: deck.name ?? untitledDeck,
                    targetLanguage: deck.target_language,
                    mode,
                  })}
                  className="group aspect-video w-full min-w-0 rounded-lg border border-[rgba(255,107,53,0.24)] bg-[url('/games/slicer/cards/frame-default.png')] bg-[length:100%_100%] px-8 py-6 text-center shadow-[0_0_26px_rgba(255,69,0,0.18)] transition hover:shadow-[0_0_34px_rgba(255,215,0,0.24)]"
                >
                  <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-black/25">
                    <img
                      src="/games/slicer/branding/play-button.png"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="block truncate font-serif text-2xl leading-tight">{deck.name ?? untitledDeck}</span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.14em] text-[#ffd2a5]/70">
                    {t('slicer.deckPicker.wordCount', { count: deck.word_count ?? 0 })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
