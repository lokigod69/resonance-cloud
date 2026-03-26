import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  created_at: string
}

type WordStatus = {
  deck_id: string
  status: string
}

export default function DashboardGO() {
  const { profile, user, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [decks, setDecks] = useState<Deck[]>([])
  const [wordCounts, setWordCounts] = useState<Record<string, { completed: number; total: number }>>({})
  const [deckThumbnails, setDeckThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const loadDecks = useCallback(async (userId: string) => {
    try {
      setDashboardError(null)
      setLoading(true)
      const { data: decksData, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (decksError) {
        setDashboardError('Failed to load your decks. Please try refreshing.')
        return
      }

      if (decksData) {
        setDecks(decksData)

        const deckIds = decksData.map((d) => d.id)
        if (deckIds.length > 0) {
          const { data: words } = await supabase
            .from('words')
            .select('deck_id, status')
            .in('deck_id', deckIds)

          if (words) {
            const counts: Record<string, { completed: number; total: number }> = {}
            for (const w of words as WordStatus[]) {
              if (!counts[w.deck_id]) counts[w.deck_id] = { completed: 0, total: 0 }
              counts[w.deck_id].total++
              if (w.status === 'complete') counts[w.deck_id].completed++
            }
            setWordCounts(counts)
          }

          // Fetch first complete word thumbnail per deck
          const { data: thumbWords } = await supabase
            .from('words')
            .select('deck_id, thumbnail_url')
            .in('deck_id', deckIds)
            .eq('status', 'complete')
            .not('thumbnail_url', 'is', null)
            .order('created_at', { ascending: true })

          if (thumbWords) {
            const thumbs: Record<string, string> = {}
            for (const w of thumbWords as { deck_id: string; thumbnail_url: string }[]) {
              if (!thumbs[w.deck_id]) {
                thumbs[w.deck_id] = w.thumbnail_url
              }
            }
            setDeckThumbnails(thumbs)
          }
        }
      }
    } catch {
      setDashboardError('Something went wrong. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadDecks(user.id)
  }, [user?.id, location.key, loadDecks])

  if (authError && !user) {
    return (
      <div className="dashboard-header">
        <h1>Session expired</h1>
        <p>{authError}</p>
        <Link to="/login" style={{ color: 'var(--go-accent)' }}>Log in again</Link>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="dashboard-header">
        <h1>Something went wrong</h1>
        <p>{dashboardError}</p>
        <button onClick={() => window.location.reload()} style={{ color: 'var(--go-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--go-text-secondary)' }}>Loading decks...</p>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="dashboard-header">
        <h1>Create your first deck</h1>
        <p>Choose a language, add some words, and watch AI create unique music videos for each one.</p>
        <button
          onClick={() => navigate('/generate')}
          style={{
            marginTop: 24,
            padding: '10px 28px',
            borderRadius: 30,
            background: 'var(--go-accent)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: '1.1rem',
            cursor: 'pointer',
          }}
        >
          Generate
        </button>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div className="dashboard-header">
        <h1>Welcome back, {profile?.display_name || 'Learner'}</h1>
        <p>{decks.length} deck{decks.length !== 1 ? 's' : ''} &middot; {profile?.credits ?? 0} credits</p>
      </div>

      <div className="decks-grid">
        {decks.map((deck) => {
          const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
          const thumb = deckThumbnails[deck.id]
          const displayName = deck.name || `${deck.target_language} Deck`

          return (
            <div
              key={deck.id}
              className="deck-folder"
              onClick={() => navigate(`/deck/${deck.id}`)}
            >
              {/* Background image layer (replaces ::before pseudo-element) */}
              <div
                className="deck-bg-layer"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: -1,
                  backgroundImage: thumb ? `url(${thumb})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.2,
                  borderRadius: '20px',
                  transition: 'opacity 0.3s',
                }}
              />
              <div className="folder-icon">✧</div>
              <h3>{displayName}</h3>
              <p>{deck.target_language} &bull; {counts.total} Words</p>
              {deck.status !== 'complete' && (
                <p style={{ color: 'var(--go-accent)', fontSize: '0.8rem', marginTop: 4 }}>
                  {deck.status === 'generating' ? `Generating ${counts.completed}/${counts.total}` : deck.status}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
