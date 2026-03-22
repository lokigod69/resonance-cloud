import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sparkles,
  Plus,
  X,
  Shuffle,
  ChevronDown,
  Coins,
  Loader2,
} from 'lucide-react'

const LANGUAGES = [
  { value: 'German', label: 'Deutsch', flag: '\ud83c\udde9\ud83c\uddea' },
  { value: 'French', label: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' },
  { value: 'Italian', label: 'Italiano', flag: '\ud83c\uddee\ud83c\uddf9' },
  { value: 'English', label: 'English', flag: '\ud83c\uddec\ud83c\udde7' },
  { value: 'Bisaya', label: 'Bisaya', flag: '\ud83c\uddf5\ud83c\udded' },
]

const ART_STYLES = [
  { value: 'auto', label: 'Auto' },
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime', label: 'Anime' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'pop_art', label: 'Pop Art' },
]

export default function Generate() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Always fetch fresh credits on mount (profile may be stale from previous navigation)
  useEffect(() => {
    refreshProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [targetLanguage, setTargetLanguage] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [wordInput, setWordInput] = useState('')
  const [artStyle, setArtStyle] = useState('auto')
  const [movieOverride, setMovieOverride] = useState('')
  const [styleOpen, setStyleOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingRandom, setLoadingRandom] = useState(false)

  const credits = profile?.credits ?? 0
  console.log('[Generate] profile:', profile ? { credits: profile.credits, id: profile.id } : 'null', 'user:', user?.id ?? 'no-user')
  const wordCount = words.length
  const canGenerate = wordCount > 0 && !!targetLanguage && !submitting

  function addWord() {
    const w = wordInput.trim()
    if (!w) return
    if (words.some((existing) => existing.toLowerCase() === w.toLowerCase())) {
      setError('Duplicate word')
      return
    }
    if (words.length >= 20) {
      setError('Maximum 20 words per deck')
      return
    }
    setWords([...words, w])
    setWordInput('')
    setError(null)
  }

  function removeWord(index: number) {
    setWords(words.filter((_, i) => i !== index))
  }

  async function handleRandomMix() {
    if (!targetLanguage) return
    setLoadingRandom(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('random_word_lists')
      .select('word')
      .eq('language', targetLanguage)
      .limit(20)

    if (fetchError || !data || data.length === 0) {
      setError('No random words available for this language')
      setLoadingRandom(false)
      return
    }

    // Shuffle and take up to 20
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 20)
    setWords(shuffled.map((r) => r.word))
    setLoadingRandom(false)
  }

  async function handleGenerate() {
    console.log('[Generate] Submit clicked', { words, targetLanguage, profile, credits, user: user?.id })
    if (!canGenerate || !user || !profile) {
      console.warn('[Generate] Guard blocked submit:', { canGenerate, user: !!user, profile: !!profile })
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      // 0. Re-fetch fresh credits to prevent stale-state race conditions
      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (profileError || !freshProfile) throw new Error('Could not verify credit balance')

      const freshCredits = freshProfile.credits ?? 0
      console.log('[Generate] Fresh credits:', freshCredits, 'needed:', wordCount)
      if (freshCredits < wordCount) {
        throw new Error(`Not enough credits. You have ${freshCredits} but need ${wordCount}.`)
      }

      // 1. Create deck
      const deckName = `${targetLanguage} Deck — ${new Date().toLocaleDateString()}`
      const deckPayload = {
        user_id: user.id,
        name: deckName,
        target_language: targetLanguage,
        art_style: artStyle === 'auto' ? null : artStyle,
        movie_override: movieOverride.trim() || null,
        word_count: wordCount,
        status: 'generating',
      }
      console.log('[Generate] Inserting deck:', deckPayload)
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert(deckPayload)
        .select('id')
        .single()
      console.log('[Generate] Deck result:', { deck, deckError })

      if (deckError || !deck) throw new Error(deckError?.message || 'Failed to create deck')

      // 2. Create words
      const wordRows = words.map((w) => ({
        deck_id: deck.id,
        user_id: user.id,
        word: w,
        status: 'pending',
      }))
      console.log('[Generate] Inserting words:', wordRows.length)
      const { error: wordsError } = await supabase.from('words').insert(wordRows)
      console.log('[Generate] Words result:', { wordsError })
      if (wordsError) throw new Error(wordsError.message)

      // 3. Create generation job
      const jobPayload = {
        user_id: user.id,
        deck_id: deck.id,
        status: 'pending',
        target_language: targetLanguage,
        art_style: artStyle === 'auto' ? null : artStyle,
        movie_override: movieOverride.trim() || null,
        words_total: wordCount,
      }
      console.log('[Generate] Inserting job:', jobPayload)
      const { error: jobError } = await supabase.from('generation_jobs').insert(jobPayload)
      console.log('[Generate] Job result:', { jobError })
      if (jobError) throw new Error(jobError.message)

      // 4. Deduct credits (use fresh server value, not stale client state)
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: freshCredits - wordCount })
        .eq('id', user.id)
      if (creditError) throw new Error(creditError.message)

      console.log('[Generate] Success — navigating to deck:', deck.id)
      await refreshProfile()
      navigate(`/deck/${deck.id}`)
    } catch (err: unknown) {
      console.error('[Generate] Error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create a Deck</h1>
          <p className="text-muted-foreground mt-1">
            Choose a language, add words, and let AI create music videos for you.
          </p>
        </div>
        {/* Credit balance */}
        <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 shrink-0">
          <Coins className="h-5 w-5 text-primary" />
          <div>
            <div className="text-2xl font-bold">{credits}</div>
            <div className="text-xs text-muted-foreground">credits</div>
          </div>
        </div>
      </div>

      {/* Target Language */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">What language do you want to learn?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => {
                setTargetLanguage(lang.value)
                setError(null)
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 border ${
                targetLanguage === lang.value
                  ? 'bg-primary/20 border-primary/50 text-primary glow-purple'
                  : 'glass glass-hover border-white/10'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Word Input */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add your words</h2>
          <span className="text-sm text-muted-foreground">{wordCount} of 20</span>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type a word and press Enter"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addWord()
              }
            }}
            className="bg-white/5 border-white/10"
            disabled={words.length >= 20}
          />
          <Button variant="secondary" onClick={addWord} disabled={!wordInput.trim() || words.length >= 20}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRandomMix}
          disabled={!targetLanguage || loadingRandom}
          className="border-white/10"
        >
          {loadingRandom ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4 mr-2" />
          )}
          Surprise Me
        </Button>

        {/* Word chips */}
        {words.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {words.map((word, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="glass text-sm py-1.5 px-3 flex items-center gap-1.5"
              >
                {word}
                <button
                  onClick={() => removeWord(i)}
                  className="hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Style Preferences */}
      <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
        <CollapsibleTrigger asChild>
          <button className="glass rounded-xl p-4 w-full flex items-center justify-between text-sm font-medium hover:bg-white/[0.07] transition-colors">
            <span>Customize Style</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                styleOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="glass rounded-xl rounded-t-none -mt-2 p-6 space-y-4 border-t-0">
            <div className="space-y-2">
              <label className="text-sm font-medium">Art Style</label>
              <Select value={artStyle} onValueChange={setArtStyle}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ART_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Movie / Theme (optional)</label>
              <Input
                placeholder="e.g., The Godfather, Studio Ghibli, Blade Runner..."
                value={movieOverride}
                onChange={(e) => setMovieOverride(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-4 border-destructive/30 bg-destructive/10">
          <p className="text-sm text-destructive-foreground">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <Button
        size="lg"
        className="w-full h-14 text-lg glow-purple"
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 mr-2" />
            Generate {wordCount} Video{wordCount !== 1 ? 's' : ''} — {wordCount}{' '}
            <Coins className="h-4 w-4 mx-1" />
          </>
        )}
      </Button>

      {wordCount > credits && credits > 0 && (
        <p className="text-sm text-center text-destructive-foreground">
          Not enough credits. You have {credits} but need {wordCount}.
        </p>
      )}
    </div>
  )
}
