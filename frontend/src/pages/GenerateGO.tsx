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
import { useTranslateAndIpa } from '@/hooks/useTranslateAndIpa'
import { useSubmitImagelessImport } from '@/hooks/useSubmitImagelessImport'
import { useAppendImagelessCards } from '@/hooks/useAppendImagelessCards'
import { useGenerateImagelessTts } from '@/hooks/useGenerateImagelessTts'
import { GenerationWheelLoader } from '@/components/ui/GenerationWheelLoader'
import { getGeneratedDeckHref, shouldNavigateGeneratedDeck } from '@/lib/cardGenerationProgress'
import {
  DEFAULT_CARD_LAYER2,
  DEFAULT_CARD_LAYER2_ART_STYLE,
  DEFAULT_PREMIUM_INFOGRAPHIC_STYLE,
  DEFAULT_PREMIUM_QUICK_MODE,
  CARD_LAYER2_ART_STYLE_OPTIONS,
  CARD_LAYER2_MEANING_OPTIONS,
  CARD_LAYER2_PRESENTATION_OPTIONS,
  PREMIUM_INFOGRAPHIC_STYLE_OPTIONS,
  cardLayer2ArtStyleLabel,
  cardLayer2MeaningLabel,
  cardLayer2PresentationLabel,
  computeCreditCost,
  isCardLane,
  isCardLayer2ArtStyle,
  isStandardCardImageStyle,
  laneToCardImageModel,
  laneToDeckType,
  premiumInfographicStyleLabel,
  resolvePremiumInfographicTemplate,
  resolvePremiumQuickMode,
} from '@/components/generate/useWizardState'
import type {
  CardLayer2BackendTemplate,
  CardLayer2ArtStyle,
  CardLayer2Customization,
  ExistingDeck,
  GeneratePayload,
  PremiumInfographicStyle,
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
import {
  PremiumSummaryRow,
  type PremiumSummaryItem,
} from '@/components/generate/shared/PremiumVisualSelectors'
import { wordsEqual } from '@/lib/wordEquality'
import { canonicalizeLanguageValue, getLanguageCode } from '@/lib/languages'
import type { SelectedCategoryVocabularyItem } from '@/data/categories'

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

const PRODUCT_LANE_LABEL_KEYS: Record<ProductLane, string> = {
  video: 'generate.productLane.video.label',
  card_standard: 'generate.productLane.standard.label',
  card_premium: 'generate.productLane.premium.label',
  card_text: 'generate.productLane.cardText.label',
}

const ART_GROUP_LABEL_KEYS: Record<string, string> = {
  Photographic: 'generateGo.artGroup.photographic',
  'Classic Fine Art': 'generateGo.artGroup.classicFineArt',
  'Decorative & Regional': 'generateGo.artGroup.decorativeRegional',
  'Animation & Shows': 'generateGo.artGroup.animationShows',
  'Digital & Retro': 'generateGo.artGroup.digitalRetro',
  'Craft & Tactile': 'generateGo.artGroup.craftTactile',
  'Illustration & Drawing': 'generateGo.artGroup.illustrationDrawing',
  'Artist-Inspired': 'generateGo.artGroup.artistInspired',
  'Genre & Fantasy': 'generateGo.artGroup.genreFantasy',
}

function isLaneLockedDeckType(deckType: ExistingDeck['deck_type'] | null | undefined): boolean {
  return deckType === 'video' || deckType === 'card_text'
}

async function fetchAllWordIds(deckId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('words')
    .select('id')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.id as string)
}

async function fetchLatestWordIds(deckId: string, count: number): Promise<string[]> {
  if (count <= 0) return []
  const { data, error } = await supabase
    .from('words')
    .select('id')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(count)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.id as string).reverse()
}

