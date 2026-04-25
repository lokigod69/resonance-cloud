import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { LANGUAGES, VIBES, ART_STYLE_GROUPS, MAX_WORDS } from '@/components/generate/wizardData'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { submitGeneration } from '@/components/generate/submitGeneration'
import { useQueuePosition } from '@/hooks/useQueuePosition'
import { useTranslation } from '@/hooks/useTranslation'
import { GenerationWheelLoader } from '@/components/ui/GenerationWheelLoader'
import type { GeneratePayload, ExistingDeck, WizardState, WizardAction } from '@/components/generate/useWizardState'
import WordsStep from '@/components/generate/steps/WordsStep'

const GO_GENRES = [
  { value: 'auto', label: 'Auto' },
  { value: 'pop', label: 'Pop' },
  { value: 'hip-hop', label: 'Hip-Hop' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'rock', label: 'Rock' },
  { value: 'techno', label: 'Techno' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'custom', label: 'Custom' },
]

export default function GenerateGO() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { activeLanguage } = useLanguage()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)

  // Selections
  const [language, setLanguage] = useState<string | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [vibe, setVibe] = useState<string | null>(null)
  const [movieTitle, setMovieTitle] = useState('')
  const [showMovieInput, setShowMovieInput] = useState(false)
  const [artStyle, setArtStyle] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [genre, setGenre] = useState<string | null>(null)
  const [lyricMode, setLyricMode] = useState<string | null>(null)
  const [customGenre, setCustomGenre] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [deckName, setDeckName] = useState('')

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [generatedDeckId, setGeneratedDeckId] = useState<string | null>(null)
  const hasNavigatedToDeckRef = useRef(false)

  // "Add Cards" mode: existing deck via ?deckId=xxx
  const [searchParams] = useSearchParams()
  const deckIdParam = searchParams.get('deckId')
  const [existingDeck, setExistingDeck] = useState<ExistingDeck | null>(null)

  useEffect(() => {
    if (!deckIdParam) return
    supabase
      .from('decks')
      .select('id, name, target_language, art_style, movie_override, word_count')
      .eq('id', deckIdParam)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingDeck(data)
          setLanguage(data.target_language)
          setStep(2) // skip language selection
        }
      })
  }, [deckIdParam])

  // Pre-seed from LanguageContext (fires when context resolves async). Only seeds if
  // the local language state is still empty — never overwrites a manual choice.
  useEffect(() => {
    if (deckIdParam) return
    if (language) return
    if (!activeLanguage) return

    const timeoutId = window.setTimeout(() => {
      setLanguage(activeLanguage)
      setStep(2)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [deckIdParam, language, activeLanguage])

   const queueDeckId = generatedDeckId ?? existingDeck?.id ?? null
   const { jobStatus, jobsAhead, queuePaused, hasChecked, shouldShowQueue } = useQueuePosition(queueDeckId ?? undefined, {
     enabled: generated && !!queueDeckId,
   })

   useEffect(() => {
     if (!generated || !queueDeckId || hasNavigatedToDeckRef.current) return
     if (jobStatus === 'processing' || (hasChecked && !jobStatus && !shouldShowQueue)) {
       hasNavigatedToDeckRef.current = true
       navigate(`/deck/${queueDeckId}`)
     }
   }, [generated, hasChecked, jobStatus, navigate, queueDeckId, shouldShowQueue])

  // Scroll refs
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const ref = sectionRefs.current[step - 1]
    if (ref) {
      setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    }
  }, [step])

  // ── Orb class helper ──────────────────────────────

  function orbClass(stepNum: number, value: string, selected: string | null) {
    if (step > stepNum) {
      return value === selected ? 'gen-orb selected breadcrumb' : 'gen-orb ignored'
    }
    return value === selected ? 'gen-orb selected' : 'gen-orb'
  }

  // ── Step 1: Language ──────────────────────────────

  function handleLanguageSelect(value: string) {
    if (existingDeck) return // language is locked when adding to existing deck
    if (step > 1 && language === value) {
      setLanguage(null)
      setStep(1)
      return
    }
    setLanguage(value)
    setStep(2)
  }

  // ── Step 2: Words ─────────────────────────────────

  // Adapter so the shared WordsStep (which expects WizardState/WizardAction)
  // can drive GenerateGO's local useState-based flow.
  const wordsStepState = {
    words,
    language,
    vibe: null,
    artStyle: null,
    genre: null,
    movieTitle: '',
    deckName: '',
    path: 'undecided',
  } as unknown as WizardState

  const wordsStepDispatch: React.Dispatch<WizardAction> = (action) => {
    switch (action.type) {
      case 'ADD_WORD':
        setWords(prev =>
          prev.some(w => w.toLowerCase() === action.word.toLowerCase())
            ? prev
            : [...prev, action.word].slice(0, MAX_WORDS),
        )
        break
      case 'REMOVE_WORD':
        setWords(prev => prev.filter((_, i) => i !== action.index))
        break
      case 'SET_WORDS':
        setWords(action.words.slice(0, MAX_WORDS))
        break
      case 'CHOOSE_PATH':
        if (action.path === 'custom') setStep(3)
        // 'quick' is handled via onQuickGenerate prop below
        break
      default:
        break
    }
  }

  // ── Step 3: Vibe ──────────────────────────────────

  function handleVibeSelect(value: string) {
    if (step > 3 && vibe === value) {
      setVibe(null)
      setMovieTitle('')
      setShowMovieInput(false)
      setStep(3)
      return
    }
    setVibe(value)
    if (value === 'specific_movie') {
      setShowMovieInput(true)
    } else {
      setShowMovieInput(false)
      setMovieTitle('')
      setStep(4)
    }
  }

  function handleMovieConfirm() {
    if (movieTitle.trim()) {
      setShowMovieInput(false)
      setStep(4)
    }
  }

  // ── Step 4: Art Style ─────────────────────────────

  function handleCategoryClick(groupName: string) {
    setExpandedCategory(prev => prev === groupName ? null : groupName)
  }

  function handleArtStyleSelect(value: string | null) {
    setArtStyle(value)
    setExpandedCategory(null)
    setStep(5)
  }

  // ── Step 5: Niveau ────────────────────────────────

  function handleLyricModeSelect(value: string | null) {
    setLyricMode(value)
    setStep(6)
  }

  // ── Step 6: Genre ─────────────────────────────────

  function handleGenreSelect(value: string) {
    if (step > 6 && genre === value) {
      setGenre(null)
      setCustomGenre('')
      setShowCustomInput(false)
      setStep(6)
      return
    }
    setGenre(value)
    if (value === 'custom') {
      setShowCustomInput(true)
    } else {
      setShowCustomInput(false)
      setStep(7)
    }
  }

  function handleCustomGenreConfirm() {
    if (customGenre.trim()) {
      setGenre(customGenre.trim())
      setShowCustomInput(false)
      setStep(7)
    }
  }

  // ── Step 7: Submit ────────────────────────────────

  async function handleInitialize(wordsOverride?: string[]) {
    const isQuickGenerate = wordsOverride !== undefined
    const effectiveWords = wordsOverride ?? words
    if (!user || !language || effectiveWords.length === 0) return

    setSubmitting(true)
    setError(null)

    try {
      const movieOverride =
        !isQuickGenerate && (vibe === 'movie' || vibe === 'specific_movie')
          ? movieTitle.trim() || null
          : null
      const creativeDirection =
        isQuickGenerate ? undefined
          : vibe === 'specific_movie' ? 'movie'
          : vibe === 'auto' ? undefined
          : vibe || undefined
      const genreValue =
        isQuickGenerate ? undefined
          : genre === 'auto' ? undefined
          : genre === 'custom' ? customGenre.trim() || undefined
          : genre || undefined
      const artStyleValue = isQuickGenerate ? null : artStyle

      const payload: GeneratePayload = {
        deckPayload: existingDeck ? null : {
          user_id: user.id,
          name: deckName.trim() || `${language} Deck — ${new Date().toLocaleDateString()}`,
          target_language: language,
          art_style: artStyleValue,
          movie_override: movieOverride,
          word_count: effectiveWords.length,
          status: 'generating',
        },
        wordList: effectiveWords,
        jobPayload: {
          user_id: user.id,
          ...(existingDeck ? { deck_id: existingDeck.id } : {}),
          status: 'pending',
          target_language: language,
          art_style: artStyleValue ?? existingDeck?.art_style ?? null,
          movie_override: movieOverride ?? existingDeck?.movie_override ?? null,
          words_total: effectiveWords.length,
          settings_override: {
            ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
            ...(genreValue ? { genre: genreValue } : {}),
            ...(!isQuickGenerate && lyricMode ? { lyric_mode: lyricMode } : {}),
          },
        },
      }

      const targetDeckId = await submitGeneration(
        user.id,
        payload,
        existingDeck ?? undefined,
        { cachedCredits: profile?.credits }
      )
      await refreshProfile()
      setGeneratedDeckId(targetDeckId)
      setGenerated(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast(msg, 'error')
      setSubmitting(false)
    }
  }

  // ── Render helpers ────────────────────────────────

  const credits = profile?.credits

  function findStyleLabel(value: string): string {
    for (const g of ART_STYLE_GROUPS) {
      const found = g.styles.find(s => s.value === value)
      if (found) return found.label
    }
    return value
  }

   if (generated) {
     return (
       <div className="gen-container">
         <div className="gen-section" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
              <GenerationWheelLoader
                label={t('generate.forgingMemories')}
                labelClassName="text-[var(--go-text-primary)]"
                sublabel={existingDeck
                  ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
                  : `${t('generate.deckBeingCreated')} ${t('generate.backgroundNotice')}`}
              />
              {hasChecked && queuePaused && (
                <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                  {t('queue.paused')}
                </p>
              )}
              {hasChecked && !queuePaused && typeof jobsAhead === 'number' && jobsAhead > 0 && (
                <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                  {jobsAhead} {t('queue.jobsAhead')}
                </p>
              )}

              <button
                type="button"
                className="gen-orb selected breadcrumb"
                style={{ marginTop: 20 }}
                onClick={() => navigate(queueDeckId ? `/deck/${queueDeckId}` : existingDeck ? `/deck/${existingDeck.id}` : '/dashboard')}
              >
                {queueDeckId ? t('generate.backToDeck') : t('common.backToDecks')}
              </button>
            </div>
          </div>
        </div>
      )
    }

  // ── Render ────────────────────────────────────────

  return (
    <div className="gen-container">
      {/* ── Step 1: Language ── */}
      <div ref={el => { sectionRefs.current[0] = el }} className="gen-section">
        {step === 1 && <h3>Choose Language Orbit</h3>}
        <div className="gen-orb-row">
          {LANGUAGES.map(lang => (
            <div
              key={lang.value}
              className={orbClass(1, lang.value, language)}
              onClick={() => handleLanguageSelect(lang.value)}
            >
              <FlagIcon code={lang.code} className="w-10 h-auto" />
              <span className="gen-orb-label">{lang.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 2: Words ── */}
      {step >= 2 && (
        <div ref={el => { sectionRefs.current[1] = el }} className="gen-section">
          {step === 2 ? (
            <div className="glass-card">
              <WordsStep
                state={wordsStepState}
                dispatch={wordsStepDispatch}
                onQuickGenerate={(words) => handleInitialize(words)}
              />
              <p style={{ textAlign: 'center', color: 'var(--go-text-secondary)', fontSize: '0.8rem', marginTop: 12 }}>
                {words.length}/{MAX_WORDS} words · {typeof credits === 'number' ? `${credits} credits available` : 'Credits check on generate'}
              </p>
            </div>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(2)}>
                {words.length} word{words.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Vibe ── */}
      {step >= 3 && (
        <div ref={el => { sectionRefs.current[2] = el }} className="gen-section">
          {step === 3 && <h3>Select Visual Context</h3>}
          <div className="gen-orb-row">
            {VIBES.map(v => (
              <div
                key={v.value}
                className={orbClass(3, v.value, vibe)}
                onClick={() => handleVibeSelect(v.value)}
              >
                {v.label}
              </div>
            ))}
          </div>
          {showMovieInput && step === 3 && (
            <div className="gen-orb-row" style={{ marginTop: 16 }}>
              <div className="gen-orb input-orb">
                <input
                  value={movieTitle}
                  onChange={e => setMovieTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMovieConfirm()}
                  placeholder="Movie name..."
                  autoFocus
                />
              </div>
              <div className="gen-orb forge-btn check-btn" onClick={handleMovieConfirm}>
                ✓
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Art Style ── */}
      {step >= 4 && (
        <div ref={el => { sectionRefs.current[3] = el }} className="gen-section">
          {step === 4 ? (
            <>
              <h3>Art Style</h3>
              {/* Auto + Category orbs */}
              <div className="gen-orb-row" style={{ marginBottom: 24 }}>
                <div
                  className="gen-orb"
                  onClick={() => handleArtStyleSelect(null)}
                  style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}
                >
                  Auto
                </div>
                {ART_STYLE_GROUPS.map(group => (
                  <div
                    key={group.group}
                    className={`gen-orb${expandedCategory === group.group ? ' selected' : ''}`}
                    onClick={() => handleCategoryClick(group.group)}
                  >
                    {group.group.split('&')[0].trim()}
                  </div>
                ))}
              </div>
              {/* Expanded category styles */}
              {ART_STYLE_GROUPS.map(group => (
                <div
                  key={group.group}
                  className={`gen-category-expand${expandedCategory === group.group ? ' open' : ''}`}
                >
                  <p className="art-group-heading">{group.group}</p>
                  <div className="gen-orb-row">
                    {group.styles.map(style => (
                      <div
                        key={style.value}
                        className={artStyle === style.value ? 'gen-orb selected' : 'gen-orb'}
                        onClick={() => handleArtStyleSelect(style.value)}
                      >
                        {style.label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => { setStep(4); setExpandedCategory(null) }}>
                {artStyle ? findStyleLabel(artStyle) : 'Auto'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Niveau ── */}
      {step >= 5 && (
        <div ref={el => { sectionRefs.current[4] = el }} className="gen-section">
          {step === 5 ? (
            <>
              <h3>Niveau</h3>
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.9rem', marginBottom: 16, textAlign: 'center' }}>
                How should the lyrics treat the word?
              </p>
              <div className="gen-orb-row">
                {([
                  { key: 'auto',     label: 'Auto',     desc: 'Smart pick',        value: null as string | null },
                  { key: 'standard', label: 'Standard', desc: 'Word-focused',      value: 'reliable' as string | null },
                  { key: 'phrase',   label: 'Phrase',   desc: 'Short expressions', value: 'contextual' as string | null },
                  { key: 'story',    label: 'Story',    desc: 'Narrative',         value: 'creative' as string | null },
                  { key: 'song',     label: 'Song',     desc: 'Full song',         value: 'dramatic' as string | null },
                ] as const).map(opt => (
                  <div
                    key={opt.key}
                    className={lyricMode === opt.value ? 'gen-orb selected' : 'gen-orb'}
                    onClick={() => handleLyricModeSelect(opt.value)}
                  >
                    <span className="gen-orb-label">{opt.label}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>{opt.desc}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(5)}>
                {lyricMode === 'reliable' ? 'Standard'
                  : lyricMode === 'contextual' ? 'Phrase'
                  : lyricMode === 'creative' ? 'Story'
                  : lyricMode === 'dramatic' ? 'Song'
                  : 'Auto'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Genre ── */}
      {step >= 6 && (
        <div ref={el => { sectionRefs.current[5] = el }} className="gen-section">
          {step === 6 && <h3>Aural Atmosphere</h3>}
          <div className="gen-orb-row">
            {GO_GENRES.map(g => (
              <div
                key={g.value}
                className={orbClass(6, g.value, genre)}
                onClick={() => handleGenreSelect(g.value)}
              >
                {g.label}
              </div>
            ))}
          </div>
          {showCustomInput && step === 6 && (
            <div className="gen-orb-row" style={{ marginTop: 16 }}>
              <div className="gen-orb input-orb">
                <input
                  value={customGenre}
                  onChange={e => setCustomGenre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomGenreConfirm()}
                  placeholder="Genre..."
                  autoFocus
                />
              </div>
              <div className="gen-orb forge-btn check-btn" onClick={handleCustomGenreConfirm}>
                ✓
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 7: Initialize ── */}
      {step >= 7 && (
        <div ref={el => { sectionRefs.current[6] = el }} className="gen-section" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 300, marginBottom: 8 }}>
            {existingDeck ? 'Adding Cards' : 'Synthesis Ready'}
          </h3>
          {existingDeck && (
            <p style={{ color: 'var(--go-accent)', marginBottom: 8, fontSize: '0.85rem' }}>
              Adding to: {existingDeck.name || `${existingDeck.target_language} Deck`}
            </p>
          )}
          <p style={{ color: 'var(--go-text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            {words.length} word{words.length !== 1 ? 's' : ''} · {words.length} credit{words.length !== 1 ? 's' : ''}
          </p>

          {/* Selection summary tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {language && (
              <span className="gen-summary-tag" style={{ borderColor: 'color-mix(in srgb, var(--accent) 42%, transparent)', color: 'var(--accent)' }}>
                🌐 {language}
              </span>
            )}
            {vibe && vibe !== 'auto' && (
              <span className="gen-summary-tag" style={{ borderColor: 'color-mix(in srgb, var(--accent-2) 42%, transparent)', color: 'var(--accent-2)' }}>
                🎭 {vibe === 'specific_movie' ? `Movie${movieTitle ? `: ${movieTitle}` : ''}` : vibe}
              </span>
            )}
            {artStyle && (
              <span className="gen-summary-tag" style={{ borderColor: 'color-mix(in srgb, var(--accent) 42%, transparent)', color: 'var(--accent)' }}>
                🎨 {artStyle}
              </span>
            )}
            {genre && genre !== 'auto' && (
              <span className="gen-summary-tag" style={{ borderColor: 'color-mix(in srgb, var(--accent-warm) 45%, transparent)', color: 'var(--accent-warm)' }}>
                🎵 {genre}
              </span>
            )}
          </div>

          {/* Deck name input */}
          {!existingDeck && (
            <div style={{ marginBottom: 24 }}>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Name your deck..."
                maxLength={50}
                className="theme-input w-full max-w-sm mx-auto block p-3 rounded-lg outline-none focus:border-[var(--go-accent)] transition-colors text-center font-semibold placeholder:text-[var(--text-muted)]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>
          )}

          {typeof credits === 'number' && credits < words.length && (
            <p style={{ color: 'var(--destructive)', marginBottom: 16, fontSize: '0.85rem' }}>
              Not enough credits — you need {words.length} but have {credits}. Redeem an invite code to get more.
            </p>
          )}
          <div
            className={`forge-orb${submitting ? ' synthesizing' : ''}${typeof credits === 'number' && credits < words.length ? ' disabled' : ''}`}
            onClick={!submitting && (typeof credits !== 'number' || credits >= words.length) ? () => handleInitialize() : undefined}
            style={typeof credits === 'number' && credits < words.length ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? 'Synthesizing...' : 'Initialize'}
          </div>
          {error && (
            <p style={{ color: 'var(--destructive)', marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
