import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Beaker, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitGeneration } from '@/components/generate/submitGeneration'
import {
  CARD_LAYER2_ART_STYLE_OPTIONS,
  CARD_LAYER2_MEANING_OPTIONS,
  CARD_LAYER2_PRESENTATION_OPTIONS,
  cardLayer2ArtStyleLabel,
  cardLayer2MeaningLabel,
  cardLayer2PresentationLabel,
  type CardLayer2ArtStyle,
  type CardLayer2BackendTemplate,
  type CardLayer2MeaningStrategy,
  type CardLayer2PresentationForm,
  type ExistingDeck,
} from '@/components/generate/useWizardState'
import {
  ADMIN_LAYER2_LAB_PRESETS,
  buildLayer2LabPayload,
  createLayer2LabResultSummary,
  buildLayer2LabRows,
  createLayer2LabDeckName,
  createLayer2LabRunId,
  DEFAULT_LAYER2_BACKEND_TEMPLATE,
  estimateLayer2LabCreditCost,
  getLayer2LabPresetRows,
  isLayer2LabAppendDeck,
  layer2BackendTemplateLabel,
  layer2QuickModePresetLabel,
  LAYER2_BACKEND_TEMPLATE_OPTIONS,
  LAYER2_QUICK_MODE_PRESET_OPTIONS,
  normalizeLayer2LabWords,
  resolveLayer2LabQuickModePreset,
  validateLayer2LabSubmit,
  type Layer2LabDeckMode,
  type Layer2LabQuickModePreset,
  type Layer2LabRun,
  type Layer2LabResultSummary,
  type Layer2LabWordScope,
} from '@/lib/adminLayer2Lab'
import { BASE_LANGUAGES, WIZARD_LANGUAGES } from '@/lib/languages'

const TARGET_LANGUAGES = WIZARD_LANGUAGES
const LAB_SELECT_CONTENT_CLASS = 'z-[999] max-h-72 overflow-y-auto border border-white/20 !bg-[#05050a] !text-white shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-none'

function languageLabel(lang: { value: string; nativeName: string }) {
  return lang.nativeName === lang.value ? lang.value : `${lang.nativeName} (${lang.value})`
}

function deckLabel(deck: ExistingDeck): string {
  return deck.name || `${deck.target_language} Card Deck`
}

