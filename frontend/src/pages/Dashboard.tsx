import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Loader, Music, Sparkles } from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import WordDetailModal, { type LibraryWord } from '@/components/dashboard/WordDetailModal'
import WordLibrary from '@/components/dashboard/WordLibrary'

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

function computeLevel(wordCount: number): string {
  if (wordCount >= 100) return 'L5'
  if (wordCount >= 50) return 'L4'
  if (wordCount >= 30) return 'L3'
  if (wordCount >= 15) return 'L2'
  if (wordCount >= 5) return 'L1'
  return 'L0'
}

export default function Dashboard() {
  const { profile, user, authError } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const { t, tp } = useTranslation()

  const [decks, setDecks] = useState<Deck[]>([])
  const [wordCounts, setWordCounts] = useState<Record<string, { completed: number; total: number }>>({})
  const [deckThumbnails, setDeckThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // Library words for active language
  const [libraryWords, setLibraryWords] = useState<LibraryWord[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [selectedWord, setSelectedWord] = useState<LibraryWord | null>(null)

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
        setDashboardError(t('deckview.failedToLoad'))
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
      setDashboardError(t('common.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadDecks(user.id)
  }, [user?.id, location.key, loadDecks])

  // Derive the list of languages the user has decks in
  const availableLanguages = useMemo(() => {
    return Array.from(new Set(decks.map((d) => d.target_language))).filter(Boolean)
  }, [decks])

  // Guard: if localStorage has a language with no decks (e.g., user deleted all decks
  // for that language), auto-correct to the first available language. This only fires
  // on deck reload, not on user interaction.
  useEffect(() => {
    if (availableLanguages.length === 0) {
      if (activeLanguage) setActiveLanguage(null)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, setActiveLanguage])

  // Load library words for active language
  useEffect(() => {
    if (!user || !activeLanguage) {
      setLibraryWords([])
      return
    }
    let cancelled = false
    const load = async () => {
      setLibraryLoading(true)
      try {
        const { data: deckRows } = await supabase
          .from('decks')
          .select('id')
          .eq('user_id', user.id)
          .eq('target_language', activeLanguage)
        const deckIds = (deckRows ?? []).map((d) => d.id)
        if (deckIds.length === 0) {
          if (!cancelled) setLibraryWords([])
          return
        }
        const { data: wordRows } = await supabase
          .from('words')
          .select(
            'id, word, word_slug, translation, mnemonic, etymology, pos, article, video_url, thumbnail_url, metadata, deck_id, created_at'
          )
          .eq('status', 'complete')
          .in('deck_id', deckIds)
          .order('created_at', { ascending: false })
        if (!cancelled) setLibraryWords((wordRows ?? []) as LibraryWord[])
      } finally {
        if (!cancelled) setLibraryLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, activeLanguage, location.key])

  const filteredDecks = useMemo(
    () => decks.filter((d) => d.target_language === activeLanguage),
    [decks, activeLanguage]
  )

  const stats = useMemo(() => {
    const deckCount = filteredDecks.length
    const wordCount = libraryWords.length
    return { deckCount, wordCount, level: computeLevel(wordCount) }
  }, [filteredDecks, libraryWords])

  const handleWatchVideo = (word: LibraryWord) => {
    navigate(`/deck/${word.deck_id}/word/${word.id}`)
  }

  if (authError && !user) {
    return (
      <div className="classic-dashboard-header">
        <h1>{t('error.sessionExpired')}</h1>
        <p>{authError}</p>
        <Link to="/login" className="classic-accent-link">{t('dashboard.loginAgain')}</Link>
      </div>
    )
  }

  if (authError && user) {
    return (
      <div className="classic-dashboard-header">
        <h1>{t('error.profileFailed')}</h1>
        <p>{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="classic-accent-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="classic-dashboard-header">
        <h1>{t('error.somethingWrong')}</h1>
        <p>{dashboardError}</p>
        <button onClick={() => window.location.reload()} className="classic-accent-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          {t('common.refresh')}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ParticleSpinner preset="rose" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('dashboard.loadingDecks')}</p>
      </div>
    )
  }

  // Empty state: no decks at all
  if (decks.length === 0) {
    return (
      <div className="classic-dashboard-wrapper">
        <div className="classic-aurora" aria-hidden="true" />
        <div className="classic-dashboard-header">
          <h1>{t('dashboard.createFirst')}</h1>
          <p>{t('dashboard.createFirstBody')}</p>
          <button
            onClick={() => navigate('/generate')}
            className="classic-accent-btn"
          >
            {t('dashboard.generate')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="classic-dashboard-wrapper">
      <div className="classic-aurora" aria-hidden="true" />

      <div className="classic-dashboard-header">
        <h1 className="truncate">
          {profile?.display_name
            ? t('dashboard.welcomeUser', { name: profile.display_name })
            : t('dashboard.welcome')}
        </h1>
        <p>{t('dashboard.credits', { count: profile?.credits ?? 0 })}</p>
      </div>

      {/* Language tabs */}
      {availableLanguages.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto px-4 sm:justify-center sm:flex-wrap sm:overflow-visible scrollbar-none -mx-1">
          {availableLanguages.map((lang) => {
            const isActive = lang === activeLanguage
            return (
              <button
                key={lang}
                onClick={() => setActiveLanguage(lang)}
                className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full text-sm border transition-all ${
                  isActive
                    ? 'bg-white/15 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                    : 'border-white/10 text-white/60 hover:text-white/90 hover:border-white/25'
                }`}
              >
                {lang}
              </button>
            )
          })}
        </div>
      )}

      {/* Stats bar + Generate CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 px-4">
        <div className="flex gap-4 sm:gap-6 text-sm text-white/70 justify-around sm:justify-start">
          <div>
            <span className="text-white font-semibold text-lg">{stats.wordCount}</span>{' '}
            <span className="text-white/50 text-xs sm:text-sm">words</span>
          </div>
          <div>
            <span className="text-white font-semibold text-lg">{stats.deckCount}</span>{' '}
            <span className="text-white/50 text-xs sm:text-sm">decks</span>
          </div>
          <div>
            <span className="text-white font-semibold text-lg">{stats.level}</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/generate')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 text-sm font-medium text-white transition-colors"
        >
          <Sparkles size={14} />
          Generate New Words
        </button>
      </div>

      {/* Word library */}
      <div className="mb-10 px-4">
        {libraryLoading ? (
          <div className="flex justify-center py-8">
            <ParticleSpinner preset="rose" size={80} />
          </div>
        ) : (
          <WordLibrary
            words={libraryWords}
            onWordClick={(w) => setSelectedWord(w)}
            emptyMessage={
              activeLanguage
                ? `No words yet in ${activeLanguage}. Generate some!`
                : 'No words yet.'
            }
          />
        )}
      </div>

      {/* Your Decks section */}
      {filteredDecks.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4 px-2">
            <h2 className="text-sm uppercase tracking-wider text-white/50">Your Decks</h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="classic-decks-grid">
            {filteredDecks.map((deck) => {
              const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
              const thumb = deckThumbnails[deck.id]
              const displayName = deck.name || `${deck.target_language} Deck`

              return (
                <div
                  key={deck.id}
                  className="classic-deck-card"
                  onClick={() => navigate(`/deck/${deck.id}`)}
                >
                  <div
                    className="classic-deck-bg-layer"
                    style={{
                      backgroundImage: thumb ? `url(${thumb})` : 'none',
                    }}
                  />
                  {!thumb && (
                    <div className="classic-deck-placeholder">
                      {deck.status === 'generating' ? (
                        <Loader className="w-8 h-8 text-gray-600 animate-spin" />
                      ) : (
                        <Music className="w-8 h-8 text-gray-600/30" />
                      )}
                    </div>
                  )}
                  <div className="classic-deck-gradient" />
                  <div style={{ flex: 1, position: 'relative', zIndex: 2 }} />
                  <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                    <h3 style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{displayName}</h3>
                    <p style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{deck.target_language} &bull; {tp('dashboard.wordCount', counts.total)}</p>
                    {deck.status !== 'complete' && (
                      <p className="classic-deck-status">
                        {deck.status === 'generating' ? t('dashboard.generating', { completed: counts.completed, total: counts.total }) : deck.status}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <WordDetailModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onWatchVideo={handleWatchVideo}
      />
    </div>
  )
}
