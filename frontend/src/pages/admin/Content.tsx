import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  Flag,
  RefreshCw,
  Search,
  ImageOff,
  Zap,
  Music,
  Loader2,
  Play,
  Square,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { generateSunoSong } from '@/api'
import WordDetailPanel from '@/components/admin/WordDetailPanel'
import StarRating from '@/components/ui/StarRating'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Deck = {
  id: string
  user_id: string
  name: string
  target_language: string
  art_style: string | null
  movie_override: string | null
  word_count: number
  status: string
  created_at: string
  updated_at: string
  profiles?: { display_name: string | null } | null
}

type WordRecord = {
  id: string
  deck_id: string
  user_id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  error_message: string | null
  retry_count: number
  metadata: Record<string, unknown> | null
  rating: number | null
  rated_at: string | null
  needs_review: boolean
  suno_audio_url: string | null
  suno_task_id: string | null
  created_at: string
}

type ProfileOption = {
  id: string
  display_name: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  generating: 'bg-blue-500/20 text-blue-400',
  complete: 'bg-green-500/20 text-green-400',
  partial: 'bg-orange-500/20 text-orange-400',
  // Word statuses
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-purple-500/20 text-purple-400',
  failed: 'bg-red-500/20 text-red-400',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractStoragePath(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/videos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length)
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Content() {
  const { toast } = useToast()

  // Data
  const [decks, setDecks] = useState<Deck[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [deckWords, setDeckWords] = useState<Record<string, WordRecord[]>>({})
  const [loading, setLoading] = useState(true)

  // UI state
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordRecord | null>(null)

  // Filters
  const [userFilter, setUserFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Confirmation dialogs
  const [deleteWordTarget, setDeleteWordTarget] = useState<WordRecord | null>(null)
  const [deleteDeckTarget, setDeleteDeckTarget] = useState<Deck | null>(null)
  const [regenerateTarget, setRegenerateTarget] = useState<WordRecord | null>(null)
  const [smartRetryTarget, setSmartRetryTarget] = useState<WordRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [sunoGeneratingId, setSunoGeneratingId] = useState<string | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handlePlayAudio = useCallback((word: WordRecord) => {
    const el = audioRef.current
    if (!el) return
    if (playingAudioId === word.id) {
      el.pause()
      setPlayingAudioId(null)
    } else {
      el.src = word.suno_audio_url!
      el.play()
      setPlayingAudioId(word.id)
    }
  }, [playingAudioId])

  const handleSunoGenerate = useCallback(async (word: WordRecord) => {
    if (!word.word_slug || !word.deck_id || !word.user_id || sunoGeneratingId) return
    setSunoGeneratingId(word.id)
    try {
      const result = await generateSunoSong(word.word_slug, word.deck_id, word.user_id)
      await supabase
        .from('words')
        .update({ suno_audio_url: result.audio_url, suno_task_id: result.task_id })
        .eq('id', word.id)
      // Update local state
      setDeckWords(prev => {
        const updated = { ...prev }
        for (const [deckId, words] of Object.entries(updated)) {
          updated[deckId] = words.map(w =>
            w.id === word.id ? { ...w, suno_audio_url: result.audio_url, suno_task_id: result.task_id } : w
          )
        }
        return updated
      })
      toast(`Full song ready for "${word.word}"`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast(`Song generation failed: ${msg}`, 'error')
    } finally {
      setSunoGeneratingId(null)
    }
  }, [sunoGeneratingId, toast])

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchDecks = useCallback(async () => {
    const { data } = await supabase
      .from('decks')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
    if (data) setDecks(data)
  }, [])

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
    if (data) setProfiles(data)
  }, [])

  const fetchWords = useCallback(async (deckId: string) => {
    const { data } = await supabase
      .from('words')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at')
    if (data) setDeckWords(prev => ({ ...prev, [deckId]: data }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchDecks(), fetchProfiles()])
    setLoading(false)
  }, [fetchDecks, fetchProfiles])

  useEffect(() => { load() }, [load])

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const languages = useMemo(() => {
    const set = new Set(decks.map(d => d.target_language))
    return Array.from(set).sort()
  }, [decks])

  const filteredDecks = useMemo(() => {
    let result = decks
    if (userFilter !== 'all') {
      result = result.filter(d => d.user_id === userFilter)
    }
    if (languageFilter !== 'all') {
      result = result.filter(d => d.target_language === languageFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d => {
        if (d.name.toLowerCase().includes(q)) return true
        // Also check words if loaded
        const words = deckWords[d.id]
        if (words) return words.some(w => w.word.toLowerCase().includes(q))
        return false
      })
    }
    return result
  }, [decks, userFilter, languageFilter, statusFilter, searchQuery, deckWords])

  // -------------------------------------------------------------------------
  // Word-level rating filter
  // -------------------------------------------------------------------------

  const filterWordsByRating = useCallback((words: WordRecord[]) => {
    if (ratingFilter === 'all') return words
    return words.filter(w => {
      switch (ratingFilter) {
        case 'unrated': return w.rating === null
        case 'rated': return w.rating !== null
        case '5': return w.rating === 5
        case '4+': return w.rating !== null && w.rating >= 4
        case '3+': return w.rating !== null && w.rating >= 3
        case '2+': return w.rating !== null && w.rating >= 2
        case '1': return w.rating === 1
        default: return true
      }
    })
  }, [ratingFilter])

  // -------------------------------------------------------------------------
  // Expand/collapse deck
  // -------------------------------------------------------------------------

  const toggleDeck = async (deckId: string) => {
    if (expandedDeckId === deckId) {
      setExpandedDeckId(null)
      return
    }
    setExpandedDeckId(deckId)
    if (!deckWords[deckId]) {
      await fetchWords(deckId)
    }
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const toggleReview = async (word: WordRecord) => {
    const next = !word.needs_review
    // Optimistic update
    setDeckWords(prev => ({
      ...prev,
      [word.deck_id]: (prev[word.deck_id] || []).map(w =>
        w.id === word.id ? { ...w, needs_review: next } : w
      ),
    }))
    await supabase.from('words').update({ needs_review: next }).eq('id', word.id)
  }

  const confirmDeleteWord = async () => {
    const word = deleteWordTarget
    if (!word) return
    setActionLoading(true)
    try {
      // 1. Delete storage files
      const paths = [
        extractStoragePath(word.video_url),
        extractStoragePath(word.thumbnail_url),
      ].filter(Boolean) as string[]
      if (paths.length > 0) {
        await supabase.storage.from('videos').remove(paths)
      }

      // 2. Delete word row
      await supabase.from('words').delete().eq('id', word.id)

      // 3. Find the parent deck
      const deck = decks.find(d => d.id === word.deck_id)

      // 4. Decrement word_count and re-evaluate status
      const { data: remainingWords } = await supabase
        .from('words')
        .select('status')
        .eq('deck_id', word.deck_id)

      let newStatus = 'complete'
      if (remainingWords && remainingWords.length > 0) {
        if (remainingWords.every(w => w.status === 'complete')) {
          newStatus = 'complete'
        } else if (remainingWords.some(w => w.status === 'complete')) {
          newStatus = 'partial'
        } else {
          newStatus = 'partial'
        }
      }

      await supabase
        .from('decks')
        .update({
          word_count: Math.max(0, (deck?.word_count ?? 1) - 1),
          status: newStatus,
        })
        .eq('id', word.deck_id)

      // 5. Refresh
      await fetchDecks()
      await fetchWords(word.deck_id)
      toast('Word deleted', 'success')
    } catch (err) {
      toast('Failed to delete word', 'error')
    } finally {
      setActionLoading(false)
      setDeleteWordTarget(null)
    }
  }

  const confirmDeleteDeck = async () => {
    const deck = deleteDeckTarget
    if (!deck) return
    setActionLoading(true)
    try {
      // 1. Get all words for storage cleanup
      const { data: words } = await supabase
        .from('words')
        .select('id, video_url, thumbnail_url')
        .eq('deck_id', deck.id)

      // 2. Delete storage files
      if (words && words.length > 0) {
        const filesToDelete = words
          .flatMap(w => [
            extractStoragePath(w.video_url),
            extractStoragePath(w.thumbnail_url),
          ])
          .filter(Boolean) as string[]
        if (filesToDelete.length > 0) {
          await supabase.storage.from('videos').remove(filesToDelete)
        }
      }

      // 3. Delete words explicitly
      await supabase.from('words').delete().eq('deck_id', deck.id)

      // 4. Delete generation jobs
      await supabase.from('generation_jobs').delete().eq('deck_id', deck.id)

      // 5. Delete deck
      await supabase.from('decks').delete().eq('id', deck.id)

      // 6. Refresh
      setExpandedDeckId(null)
      setDeckWords(prev => {
        const next = { ...prev }
        delete next[deck.id]
        return next
      })
      await fetchDecks()
      toast('Deck deleted', 'success')
    } catch (err) {
      toast('Failed to delete deck', 'error')
    } finally {
      setActionLoading(false)
      setDeleteDeckTarget(null)
    }
  }

  const confirmRegenerate = async () => {
    const word = regenerateTarget
    if (!word) return
    setActionLoading(true)
    try {
      // Check credits
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('credits, display_name')
        .eq('id', word.user_id)
        .single()

      if (!ownerProfile || ownerProfile.credits < 1) {
        toast(`${ownerProfile?.display_name || 'User'} has 0 credits — cannot regenerate`, 'error')
        setActionLoading(false)
        setRegenerateTarget(null)
        return
      }

      const deck = decks.find(d => d.id === word.deck_id)

      // 1. Reset word
      await supabase.from('words').update({
        status: 'pending',
        video_url: null,
        thumbnail_url: null,
        error_message: null,
        retry_count: 0,
        metadata: null,
        needs_review: false,
      }).eq('id', word.id)

      // 2. Create generation job
      await supabase.from('generation_jobs').insert({
        user_id: word.user_id,
        deck_id: word.deck_id,
        status: 'approved',
        priority: 0,
        target_language: deck?.target_language || 'Unknown',
        art_style: deck?.art_style || null,
        words_total: 1,
        words_completed: 0,
        words_failed: 0,
      })

      // 3. Deduct credit
      await supabase
        .from('profiles')
        .update({ credits: ownerProfile.credits - 1 })
        .eq('id', word.user_id)

      // 4. Update deck status
      await supabase
        .from('decks')
        .update({ status: 'generating' })
        .eq('id', word.deck_id)

      // 5. Refresh
      await fetchDecks()
      await fetchWords(word.deck_id)
      toast('Regeneration job created — it will be picked up by the job runner', 'success')
    } catch (err) {
      toast('Failed to create regeneration job', 'error')
    } finally {
      setActionLoading(false)
      setRegenerateTarget(null)
    }
  }

  const confirmSmartRetry = async () => {
    const word = smartRetryTarget
    if (!word) return
    setActionLoading(true)
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('credits, display_name')
        .eq('id', word.user_id)
        .single()

      if (!ownerProfile || ownerProfile.credits < 1) {
        toast(`${ownerProfile?.display_name || 'User'} has 0 credits — cannot retry`, 'error')
        setActionLoading(false)
        setSmartRetryTarget(null)
        return
      }

      const deck = decks.find(d => d.id === word.deck_id)

      // Preserve video_url, thumbnail_url, metadata — only reset status + error
      await supabase.from('words').update({
        status: 'pending',
        error_message: null,
      }).eq('id', word.id)

      await supabase.from('generation_jobs').insert({
        user_id: word.user_id,
        deck_id: word.deck_id,
        status: 'approved',
        priority: 0,
        target_language: deck?.target_language || 'Unknown',
        art_style: deck?.art_style || null,
        words_total: 1,
        words_completed: 0,
        words_failed: 0,
      })

      await supabase
        .from('profiles')
        .update({ credits: ownerProfile.credits - 1 })
        .eq('id', word.user_id)

      await supabase
        .from('decks')
        .update({ status: 'generating' })
        .eq('id', word.deck_id)

      await fetchDecks()
      await fetchWords(word.deck_id)
      toast('Smart retry — only failed stages will re-run', 'success')
    } catch (err) {
      toast('Failed to create smart retry job', 'error')
    } finally {
      setActionLoading(false)
      setSmartRetryTarget(null)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Content Browser</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.display_name || p.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languages.map(lang => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="unrated">Unrated</SelectItem>
            <SelectItem value="rated">Rated (any)</SelectItem>
            <SelectItem value="5">★★★★★ (5)</SelectItem>
            <SelectItem value="4+">★★★★ (4+)</SelectItem>
            <SelectItem value="3+">★★★ (3+)</SelectItem>
            <SelectItem value="2+">★★ (2+)</SelectItem>
            <SelectItem value="1">★ (1)</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decks or words…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Deck List */}
      <div className="space-y-2">
        {filteredDecks.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {decks.length === 0
              ? 'No content generated yet'
              : 'No decks match the current filters'}
          </Card>
        ) : (
          filteredDecks.map(deck => (
            <Card key={deck.id} className="overflow-hidden">
              {/* Deck row */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleDeck(deck.id)}
              >
                {/* Chevron */}
                {expandedDeckId === deck.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                {/* Name */}
                <span className="font-medium truncate min-w-[120px]">{deck.name}</span>

                {/* User */}
                <span className="text-sm text-muted-foreground truncate min-w-[80px]">
                  {deck.profiles?.display_name || deck.user_id.slice(0, 8)}
                </span>

                {/* Language badge */}
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent text-accent-foreground">
                  {deck.target_language}
                </span>

                {/* Word count */}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {ratingFilter !== 'all' && deckWords[deck.id]
                    ? `${filterWordsByRating(deckWords[deck.id]).length}/${deck.word_count} words`
                    : `${deck.word_count} ${deck.word_count === 1 ? 'word' : 'words'}`}
                </span>

                {/* Status badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[deck.status] || ''}`}>
                  {deck.status}
                </span>

                {/* Created date */}
                <span className="text-xs text-muted-foreground hidden lg:block ml-auto">
                  {formatTime(deck.created_at)}
                </span>

                {/* Delete button */}
                <div onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDeckTarget(deck)}
                    title="Delete deck"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>

              {/* Expanded words */}
              {expandedDeckId === deck.id && (
                <div className="border-t border-border bg-accent/20">
                  {!deckWords[deck.id] ? (
                    <div className="flex items-center justify-center py-6">
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : deckWords[deck.id].length === 0 ? (
                    <p className="px-4 py-4 text-sm text-muted-foreground">
                      No words in this deck
                    </p>
                  ) : filterWordsByRating(deckWords[deck.id]).length === 0 ? (
                    <p className="px-4 py-4 text-sm text-muted-foreground">
                      No words match the current rating filter
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filterWordsByRating(deckWords[deck.id]).map(word => (
                        <div
                          key={word.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="h-10 w-10 rounded bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {word.thumbnail_url ? (
                              <img
                                src={word.thumbnail_url}
                                alt={word.word}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Word + translation */}
                          <div className="min-w-[120px]">
                            <span className="font-medium text-sm">{word.word}</span>
                            {word.translation && (
                              <span className="text-sm text-muted-foreground ml-2">
                                {word.translation}
                              </span>
                            )}
                          </div>

                          {/* POS badge */}
                          {word.pos && (
                            <span className="px-1.5 py-0.5 rounded text-xs text-muted-foreground bg-zinc-800">
                              {word.pos}
                            </span>
                          )}

                          {/* Status badge */}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[word.status] || ''}`}>
                            {word.status}
                          </span>

                          {/* Rating */}
                          {word.rating ? (
                            <StarRating rating={word.rating} readOnly size={14} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Unrated</span>
                          )}

                          {/* Needs review indicator */}
                          {word.needs_review && (
                            <span className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" title="Needs review" />
                          )}

                          {/* Error message */}
                          {word.status === 'failed' && word.error_message && (
                            <span className="text-xs text-red-400 truncate max-w-[200px]" title={word.error_message}>
                              {word.error_message}
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedWord(word)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReview(word)}
                              title={word.needs_review ? 'Remove review flag' : 'Flag for review'}
                            >
                              <Flag className={`h-4 w-4 ${word.needs_review ? 'text-orange-400' : ''}`} />
                            </Button>
                            {word.status === 'complete' && (
                              word.suno_audio_url ? (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePlayAudio(word)}
                                    title={playingAudioId === word.id ? 'Stop' : 'Play Song'}
                                  >
                                    {playingAudioId === word.id ? (
                                      <Square className="h-4 w-4 text-green-400 fill-green-400" />
                                    ) : (
                                      <Play className="h-4 w-4 text-green-400 fill-green-400" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSunoGenerate(word)}
                                    disabled={sunoGeneratingId === word.id}
                                    title="Regenerate Full Song"
                                  >
                                    {sunoGeneratingId === word.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                    ) : (
                                      <Music className="h-4 w-4 text-purple-400" />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSunoGenerate(word)}
                                  disabled={sunoGeneratingId === word.id}
                                  title="Generate Full Song"
                                >
                                  {sunoGeneratingId === word.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                  ) : (
                                    <Music className="h-4 w-4 text-purple-400" />
                                  )}
                                </Button>
                              )
                            )}
                            {word.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSmartRetryTarget(word)}
                                title="Smart Retry (reuse completed stages)"
                              >
                                <Zap className="h-4 w-4 text-yellow-400" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRegenerateTarget(word)}
                              title="Full Regenerate"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteWordTarget(word)}
                              title="Delete word"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Hidden audio element for inline playback */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudioId(null)}
        onError={() => setPlayingAudioId(null)}
      />

      {/* Word Detail Panel */}
      <WordDetailPanel
        word={selectedWord}
        open={!!selectedWord}
        onClose={() => setSelectedWord(null)}
      />

      {/* Delete Word Confirmation */}
      <Dialog open={!!deleteWordTarget} onOpenChange={(v) => !v && setDeleteWordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Word</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteWordTarget?.word}</strong>? This will permanently remove the video and all data for this word. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteWordTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteWord} disabled={actionLoading}>
              {actionLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Deck Confirmation */}
      <Dialog open={!!deleteDeckTarget} onOpenChange={(v) => !v && setDeleteDeckTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteDeckTarget?.name}</strong> and all {deleteDeckTarget?.word_count} words? This will permanently remove all videos and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDeckTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDeck} disabled={actionLoading}>
              {actionLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation (full) */}
      <Dialog open={!!regenerateTarget} onOpenChange={(v) => !v && setRegenerateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Regenerate</DialogTitle>
            <DialogDescription>
              Regenerate <strong>{regenerateTarget?.word}</strong> from scratch? All stages will re-run. Cost: 1 credit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegenerateTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={confirmRegenerate} disabled={actionLoading}>
              {actionLoading ? 'Creating job…' : 'Full Regenerate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Retry Confirmation */}
      <Dialog open={!!smartRetryTarget} onOpenChange={(v) => !v && setSmartRetryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smart Retry: {smartRetryTarget?.word}</DialogTitle>
            <DialogDescription>
              Re-run only the failed stages. Completed stages (images, video, etc.) will be reused. Cost: 1 credit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSmartRetryTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={confirmSmartRetry} disabled={actionLoading}>
              {actionLoading ? 'Retrying…' : 'Smart Retry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
