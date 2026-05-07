import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { LANGUAGES, VIBES, ART_STYLE_GROUPS, MAX_WORDS, NIVEAU_OPTIONS } from '@/components/generate/wizardData'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { submitGeneration } from '@/components/generate/submitGeneration'
import { useQueuePosition } from '@/hooks/useQueuePosition'
import { useTranslation } from '@/hooks/useTranslation'
import { GenerationWheelLoader } from '@/components/ui/GenerationWheelLoader'
import { getGeneratedDeckHref, shouldNavigateGeneratedDeck } from '@/lib/cardGenerationProgress'
import {
  DEFAULT_CARD_LAYER2,
  DEFAULT_CARD_LAYER2_ART_STYLE,
  DEFAULT_PREMIUM_QUICK_MODE,
  cardLayer2ArtStyleLabel,
  cardLayer2MeaningLabel,
  cardLayer2PresentationLabel,
  computeCreditCost,
  isCardLane,
  isCardLayer2ArtStyle,
  isStandardCardImageStyle,
  laneToCardImageModel,
  laneToDeckType,
  resolvePremiumQuickMode,
} from '@/components/generate/useWizardState'
import type {
  CardLayer2ArtStyle,
  CardLayer2Customization,
  ExistingDeck,
  GeneratePayload,
  PremiumQuickMode,
  ProductLane,
  StandardCardImageStyle,
  WizardState,
  WizardAction,
} from '@/components/generate/useWizardState'
import ProductLaneStep from '@/components/generate/steps/ProductLaneStep'
import CardImageStyleStep from '@/components/generate/steps/CardImageStyleStep'
import PremiumCardCustomizationStep from '@/components/generate/steps/PremiumCardCustomizationStep'
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