export default function Layer2Lab() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [targetLanguage, setTargetLanguage] = useState('English')
  const [baseLanguage, setBaseLanguage] = useState(profile?.base_language || 'English')
  const [deckMode, setDeckMode] = useState<Layer2LabDeckMode>('create')
  const [deckNamePrefix, setDeckNamePrefix] = useState('Layer2 Lab')
  const [existingDecks, setExistingDecks] = useState<ExistingDeck[]>([])
  const [selectedExistingDeckId, setSelectedExistingDeckId] = useState<string | null>(null)
  const [loadingDecks, setLoadingDecks] = useState(false)
  const [wordDraft, setWordDraft] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [wordScope, setWordScope] = useState<Layer2LabWordScope>('selected')
  const [quickModePreset, setQuickModePreset] = useState<Layer2LabQuickModePreset>('custom')
  const [meaningStrategy, setMeaningStrategy] = useState<CardLayer2MeaningStrategy>('clear_meaning')
  const [presentationForm, setPresentationForm] = useState<CardLayer2PresentationForm>('single_scene')
  const [artStyle, setArtStyle] = useState<CardLayer2ArtStyle>('realistic')
  const [backendTemplate, setBackendTemplate] = useState<CardLayer2BackendTemplate>(DEFAULT_LAYER2_BACKEND_TEMPLATE)
  const [runLabel, setRunLabel] = useState('')
  const [scriptRows, setScriptRows] = useState<Layer2LabRun[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null)
  const [createdDeckName, setCreatedDeckName] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState<Layer2LabResultSummary | null>(null)

  const selectedWordValue = selectedWord ?? words[0] ?? null
  const canAddRun = words.length > 0 && (wordScope === 'all' || Boolean(selectedWordValue))
  const deckNamePreview = useMemo(
    () => createLayer2LabDeckName(deckNamePrefix),
    [deckNamePrefix],
  )
  const selectedExistingDeck = useMemo(
    () => existingDecks.find((deck) => deck.id === selectedExistingDeckId) ?? null,
    [existingDecks, selectedExistingDeckId],
  )
  const estimatedCredits = estimateLayer2LabCreditCost(scriptRows.length)

  useEffect(() => {
    if (!user || deckMode !== 'append') return
    const userId = user.id
    let cancelled = false
    setLoadingDecks(true)
    async function loadAppendDecks() {
      try {
        const { data, error } = await supabase
          .from('decks')
          .select('id, name, target_language, art_style, movie_override, word_count, deck_type')
          .eq('user_id', userId)
          .eq('deck_type', 'card')
          .order('updated_at', { ascending: false })
          .limit(50)
        if (cancelled) return
        if (error) {
          console.error('Failed to load Layer 2 Lab append decks:', error)
          setExistingDecks([])
          setSelectedExistingDeckId(null)
          return
        }
        const decks: ExistingDeck[] = (data ?? [])
          .filter((deck) => deck.deck_type === 'card')
          .map((deck) => ({
            id: deck.id,
            name: deck.name ?? null,
            target_language: deck.target_language,
            art_style: deck.art_style ?? null,
            movie_override: deck.movie_override ?? null,
            word_count: deck.word_count ?? 0,
            deck_type: 'card',
            last_card_image_model: 'gpt_image_2',
          }))
        setExistingDecks(decks)
        setSelectedExistingDeckId((current) =>
          current && decks.some((deck) => deck.id === current) ? current : null,
        )
      } finally {
        if (!cancelled) setLoadingDecks(false)
      }
    }
    void loadAppendDecks()
    return () => {
      cancelled = true
    }
  }, [deckMode, user])

  function addWordsFromDraft() {
    const nextWords = normalizeLayer2LabWords(wordDraft)
    if (nextWords.length === 0) return
    setWords((prev) => {
      const seen = new Set(prev.map((word) => word.toLowerCase()))
      const merged = [...prev]
      for (const word of nextWords) {
        if (seen.has(word.toLowerCase())) continue
        seen.add(word.toLowerCase())
        merged.push(word)
      }
      if (!selectedWord && merged.length > 0) setSelectedWord(merged[0])
      return merged
    })
    setWordDraft('')
  }

  function removeWord(word: string) {
    setWords((prev) => prev.filter((item) => item !== word))
    if (selectedWord === word) {
      const next = words.find((item) => item !== word) ?? null
      setSelectedWord(next)
    }
  }

  function applyQuickModePreset(value: Layer2LabQuickModePreset) {
    setQuickModePreset(value)
    const resolved = resolveLayer2LabQuickModePreset(value)
    if (!resolved) return
    setMeaningStrategy(resolved.meaning_strategy)
    setPresentationForm(resolved.presentation_form)
  }

  function addCurrentRun() {
    if (!canAddRun) return
    const rows = buildLayer2LabRows({
      words,
      selectedWord: selectedWordValue,
      wordScope,
      quick_mode_preset: quickModePreset,
      meaning_strategy: meaningStrategy,
      presentation_form: presentationForm,
      art_style: artStyle,
      backend_template: backendTemplate,
      label: runLabel,
    }).map((row) => ({ ...row, id: crypto.randomUUID() }))
    setScriptRows((prev) => [...prev, ...rows])
  }

  function addPreset(id: (typeof ADMIN_LAYER2_LAB_PRESETS)[number]['id']) {
    const rows = getLayer2LabPresetRows(id, words).map((row) => ({ ...row, id: crypto.randomUUID() }))
    setScriptRows((prev) => [...prev, ...rows])
    setWords((prev) => {
      const seen = new Set(prev.map((word) => word.toLowerCase()))
      const merged = [...prev]
      for (const row of rows) {
        if (seen.has(row.word.toLowerCase())) continue
        seen.add(row.word.toLowerCase())
        merged.push(row.word)
      }
      if (!selectedWord && merged.length > 0) setSelectedWord(merged[0])
      return merged
    })
  }

  async function createEvaluationDeck() {
    if (!user || scriptRows.length === 0) return
    const validation = validateLayer2LabSubmit({
      mode: deckMode,
      rowCount: scriptRows.length,
      existingDeck: selectedExistingDeck,
    })
    if (validation) {
      toast(validation, 'error')
      return
    }
    setSubmitting(true)
    setCreatedDeckId(null)
    setCreatedDeckName(null)
    setResultSummary(null)
    const startingDeck = deckMode === 'append' && isLayer2LabAppendDeck(selectedExistingDeck)
      ? selectedExistingDeck
      : undefined
    const deckName = startingDeck ? deckLabel(startingDeck) : createLayer2LabDeckName(deckNamePrefix)
    let deck: ExistingDeck | undefined = startingDeck
    let deckId: string | null = startingDeck?.id ?? null
    let submittedRows = 0
    const labRunId = createLayer2LabRunId()
    const failedRows: Layer2LabResultSummary['failedRows'] = []

    try {
      for (const [index, row] of scriptRows.entries()) {
        const payload = buildLayer2LabPayload({
          row,
          scriptIndex: index + 1,
          labRunId,
          userId: user.id,
          targetLanguage,
          baseLanguage,
          deckName,
          existingDeck: deck,
        })
        try {
          deckId = await submitGeneration(user.id, payload, deck)
          submittedRows += 1
          deck = {
            id: deckId,
            name: deckName,
            target_language: targetLanguage,
            art_style: null,
            movie_override: null,
            word_count: 0,
            deck_type: 'card',
            last_card_image_model: 'gpt_image_2',
          }
        } catch (err) {
          failedRows.push({
            scriptIndex: index + 1,
            word: row.word,
            label: row.label,
            reason: err instanceof Error ? err.message : 'Failed to submit row',
          })
          if (deckMode === 'create' && !deckId) break
        }
      }
      setCreatedDeckId(deckId)
      setCreatedDeckName(deckName)
      const summary = createLayer2LabResultSummary({
        deckId,
        deckName,
        totalRows: scriptRows.length,
        submittedRows,
        failedRows,
      })
      setResultSummary(summary)
      if (!deckId) {
        toast('Layer 2 evaluation deck was not created', 'error')
      } else if (failedRows.length > 0) {
        toast('Layer 2 evaluation deck partially created', 'error')
      } else {
        toast('Layer 2 evaluation deck created', 'success')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create evaluation deck'
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Beaker className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Layer 2 Lab</h1>
            <p className="text-sm text-muted-foreground">
              Create one evaluation deck with one generated card per script row.
            </p>
          </div>
        </div>
        {createdDeckId && (
          <Button asChild>
            <Link to={`/deck/${createdDeckId}`}>Open {createdDeckName || 'deck'}</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold">Language</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Target language</span>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {TARGET_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{languageLabel(lang)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Base language</span>
                <Select value={baseLanguage} onValueChange={setBaseLanguage}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {BASE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{languageLabel(lang)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  Enrichment currently uses the admin profile base language; this value is recorded for lab intent only.
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Mode</span>
                <Select value={deckMode} onValueChange={(value) => setDeckMode(value as Layer2LabDeckMode)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    <SelectItem value="create">Create new evaluation deck</SelectItem>
                    <SelectItem value="append">Append to existing deck</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              {deckMode === 'append' ? (
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Existing card deck</span>
                  <Select
                    value={selectedExistingDeckId ?? undefined}
                    onValueChange={setSelectedExistingDeckId}
                    disabled={loadingDecks || existingDecks.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingDecks ? 'Loading card decks...' : 'Select a card deck'} />
                    </SelectTrigger>
                    <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                      {existingDecks.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deckLabel(deck)} - {deck.target_language} - {deck.word_count} cards
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {loadingDecks ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Only card decks are available for Layer 2 Lab appends.
                  </span>
                </label>
              ) : (
                <>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Deck name prefix</span>
                    <Input value={deckNamePrefix} onChange={(event) => setDeckNamePrefix(event.target.value)} />
                  </label>
                  <p className="text-xs text-muted-foreground">Preview: {deckNamePreview}</p>
                </>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold">Words</h2>
            <div className="flex gap-2">
              <Input
                value={wordDraft}
                onChange={(event) => setWordDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addWordsFromDraft()
                  }
                }}
                placeholder="pride, remorse, flowers"
              />
              <Button type="button" onClick={addWordsFromDraft}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {words.map((word) => (
                <span
                  key={word}
                  className={`inline-flex items-center rounded-full border text-sm transition-colors ${
                    selectedWordValue === word
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedWord(word)}
                    className="px-3 py-1 hover:text-foreground"
                  >
                    {word}
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs opacity-70 hover:opacity-100"
                    onClick={() => removeWord(word)}
                    aria-label={`Remove ${word}`}
                  >
                    x
                  </button>
                </span>
              ))}
              {words.length === 0 && (
                <p className="text-sm text-muted-foreground">Add one or more words to build a run.</p>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold">Presets</h2>
            <div className="grid grid-cols-1 gap-2">
              {ADMIN_LAYER2_LAB_PRESETS.map((preset) => (
                <Button key={preset.id} type="button" variant="outline" onClick={() => addPreset(preset.id)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold">Run Builder</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Word scope</span>
                <Select value={wordScope} onValueChange={(value) => setWordScope(value as Layer2LabWordScope)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    <SelectItem value="selected">One selected word</SelectItem>
                    <SelectItem value="all">All words</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Quick Mode Preset</span>
                <Select value={quickModePreset} onValueChange={(value) => applyQuickModePreset(value as Layer2LabQuickModePreset)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {LAYER2_QUICK_MODE_PRESET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Meaning strategy</span>
                <Select
                  value={meaningStrategy}
                  onValueChange={(value) => {
                    setMeaningStrategy(value as CardLayer2MeaningStrategy)
                    setQuickModePreset('custom')
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {CARD_LAYER2_MEANING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Presentation form</span>
                <Select
                  value={presentationForm}
                  onValueChange={(value) => {
                    setPresentationForm(value as CardLayer2PresentationForm)
                    setQuickModePreset('custom')
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {CARD_LAYER2_PRESENTATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Art style</span>
                <Select value={artStyle} onValueChange={(value) => setArtStyle(value as CardLayer2ArtStyle)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {CARD_LAYER2_ART_STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Backend Template</span>
                <Select value={backendTemplate} onValueChange={(value) => setBackendTemplate(value as CardLayer2BackendTemplate)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className={LAB_SELECT_CONTENT_CLASS}>
                    {LAYER2_BACKEND_TEMPLATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-muted-foreground">Run label</span>
                <Input value={runLabel} onChange={(event) => setRunLabel(event.target.value)} placeholder="optional" />
              </label>
            </div>
            <Button type="button" onClick={addCurrentRun} disabled={!canAddRun}>
              Add to script
            </Button>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Script</h2>
                <p className="text-xs text-muted-foreground">
                  Estimated cost: {estimatedCredits} credits ({scriptRows.length} x 5 Premium GPT Image-2 credits).
                </p>
              </div>
              <Button
                type="button"
                onClick={createEvaluationDeck}
                disabled={scriptRows.length === 0 || submitting}
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {deckMode === 'append' ? 'Append To Evaluation Deck' : 'Create Evaluation Deck'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Word</th>
                    <th className="py-2 pr-3 font-medium">Quick Mode</th>
                    <th className="py-2 pr-3 font-medium">Meaning Strategy</th>
                    <th className="py-2 pr-3 font-medium">Presentation Form</th>
                    <th className="py-2 pr-3 font-medium">Art Style</th>
                    <th className="py-2 pr-3 font-medium">Backend Template</th>
                    <th className="py-2 pr-3 font-medium">Label</th>
                    <th className="py-2 pr-3 font-medium">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {scriptRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">{row.word}</td>
                      <td className="py-2 pr-3">{layer2QuickModePresetLabel(row.quick_mode_preset ?? 'custom')}</td>
                      <td className="py-2 pr-3">{cardLayer2MeaningLabel(row.meaning_strategy)}</td>
                      <td className="py-2 pr-3">{cardLayer2PresentationLabel(row.presentation_form)}</td>
                      <td className="py-2 pr-3">{cardLayer2ArtStyleLabel(row.art_style)}</td>
                      <td className="py-2 pr-3">
                        {layer2BackendTemplateLabel(row.backend_template)}
                      </td>
                      <td className="py-2 pr-3">{row.label || '—'}</td>
                      <td className="py-2 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setScriptRows((prev) => prev.filter((item) => item.id !== row.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {scriptRows.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={8}>
                        No planned runs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {resultSummary && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="font-medium">
                  {resultSummary.deckId ? 'Evaluation deck result' : 'Evaluation deck failed'}
                </div>
                <div className="mt-1 text-muted-foreground">
                  Rows submitted: {resultSummary.submittedRows} / {resultSummary.totalRows}. Rows failed: {resultSummary.failedRows.length}.
                </div>
                {resultSummary.deckId && (
                  <Button asChild variant="link" className="h-auto px-0 py-1">
                    <Link to={`/deck/${resultSummary.deckId}`}>Open {resultSummary.deckName}</Link>
                  </Button>
                )}
                {resultSummary.failedRows.length > 0 && (
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {resultSummary.failedRows.map((failure) => (
                      <li key={`${failure.scriptIndex}-${failure.word}`}>
                        Row {failure.scriptIndex}: {failure.label || failure.word} - {failure.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
