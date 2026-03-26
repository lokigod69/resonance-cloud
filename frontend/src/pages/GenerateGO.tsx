import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES, VIBES, ART_STYLE_GROUPS, MAX_WORDS } from '@/components/generate/wizardData'
import { submitGeneration } from '@/components/generate/submitGeneration'
import type { GeneratePayload } from '@/components/generate/useWizardState'

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
  const navigate = useNavigate()

  const [step, setStep] = useState(1)

  // Selections
  const [language, setLanguage] = useState<string | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [wordInput, setWordInput] = useState('')
  const [vibe, setVibe] = useState<string | null>(null)
  const [movieTitle, setMovieTitle] = useState('')
  const [showMovieInput, setShowMovieInput] = useState(false)
  const [artStyle, setArtStyle] = useState<string | null>(null)
  const [genre, setGenre] = useState<string | null>(null)
  const [customGenre, setCustomGenre] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scroll refs
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const ref = sectionRefs.current[step - 1]
    if (ref) {
      setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
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
    if (step > 1 && language === value) {
      setLanguage(null)
      setStep(1)
      return
    }
    setLanguage(value)
    setStep(2)
  }

  // ── Step 2: Words ─────────────────────────────────

  function handleWordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const trimmed = wordInput.trim()
    if (!trimmed || words.length >= MAX_WORDS) return
    if (words.some(w => w.toLowerCase() === trimmed.toLowerCase())) return
    setWords(prev => [...prev, trimmed])
    setWordInput('')
  }

  function handleRemoveWord(index: number) {
    setWords(prev => prev.filter((_, i) => i !== index))
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

  function handleArtStyleSelect(value: string | null) {
    setArtStyle(value)
    setStep(5)
  }

  // ── Step 5: Genre ─────────────────────────────────

  function handleGenreSelect(value: string) {
    if (step > 5 && genre === value) {
      setGenre(null)
      setCustomGenre('')
      setShowCustomInput(false)
      setStep(5)
      return
    }
    setGenre(value)
    if (value === 'custom') {
      setShowCustomInput(true)
    } else {
      setShowCustomInput(false)
      setStep(6)
    }
  }

  function handleCustomGenreConfirm() {
    if (customGenre.trim()) {
      setShowCustomInput(false)
      setStep(6)
    }
  }

  // ── Step 6: Submit ────────────────────────────────

  async function handleInitialize() {
    if (!user || !language || words.length === 0) return
    setSubmitting(true)
    setError(null)

    try {
      const movieOverride =
        vibe === 'movie' || vibe === 'specific_movie'
          ? movieTitle.trim() || null
          : null
      const creativeDirection =
        vibe === 'specific_movie' ? 'movie'
          : vibe === 'auto' ? undefined
          : vibe || undefined
      const genreValue =
        genre === 'auto' ? undefined
          : genre === 'custom' ? customGenre.trim() || undefined
          : genre || undefined

      const payload: GeneratePayload = {
        deckPayload: {
          user_id: user.id,
          name: `${language} Deck — ${new Date().toLocaleDateString()}`,
          target_language: language,
          art_style: artStyle,
          movie_override: movieOverride,
          word_count: words.length,
          status: 'generating',
        },
        wordList: words,
        jobPayload: {
          user_id: user.id,
          status: 'pending',
          target_language: language,
          art_style: artStyle,
          movie_override: movieOverride,
          words_total: words.length,
          settings_override: {
            ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
            ...(genreValue ? { genre: genreValue } : {}),
          },
        },
      }

      await submitGeneration(user.id, payload)
      await refreshProfile()
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  // ── Render helpers ────────────────────────────────

  const credits = profile?.credits ?? 0

  function findStyleLabel(value: string): string {
    for (const g of ART_STYLE_GROUPS) {
      const found = g.styles.find(s => s.value === value)
      if (found) return found.label
    }
    return value
  }

  function findLanguageLabel(value: string): string {
    const l = LANGUAGES.find(lang => lang.value === value)
    return l ? `${l.flag} ${l.label}` : value
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
              <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{lang.flag}</span>
              <span className="gen-orb-label">{lang.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 2: Words ── */}
      {step >= 2 && (
        <div ref={el => { sectionRefs.current[1] = el }} className="gen-section">
          {step === 2 ? (
            <>
              <h3>Seed Words</h3>
              <div className="gen-orb-row" style={{ flexWrap: 'wrap' }}>
                {words.map((word, i) => (
                  <div
                    key={`${word}-${i}`}
                    className="gen-orb word-orb"
                    style={{
                      background: `hsla(${(i * 40) % 360}, 70%, 50%, 0.2)`,
                      borderColor: `hsla(${(i * 40) % 360}, 70%, 50%, 0.6)`,
                    }}
                    onClick={() => handleRemoveWord(i)}
                    title="Click to remove"
                  >
                    {word}
                  </div>
                ))}
                {words.length < MAX_WORDS && (
                  <div className="gen-orb input-orb">
                    <input
                      value={wordInput}
                      onChange={e => setWordInput(e.target.value)}
                      onKeyDown={handleWordKeyDown}
                      placeholder="Type word..."
                      autoFocus
                    />
                  </div>
                )}
                {words.length > 0 && (
                  <div className="gen-orb forge-btn" onClick={() => setStep(3)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>arrow_forward</span>
                  </div>
                )}
              </div>
              <p style={{ textAlign: 'center', color: 'var(--go-text-secondary)', fontSize: '0.8rem', marginTop: 12 }}>
                {words.length}/{MAX_WORDS} words · {credits} credits available
              </p>
            </>
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
          <div className="gen-orb-row" style={{ flexWrap: 'wrap' }}>
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
              <div className="gen-art-scroll">
                {/* Auto option */}
                <div className="gen-orb-row" style={{ marginBottom: 24 }}>
                  <div
                    className="gen-orb"
                    onClick={() => handleArtStyleSelect(null)}
                    style={{ background: 'rgba(94, 106, 210, 0.15)', borderColor: 'rgba(94, 106, 210, 0.4)' }}
                  >
                    Auto
                  </div>
                </div>
                {/* Grouped styles */}
                {ART_STYLE_GROUPS.map(group => (
                  <div key={group.group} style={{ marginBottom: 20 }}>
                    <p className="art-group-heading">{group.group}</p>
                    <div className="gen-orb-row" style={{ flexWrap: 'wrap' }}>
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
              </div>
            </>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(4)}>
                {artStyle ? findStyleLabel(artStyle) : 'Auto'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Genre ── */}
      {step >= 5 && (
        <div ref={el => { sectionRefs.current[4] = el }} className="gen-section">
          {step === 5 && <h3>Aural Atmosphere</h3>}
          <div className="gen-orb-row" style={{ flexWrap: 'wrap' }}>
            {GO_GENRES.map(g => (
              <div
                key={g.value}
                className={orbClass(5, g.value, genre)}
                onClick={() => handleGenreSelect(g.value)}
              >
                {g.label}
              </div>
            ))}
          </div>
          {showCustomInput && step === 5 && (
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

      {/* ── Step 6: Initialize ── */}
      {step >= 6 && (
        <div ref={el => { sectionRefs.current[5] = el }} className="gen-section" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2rem', color: 'white', fontWeight: 300, marginBottom: 8 }}>
            Synthesis Ready
          </h3>
          <p style={{ color: 'var(--go-text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            {words.length} word{words.length !== 1 ? 's' : ''} · {findLanguageLabel(language!)} · {credits} credits
          </p>

          {/* Summary tags */}
          <div className="gen-orb-row" style={{ marginBottom: 32, gap: 12, opacity: 0.6 }}>
            <span className="gen-summary-tag">{vibe === 'specific_movie' ? `Movie: ${movieTitle}` : vibe}</span>
            <span className="gen-summary-tag">{artStyle ? findStyleLabel(artStyle) : 'Auto style'}</span>
            <span className="gen-summary-tag">{genre === 'custom' ? customGenre : genre}</span>
          </div>

          <div
            className={`forge-orb${submitting ? ' synthesizing' : ''}`}
            onClick={!submitting ? handleInitialize : undefined}
          >
            {submitting ? 'Synthesizing...' : 'Initialize'}
          </div>
          {error && (
            <p style={{ color: '#ef4444', marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
