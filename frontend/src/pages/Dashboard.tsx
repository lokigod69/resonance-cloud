import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Loader, Music } from 'lucide-react'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'

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

export default function Dashboard() {
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
      <div className="classic-dashboard-header">
        <h1>Session expired</h1>
        <p>{authError}</p>
        <Link to="/login" className="classic-accent-link">Log in again</Link>
      </div>
    )
  }

  if (authError && user) {
    return (
      <div className="classic-dashboard-header">
        <h1>Profile failed to load</h1>
        <p>{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="classic-accent-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="classic-dashboard-header">
        <h1>Something went wrong</h1>
        <p>{dashboardError}</p>
        <button onClick={() => window.location.reload()} className="classic-accent-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <LoadingIndicator text="Loading decks" />
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="classic-dashboard-wrapper">
        <div className="classic-aurora" aria-hidden="true" />
        <div className="classic-dashboard-header">
          <h1>Create your first deck</h1>
          <p>Choose a language, add some words, and watch AI create unique music videos for each one.</p>
          <button
            onClick={() => navigate('/generate')}
            className="classic-accent-btn"
          >
            Generate
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="classic-dashboard-wrapper">
      {/* Aurora breathing background */}
      <div className="classic-aurora" aria-hidden="true" />

      <div className="classic-dashboard-header">
        <h1 className="break-words overflow-hidden">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h1>
        <p>{decks.length} deck{decks.length !== 1 ? 's' : ''} &middot; {profile?.credits ?? 0} credits</p>
      </div>

      <div className="classic-decks-grid">
        {decks.map((deck) => {
          const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
          const thumb = deckThumbnails[deck.id]
          const displayName = deck.name || `${deck.target_language} Deck`

          return (
            <div
              key={deck.id}
              className="classic-deck-card"
              onClick={() => navigate(`/deck/${deck.id}`)}
            >
              {/* Background image layer */}
              <div
                className="classic-deck-bg-layer"
                style={{
                  backgroundImage: thumb ? `url(${thumb})` : 'none',
                }}
              />
              {/* Placeholder for decks with no thumbnail */}
              {!thumb && (
                <div className="classic-deck-placeholder">
                  {deck.status === 'generating' ? (
                    <Loader className="w-8 h-8 text-gray-600 animate-spin" />
                  ) : (
                    <Music className="w-8 h-8 text-gray-600/30" />
                  )}
                </div>
              )}
              {/* Bottom gradient for text readability */}
              <div className="classic-deck-gradient" />
              {/* Spacer to push text to bottom */}
              <div style={{ flex: 1, position: 'relative', zIndex: 2 }} />
              {/* Text at bottom center */}
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <h3 style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{displayName}</h3>
                <p style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{deck.target_language} &bull; {counts.total} {counts.total === 1 ? 'Word' : 'Words'}</p>
                {deck.status !== 'complete' && (
                  <p className="classic-deck-status">
                    {deck.status === 'generating' ? `Generating ${counts.completed}/${counts.total}` : deck.status}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
