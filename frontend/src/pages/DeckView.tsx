import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import CardGenerationProgress from '@/components/CardGenerationProgress'
import QueuePositionDisplay from '@/components/QueuePositionDisplay'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, Pencil, Plus, BookOpen, Check, X, ChevronLeft, ChevronRight, RotateCcw, Trash2, CheckCircle2, Loader2, AlertTriangle, Play, Share2, PencilLine, Sparkles } from 'lucide-react'
import { useMoveWords } from '@/hooks/useMoveWords'
import DeckPickerSheet from '@/components/deck/DeckPickerSheet'
import CardWordViewerModal from '@/components/deck/CardWordViewerModal'
import ImagelessCardEditModal from '@/components/ImagelessCardEditModal'
import ImagelessCardViewerModal from '@/components/ImagelessCardViewerModal'
import ImagelessCardThumbnail from '@/components/study/ImagelessCardThumbnail'
import WordInfoPanel from '@/components/WordInfoPanel'
import VersionBadge from '@/components/VersionBadge'
import { useAuth } from '@/hooks/useAuth'
import { useVideoVersion, getStoredVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { useVideoPlayback } from '@/hooks/useVideoPlayback'
import { VideoControls } from '@/components/VideoControls'
import { VolumeControl } from '@/components/VolumeControl'
import { useToast } from '@/components/Toast'
import { useQueuePosition } from '@/hooks/useQueuePosition'
import { useDeleteWords } from '@/hooks/useDeleteWords'
import { useDeleteImagelessDeck } from '@/hooks/useDeleteImagelessDeck'
import { VerbCycler } from '@/components/ui/VerbCycler'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { GenerationWheelLoader } from '@/components/ui/GenerationWheelLoader'
import { useTranslation } from '@/hooks/useTranslation'
import { getOrCreateShareLink } from '@/lib/shareWord'
import { shouldUseGlobalQueuePosition, summarizeCardGenerationProgress } from '@/lib/cardGenerationProgress'
import { classifyCardGenerationFailure, getCardRetryAction } from '@/lib/cardFailureClassification'
import { getDeckLanguageLabel } from '@/lib/i18nDisplay'
import { getCardThumbUrl } from '@/lib/imageUrls'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  art_style: string | null
  created_at: string
  deck_type?: 'video' | 'card' | 'card_text'
  source_kind?: string | null
}

type Word = {
  id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  ipa: string | null
  pos: string | null
  article: string | null
  rating: number | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  tts_audio_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_storage_url: string | null
  suno_storage_url_b: string | null
  suno_audio_url: string | null
  suno_audio_url_b: string | null
  suno_task_id: string | null
  metadata: Record<string, unknown> | null
  current_stage?: string | null
  failed_stage?: string | null
  retry_requested?: boolean | null
  retry_requested_at?: string | null
  error_message?: string | null
  image_url?: string | null
  card_image_url?: string | null
  created_at: string
}

