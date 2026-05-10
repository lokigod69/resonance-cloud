import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { DeckMode } from '../engine/types'

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
}

const MODES: Array<{ value: DeckMode; label: string }> = [
  { value: 'audio_to_image', label: 'Image' },
  { value: 'audio_to_text', label: 'Text' },
]

export function DeckPicker({ onSelect }: DeckPickerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeLanguage } = useLanguage()
  const [decks, setDecks] = useState<DeckRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<DeckMode>('audio_to_image')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (!user || !activeLanguage) {
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
        .eq('target_language', activeLanguage)
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
  }, [activeLanguage, user])

  const title = useMemo(() => {
    if (!activeLanguage) return 'Choose a deck'
    return `Choose a ${activeLanguage.toUpperCase()} deck`
  }, [activeLanguage])

  const playAllTitle = activeLanguage?.toLowerCase().startsWith('de') ? 'Alle Wörter' : 'All Words'
  const playAllLabel = activeLanguage?.toLowerCase().startsWith('de') ? 'Alle Wörter spielen' : 'Play all words'

  return (
    <section className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/45 px-4 text-[#fff1d0] backdrop-blur-sm">
      <div className="w-full max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/games')}
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/30 px-4 text-sm text-[#fff1d0] transition hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#ff9155]/70">Lexicon Slice</p>
            <h1 className="font-serif text-4xl leading-none sm:text-6xl">{title}</h1>
          </div>
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

        {loading ? (
          <div className="rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-8 text-center text-[#ffd2a5]/80">
            Loading decks...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-8 text-center text-red-100">{error}</div>
        ) : decks.length === 0 ? (
          <div className="rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 p-8 text-center text-[#ffd2a5]/80">
            No decks are ready for this language.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeLanguage && (
              <button
                type="button"
                onClick={() => onSelect({
                  id: `play-all-${activeLanguage}`,
                  title: playAllTitle,
                  targetLanguage: activeLanguage,
                  mode,
                  isPlayAll: true,
                })}
                className="group aspect-video rounded-lg border border-[rgba(255,215,0,0.42)] bg-[#ff6b35]/10 px-8 py-6 text-center shadow-[0_0_34px_rgba(255,215,0,0.18)] transition hover:bg-[#ff6b35]/15 hover:shadow-[0_0_42px_rgba(255,215,0,0.26)]"
              >
                <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-[rgba(255,215,0,0.48)] bg-black/35 text-[#ffd700] transition group-hover:bg-[#ff6b35]/20">
                  <Play size={17} />
                </span>
                <span className="block truncate font-serif text-2xl leading-tight text-[#ffd700]">{playAllLabel}</span>
                <span className="mt-2 block text-xs uppercase tracking-[0.14em] text-[#ffd2a5]/70">
                  {decks.reduce((total, deck) => total + (deck.word_count ?? 0), 0)} words
                </span>
              </button>
            )}
            {decks.map((deck) => (
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
                <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-[rgba(255,107,53,0.34)] bg-black/35 text-[#ffd700] transition group-hover:bg-[#ff6b35]/20">
                  <Play size={17} />
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
    </section>
  )
}
