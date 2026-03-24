import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Coins, Sparkles, Music, Plus, ChevronRight, Gift, Check, X, AlertCircle, RefreshCw, LogIn } from 'lucide-react'

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

const LANGUAGE_FLAGS: Record<string, string> = {
  German: '\ud83c\udde9\ud83c\uddea',
  French: '\ud83c\uddeb\ud83c\uddf7',
  Italian: '\ud83c\uddee\ud83c\uddf9',
  English: '\ud83c\uddec\ud83c\udde7',
  Bisaya: '\ud83c\uddf5\ud83c\udded',
}

function getStatusBadge(status: string, completed: number, total: number) {
  if (status === 'generating') {
    return (
      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
        Generating ({completed}/{total})
      </Badge>
    )
  }
  if (status === 'complete') {
    return (
      <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
        Ready
      </Badge>
    )
  }
  if (status === 'partial') {
    return (
      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        Partial ({completed}/{total})
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">{status}</Badge>
  )
}

export default function Dashboard() {
  const { profile, user, refreshProfile, authError } = useAuth()
  const [decks, setDecks] = useState<Deck[]>([])
  const [wordCounts, setWordCounts] = useState<Record<string, { completed: number; total: number }>>({})
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // Redeem code state
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)

  async function handleRedeem() {
    if (!inviteCode.trim() || !user || !profile) return
    setRedeeming(true)
    setRedeemError(null)
    setRedeemSuccess(null)

    const code = inviteCode.trim().toUpperCase()

    const { data: invite, error: lookupError } = await supabase
      .from('invite_codes')
      .select('id, code, credits, redeemed_by')
      .eq('code', code)
      .maybeSingle()

    if (lookupError) {
      setRedeemError('Error looking up code.')
      setRedeeming(false)
      return
    }
    if (!invite) {
      setRedeemError('Invalid invite code.')
      setRedeeming(false)
      return
    }
    if (invite.redeemed_by) {
      setRedeemError('Already redeemed.')
      setRedeeming(false)
      return
    }

    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
      .eq('id', invite.id)
      .is('redeemed_by', null)

    if (updateError) {
      setRedeemError('Failed to redeem.')
      setRedeeming(false)
      return
    }

    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({ credits: (freshProfile?.credits || 0) + invite.credits })
      .eq('id', user.id)

    setRedeemSuccess(`+${invite.credits} credits!`)
    setInviteCode('')
    await refreshProfile()
    setRedeeming(false)
    setTimeout(() => {
      setRedeemSuccess(null)
      setRedeemOpen(false)
    }, 2000)
  }

  const location = useLocation()

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
        console.error('[Dashboard] Failed to load decks:', decksError)
        setDashboardError('Failed to load your decks. Please try refreshing.')
        return
      }

      if (decksData) {
        setDecks(decksData)

        // Get word statuses for each deck
        const deckIds = decksData.map((d) => d.id)
        if (deckIds.length > 0) {
          const { data: words, error: wordsError } = await supabase
            .from('words')
            .select('deck_id, status')
            .in('deck_id', deckIds)

          if (wordsError) {
            console.error('[Dashboard] Failed to load word statuses:', wordsError)
          }

          if (words) {
            const counts: Record<string, { completed: number; total: number }> = {}
            for (const w of words as WordStatus[]) {
              if (!counts[w.deck_id]) counts[w.deck_id] = { completed: 0, total: 0 }
              counts[w.deck_id].total++
              if (w.status === 'complete') counts[w.deck_id].completed++
            }
            setWordCounts(counts)
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] Unexpected error:', err)
      setDashboardError('Something went wrong. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load decks when user is available or when navigating back to this page
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadDecks(user.id)
  }, [user?.id, location.key, loadDecks])

  // Auth-level error: session timed out or profile failed
  if (authError && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <LogIn className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Session expired</h2>
          <p className="text-sm text-muted-foreground">{authError}</p>
          <Button asChild>
            <Link to="/login">Log in again</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Auth error but user is logged in (profile fetch failed/timed out)
  if (authError && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-yellow-400" />
          <h2 className="text-lg font-semibold">Profile failed to load</h2>
          <p className="text-sm text-muted-foreground">{authError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Dashboard data error
  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{dashboardError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.display_name || 'Learner'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your learning overview.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Credit balance */}
          <div className="glass rounded-xl px-5 py-3 flex items-center gap-3">
            <Coins className="h-5 w-5 text-primary" />
            <div>
              <div className="text-2xl font-bold">{profile?.credits ?? 0}</div>
              <div className="text-xs text-muted-foreground">credits</div>
            </div>
          </div>
          {/* Redeem code */}
          {redeemOpen ? (
            <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Input
                placeholder="Code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                className="h-8 w-32 bg-white/5 border-white/10 text-sm uppercase"
                autoFocus
                disabled={redeeming}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRedeem}
                disabled={redeeming || !inviteCode.trim()}
                className="h-8 px-2"
              >
                {redeeming ? '...' : <Check className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setRedeemOpen(false); setRedeemError(null); setRedeemSuccess(null); setInviteCode('') }}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
              {redeemError && (
                <span className="text-xs text-destructive-foreground whitespace-nowrap">{redeemError}</span>
              )}
              {redeemSuccess && (
                <span className="text-xs text-green-400 whitespace-nowrap">{redeemSuccess}</span>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRedeemOpen(true)}
              className="border-white/10 h-auto py-3"
            >
              <Gift className="h-4 w-4 mr-1.5" />
              Redeem
            </Button>
          )}
        </div>
      </div>

      {/* Decks section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Music className="h-5 w-5" />
            Your Decks
          </h2>
          {decks.length > 0 && (
            <Button asChild size="sm" variant="ghost">
              <Link to="/generate">
                <Plus className="h-4 w-4 mr-1" />
                New Deck
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-5 space-y-3">
                <Skeleton className="h-5 w-32 bg-white/10" />
                <Skeleton className="h-4 w-20 bg-white/10" />
                <Skeleton className="h-2 w-full bg-white/10" />
              </div>
            ))}
          </div>
        ) : decks.length === 0 ? (
          /* Empty state */
          <div className="glass rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Create your first deck</h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-sm">
              Choose a language, add some words, and watch AI create unique music videos for each one.
            </p>
            <Button asChild size="lg" className="glow-purple">
              <Link to="/generate">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Link>
            </Button>
          </div>
        ) : (
          /* Deck grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
              const progress = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0
              const flag = LANGUAGE_FLAGS[deck.target_language] || ''
              const displayName =
                deck.name ||
                `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString()}`

              return (
                <Link
                  key={deck.id}
                  to={`/deck/${deck.id}`}
                  className="glass glass-hover rounded-xl p-5 space-y-3 transition-all duration-200 hover:scale-[1.02] hover:glow-purple group block"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {displayName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {flag} {deck.target_language} &middot; {counts.total} words
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>

                  {getStatusBadge(deck.status, counts.completed, counts.total)}

                  {deck.status === 'generating' && (
                    <Progress value={progress} className="h-1.5" />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