function laneLabel(lane: ProductLane | null): string {
  if (lane === 'video') return 'Video & Music'
  if (lane === 'card_standard') return 'Standard Card'
  if (lane === 'card_premium') return 'Premium Card'
  return ''
}

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
  const [productLane, setProductLane] = useState<ProductLane | null>(null)
  const [cardImageStyle, setCardImageStyle] = useState<StandardCardImageStyle | CardLayer2ArtStyle | null>(null)
  const [cardLayer2, setCardLayer2] = useState<CardLayer2Customization | null>(null)
  const [premiumQuickMode, setPremiumQuickMode] = useState<PremiumQuickMode>(DEFAULT_PREMIUM_QUICK_MODE)
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
    let cancelled = false
    void (async () => {
      const { data: deck } = await supabase
        .from('decks')
        .select('id, name, target_language, art_style, movie_override, word_count, deck_type')
        .eq('id', deckIdParam)
        .single()
      if (!deck || cancelled) return

      let lastCardImageModel: 'zturbo' | 'gpt_image_2' | null = null
      if (deck.deck_type === 'card') {
        const { data: lastJob } = await supabase
          .from('generation_jobs')
          .select('settings_override')
          .eq('deck_id', deck.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const m = lastJob?.settings_override?.card_image_model
        if (m === 'gpt_image_2' || m === 'zturbo') lastCardImageModel = m
      }
      if (cancelled) return

      setExistingDeck({ ...deck, last_card_image_model: lastCardImageModel })
      setLanguage(deck.target_language)
      const lane: ProductLane =
        deck.deck_type === 'video'
          ? 'video'
          : lastCardImageModel === 'gpt_image_2'
            ? 'card_premium'
            : 'card_standard'
      setProductLane(lane)
      if (lane === 'card_premium') {
        setCardImageStyle(DEFAULT_CARD_LAYER2_ART_STYLE)
        setCardLayer2(DEFAULT_CARD_LAYER2)
        setPremiumQuickMode(DEFAULT_PREMIUM_QUICK_MODE)
      } else {
        setCardImageStyle(null)
        setCardLayer2(null)
        setPremiumQuickMode(DEFAULT_PREMIUM_QUICK_MODE)
      }
      // Existing video deck: skip language and lane (both locked) → words.
      // Existing card deck: skip language, show lane (preselected, mutable).
      setStep(deck.deck_type === 'video' ? 3 : 2)
    })()
    return () => { cancelled = true }
  }, [deckIdParam])

  // Pre-seed from LanguageContext.
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
  const generatedQueueIsCard = existingDeck?.deck_type === 'card' || isCardLane(productLane)
  const { jobStatus, jobsAhead, queuePaused, hasChecked, shouldShowQueue } = useQueuePosition(queueDeckId ?? undefined, {
    enabled: generated && !!queueDeckId && !generatedQueueIsCard,
  })

  useEffect(() => {
    if (!generated || !queueDeckId || hasNavigatedToDeckRef.current) return
    if (shouldNavigateGeneratedDeck({
      generated,
      queueDeckId,
      isCardSubmission: generatedQueueIsCard,
      jobStatus,
      hasChecked,
      shouldShowQueue,
    })) {
      hasNavigatedToDeckRef.current = true
      navigate(getGeneratedDeckHref(queueDeckId))
    }
  }, [generated, generatedQueueIsCard, hasChecked, jobStatus, navigate, queueDeckId, shouldShowQueue])

  // Scroll refs
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const ref = sectionRefs.current[step - 1]
    if (ref) {
      setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    }
  }, [step])

  const cardLane = isCardLane(productLane)

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

  // ── Step 2: Product Lane ──────────────────────────

  function handleLaneSelect(lane: ProductLane) {
    setProductLane(lane)
    if (lane === 'card_premium') {
      setCardImageStyle(prev => isCardLayer2ArtStyle(prev) ? prev : DEFAULT_CARD_LAYER2_ART_STYLE)
      setCardLayer2(prev => prev ?? DEFAULT_CARD_LAYER2)
      setPremiumQuickMode(prev => prev ?? DEFAULT_PREMIUM_QUICK_MODE)
    } else if (lane === 'card_standard') {
      setCardImageStyle(prev => isStandardCardImageStyle(prev) ? prev : null)
      setCardLayer2(null)
      setPremiumQuickMode(DEFAULT_PREMIUM_QUICK_MODE)
    } else {
      setCardImageStyle(null)
      setCardLayer2(null)
      setPremiumQuickMode(DEFAULT_PREMIUM_QUICK_MODE)
    }
    setStep(3)
  }

  // ── Step 3: Words ─────────────────────────────────

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
    productLane,
    cardImageStyle,
    cardLayer2,
    premiumQuickMode,
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
        if (action.path === 'custom') setStep(4)
        // 'quick' is handled via onQuickGenerate prop below
        break
      default:
        break
    }
  }

  // ── Quick Generate ──────────────────────────────

  function handleQuickGenerate(quickWords: string[]) {
    // Card lanes submit straight from words — no tier or style detour.
    if (cardLane) {
      handleInitialize(quickWords)
      return
    }
    // Video lane: submit straight from words too (skip vibe/art/niveau/genre).
    handleInitialize(quickWords)
  }

  function handlePremiumQuickModeGenerate(quickWords: string[], mode: PremiumQuickMode) {
    setPremiumQuickMode(mode)
    handleInitialize(quickWords, { premiumQuickMode: mode })
  }

  function handleVibeSelect(value: string) {
    if (step > 4 && vibe === value) {
      setVibe(null)
      setMovieTitle('')
      setShowMovieInput(false)
      setStep(4)
      return
    }
    setVibe(value)
    if (value === 'specific_movie') {
      setShowMovieInput(true)
    } else {
      setShowMovieInput(false)
      setMovieTitle('')
      setStep(5)
    }
  }

  function handleMovieConfirm() {
    if (movieTitle.trim()) {
      setShowMovieInput(false)
      setStep(5)
    }
  }

  // ── Art Style ─────────────────────────────────

  function handleCategoryClick(groupName: string) {
    setExpandedCategory(prev => prev === groupName ? null : groupName)
  }

  function handleArtStyleSelect(value: string | null) {
    setArtStyle(value)
    setExpandedCategory(null)
    setStep(6)
  }

  // ── Niveau ────────────────────────────────

  function handleLyricModeSelect(value: string | null) {
    setLyricMode(value)
    setStep(7)
  }

  // ── Genre ─────────────────────────────────

  function handleGenreSelect(value: string) {
    if (step > 7 && genre === value) {
      setGenre(null)
      setCustomGenre('')
      setShowCustomInput(false)
      setStep(7)
      return
    }
    setGenre(value)
    if (value === 'custom') {
      setShowCustomInput(true)
    } else {
      setShowCustomInput(false)
      setStep(8)
    }
  }

  function handleCustomGenreConfirm() {
    if (customGenre.trim()) {
      setGenre(customGenre.trim())
      setShowCustomInput(false)
      setStep(8)
    }
  }

  // ── Submit ────────────────────────────────

  async function handleInitialize(
    wordsOverride?: string[],
    options?: { premiumQuickMode?: PremiumQuickMode },
  ) {
    const isQuickGenerate = wordsOverride !== undefined && !options?.premiumQuickMode
    const effectiveWords = wordsOverride ?? words
    if (!user) return
    if (!productLane) return
    if (!language) return
    if (effectiveWords.length === 0) return

    setSubmitting(true)
    setError(null)

    try {
      const isCard = isCardLane(productLane)
      const cardImageModel = laneToCardImageModel(productLane)
      const deckType = laneToDeckType(productLane) ?? 'video'

      const movieOverride =
        !isCard && !isQuickGenerate && (vibe === 'movie' || vibe === 'specific_movie')
          ? movieTitle.trim() || null
          : null
      const creativeDirection =
        isCard || isQuickGenerate
          ? undefined
          : vibe === 'specific_movie'
            ? 'movie'
            : vibe === 'auto'
              ? undefined
              : vibe || undefined
      const genreValue =
        isCard || isQuickGenerate
          ? undefined
          : genre === 'auto'
            ? undefined
            : genre === 'custom'
              ? customGenre.trim() || undefined
              : genre || undefined
      const artStyleValue = isCard || isQuickGenerate ? null : artStyle
      const premiumArtStyle = isCardLayer2ArtStyle(cardImageStyle)
        ? cardImageStyle
        : DEFAULT_CARD_LAYER2_ART_STYLE
      const premiumQuick = productLane === 'card_premium' && options?.premiumQuickMode
        ? resolvePremiumQuickMode(options.premiumQuickMode, premiumArtStyle)
        : null
      const customPremiumMetadata =
        productLane === 'card_premium' && !isQuickGenerate && !premiumQuick && cardImageStyle
          ? {
              premium_quick_mode: 'custom' as const,
              backend_template: 'structured_plan_v1' as const,
              meaning_strategy: (cardLayer2 ?? DEFAULT_CARD_LAYER2).meaning_strategy,
              presentation_form: (cardLayer2 ?? DEFAULT_CARD_LAYER2).presentation_form,
              art_style: premiumArtStyle,
              prompt_version: 'premium_quick_modes_v1' as const,
            }
          : null
      const layer2Payload = premiumQuick?.card_layer2 ?? (
        productLane === 'card_premium' && !isQuickGenerate && !premiumQuick && cardImageStyle
          ? {
              ...(cardLayer2 ?? DEFAULT_CARD_LAYER2),
              visual_intensity: 'balanced' as const,
              premium_quick_mode: 'custom' as const,
              premium_generation_mode: customPremiumMetadata ?? undefined,
            }
          : undefined
      )
      const premiumGenerationMode = premiumQuick?.metadata ?? customPremiumMetadata

      const payload: GeneratePayload = {
        deckPayload: existingDeck
          ? null
          : {
              user_id: user.id,
              name: deckName.trim() || `${language} Deck — ${new Date().toLocaleDateString()}`,
              target_language: language,
              art_style: artStyleValue,
              movie_override: movieOverride,
              word_count: effectiveWords.length,
              status: 'generating',
              deck_type: deckType,
            },
        wordList: effectiveWords,
        jobPayload: {
          user_id: user.id,
          ...(existingDeck ? { deck_id: existingDeck.id } : {}),
          status: 'pending',
          target_language: language,
          art_style: isCard ? null : artStyleValue ?? existingDeck?.art_style ?? null,
          movie_override: isCard ? null : movieOverride ?? existingDeck?.movie_override ?? null,
          words_total: effectiveWords.length,
          settings_override: {
            ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
            ...(genreValue ? { genre: genreValue } : {}),
            ...(!isCard && !isQuickGenerate && lyricMode ? { lyric_mode: lyricMode } : {}),
            ...(cardImageModel ? { card_image_model: cardImageModel } : {}),
            ...(isCard && !isQuickGenerate && cardImageStyle ? { card_image_style: cardImageStyle } : {}),
            ...(layer2Payload ? { card_layer2: layer2Payload } : {}),
            ...(productLane === 'card_premium' && premiumGenerationMode
              ? {
                  premium_quick_mode: premiumGenerationMode.premium_quick_mode,
                  premium_generation_mode: premiumGenerationMode,
                }
              : {}),
          },
        },
      }

      const targetDeckId = await submitGeneration(
        user.id,
        payload,
        existingDeck ?? undefined,
        { cachedCredits: profile?.credits },
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
  const creditCost = computeCreditCost(productLane, words.length)

  function findStyleLabel(value: string): string {
    for (const g of ART_STYLE_GROUPS) {
      const found = g.styles.find(s => s.value === value)
      if (found) return found.label
    }
    return value
  }

  function findCardImageStyleLabel(value: typeof cardImageStyle): string {
    return cardLayer2ArtStyleLabel(value)
  }

  if (deckIdParam && !existingDeck) {
    return (
      <div className="gen-container">
        <div className="gen-section" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {t('common.loading')}
          </p>
        </div>
      </div>
    )
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
            {generatedQueueIsCard && (
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                Generating cards...
              </p>
            )}
            {!generatedQueueIsCard && hasChecked && queuePaused && (
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                {t('queue.paused')}
              </p>
            )}
            {!generatedQueueIsCard && hasChecked && !queuePaused && typeof jobsAhead === 'number' && jobsAhead > 0 && (
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                {jobsAhead} {t('queue.jobsAhead')}
              </p>
            )}

            <button
              type="button"
              className="gen-orb selected breadcrumb"
              style={{ marginTop: 20 }}
              onClick={() => navigate(getGeneratedDeckHref(queueDeckId))}
            >
              {queueDeckId ? t('generate.backToDeck') : t('common.backToDecks')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────

  const showLaneStep = !existingDeck || existingDeck.deck_type === 'card'
  const laneVariant: 'all' | 'card-only' = existingDeck?.deck_type === 'card' ? 'card-only' : 'all'

  return (
    <div className="gen-container">
      {/* ── Step 1: Language ── */}
      {!existingDeck && (
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
      )}

      {/* ── Step 2: Product Lane ── */}
      {showLaneStep && step >= 2 && (
        <div ref={el => { sectionRefs.current[1] = el }} className="gen-section">
          {step === 2 ? (
            <ProductLaneStep
              skin="glassy"
              variant={laneVariant}
              value={productLane}
              onChange={handleLaneSelect}
            />
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(2)}>
                {laneLabel(productLane)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Words ── */}
      {step >= 3 && (
        <div ref={el => { sectionRefs.current[2] = el }} className="gen-section">
          {step === 3 ? (
            <div className="glass-card">
              <WordsStep
                state={wordsStepState}
                dispatch={wordsStepDispatch}
                onQuickGenerate={(qw) => handleQuickGenerate(qw)}
                onPremiumQuickModeGenerate={(qw, mode) => handlePremiumQuickModeGenerate(qw, mode)}
                onCustomize={() => setStep(4)}
              />
              <p style={{ textAlign: 'center', color: 'var(--go-text-secondary)', fontSize: '0.8rem', marginTop: 12 }}>
                {words.length}/{MAX_WORDS} words · {typeof credits === 'number' ? `${credits} credits available` : 'Credits check on generate'}
              </p>
            </div>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(3)}>
                {words.length} word{words.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Vibe (video lane only) ── */}
      {step >= 4 && !cardLane && (
        <div ref={el => { sectionRefs.current[3] = el }} className="gen-section">
          {step === 4 && <h3>Select Visual Context</h3>}
          <div className="gen-orb-row">
            {VIBES.map(v => (
              <div
                key={v.value}
                className={orbClass(4, v.value, vibe)}
                onClick={() => handleVibeSelect(v.value)}
              >
                {v.label}
              </div>
            ))}
          </div>
          {showMovieInput && step === 4 && (
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

      {/* ── Step 5: Art Style (video lane only) ── */}
      {step >= 5 && !cardLane && (
        <div ref={el => { sectionRefs.current[4] = el }} className="gen-section">
          {step === 5 ? (
            <>
              <h3>Art Style</h3>
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
              <div className="gen-orb selected breadcrumb" onClick={() => { setStep(5); setExpandedCategory(null) }}>
                {artStyle ? findStyleLabel(artStyle) : 'Auto'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Niveau (video lane only) ── */}
      {step >= 6 && !cardLane && (
        <div ref={el => { sectionRefs.current[5] = el }} className="gen-section">
          {step === 6 ? (
            <>
              <h3>Niveau</h3>
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.9rem', marginBottom: 16, textAlign: 'center' }}>
                How should the lyrics treat the word?
              </p>
              <div className="gen-orb-row">
                {NIVEAU_OPTIONS.map(opt => (
                  <div
                    key={opt.key}
                    className={lyricMode === opt.value ? 'gen-orb selected' : 'gen-orb'}
                    onClick={() => handleLyricModeSelect(opt.value)}
                  >
                    <span className="gen-orb-label">{t(`generate.niveau.${opt.key}`)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(6)}>
                {t(`generate.niveau.${(NIVEAU_OPTIONS.find(o => o.value === lyricMode) ?? NIVEAU_OPTIONS[0]).key}`)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 7: Genre (video lane only) ── */}
      {step >= 7 && !cardLane && (
        <div ref={el => { sectionRefs.current[6] = el }} className="gen-section">
          {step === 7 && <h3>Aural Atmosphere</h3>}
          <div className="gen-orb-row">
            {GO_GENRES.map(g => (
              <div
                key={g.value}
                className={orbClass(7, g.value, genre)}
                onClick={() => handleGenreSelect(g.value)}
              >
                {g.label}
              </div>
            ))}
          </div>
          {showCustomInput && step === 7 && (
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

      {/* ── Card visual style (card lane, optional, between Words and Synthesis) ── */}
      {step >= 4 && cardLane && (
        <div ref={el => { sectionRefs.current[3] = el }} className="gen-section">
          {step === 4 ? (
            productLane === 'card_premium' ? (
              <PremiumCardCustomizationStep
                skin="glassy"
                layer2Value={cardLayer2}
                artStyleValue={isCardLayer2ArtStyle(cardImageStyle) ? cardImageStyle : null}
                onLayer2Change={(value) => setCardLayer2(prev => ({ ...(prev ?? DEFAULT_CARD_LAYER2), ...value }))}
                onArtStyleChange={(value) => setCardImageStyle(value)}
                onContinue={() => setStep(5)}
              />
            ) : (
              <CardImageStyleStep
                skin="glassy"
                value={isStandardCardImageStyle(cardImageStyle) ? cardImageStyle : null}
                onChange={(value) => {
                  setCardImageStyle(value)
                  setStep(5)
                }}
              />
            )
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(4)}>
                {findCardImageStyleLabel(cardImageStyle)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Synthesis Ready (card lane) ── */}
      {step >= 5 && cardLane && (
        <div ref={el => { sectionRefs.current[4] = el }} className="gen-section" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 300, marginBottom: 8 }}>
            {existingDeck ? 'Adding Cards' : 'Synthesis Ready'}
          </h3>
          {existingDeck && (
            <p style={{ color: 'var(--go-accent)', marginBottom: 8, fontSize: '0.85rem' }}>
              Adding to: {existingDeck.name || `${existingDeck.target_language} Deck`}
            </p>
          )}
          <p style={{ color: 'var(--go-text-secondary)', marginBottom: 8, fontSize: '0.9rem' }}>
            {words.length} word{words.length !== 1 ? 's' : ''} - {creditCost} credit{creditCost !== 1 ? 's' : ''}
          </p>
          {cardImageStyle && (
            <p className="text-sm text-go-text-secondary">
              Style: {findCardImageStyleLabel(cardImageStyle)}
            </p>
          )}
          {productLane === 'card_premium' && cardLayer2 && (
            <>
              <p className="text-sm text-go-text-secondary">
                Meaning: {cardLayer2MeaningLabel(cardLayer2.meaning_strategy)}
              </p>
              <p className="text-sm text-go-text-secondary">
                Form: {cardLayer2PresentationLabel(cardLayer2.presentation_form)}
              </p>
            </>
          )}
          <p className="text-sm text-go-text-secondary">{laneLabel(productLane)}</p>

          {!existingDeck && (
            <div style={{ marginBottom: 24, marginTop: 24 }}>
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

          {typeof credits === 'number' && credits < creditCost && (
            <p style={{ color: 'var(--destructive)', marginBottom: 16, fontSize: '0.85rem' }}>
              Not enough credits - you need {creditCost} but have {credits}. Redeem an invite code to get more.
            </p>
          )}
          <div
            className={`forge-orb${submitting ? ' synthesizing' : ''}${typeof credits === 'number' && credits < creditCost ? ' disabled' : ''}`}
            onClick={!submitting && (typeof credits !== 'number' || credits >= creditCost) ? () => handleInitialize() : undefined}
            style={typeof credits === 'number' && credits < creditCost ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? 'Synthesizing...' : 'Initialize'}
          </div>
          {error && (
            <p style={{ color: 'var(--destructive)', marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
          )}
        </div>
      )}

      {/* ── Synthesis Ready (video lane) ── */}
      {step >= 8 && !cardLane && (
        <div ref={el => { sectionRefs.current[7] = el }} className="gen-section" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 300, marginBottom: 8 }}>
            {existingDeck ? 'Adding Cards' : 'Synthesis Ready'}
          </h3>
          {existingDeck && (
            <p style={{ color: 'var(--go-accent)', marginBottom: 8, fontSize: '0.85rem' }}>
              Adding to: {existingDeck.name || `${existingDeck.target_language} Deck`}
            </p>
          )}
          <p style={{ color: 'var(--go-text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            {words.length} word{words.length !== 1 ? 's' : ''} · {creditCost} credit{creditCost !== 1 ? 's' : ''}
          </p>

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

          {typeof credits === 'number' && credits < creditCost && (
            <p style={{ color: 'var(--destructive)', marginBottom: 16, fontSize: '0.85rem' }}>
              Not enough credits — you need {creditCost} but have {credits}. Redeem an invite code to get more.
            </p>
          )}
          <div
            className={`forge-orb${submitting ? ' synthesizing' : ''}${typeof credits === 'number' && credits < creditCost ? ' disabled' : ''}`}
            onClick={!submitting && (typeof credits !== 'number' || credits >= creditCost) ? () => handleInitialize() : undefined}
            style={typeof credits === 'number' && credits < creditCost ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
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