export default function GenerateGO() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { activeLanguage, languageReady } = useLanguage()
  const { t, tp } = useTranslation()
  const navigate = useNavigate()
  const { translateAndIpa } = useTranslateAndIpa()
  const { submitImagelessImport } = useSubmitImagelessImport()
  const { appendImagelessCards } = useAppendImagelessCards()
  const { generateImagelessTts } = useGenerateImagelessTts()

  const [step, setStep] = useState(1)

  // Selections
  const [language, setLanguage] = useState<string | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [selectedVocabularyItems, setSelectedVocabularyItems] = useState<SelectedCategoryVocabularyItem[]>([])
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
  const [premiumInfographicStyle, setPremiumInfographicStyle] =
    useState<PremiumInfographicStyle>(DEFAULT_PREMIUM_INFOGRAPHIC_STYLE)
  const [customGenre, setCustomGenre] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [deckName, setDeckName] = useState('')

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [generatedDeckId, setGeneratedDeckId] = useState<string | null>(null)
  const hasNavigatedToDeckRef = useRef(false)
  const submitInFlightRef = useRef(false)

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
        deck.deck_type === 'card_text'
          ? 'card_text'
          : deck.deck_type === 'video'
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
      setStep(isLaneLockedDeckType(deck.deck_type) ? 3 : 2)
    })()
    return () => { cancelled = true }
  }, [deckIdParam])

  // Pre-seed from LanguageContext. `gateResolved` holds the loader through the
  // auto-advance (no orbit flash) and prevents the loader from reappearing on
  // back-navigation to the language step.
  const [gateResolved, setGateResolved] = useState(false)
  useEffect(() => {
    if (deckIdParam) return
    if (language) return
    if (!languageReady) return

    const timeoutId = window.setTimeout(() => {
      if (activeLanguage) {
        setLanguage(activeLanguage)
        setStep(2)
      }
      setGateResolved(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [deckIdParam, language, languageReady, activeLanguage])

  const queueDeckId = generatedDeckId ?? existingDeck?.id ?? null
  const generatedQueueIsCard = existingDeck?.deck_type === 'card'
    || existingDeck?.deck_type === 'card_text'
    || productLane === 'card_text'
    || isCardLane(productLane)
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
      setTimeout(() => {
        const summaryTarget = document.querySelector<HTMLElement>('.generate-selection-summary')
        const target = summaryTarget && summaryTarget.childElementCount > 0
          ? summaryTarget
          : ref
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
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
    selectedVocabularyItems,
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
    premiumInfographicStyle,
  } as unknown as WizardState

  const wordsStepDispatch: React.Dispatch<WizardAction> = (action) => {
    switch (action.type) {
      case 'SET_LANGUAGE':
      case 'PRESELECT_LANGUAGE':
        setLanguage(action.language)
        break
      case 'ADD_WORD':
        setWords(prev =>
          prev.some(w => wordsEqual(w, action.word))
            ? prev
            : [...prev, action.word].slice(0, MAX_WORDS),
        )
        break
      case 'ADD_WORDS': {
        const incoming = action.words
        setWords(prev => {
          const next = [...prev]
          for (const raw of incoming) {
            const word = raw.trim()
            if (!word) continue
            if (next.some(existing => wordsEqual(existing, word))) continue
            if (next.length >= MAX_WORDS) break
            next.push(word)
          }
          return next
        })
        break
      }
      case 'ADD_VOCABULARY_ITEMS': {
        setWords(prev => {
          const next = [...prev]
          const addedItems: SelectedCategoryVocabularyItem[] = []
          for (const item of action.items) {
            const targetTerm = item.targetTerm.trim()
            if (!targetTerm) continue
            if (next.some(existing => wordsEqual(existing, item.targetTerm))) continue
            if (next.length >= MAX_WORDS) break
            next.push(targetTerm)
            addedItems.push({ ...item, targetTerm })
          }
          if (addedItems.length > 0) {
            setSelectedVocabularyItems(prevItems => [...prevItems, ...addedItems])
          }
          return next
        })
        break
      }
      case 'REMOVE_WORD':
        setWords(prev => {
          const removedWord = prev[action.index]
          if (removedWord) {
            setSelectedVocabularyItems(prevItems => {
              let removedMetadata = false
              return prevItems.filter((item) => {
                if (!removedMetadata && wordsEqual(item.targetTerm, removedWord)) {
                  removedMetadata = true
                  return false
                }
                return true
              })
            })
          }
          return prev.filter((_, i) => i !== action.index)
        })
        break
      case 'SET_WORDS':
        {
          const nextWords = action.words.slice(0, MAX_WORDS)
          setWords(nextWords)
          setSelectedVocabularyItems(prevItems =>
            prevItems.filter((item) => nextWords.some((word) => wordsEqual(word, item.targetTerm))),
          )
        }
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
    if (mode === 'infographic') {
      setPremiumInfographicStyle(DEFAULT_PREMIUM_INFOGRAPHIC_STYLE)
    }
    handleInitialize(quickWords, {
      premiumQuickMode: mode,
      premiumInfographicStyle: mode === 'infographic' ? DEFAULT_PREMIUM_INFOGRAPHIC_STYLE : premiumInfographicStyle,
    })
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
    options?: { premiumQuickMode?: PremiumQuickMode; premiumInfographicStyle?: PremiumInfographicStyle },
  ) {
    if (submitInFlightRef.current) return
    const isQuickGenerate = wordsOverride !== undefined && !options?.premiumQuickMode
    const effectiveWords = wordsOverride ?? words
    const effectiveVocabularyItems = selectedVocabularyItems.filter((item) =>
      effectiveWords.some((word) => wordsEqual(word, item.targetTerm)),
    )
    const effectiveProductLane = existingDeck?.deck_type === 'card_text' ? 'card_text' : productLane
    const effectiveLanguage = existingDeck?.target_language ?? language
    if (!user) return
    if (!effectiveProductLane) return
    if (!effectiveLanguage) return
    if (effectiveWords.length === 0) return

    submitInFlightRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      if (effectiveProductLane === 'card_text') {
        const targetLanguageValue = canonicalizeLanguageValue(effectiveLanguage)
        const targetLanguageCode = getLanguageCode(targetLanguageValue)
        const baseLanguageValue = canonicalizeLanguageValue(profile?.base_language ?? 'English')
        const baseLanguageCode = getLanguageCode(baseLanguageValue)
        const items = await translateAndIpa({
          items: effectiveWords.map((word) => ({ word, is_phrase: /\s/.test(word.trim()) })),
          target_language: targetLanguageCode,
          base_language: baseLanguageCode,
        })

        const origin = effectiveVocabularyItems.length > 0 ? 'category' : 'manual'
        let targetDeckId: string
        if (existingDeck?.id) {
          targetDeckId = existingDeck.id
          const insertedCount = await appendImagelessCards({
            p_deck_id: existingDeck.id,
            p_items: items,
            p_origin: origin,
          })
          triggerImagelessTts(() => fetchLatestWordIds(existingDeck.id, insertedCount))
        } else {
          targetDeckId = await submitImagelessImport({
            deckName: deckName.trim() || 'Text Deck',
            targetLanguage: targetLanguageValue,
            baseLanguage: baseLanguageValue,
            origin,
            items,
          })
          triggerImagelessTts(() => fetchAllWordIds(targetDeckId))
        }
        setGeneratedDeckId(targetDeckId)
        setGenerated(true)
        hasNavigatedToDeckRef.current = true
        navigate(getGeneratedDeckHref(targetDeckId))
        return
      }

      const isCard = isCardLane(effectiveProductLane)
      const cardImageModel = laneToCardImageModel(effectiveProductLane)
      const deckType = laneToDeckType(effectiveProductLane) ?? 'video'

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
      const selectedPremiumInfographicStyle =
        options?.premiumInfographicStyle ?? premiumInfographicStyle ?? DEFAULT_PREMIUM_INFOGRAPHIC_STYLE
      const premiumQuick = productLane === 'card_premium' && options?.premiumQuickMode
        ? resolvePremiumQuickMode(options.premiumQuickMode, premiumArtStyle, selectedPremiumInfographicStyle)
        : null
      const selectedLayer2 = cardLayer2 ?? DEFAULT_CARD_LAYER2
      const isCustomInfographic =
        productLane === 'card_premium'
        && !isQuickGenerate
        && !premiumQuick
        && cardImageStyle
        && selectedLayer2.presentation_form === 'infographic_card'
      const customInfographicTemplate = isCustomInfographic
        ? resolvePremiumInfographicTemplate(selectedPremiumInfographicStyle)
        : undefined
      const customPremiumMetadata =
        productLane === 'card_premium' && !isQuickGenerate && !premiumQuick && cardImageStyle
          ? isCustomInfographic
            ? {
                premium_quick_mode: 'custom' as const,
                backend_template: 'infographic_prompt_v1' as const,
                presentation_form: 'infographic_card' as const,
                infographic_template: customInfographicTemplate,
                prompt_version: 'premium_quick_modes_v1' as const,
              }
            : {
                premium_quick_mode: 'custom' as const,
                backend_template: 'structured_plan_v1' as const,
                meaning_strategy: selectedLayer2.meaning_strategy,
                presentation_form: selectedLayer2.presentation_form,
                art_style: premiumArtStyle,
                prompt_version: 'premium_quick_modes_v1' as const,
              }
          : null
      const layer2Payload = premiumQuick?.card_layer2 ?? (
        productLane === 'card_premium' && !isQuickGenerate && !premiumQuick && cardImageStyle
          ? {
              ...selectedLayer2,
              visual_intensity: 'balanced' as const,
              backend_template: (isCustomInfographic ? 'infographic_prompt_v1' : 'structured_plan_v1') as CardLayer2BackendTemplate,
              ...(customInfographicTemplate ? { infographic_template: customInfographicTemplate } : {}),
              premium_quick_mode: 'custom' as const,
              premium_generation_mode: customPremiumMetadata ?? undefined,
            }
          : undefined
      )
      const premiumGenerationMode = premiumQuick?.metadata ?? customPremiumMetadata
      const isInfographicLayer2 = layer2Payload?.presentation_form === 'infographic_card'

      const payload: GeneratePayload = {
        deckPayload: existingDeck
          ? null
          : {
              user_id: user.id,
              name: deckName.trim() || `${language} Deck — ${new Date().toLocaleDateString()}`,
              target_language: effectiveLanguage,
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
          target_language: effectiveLanguage,
          art_style: isCard ? null : artStyleValue ?? existingDeck?.art_style ?? null,
          movie_override: isCard ? null : movieOverride ?? existingDeck?.movie_override ?? null,
          words_total: effectiveWords.length,
          settings_override: {
            ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
            ...(genreValue ? { genre: genreValue } : {}),
            ...(!isCard && !isQuickGenerate && lyricMode ? { lyric_mode: lyricMode } : {}),
            ...(cardImageModel ? { card_image_model: cardImageModel } : {}),
            ...(isCard && !isQuickGenerate && cardImageStyle && !isInfographicLayer2 ? { card_image_style: cardImageStyle } : {}),
            ...(layer2Payload ? { card_layer2: layer2Payload } : {}),
            ...(productLane === 'card_premium' && premiumGenerationMode
              ? {
                  premium_quick_mode: premiumGenerationMode.premium_quick_mode,
                  premium_generation_mode: premiumGenerationMode,
                }
              : {}),
            ...(effectiveVocabularyItems.length > 0
              ? { category_vocabulary_items: effectiveVocabularyItems }
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
      submitInFlightRef.current = false
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast(msg, 'error')
      setSubmitting(false)
    }
  }

  // ── Render helpers ────────────────────────────────

  function triggerImagelessTts(loadWordIds: () => Promise<string[]>) {
    void loadWordIds()
      .then((wordIds) => {
        if (wordIds.length > 0) {
          return generateImagelessTts({ word_ids: wordIds })
        }
        return undefined
      })
      .catch(() => undefined)
  }

  const credits = profile?.credits
  const creditCost = computeCreditCost(productLane, words.length)
  const showLaneStep = !existingDeck || existingDeck.deck_type === 'card'

  function productLaneLabel(lane: ProductLane | null): string {
    return lane ? t(PRODUCT_LANE_LABEL_KEYS[lane]) : ''
  }

  function findStyleLabel(value: string): string {
    for (const g of ART_STYLE_GROUPS) {
      const found = g.styles.find(s => s.value === value)
      if (found) return t(`generateGo.artStyle.${found.value}`)
    }
    return value
  }

  function findCardImageStyleLabel(value: typeof cardImageStyle): string {
    if (value === 'Photorealistic') return t('generate.cardImageStyle.realistic.label')
    if (value === 'Editorial') return t('generate.cardImageStyle.editorial.label')
    if (value === 'Random') return t('generate.cardImageStyle.random.label')
    const option = CARD_LAYER2_ART_STYLE_OPTIONS.find((item) => item.value === value)
    return option?.labelKey ? t(option.labelKey) : cardLayer2ArtStyleLabel(value)
  }

  function languageDisplayLabel(value: string): string {
    return LANGUAGES.find((lang) => lang.value === value)?.label ?? value
  }

  function wordCountLabel(count: number): string {
    return tp('generateGo.wordCount', count)
  }

  function niveauLabel(value: string | null): string {
    const key = (NIVEAU_OPTIONS.find((option) => option.value === value) ?? NIVEAU_OPTIONS[0]).key
    return t(`generate.niveau.${key}`)
  }

  function vibeLabel(value: string): string {
    return t(`generateGo.vibe.${value}`)
  }

  function genreLabel(value: string): string {
    if (value === 'custom') return t('generateGo.genre.custom')
    return GO_GENRES.find((item) => item.value === value)?.label ?? value
  }

  function artGroupLabel(group: string): string {
    const key = ART_GROUP_LABEL_KEYS[group]
    return key ? t(key) : group
  }

  function cardLayer2MeaningDisplay(value: CardLayer2Customization['meaning_strategy']): string {
    const option = CARD_LAYER2_MEANING_OPTIONS.find((item) => item.value === value)
    return option?.labelKey ? t(option.labelKey) : cardLayer2MeaningLabel(value)
  }

  function cardLayer2PresentationDisplay(value: CardLayer2Customization['presentation_form']): string {
    const option = CARD_LAYER2_PRESENTATION_OPTIONS.find((item) => item.value === value)
    return option?.labelKey ? t(option.labelKey) : cardLayer2PresentationLabel(value)
  }

  function premiumInfographicStyleDisplay(value: PremiumInfographicStyle): string {
    const option = PREMIUM_INFOGRAPHIC_STYLE_OPTIONS.find((item) => item.value === value)
    return option?.labelKey ? t(option.labelKey) : premiumInfographicStyleLabel(value)
  }

  const premiumInfographicSelected =
    productLane === 'card_premium' && cardLayer2?.presentation_form === 'infographic_card'
  const summaryItems: PremiumSummaryItem[] = [
    ...(!existingDeck && language && step > 1
      ? [{
          key: 'language',
          label: languageDisplayLabel(language),
          ariaLabel: t('generateGo.backToLanguageStep'),
          onClick: () => setStep(1),
          tone: 'language',
        }]
      : []),
    ...(productLane && showLaneStep && step > 2
      ? [{
          key: 'product',
          label: productLaneLabel(productLane),
          ariaLabel: t('generateGo.backToProductStep'),
          onClick: () => setStep(2),
          tone: 'product',
        }]
      : []),
    ...(words.length > 0 && step > 3
      ? [{
          key: 'words',
          label: wordCountLabel(words.length),
          ariaLabel: t('generateGo.backToWordsStep'),
          onClick: () => setStep(3),
          tone: 'words',
        }]
      : []),
    ...(cardLane && cardImageStyle && step > 4 && !premiumInfographicSelected
      ? [{
          key: 'style',
          label: findCardImageStyleLabel(cardImageStyle),
          ariaLabel: t('generateGo.backToVisualStyleStep'),
          onClick: () => setStep(4),
          tone: 'style',
        }]
      : []),
    ...(productLane === 'card_premium' && cardLayer2 && step > 4
      ? premiumInfographicSelected
        ? [
            {
              key: 'form',
              label: t('premium.presentation.infographic_card.label'),
              ariaLabel: t('generateGo.backToCustomizeStep'),
              onClick: () => setStep(4),
              tone: 'form',
            },
            {
              key: 'infographic-style',
              label: premiumInfographicStyleDisplay(premiumInfographicStyle),
              ariaLabel: t('generateGo.backToCustomizeStep'),
              onClick: () => setStep(4),
              tone: 'infographic',
            },
          ]
        : [
            {
              key: 'meaning',
              label: cardLayer2MeaningDisplay(cardLayer2.meaning_strategy),
              ariaLabel: t('generateGo.backToCustomizeStep'),
              onClick: () => setStep(4),
              tone: 'meaning',
            },
            {
              key: 'form',
              label: cardLayer2PresentationDisplay(cardLayer2.presentation_form),
              ariaLabel: t('generateGo.backToCustomizeStep'),
              onClick: () => setStep(4),
              tone: 'form',
            },
          ]
      : []),
    ...(!cardLane && vibe && step > 4
      ? [{
          key: 'vibe',
          label: vibeLabel(vibe),
          ariaLabel: t('generateGo.backToVisualContextStep'),
          onClick: () => setStep(4),
          tone: 'vibe',
        }]
      : []),
    ...(!cardLane && step > 5
      ? [{
          key: 'art',
          label: artStyle ? findStyleLabel(artStyle) : t('generateGo.vibe.auto'),
          ariaLabel: t('generateGo.backToArtStyleStep'),
          onClick: () => {
            setExpandedCategory(null)
            setStep(5)
          },
          tone: 'style',
        }]
      : []),
    ...(!cardLane && step > 6
      ? [{
          key: 'niveau',
          label: niveauLabel(lyricMode),
          ariaLabel: t('generateGo.backToNiveauStep'),
          onClick: () => setStep(6),
          tone: 'niveau',
        }]
      : []),
    ...(!cardLane && genre && genre !== 'auto' && step > 7
      ? [{
          key: 'music',
          label: genre,
          ariaLabel: t('generateGo.backToMusicStep'),
          onClick: () => setStep(7),
          tone: 'music',
        }]
      : []),
  ]

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
                ? t('generateGo.newCardsGeneratingForDeck', {
                    name: existingDeck.name || t('generateGo.languageDeckName', { language: existingDeck.target_language }),
                  })
                : `${t('generate.deckBeingCreated')} ${t('generate.backgroundNotice')}`}
            />
            {generatedQueueIsCard && (
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                {t('generateGo.generatingCards')}
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

  const laneVariant: 'all' | 'card-only' = existingDeck?.deck_type === 'card' ? 'card-only' : 'all'

  // Smooth language gate: hold a calm loader while the saved language resolves
  // (or is about to auto-advance) instead of flashing the orbit then jumping.
  const showLanguageLoader =
    !existingDeck && step === 1 && !language && !gateResolved

  return (
    <div className="gen-container">
      <PremiumSummaryRow items={summaryItems} className="generate-selection-summary" />
      {/* ── Step 1: Language ── */}
      {!existingDeck && step === 1 && (
        <div ref={el => { sectionRefs.current[0] = el }} className="gen-section">
          {showLanguageLoader ? (
            <div className="gen-resolving" role="status">
              <span className="gen-resolving-spinner" aria-hidden="true" />
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <>
              <h3>{t('generateGo.chooseLanguageOrbit')}</h3>
              <div className="gen-orb-row gen-language-grid">
                {LANGUAGES.map(lang => (
                  <button
                    type="button"
                    key={lang.value}
                    className={orbClass(1, lang.value, language)}
                    onClick={() => handleLanguageSelect(lang.value)}
                    aria-pressed={language === lang.value}
                  >
                    <FlagIcon code={lang.code} className="w-10 h-auto" />
                    <span className="gen-orb-label">{lang.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Product Lane ── */}
      {showLaneStep && step === 2 && (
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
                {productLaneLabel(productLane)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Words ── */}
      {step === 3 && (
        <div ref={el => { sectionRefs.current[2] = el }} className="gen-section">
          {step === 3 ? (
            <div className="gen-words-panel">
              <WordsStep
                state={wordsStepState}
                dispatch={wordsStepDispatch}
                onQuickGenerate={(qw) => handleQuickGenerate(qw)}
                onPremiumQuickModeGenerate={(qw, mode) => handlePremiumQuickModeGenerate(qw, mode)}
                onCustomize={() => setStep(4)}
              />
              <p style={{ textAlign: 'center', color: 'var(--go-text-secondary)', fontSize: '0.8rem', marginTop: 12 }}>
                {typeof credits === 'number' ? `${credits} ${t('credits.available')}` : t('generateGo.creditsCheckOnGenerate')}
              </p>
            </div>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => setStep(3)}>
                {wordCountLabel(words.length)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Vibe (video lane only) ── */}
      {step === 4 && !cardLane && (
        <div ref={el => { sectionRefs.current[3] = el }} className="gen-section">
          {step === 4 && <h3>{t('generateGo.selectVisualContext')}</h3>}
          <div className="gen-orb-row">
            {VIBES.map(v => (
              <div
                key={v.value}
                className={orbClass(4, v.value, vibe)}
                onClick={() => handleVibeSelect(v.value)}
              >
                {vibeLabel(v.value)}
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
                  placeholder={t('generateGo.movieNamePlaceholder')}
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
      {step === 5 && !cardLane && (
        <div ref={el => { sectionRefs.current[4] = el }} className="gen-section">
          {step === 5 ? (
            <>
              <h3>{t('premium.artStyle.title')}</h3>
              <div className="gen-orb-row" style={{ marginBottom: 24 }}>
                <div
                  className="gen-orb"
                  onClick={() => handleArtStyleSelect(null)}
                  style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}
                >
                  {t('generateGo.vibe.auto')}
                </div>
                {ART_STYLE_GROUPS.map(group => (
                  <div
                    key={group.group}
                    className={`gen-orb${expandedCategory === group.group ? ' selected' : ''}`}
                    onClick={() => handleCategoryClick(group.group)}
                  >
                    {artGroupLabel(group.group)}
                  </div>
                ))}
              </div>
              {ART_STYLE_GROUPS.map(group => (
                <div
                  key={group.group}
                  className={`gen-category-expand${expandedCategory === group.group ? ' open' : ''}`}
                >
                  <p className="art-group-heading">{artGroupLabel(group.group)}</p>
                  <div className="gen-orb-row">
                    {group.styles.map(style => (
                      <div
                        key={style.value}
                        className={artStyle === style.value ? 'gen-orb selected' : 'gen-orb'}
                        onClick={() => handleArtStyleSelect(style.value)}
                      >
                        {findStyleLabel(style.value)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="gen-orb-row">
              <div className="gen-orb selected breadcrumb" onClick={() => { setStep(5); setExpandedCategory(null) }}>
                {artStyle ? findStyleLabel(artStyle) : t('generateGo.vibe.auto')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Niveau (video lane only) ── */}
      {step === 6 && !cardLane && (
        <div ref={el => { sectionRefs.current[5] = el }} className="gen-section">
          {step === 6 ? (
            <>
              <h3>Niveau</h3>
              <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.9rem', marginBottom: 16, textAlign: 'center' }}>
                {t('generate.chooseNiveauSub')}
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
      {step === 7 && !cardLane && (
        <div ref={el => { sectionRefs.current[6] = el }} className="gen-section">
          {step === 7 && <h3>{t('generateGo.auralAtmosphere')}</h3>}
          <div className="gen-orb-row">
            {GO_GENRES.map(g => (
              <div
                key={g.value}
                className={orbClass(7, g.value, genre)}
                onClick={() => handleGenreSelect(g.value)}
              >
                {genreLabel(g.value)}
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
                  placeholder={t('generateGo.genrePlaceholder')}
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
      {step === 4 && cardLane && (
        <div ref={el => { sectionRefs.current[3] = el }} className="gen-section">
          {step === 4 ? (
            productLane === 'card_premium' ? (
              <PremiumCardCustomizationStep
                skin="glassy"
                layer2Value={cardLayer2}
                artStyleValue={isCardLayer2ArtStyle(cardImageStyle) ? cardImageStyle : null}
                infographicStyleValue={premiumInfographicStyle}
                onLayer2Change={(value) => setCardLayer2(prev => ({ ...(prev ?? DEFAULT_CARD_LAYER2), ...value }))}
                onArtStyleChange={(value) => setCardImageStyle(value)}
                onInfographicStyleChange={setPremiumInfographicStyle}
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
      {step === 5 && cardLane && (
        <div ref={el => { sectionRefs.current[4] = el }} className="gen-section" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 300, marginBottom: 8 }}>
            {existingDeck ? t('generateGo.addingCards') : t('generate.synthesisReady')}
          </h3>
          {existingDeck && (
            <p style={{ color: 'var(--go-accent)', marginBottom: 8, fontSize: '0.85rem' }}>
              {t('generateGo.addingTo', {
                name: existingDeck.name || t('generateGo.languageDeckName', { language: existingDeck.target_language }),
              })}
            </p>
          )}
          <p style={{ color: 'var(--go-text-secondary)', marginBottom: 8, fontSize: '0.9rem' }}>
            {wordCountLabel(words.length)} · {tp('generateGo.creditCount', creditCost)}
          </p>
          {cardImageStyle && (
            <p className="text-sm text-go-text-secondary">
              {t('generateGo.stylePrefix', { value: findCardImageStyleLabel(cardImageStyle) })}
            </p>
          )}
          {productLane === 'card_premium' && cardLayer2 && (
            premiumInfographicSelected ? (
              <p className="text-sm text-go-text-secondary">
                {t('generateGo.premiumInfographicSummary', {
                  product: t('generate.productLane.premium.label'),
                  presentation: t('premium.presentation.infographic_card.label'),
                  style: premiumInfographicStyleDisplay(premiumInfographicStyle),
                })}
              </p>
            ) : (
              <>
                <p className="text-sm text-go-text-secondary">
                  {t('generateGo.meaningPrefix', { value: cardLayer2MeaningDisplay(cardLayer2.meaning_strategy) })}
                </p>
                <p className="text-sm text-go-text-secondary">
                  {t('generateGo.formPrefix', { value: cardLayer2PresentationDisplay(cardLayer2.presentation_form) })}
                </p>
              </>
            )
          )}
          <p className="text-sm text-go-text-secondary">{productLaneLabel(productLane)}</p>

          {!existingDeck && (
            <div style={{ marginBottom: 24, marginTop: 24 }}>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder={t('generate.deckNamePlaceholder')}
                maxLength={50}
                className="theme-input w-full max-w-sm mx-auto block p-3 rounded-lg outline-none focus:border-[var(--go-accent)] transition-colors text-center font-semibold placeholder:text-[var(--text-muted)]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>
          )}

          {typeof credits === 'number' && credits < creditCost && (
            <p style={{ color: 'var(--destructive)', marginBottom: 16, fontSize: '0.85rem' }}>
              {t('generateGo.notEnoughCreditsDetail', { need: creditCost, have: credits })}
            </p>
          )}
          <div
            className={`forge-orb${submitting ? ' synthesizing' : ''}${typeof credits === 'number' && credits < creditCost ? ' disabled' : ''}`}
            onClick={!submitting && (typeof credits !== 'number' || credits >= creditCost) ? () => handleInitialize() : undefined}
            style={typeof credits === 'number' && credits < creditCost ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? t('generateGo.synthesizing') : t('generateGo.initialize')}
          </div>
          {error && (
            <p style={{ color: 'var(--destructive)', marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
          )}
        </div>
      )}

      {/* ── Synthesis Ready (video lane) ── */}
      {step === 8 && !cardLane && (
        <div ref={el => { sectionRefs.current[7] = el }} className="gen-section" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 300, marginBottom: 8 }}>
            {existingDeck ? t('generateGo.addingCards') : t('generate.synthesisReady')}
          </h3>
          {existingDeck && (
            <p style={{ color: 'var(--go-accent)', marginBottom: 8, fontSize: '0.85rem' }}>
              {t('generateGo.addingTo', {
                name: existingDeck.name || t('generateGo.languageDeckName', { language: existingDeck.target_language }),
              })}
            </p>
          )}
          <p style={{ color: 'var(--go-text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            {wordCountLabel(words.length)} · {tp('generateGo.creditCount', creditCost)}
          </p>

          <div style={{ display: 'none' }} aria-hidden="true">
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
                placeholder={t('generate.deckNamePlaceholder')}
                maxLength={50}
                className="theme-input w-full max-w-sm mx-auto block p-3 rounded-lg outline-none focus:border-[var(--go-accent)] transition-colors text-center font-semibold placeholder:text-[var(--text-muted)]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>
          )}

          {typeof credits === 'number' && credits < creditCost && (
            <p style={{ color: 'var(--destructive)', marginBottom: 16, fontSize: '0.85rem' }}>
              {t('generateGo.notEnoughCreditsDetail', { need: creditCost, have: credits })}
            </p>
          )}
          <div
            className={`forge-orb${submitting ? ' synthesizing' : ''}${typeof credits === 'number' && credits < creditCost ? ' disabled' : ''}`}
            onClick={!submitting && (typeof credits !== 'number' || credits >= creditCost) ? () => handleInitialize() : undefined}
            style={typeof credits === 'number' && credits < creditCost ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? t('generateGo.synthesizing') : t('generateGo.initialize')}
          </div>
          {error && (
            <p style={{ color: 'var(--destructive)', marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
