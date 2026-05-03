import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
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
  Play,
  Square,
  Activity,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
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
  dominant_emotional_reading?: string | null
  composition_hint?: string | null
  treatment_hint?: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  card_image_model?: string | null
  generation_job_id?: string | null
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
  suno_storage_url: string | null
  suno_audio_url: string | null
  suno_task_id: string | null
  created_at: string
}

type ProfileOption = {
  id: string
  display_name: string | null
}

type GenerationJobSettings = {
  id: string
  target_language: string | null
  profile_used: string | null
  settings_override: Record<string, unknown> | null
}

type LanguageProfileSettings = {
  language: string
  name: string
  settings: Record<string, unknown> | null
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

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function extractCardImageModel(settings: Record<string, unknown> | null): string | null {
  const direct = settings?.card_image_model
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const images = asRecord(settings?.images)
  const nested = images?.card_image_model
  if (typeof nested === 'string' && nested.trim()) return nested.trim()

  return null
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
  const [actionLoading, setActionLoading] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handlePlayAudio = useCallback((word: WordRecord) => {
    const el = audioRef.current
    const trackAUrl = word.suno_storage_url ?? word.suno_audio_url
    if (!el) return
    if (playingAudioId === word.id) {
      el.pause()
      setPlayingAudioId(null)
    } else {
      if (!trackAUrl) return
      el.src = trackAUrl
      el.play()
      setPlayingAudioId(word.id)
    }
  }, [playingAudioId])

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
    if (!data) return

    const words = data as WordRecord[]
    const jobIds = Array.from(new Set(
      words
        .map(word => word.generation_job_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ))

    if (jobIds.length === 0) {
      setDeckWords(prev => ({ ...prev, [deckId]: words }))
      return
    }

    const { data: jobs } = await supabase
      .from('generation_jobs')
      .select('id, target_language, profile_used, settings_override')
      .in('id', jobIds)

    const jobRows = (jobs || []) as GenerationJobSettings[]
    const profileNames = Array.from(new Set(
      jobRows
        .filter(job => !extractCardImageModel(job.settings_override))
        .map(job => job.profile_used)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    ))
    let profilesByKey = new Map<string, LanguageProfileSettings>()
    if (profileNames.length > 0) {
      const { data: languageProfiles } = await supabase
        .from('language_profiles')
        .select('language, name, settings')
        .in('name', profileNames)
      profilesByKey = new Map(
        ((languageProfiles || []) as LanguageProfileSettings[])
          .map(profile => [`${profile.language}::${profile.name}`, profile])
      )
    }

    const jobsById = new Map(
      jobRows.map(job => [job.id, job])
    )
    const enrichedWords = words.map(word => {
      if (word.card_image_model) return word
      const job = word.generation_job_id ? jobsById.get(word.generation_job_id) : null
      const profile = job?.target_language && job.profile_used
        ? profilesByKey.get(`${job.target_language}::${job.profile_used}`)
        : null
      const cardImageModel = (
        extractCardImageModel(job?.settings_override ?? null) ??
        extractCardImageModel(profile?.settings ?? null)
      )
      return cardImageModel ? { ...word, card_image_model: cardImageModel } : word
    })

    setDeckWords(prev => ({ ...prev, [deckId]: enrichedWords }))
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
      const { error } = await supabase.rpc('admin_archive_content', {
        p_kind: 'word',
        p_id: word.id,
        p_reason: 'Deleted word from admin content page',
      })
      if (error) throw error

      await fetchDecks()
      await fetchWords(word.deck_id)
      toast('Word deleted', 'success')
    } catch {
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
      const { error } = await supabase.rpc('admin_archive_content', {
        p_kind: 'deck',
        p_id: deck.id,
        p_reason: 'Deleted deck from admin content page',
      })
      if (error) throw error

      setExpandedDeckId(null)
      setDeckWords(prev => {
        const next = { ...prev }
        delete next[deck.id]
        return next
      })
      await fetchDecks()
      toast('Deck deleted', 'success')
    } catch {
      toast('Failed to delete deck', 'error')
    } finally {
      setActionLoading(false)
      setDeleteDeckTarget(null)
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
    <div className="space-y-5 max-w-6xl mx-auto">
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
      <div className="space-y-1.5">
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
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
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
                          className="flex items-center gap-3 px-4 py-2 hover:bg-accent/30 transition-colors text-sm"
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePlayAudio(word)}
                              disabled={!(word.suno_storage_url ?? word.suno_audio_url)}
                              title={
                                word.suno_storage_url ?? word.suno_audio_url
                                  ? playingAudioId === word.id ? 'Stop Track A' : 'Play Track A'
                                  : 'Track A unavailable'
                              }
                              aria-label={
                                word.suno_storage_url ?? word.suno_audio_url
                                  ? playingAudioId === word.id ? 'Stop Track A' : 'Play Track A'
                                  : 'Track A unavailable'
                              }
                            >
                              {playingAudioId === word.id ? (
                                <Square className="h-4 w-4 text-green-400 fill-green-400" />
                              ) : (
                                <Play className="h-4 w-4 text-green-400 fill-green-400" />
                              )}
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              title="Observability"
                              aria-label="Observability"
                            >
                              <Link to={`/admin/observability/word/${word.id}`}>
                                <Activity className="h-4 w-4" />
                              </Link>
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

    </div>
  )
}
