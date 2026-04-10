import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Sparkles } from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import WordDetailModal, { type LibraryWord } from '@/components/dashboard/WordDetailModal'
import WordLibrary from '@/components/dashboard/WordLibrary'
import { QUOTES } from '@/data/quotes'
import { getLanguageName } from '@/lib/languageNames'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  created_at: string
}

export default function Dashboard() {
  const { profile, user, authError } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const { t } = useTranslation()

  const [decks, setDecks] = useState<Deck[]>([])
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

  const stats = useMemo(() => {
    const source = activeLanguage ? decks.filter((d) => d.target_language === activeLanguage) : decks
    const deckCount = source.length
    const wordCount = source.reduce((sum, d) => sum + (d.word_count ?? 0), 0)
    const level = `L${Math.floor(wordCount / 10) + 1}`
    return { deckCount, wordCount, level }
  }, [decks, activeLanguage])

  const deckNameMap = useMemo(() => new Map(decks.map(d => [d.id, d.name ?? 'Untitled'])), [decks])

  const handleWatchVideo = (word: LibraryWord) => {
    navigate(`/deck/${word.deck_id}/word/${word.id}?returnTo=/dashboard`)
  }

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

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

  const showEmptyState = decks.length === 0 && libraryWords.length === 0

  return (
    <div className="classic-dashboard-wrapper w-full max-w-full overflow-x-hidden">
      <div className="classic-aurora" aria-hidden="true" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="classic-dashboard-header">
          <h1 className="break-words">
            {profile?.display_name
              ? t('dashboard.welcomeUser', { name: profile.display_name })
              : t('dashboard.welcome')}
          </h1>
          <p>{t('dashboard.credits', { count: profile?.credits ?? 0 })}</p>
        </div>

        {!showEmptyState && (
          <>
            {/* Stats row */}
            <div className="flex gap-6 text-sm text-white/70 justify-center mb-6">
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

            {/* Sticky language tabs */}
            {availableLanguages.length > 1 && (
              <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-sm py-2 mb-2">
                <div className="flex gap-2 flex-wrap justify-center">
                  {availableLanguages.map((lang) => {
                    const isActive = lang === activeLanguage
                    return (
                      <button
                        key={lang}
                        onClick={() => setActiveLanguage(lang)}
                        className={`min-h-[44px] px-3 py-2 rounded-full text-sm border transition-all ${
                          isActive
                            ? 'bg-white/15 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                            : 'border-white/10 text-white/60 hover:text-white/90 hover:border-white/25'
                        }`}
                      >
                        {getLanguageName(lang)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Word count line */}
            {activeLanguage && (
              <p className="text-xs text-muted-foreground mb-4 text-center sm:text-left">
                {libraryWords.length} words in {getLanguageName(activeLanguage)}
              </p>
            )}

            {/* Word library */}
            <div className="mb-4">
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

            {/* Generate button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => navigate('/generate')}
                className="w-full sm:w-auto min-h-[52px] px-8 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/25 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles size={16} />
                Generate New Words
              </button>
            </div>
          </>
        )}

        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative w-32 h-32 mb-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border border-border animate-ping"
                  style={{ animationDelay: `${i * 0.6}s`, animationDuration: '2s' }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-accent" />
              </div>
            </div>
            <p className="text-foreground text-lg font-medium mb-2">Your vocabulary awaits</p>
            <p className="text-muted-foreground text-sm mb-6">Generate your first words to begin</p>
            <button
              onClick={() => navigate('/generate')}
              className="rounded-xl bg-accent/20 border border-border px-6 py-3 hover:bg-accent/30 transition-colors"
            >
              Generate First Words
            </button>
          </div>
        )}

        {/* Quote */}
        <div className="mt-12 mb-8 text-center max-w-2xl mx-auto px-4">
          <p className="text-sm text-muted-foreground italic">"{quote}"</p>
        </div>
      </div>

      <WordDetailModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onWatchVideo={handleWatchVideo}
        deckName={selectedWord ? deckNameMap.get(selectedWord.deck_id) : undefined}
      />
    </div>
  )
}
