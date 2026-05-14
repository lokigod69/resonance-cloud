import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import styles from '../styles.module.css'

export type RunnerDisplayMode = 'image' | 'text'

export type RunnerDeckChoice = {
  id: string
  title: string
  targetLanguage: string
  displayMode: RunnerDisplayMode
  isPlayAll?: boolean
}

type DeckRow = {
  id: string
  name: string | null
  target_language: string
  word_count: number | null
}

type DeckPickerProps = {
  onSelect: (choice: RunnerDeckChoice) => void
  easyMode: boolean
  selectedLanguage: string | null
  onEasyModeChange: (enabled: boolean) => void
  onLanguageChange: (language: string | null) => void
}

const DISPLAY_MODES: Array<{ value: RunnerDisplayMode; labelKey: string }> = [
  { value: 'image', labelKey: 'games.runner.deckPicker.imageMode' },
  { value: 'text', labelKey: 'games.runner.deckPicker.textMode' },
]

export function DeckPicker({ easyMode, selectedLanguage, onEasyModeChange, onLanguageChange, onSelect }: DeckPickerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [decks, setDecks] = useState<DeckRow[]>([])
  const [loading, setLoading] = useState(true)
  const [displayMode, setDisplayMode] = useState<RunnerDisplayMode>('image')
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
  const title = languageLabel
    ? t('games.runner.deckPicker.heading', { language: languageLabel })
    : t('games.runner.deckPicker.chooseDeck')
  const playAllWordCount = useMemo(() => (
    filteredDecks.reduce((total, deck) => total + (deck.word_count ?? 0), 0)
  ), [filteredDecks])
  const modeHint = easyMode ? t('games.runner.deckPicker.glide') : t('games.runner.deckPicker.rush')
  const selectDisplayMode = (mode: RunnerDisplayMode) => {
    setDisplayMode(mode)
  }

  return (
    <section className="pointer-events-auto absolute inset-0 z-30 flex bg-[#0a1520]/62 px-4 py-4 text-[#d0f0ff] backdrop-blur-sm sm:px-6 sm:py-6">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
        <button
          type="button"
          onClick={() => navigate('/study')}
          className="mb-3 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-[var(--runner-border-subtle)] bg-[#0f2337]/70 px-4 text-sm text-[#a8d8ea] transition hover:border-[var(--runner-border-strong)] hover:bg-[#142d46]/82"
        >
          <ArrowLeft size={16} />
          {t('games.runner.deckPicker.back')}
        </button>

        <div className="mb-3 flex shrink-0 justify-center">
          <img
            src="/games/runner/branding/runner-header.png"
            alt="Runner"
            width={1600}
            height={400}
            className="h-auto w-[min(720px,94vw)] object-contain drop-shadow-[0_0_28px_rgba(79,195,247,0.28)]"
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
                      ? 'border-[rgba(79,195,247,0.78)] bg-[#142d46]/90 text-[#d0f0ff] shadow-[0_0_22px_rgba(79,195,247,0.24),inset_0_0_18px_rgba(79,195,247,0.08)]'
                      : 'border-[var(--runner-border-subtle)] bg-[#0f2337]/56 text-[#a8d8ea]/74 hover:border-[var(--runner-border-strong)] hover:text-[#d0f0ff]'
                  }`}
                >
                  {t(`langName.${language}`)}
                </button>
              )
            })}
          </div>
        )}

        <div className="mb-3 flex shrink-0 flex-col items-center gap-3 text-center">
          <h1 className="font-[var(--runner-font-display)] text-2xl leading-none text-[#d0f0ff] drop-shadow-[0_0_16px_rgba(168,216,234,0.34)] sm:text-4xl">
            {title}
          </h1>
          <div className="flex flex-wrap justify-center gap-2">
            <label
              className={`inline-flex min-h-12 items-center gap-3 rounded-lg border px-4 text-sm shadow-[var(--runner-shadow-soft)] transition ${
                easyMode
                  ? 'border-[rgba(79,195,247,0.78)] bg-[#173956]/92 text-[#d0f0ff]'
                  : 'border-[var(--runner-border-subtle)] bg-[rgba(15,35,55,0.58)] text-[#a8d8ea]/76'
              }`}
            >
              <span>{t('games.runner.deckPicker.easyMode')}</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  easyMode
                    ? 'border-[rgba(79,195,247,0.56)] bg-[#0a1520]/72 text-[#d0f0ff]'
                    : 'border-[var(--runner-border-subtle)] bg-[#0a1520]/42 text-[#a8d8ea]/72'
                }`}
              >
                {modeHint}
              </span>
              <input
                type="checkbox"
                checked={easyMode}
                onChange={(event) => onEasyModeChange(event.currentTarget.checked)}
                className="h-4 w-4 accent-[#4fc3f7]"
              />
            </label>
            <div
              data-runner-interactive="true"
              onPointerDown={(event) => event.stopPropagation()}
              className={styles.displayModeToggle}
            >
              {DISPLAY_MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={displayMode === item.value}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    selectDisplayMode(item.value)
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectDisplayMode(item.value)
                  }}
                  className={`${styles.displayModeButton} ${
                    displayMode === item.value ? styles.displayModeButtonActive : ''
                  }`}
                >
                  {t(item.labelKey)}
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
                title: t('games.runner.deckPicker.allWords'),
                targetLanguage: selectedLanguage,
                displayMode,
                isPlayAll: true,
              })}
              className="group relative min-h-20 w-full overflow-hidden rounded-lg bg-[url('/games/runner/branding/play-all-frame.png')] bg-[length:100%_100%] bg-center px-6 py-3 text-center transition duration-200 hover:scale-[1.01] hover:brightness-110 sm:min-h-24 sm:px-10"
            >
              <span className="relative z-10 flex h-full items-center justify-center">
                <img
                  src="/games/runner/branding/play-all-wordmark.png"
                  alt={t('games.runner.deckPicker.playAll')}
                  width={1200}
                  height={320}
                  className="mx-auto h-auto w-[min(420px,76vw)] object-contain sm:w-[min(560px,68vw)]"
                />
              </span>
            </button>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#a8d8ea]/62">
              {t('games.runner.deckPicker.wordCount', { count: playAllWordCount })}
            </div>
          </div>
        )}

        <div className={`min-h-0 flex-1 overflow-y-auto ${styles.deckScroll}`}>
          {loading ? (
            <div className="rounded-lg border border-[var(--runner-border-strong)] bg-[var(--surface-glass)] p-8 text-center text-[#a8d8ea]/84 shadow-[var(--runner-shadow-soft)]">
              {t('games.runner.deckPicker.loading')}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-[rgba(168,216,234,0.34)] bg-[#0f2337]/82 p-8 text-center text-[#d0f0ff] shadow-[var(--runner-shadow-soft)]">{error}</div>
          ) : filteredDecks.length === 0 ? (
            <div className="rounded-lg border border-[var(--runner-border-strong)] bg-[var(--surface-glass)] p-8 text-center text-[#a8d8ea]/84 shadow-[var(--runner-shadow-soft)]">
              {t('games.runner.deckPicker.empty')}
            </div>
          ) : (
            <div className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDecks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => onSelect({
                    id: deck.id,
                    title: deck.name ?? t('games.runner.deckPicker.untitledDeck'),
                    targetLanguage: deck.target_language,
                    displayMode,
                  })}
                  className="group aspect-video rounded-lg border-2 border-[var(--runner-border-strong)] bg-[rgba(15,35,55,0.85)] bg-[url('/games/runner/cards/frame-default.png')] bg-[length:100%_100%] px-8 py-6 text-center shadow-[var(--runner-shadow-soft)] transition hover:border-[rgba(79,195,247,0.8)] hover:bg-[rgba(20,45,70,0.9)] hover:shadow-[0_0_25px_rgba(79,195,247,0.4),inset_0_0_25px_rgba(79,195,247,0.1)]"
                >
                  <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#0a1520]/30">
                    <img
                      src="/games/runner/branding/play-button.png"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="block truncate font-[var(--runner-font-display)] text-3xl leading-tight text-[#d0f0ff]">{deck.name ?? t('games.runner.deckPicker.untitledDeck')}</span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.14em] text-[#a8d8ea]/70">
                    {t('games.runner.deckPicker.wordCount', { count: deck.word_count ?? 0 })}
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