export default function DeckView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameTo, setRenameTo] = useState('')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [videoKey, setVideoKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const globalQueueEnabled = shouldUseGlobalQueuePosition(deck)
  const { jobsAhead, queuePaused, hasChecked, shouldShowQueue } = useQueuePosition(id, {
    enabled: !!id && globalQueueEnabled,
  })
  const [retrying, setRetrying] = useState<string | null>(null)
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null)
  const [deletingDeck, setDeletingDeck] = useState(false)

  // ── Edit mode state ──
  const [editMode, setEditMode] = useState(false)
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [showDeckPicker, setShowDeckPicker] = useState(false)
  const [editingImagelessWord, setEditingImagelessWord] = useState<Word | null>(null)
  const { moveWords, moving } = useMoveWords(id!)
  const { deleteWords, deleting } = useDeleteWords(id!)
  const { deleteImagelessDeck } = useDeleteImagelessDeck()

  const handleRetry = async (word: Word) => {
    if (!user) return
    const retryAction = getCardRetryAction(word)
    if (!retryAction.submitRetry) {
      toast(retryAction.message, 'info')
      return
    }
    setRetrying(word.id)
    try {
      const { data, error } = await supabase.rpc('request_word_retry', {
        p_word_id: word.id,
        p_retry_scope: 'word',
      })
      if (error) throw error

      const result = data as { success?: boolean; already_requested?: boolean; error?: string } | null
      if (!result?.success) {
        if (result?.error?.toLowerCase().includes('credit')) {
          toast(t('deckview.noCredits'), 'error')
          return
        }
        throw new Error(result?.error || 'Retry request failed')
      }
      if (result.already_requested) {
        toast('Retry already requested / queued', 'info')
        const { data: refreshedWords } = await supabase
          .from('words')
          .select('*')
          .eq('deck_id', id)
          .order('created_at')
        if (refreshedWords) setWords(refreshedWords)
        return
      }

      await refreshProfile()
      const { data: refreshedWords, error: refreshError } = await supabase
        .from('words')
        .select('*')
        .eq('deck_id', id)
        .order('created_at')
      if (refreshError) throw refreshError
      if (refreshedWords) setWords(refreshedWords)
      toast(t('deckview.retryingGeneration'), 'success')
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('credit')) {
        toast(t('deckview.noCredits'), 'error')
        return
      }
      toast(t('deckview.retryFailed'), 'error')
    } finally {
      setRetrying(null)
    }
  }

  const handleDeleteWord = async (word: Word) => {
    if (!confirm(t('deckview.confirmRemove', { word: word.word }))) return
    setDeletingWordId(word.id)
    try {
      const result = await deleteWords([word.id])
      if (result.success) {
        setWords((prev) => prev.filter(w => w.id !== word.id))
        setSelectedWords((prev) => {
          if (!prev.has(word.id)) return prev
          const next = new Set(prev)
          next.delete(word.id)
          return next
        })
        if (result.deck) {
          setDeck((prev) => prev ? { ...prev, ...result.deck } : prev)
        }
        toast(t('deckview.wordRemoved'), 'success')
      } else {
        toast(result.error || t('deckview.removeFailed'), 'error')
      }
    } catch {
      toast(t('deckview.removeFailed'), 'error')
    } finally {
      setDeletingWordId(null)
    }
  }

  const handleDeleteSelected = async () => {
    const wordIds = Array.from(selectedWords)
    if (wordIds.length === 0) return
    if (!confirm(t('deckview.confirmDeleteSelected', { count: wordIds.length }))) return

    const result = await deleteWords(wordIds)
    if (result.success) {
      const deleted = new Set(wordIds)
      setWords((prev) => prev.filter(w => !deleted.has(w.id)))
      setSelectedWords(new Set())
      setEditMode(false)
      if (result.deck) {
        setDeck((prev) => prev ? { ...prev, ...result.deck } : prev)
      } else {
        setDeck((prev) => prev ? { ...prev, word_count: Math.max(0, prev.word_count - wordIds.length) } : prev)
      }
      toast(t('deckview.wordsDeleted', { count: wordIds.length }), 'success')
    } else {
      toast(result.error || t('deckview.deleteSelectedFailed'), 'error')
    }
  }

  const handleImagelessWordSaved = (updatedWord: Pick<Word, 'id' | 'word' | 'translation' | 'ipa'> & Partial<Pick<Word, 'tts_audio_url'>>) => {
    setWords((prev) => prev.map((word) => (
      word.id === updatedWord.id
        ? {
          ...word,
          word: updatedWord.word,
          translation: updatedWord.translation,
          ipa: updatedWord.ipa,
          tts_audio_url: updatedWord.tts_audio_url ?? word.tts_audio_url,
        }
        : word
    )))
  }

  const handleImagelessWordDeleted = (wordId: string, nextDeck?: { word_count: number; status: string }) => {
    setWords((prev) => prev.filter((word) => word.id !== wordId))
    setSelectedWords((prev) => {
      if (!prev.has(wordId)) return prev
      const next = new Set(prev)
      next.delete(wordId)
      return next
    })
    setViewerOpen(false)
    setEditingImagelessWord(null)
    setDeck((prev) => {
      if (!prev) return prev
      if (nextDeck) return { ...prev, ...nextDeck }
      return { ...prev, word_count: Math.max(0, prev.word_count - 1) }
    })
  }

  const handleDeleteViewerImagelessWord = async (word: Word) => {
    await handleDeleteWord(word)
    setViewerOpen(false)
  }

  const handleDeleteDeck = async () => {
    if (!deck) return
    setDeletingDeck(true)
    try {
      if (deck.deck_type === 'card_text') {
        const confirmed = window.confirm(t('deckview.confirmDeleteDeck'))
        if (!confirmed) return
        await deleteImagelessDeck(deck.id)
      } else if (deck.source_kind === 'curriculum') {
        // Curriculum decks cascade-delete the Learner's personal words for this import.
        const confirmed = window.confirm(t('deckview.confirmCurriculumDelete'))
        if (!confirmed) return

        const { error } = await supabase.rpc('delete_curriculum_deck', {
          p_deck_id: deck.id,
        })
        if (error) throw error
      } else {
        // Non-curriculum decks still have to be empty before archive.
        const { count, error: countError } = await supabase
          .from('words')
          .select('*', { count: 'exact', head: true })
          .eq('deck_id', deck.id)
        if (countError) throw countError
        if ((count ?? 0) > 0) {
          toast(t('deckview.deckNotEmpty'), 'error')
          return
        }

        const { error } = await supabase.rpc('archive_deck', {
          p_deck_id: deck.id,
        })
        if (error) throw error
      }

      toast(t('deckview.deckDeleted'), 'success')
      navigate('/dashboard')
    } catch {
      toast(t('deckview.deleteError'), 'error')
    } finally {
      setDeletingDeck(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!id) return

    try {
      const [deckRes, wordsRes] = await Promise.all([
        supabase.from('decks').select('*').eq('id', id).single(),
        supabase.from('words').select('*').eq('deck_id', id).order('created_at'),
      ])

      if (deckRes.data) setDeck(deckRes.data)
      if (wordsRes.data) setWords(wordsRes.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll every 30s while generating
  useEffect(() => {
    if (!deck || deck.status !== 'generating') return

    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [deck, fetchData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ParticleSpinner preset="spiral" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('deckview.loadingDeck')}</p>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">{t('deckview.notFound')}</h2>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/dashboard">{t('common.backToDecks')}</Link>
        </Button>
      </div>
    )
  }

  const completedCount = words.filter((w) => w.status === 'complete').length
  const totalCount = words.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isGenerating = deck.status === 'generating'
  const isCardDeck = deck.deck_type === 'card'
  const isTextDeck = deck.deck_type === 'card_text'
  const isVideoDeck = !isCardDeck && !isTextDeck
  const cardGenerationProgress = summarizeCardGenerationProgress(words)
  const completeWords = words.filter((w) => w.status === 'complete')
  const cardMaxWidth = completeWords.length === 1 ? 'max-w-[480px]' : 'max-w-[280px]'
  const viewerWord = completeWords[viewerIndex]

  const deckLanguageLabel = getDeckLanguageLabel(deck.target_language, t)
  const displayName =
    deck.name ||
    `${t('generateGo.languageDeckName', { language: deckLanguageLabel })} — ${new Date(deck.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'en-US')}`

  async function handleRate(wordId: string, rating: number) {
    const { error } = await supabase.rpc('rate_word', {
      p_word_id: wordId,
      p_rating: rating,
    })
    if (!error) {
      setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, rating } : w)))
    }
  }

  async function handleRename() {
    if (!deck) return
    const trimmed = renameTo.trim()
    if (!trimmed || trimmed === displayName) {
      setIsRenaming(false)
      return
    }
    const { data, error } = await supabase.rpc('update_deck_metadata', {
      p_deck_id: deck.id,
      p_name: trimmed,
    })
    if (!error) {
      const result = data as Partial<Deck> | null
      setDeck((prev) => prev ? { ...prev, name: result?.name ?? trimmed } : prev)
      setIsRenaming(false)
    }
  }

  function startRenaming() {
    setRenameTo(displayName)
    setIsRenaming(true)
  }

  function cancelRenaming() {
    setIsRenaming(false)
    setRenameTo('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center gap-2 mb-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/decks">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <div className="space-y-2">
          {isRenaming ? (
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') cancelRenaming()
                }}
                autoFocus
                maxLength={100}
                className="text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary outline-none text-foreground max-w-md text-center"
              />
              <Button variant="ghost" size="icon" onClick={handleRename} className="shrink-0">
                <Check className="h-4 w-4 text-green-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={cancelRenaming} className="shrink-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 group/name">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <button
                onClick={startRenaming}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title={t('deckview.renameDeck')}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">{deckLanguageLabel}</span>
            {isGenerating ? (
              <span title={t('deckview.statusGenerating', { completed: completedCount, total: totalCount })}>
                <Sparkles className="h-4 w-4 text-[var(--pg-accent-teal,var(--primary))]" />
              </span>
            ) : deck.status === 'complete' ? (
              <span title={t('deckview.statusReady')}>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </span>
            ) : (
              <span title={t('deckview.statusPartial', { completed: completedCount, total: totalCount })}>
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </span>
            )}
          </div>
          {globalQueueEnabled && (!hasChecked || shouldShowQueue) && (
            <div className="mx-auto mt-4 w-full max-w-3xl px-4">
              <QueuePositionDisplay jobsAhead={jobsAhead} queuePaused={queuePaused} hasChecked={hasChecked} />
            </div>
          )}
          {isGenerating && isCardDeck && (
            <div className="mx-auto mt-4 w-full max-w-3xl px-4">
              <CardGenerationProgress summary={cardGenerationProgress} />
            </div>
          )}
          {isGenerating && (
            <div className="mt-6 flex flex-col items-center gap-5">
              <GenerationWheelLoader size={112} className="gap-0" />
              <Progress value={progress} className="h-2 w-full max-w-md mx-auto" />
            </div>
          )}
          {isGenerating && isVideoDeck && hasChecked && !shouldShowQueue && (
            <VerbCycler className="mt-1" />
          )}
        </div>
      </div>

      {/* Top actions — layout adapts to button count:
          editMode=true  → 1 button (Done)              → centered at natural width
          editMode=false → 3 buttons (Study/Add/Edit|Delete) → 3-col grid */}
      <div className={editMode
        ? 'flex justify-center'
        : 'grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto'
      }>
        {!editMode && (
          <>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => navigate(`/study?deck=${deck.id}`)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {t('deckview.study')}
            </Button>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => navigate(`/generate?deckId=${deck.id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('deckview.addCards')}
            </Button>
          </>
        )}
        {words.length === 0 || deck.source_kind === 'curriculum' ? (
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleDeleteDeck}
            disabled={deletingDeck}
          >
            {deletingDeck ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {t('deckview.deleteDeck')}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => {
              if (editMode) {
                setEditMode(false)
                setSelectedWords(new Set())
              } else {
                setEditMode(true)
                setSelectedWords(new Set())
              }
            }}
          >
            {editMode ? (
              <><X className="h-4 w-4 mr-2" />{t('deckview.done')}</>
            ) : isTextDeck ? (
              <><PencilLine className="h-4 w-4 mr-2" />{t('deckview.manage')}</>
            ) : (
              <><PencilLine className="h-4 w-4 mr-2" />{t('deckview.editDeck')}</>
            )}
          </Button>
        )}
      </div>

      {/* Quick-select bar (edit mode) */}
      {editMode && (
        <div className="w-full max-w-5xl mx-auto px-4 pt-4 flex flex-wrap gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border"
            onClick={() => {
              const selectable = words.filter(w => w.status !== 'pending' && w.status !== 'processing')
              setSelectedWords(new Set(selectable.map(w => w.id)))
            }}
          >
            {t('deckview.selectAll')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border"
            onClick={() => {
              const failed = words.filter(w => w.status === 'failed')
              setSelectedWords(new Set(failed.map(w => w.id)))
            }}
          >
            {t('deckview.selectFailed')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border"
            onClick={() => setSelectedWords(new Set())}
          >
            {t('deckview.clearSelection')}
          </Button>
        </div>
      )}

      {/* Word Grid */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-center gap-4 [touch-action:pan-y]">
        {words.map((word) => {
          const isComplete = word.status === 'complete'
          const isFailed = word.status === 'failed'
          const cardDiagnostic = isCardDeck ? classifyCardGenerationFailure(word) : null

          const isSelectable = word.status !== 'pending' && word.status !== 'processing'
          const isSelected = selectedWords.has(word.id)

          return (
            <div key={word.id} className={`relative group w-full ${cardMaxWidth}`}>
              {isComplete ? (
                <div
                  onClick={() => {
                    if (editMode && isSelectable) {
                      setSelectedWords(prev => {
                        const next = new Set(prev)
                        if (next.has(word.id)) next.delete(word.id)
                        else next.add(word.id)
                        return next
                      })
                      return
                    }
                    const idx = completeWords.findIndex(w => w.id === word.id)
                    if (idx >= 0) {
                      setViewerIndex(idx)
                      if (isVideoDeck) setVideoKey(k => k + 1)
                      setViewerOpen(true)
                    }
                  }}
                  onContextMenu={(event) => {
                    if (!isTextDeck) return
                    event.preventDefault()
                    setEditingImagelessWord(word)
                  }}
                  className={`block glass glass-hover rounded-xl overflow-hidden transition-[background-color,box-shadow,border-color,transform] duration-200 cursor-pointer active:scale-[0.98] ${
                    editMode && isSelected
                      ? 'ring-2 ring-emerald-400 border-emerald-400/30'
                      : '[@media(hover:hover)]:hover:scale-[1.03] hover:glow-purple'
                  }`}
                >
                  {/* Edit mode checkbox */}
                  {editMode && isSelectable && (
                    <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
                      isSelected
                        ? 'bg-emerald-400 border-emerald-400 text-black'
                        : 'bg-black/40 border-white/40 backdrop-blur-sm'
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  )}
                  {/* Thumbnail */}
                  {isTextDeck ? (
                    <ImagelessCardThumbnail
                      word={word.word}
                      translation={word.translation ?? ''}
                      ipa={word.ipa}
                      targetLanguage={deck.target_language}
                    />
                  ) : (
                  <div className="aspect-video relative bg-card">
                    {word.thumbnail_url ? (
                      <img
                        src={isCardDeck ? getCardThumbUrl(word.thumbnail_url) ?? undefined : word.thumbnail_url}
                        alt={word.word}
                        loading="lazy"
                        className={`w-full h-full ${isCardDeck ? 'object-contain bg-card' : 'object-cover'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        {isVideoDeck && <Play className="h-8 w-8 text-primary/50" />}
                      </div>
                    )}
                    {/* Play overlay */}
                    {isVideoDeck && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                    )}
                    {/* Version indicator on card */}
                    {word.video_url_b && (
                      <span className={`absolute top-2 ${!editMode ? 'right-10' : 'right-2'} px-1.5 py-0.5 rounded-full bg-black/60 border border-white/20 text-white text-[10px] font-medium backdrop-blur-sm z-10`}>
                        {getStoredVersion(word.id).toUpperCase()}
                      </span>
                    )}
                  </div>
                  )}
                  {/* Info */}
                  <div className="p-3 space-y-0.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    {!isTextDeck && word.translation && (
                      <p className="text-xs text-muted-foreground truncate">{word.translation}</p>
                    )}
                  </div>
                </div>
              ) : isFailed ? (
                <div
                  className={`glass rounded-xl overflow-hidden opacity-70 ${
                    editMode ? 'cursor-pointer' : ''
                  } ${editMode && isSelected ? 'ring-2 ring-emerald-400 border-emerald-400/30 opacity-100' : ''}`}
                  onClick={() => {
                    if (editMode && isSelectable) {
                      setSelectedWords(prev => {
                        const next = new Set(prev)
                        if (next.has(word.id)) next.delete(word.id)
                        else next.add(word.id)
                        return next
                      })
                    }
                  }}
                >
                  {/* Edit mode checkbox */}
                  {editMode && isSelectable && (
                    <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
                      isSelected
                        ? 'bg-emerald-400 border-emerald-400 text-black'
                        : 'bg-black/40 border-white/40 backdrop-blur-sm'
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  )}
                  <div className="aspect-video flex items-center justify-center bg-destructive/5">
                    <AlertCircle className="h-8 w-8 text-destructive-foreground/50" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    <p className="text-xs text-destructive-foreground">
                      {isCardDeck || isTextDeck ? t('deckview.cardFailure') : t('deckview.couldNotGenerate')}
                    </p>
                    {cardDiagnostic && (
                      <p className="text-[11px] text-destructive-foreground/70">
                        {cardDiagnostic.label}
                        {cardDiagnostic.providerReached === false ? ' · Provider was not reached' : ''}
                      </p>
                    )}
                    {!editMode && (
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => { e.stopPropagation(); handleRetry(word) }}
                          disabled={retrying === word.id}
                        >
                          <RotateCcw className="h-3 w-3" />
                          {retrying === word.id ? t('deckview.retrying') : isCardDeck ? 'Bild erneut erstellen' : t('common.retry')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive-foreground/50 hover:text-destructive-foreground"
                          onClick={(e) => { e.stopPropagation(); handleDeleteWord(word) }}
                          disabled={deleting || deletingWordId === word.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Pending / Processing — status is shown only inside the media placeholder, not duplicated under the title */
                <div className="glass rounded-xl overflow-hidden">
                  <div className="aspect-video flex items-center justify-center bg-card px-3 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {word.status === 'pending'
                        ? t('deckview.queued')
                        : isCardDeck || isTextDeck ? t('deckview.cardCreation') : t('deckview.processing')}
                    </span>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    {cardDiagnostic && (
                      <p className="text-[11px] text-muted-foreground/70">
                        {cardDiagnostic.label}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>

      {/* Edit mode action bar */}
      {editMode && isTextDeck && (
        <div className="fixed left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10" style={{ bottom: 'var(--fixed-bottom-ui-offset)', paddingBottom: 'var(--fixed-bottom-ui-safe-bottom)' }}>
          <div className="flex flex-col gap-3 px-4 py-3 max-w-5xl mx-auto sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="text-sm text-white/70 sm:shrink-0">
              {t('deckview.nSelected', { count: selectedWords.size })}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={selectedWords.size === 0 || deleting || moving}
                onClick={handleDeleteSelected}
                className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 sm:w-auto"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {t('deckview.manage.deleteSelected')}
              </Button>
              <Button
                size="sm"
                disabled={selectedWords.size === 0 || moving || deleting}
                onClick={() => setShowDeckPicker(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium sm:w-auto"
              >
                {moving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('deckview.manage.moveSelected')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-white/10 sm:w-auto"
                onClick={() => {
                  setEditMode(false)
                  setSelectedWords(new Set())
                }}
              >
                <X className="h-4 w-4 mr-2" />
                {t('deckview.manage.cancelManage')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deletingDeck}
                onClick={handleDeleteDeck}
                className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 sm:w-auto"
              >
                {deletingDeck ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                {t('deckview.manage.deleteDeck')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editMode && !isTextDeck && selectedWords.size > 0 && (
        <div className="fixed left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10" style={{ bottom: 'var(--fixed-bottom-ui-offset)', paddingBottom: 'var(--fixed-bottom-ui-safe-bottom)' }}>
          <div className="flex flex-col gap-3 px-4 py-3 max-w-5xl mx-auto sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="text-sm text-white/70 sm:shrink-0">
              {t('deckview.nSelected', { count: selectedWords.size })}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={deleting || moving}
                onClick={handleDeleteSelected}
                className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 sm:w-auto"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {t('deckview.deleteSelected')}
              </Button>
              <Button
                size="sm"
                disabled={moving || deleting}
                onClick={() => setShowDeckPicker(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium sm:w-auto"
              >
                {moving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t('deckview.moveToDeck')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Card Viewer Modal */}
      {viewerOpen && viewerWord && isCardDeck && (
        <CardWordViewerModal
          words={completeWords}
          currentIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onNavigate={setViewerIndex}
          onRate={handleRate}
        />
      )}

      {/* Image-less Card Viewer Modal */}
      {viewerOpen && viewerWord && isTextDeck && (
        <ImagelessCardViewerModal
          word={{ ...viewerWord, target_language: deck.target_language }}
          isOpen={viewerOpen}
          isManageMode={editMode}
          onClose={() => setViewerOpen(false)}
          onEdit={() => setEditingImagelessWord(viewerWord)}
          onDelete={() => { void handleDeleteViewerImagelessWord(viewerWord) }}
        />
      )}

      {/* Video Viewer Modal */}
      {viewerOpen && viewerWord && isVideoDeck && (
        <VideoViewerModal
          words={completeWords}
          currentIndex={viewerIndex}
          videoKey={videoKey}
          videoRef={videoRef}
          onClose={() => setViewerOpen(false)}
          onNavigate={(idx) => {
            setViewerIndex(idx)
            setVideoKey(k => k + 1)
          }}
          onReplay={() => setVideoKey(k => k + 1)}
          onRate={handleRate}
        />
      )}

      <ImagelessCardEditModal
        key={editingImagelessWord?.id ?? 'no-imageless-edit'}
        word={editingImagelessWord}
        isOpen={Boolean(editingImagelessWord)}
        onClose={() => setEditingImagelessWord(null)}
        onSaved={handleImagelessWordSaved}
        onDeleted={handleImagelessWordDeleted}
      />

      {/* Deck Picker */}
      {deck && (
        <DeckPickerSheet
          open={showDeckPicker}
          onClose={() => setShowDeckPicker(false)}
          onSelectDeck={async (targetDeckId) => {
            setShowDeckPicker(false)
            const wordIds = Array.from(selectedWords)
            const result = await moveWords(wordIds, targetDeckId)
            if (result.success) {
              setWords(prev => prev.filter(w => !selectedWords.has(w.id)))
              setSelectedWords(new Set())
              setEditMode(false)
              setDeck(prev => prev ? { ...prev, word_count: Math.max(0, prev.word_count - wordIds.length) } : prev)
              toast(t('deckview.wordsMoved', { count: wordIds.length }), 'success')
            } else {
              toast(result.error || t('deckview.moveFailed'), 'error')
            }
          }}
          sourceDeckId={id!}
          sourceDeckType={deck.deck_type ?? null}
          targetLanguage={deck.target_language}
          selectedCount={selectedWords.size}
        />
      )}
    </div>
  )
}

function VideoViewerModal({
  words,
  currentIndex,
  videoKey,
  videoRef,
  onClose,
  onNavigate,
  onReplay,
  onRate,
}: {
  words: Word[]
  currentIndex: number
  videoKey: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  onClose: () => void
  onNavigate: (idx: number) => void
  onReplay: () => void
  onRate: (wordId: string, rating: number) => void
}) {
  const word = words[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < words.length - 1
  const { activeVideoUrl, version, toggleVersion, hasAltVersion } = useVideoVersion(word ?? { id: '', video_url: null, thumbnail_url: null })
  const { t } = useTranslation()
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(videoRef, false)
  const { isPlaying, setIsPlaying, togglePlay, onPlay, onPause } = useVideoPlayback(videoRef)
  const isPlayingRef = useRef(isPlaying)
  const [sharing, setSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  async function handleShare() {
    setSharing(true)
    setShareSuccess(false)
    const url = await getOrCreateShareLink(word.id)
    if (!url) {
      setSharing(false)
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${word.word}${word.translation ? ` — ${word.translation}` : ''}`,
          text: word.mnemonic || `Learn "${word.word}" with Lingwave`,
          url,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[share] Native share failed:', err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch {
        const input = document.createElement('input')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    }
    setSharing(false)
  }

  // Preserve playing/paused state when navigating to a new word
  useEffect(() => {
    setIsPlaying(isPlayingRef.current)
  }, [currentIndex, setIsPlaying])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext, togglePlay])

  if (!word) return null

  return (
    <div className="fixed inset-0 z-50 gradient-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="w-10" />
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4 overflow-y-auto h-0">
        {/* Main content */}
        <div className="w-full max-w-3xl space-y-6">
          {/* Video container with arrows */}
          <div className="relative group/video">
            {/* Volume control — outside overflow-hidden so slider isn't clipped */}
            {activeVideoUrl && (
              <div className="absolute top-3 left-3 z-30 opacity-0 group-hover/video:opacity-100 transition-opacity">
                <VolumeControl
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  popDirection="right"
                  iconSize={20}
                  buttonClassName="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                />
              </div>
            )}
            <div className="relative rounded-xl overflow-hidden bg-black/50 shadow-2xl">
            {/* Prev arrow — centered on video */}
            {hasPrev && (
              <button
                onClick={() => onNavigate(currentIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next arrow — centered on video */}
            {hasNext && (
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
            {activeVideoUrl ? (
              <>
                <video
                  ref={videoRef}
                  key={`${videoKey}-${version}`}
                  src={`${activeVideoUrl}?t=${videoKey}`}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  onClick={togglePlay}
                  onPlay={onPlay}
                  onPause={onPause}
                  onEnded={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0
                      videoRef.current.pause()
                    }
                    setIsPlaying(false)
                  }}
                  className="w-full aspect-video cursor-pointer"
                />
              </>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-white/5">
                <p className="text-muted-foreground">{t('deckview.noVideo')}</p>
              </div>
            )}

            {/* Version badge */}
            <VersionBadge
              version={version}
              hasAlt={hasAltVersion}
              onToggle={() => { toggleVersion(); onReplay() }}
              className="absolute top-4 right-4"
            />

            {/* Video controls overlay */}
            {activeVideoUrl && (
              <VideoControls
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                fullscreenRef={videoRef}
                iconSize={20}
                buttonClassName="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                className="z-20"
                renderVolumeExternal={true}
              />
            )}
            </div>
          </div>

          {/* Word info */}
          <WordInfoPanel
            word={word}
            onRate={onRate}
          />

          {/* Share */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="border-white/10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {sharing ? 'Sharing...' : shareSuccess ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
