import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
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

const MODES: Array<{ value: DeckMode; label: string }> = [
  { value: 'audio_to_image', label: 'Image' },
  { value: 'audio_to_text', label: 'Text' },
]

export function DeckPicker({ easyMode, selectedLanguage, onEasyModeChange, onLanguageChange, onSelect }: DeckPickerProps) {
  const navigate = useNavigate()
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
    Array.from(new Set(decks.map((deck) => deck.target_language).filter(Boolean)))
  ), [decks])

  useEffect(() => {
    if (loading || availableLanguages.length === 0) return
    if (!selectedLanguage || !availableLanguages.includes(selectedLanguage)) {
      onLanguageChange(availableLanguages[0])
    }
  }, [availableLanguages, loading, onLanguageChange, selectedLanguage])

  const filteredDecks = useMemo(() => {
    if (!selectedLanguage) return []
    return decks.filter((deck) => deck.target_language === selectedLanguage)
  }, [decks, selectedLanguage])

  const languageLabel = selectedLanguage ? t(`langName.${selectedLanguage}`) : null

  const title = useMemo(() => {
    if (!languageLabel) return 'Choose a deck'
    return t('slicer.deckPicker.heading', { language: languageLabel })
  }, [languageLabel, t])

  const isGerman = selectedLanguage?.toLowerCase().startsWith('de') ?? false
  const playAllTitle = isGerman ? 'Alle Wörter' : 'All Words'
  const playAllLabel = isGerman ? 'Alle Wörter spielen' : 'Play all words'
  const playAllWordCount = useMemo(() => (
    filteredDecks.reduce((total, deck) => total + (deck.word_count ?? 0), 0)
  ), [filteredDecks])

  return (
    <section className="pointer-events-auto absolute inset-0 z-30 flex bg-black/45 px-4 py-4 text-[#fff1d0] backdrop-blur-sm sm:px-6 sm:py-6">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
        <button
          type="button"
          onClick={() => navigate('/study')}
          className="mb-3 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/30 px-4 text-sm text-[#fff1d0] transition hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="mb-3 flex shrink-0 justify-center">
          <img
            src="/games/slicer/branding/slicer-header.png"
            alt="Slicer"
            width={1600}
            height={400}
            className="h-auto w-[min(720px,94vw)] object-contain"
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
                  className={`min-h-10 rounded-full border px-3 py-2 text-sm transition ${
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
              <span>Easy mode</span>
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
                  className={`min-h-10 rounded-md px-4 text-sm transition ${mode === item.value ? 'bg-[#ff6b35]/25 text-[#ffd700]' : 'text-[#fff1d0]/70 hover:text-[#fff1d0]'}`}
                >
                  {item.label}
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
              {playAllWordCount} words
            </div>
          </div>
        )}

        <div className={`min-h-0 flex-1 overflow-y-auto ${styles.deckScroll}`}>
          {loading ? (
            <div className="rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-8 text-center text-[#ffd2a5]/80">
              Loading decks...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-8 text-center text-red-100">{error}</div>
          ) : filteredDecks.length === 0 ? (
            <div className="rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-8 text-center text-[#ffd2a5]/80">
              No decks are ready for this language.
            </div>
          ) : (
            <div className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDecks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => onSelect({
                    id: deck.id,
                    title: deck.name ?? 'Untitled deck',
                    targetLanguage: deck.target_language,
                    mode,
                  })}
                  className="group aspect-video rounded-lg border border-[rgba(255,107,53,0.24)] bg-[url('/games/slicer/cards/frame-default.png')] bg-[length:100%_100%] px-8 py-6 text-center shadow-[0_0_26px_rgba(255,69,0,0.18)] transition hover:shadow-[0_0_34px_rgba(255,215,0,0.24)]"
                >
                  <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-black/25">
                    <img
                      src="/games/slicer/branding/play-button.png"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="block truncate font-serif text-2xl leading-tight">{deck.name ?? 'Untitled deck'}</span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.14em] text-[#ffd2a5]/70">
                    {deck.word_count ?? 0} words
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
