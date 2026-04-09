import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react'
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

export default function DashboardPG() {
  const { profile, user, authError } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [decks, setDecks] = useState<Deck[]>([])
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

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

  const availableLanguages = useMemo(() => {
    return Array.from(new Set(decks.map((d) => d.target_language))).filter(Boolean)
  }, [decks])

  useEffect(() => {
    if (availableLanguages.length === 0) {
      if (activeLanguage) setActiveLanguage(null)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, setActiveLanguage])

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

  const totalWords = decks.reduce((sum, d) => sum + (d.word_count ?? 0), 0)
  const level = Math.floor(totalWords / 10) + 1

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

  const handleWatchVideo = (word: LibraryWord) => {
    navigate(`/deck/${word.deck_id}/word/${word.id}`)
  }

  if (authError && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <LogIn className="h-10 w-10 text-[var(--pg-text-dim)]" />
          <h2 className="text-lg font-semibold font-display">{t('error.sessionExpired')}</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{authError}</p>
          <Button asChild>
            <Link to="/login">{t('dashboard.loginAgain')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (authError && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-[var(--pg-accent-gold)]" />
          <h2 className="text-lg font-semibold font-display">{t('error.profileFailed')}</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{authError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-[var(--pg-accent-rose)]" />
          <h2 className="text-lg font-semibold font-display">{t('error.somethingWrong')}</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{dashboardError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ParticleSpinner preset="rose" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('dashboard.loadingDecks')}</p>
      </div>
    )
  }

  const showEmptyState = decks.length === 0 && libraryWords.length === 0

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight truncate text-white">
              {profile?.display_name
                ? t('dashboard.welcomeUser', { name: profile.display_name })
                : t('dashboard.welcome')}
            </h1>
            <p className="text-white/50 mt-1 text-sm">
              {t('dashboard.credits', { count: profile?.credits ?? 0 })}
            </p>
          </div>
        </div>

        {!showEmptyState && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-3xl font-bold text-white">{totalWords}</div>
                <div className="text-xs text-white/50 mt-1">words</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-3xl font-bold text-white">{decks.length}</div>
                <div className="text-xs text-white/50 mt-1">decks</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-3xl font-bold text-white">L{level}</div>
                <div className="text-xs text-white/50 mt-1">level</div>
              </div>
            </div>

            {/* Sticky language tabs */}
            {availableLanguages.length > 1 && (
              <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-sm py-2 -mx-4 px-4 mb-2">
                <div className="flex gap-2 overflow-x-auto sm:justify-center sm:flex-wrap sm:overflow-visible scrollbar-none">
                  {availableLanguages.map((lang) => {
                    const isActive = lang === activeLanguage
                    return (
                      <button
                        key={lang}
                        onClick={() => setActiveLanguage(lang)}
                        className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full text-sm border transition-all ${
                          isActive
                            ? 'bg-white/15 border-white/40 text-white'
                            : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/25'
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
              <p className="text-white/40 text-sm mb-4">
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
            <button
              onClick={() => navigate('/generate')}
              className="mt-6 w-full rounded-2xl bg-white/10 border border-white/20 text-white py-4 font-semibold hover:bg-white/20 transition-colors"
            >
              ✦ Generate New Words
            </button>
          </>
        )}

        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative w-32 h-32 mb-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border border-white/20 animate-ping"
                  style={{ animationDelay: `${i * 0.6}s`, animationDuration: '2s' }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/20" />
              </div>
            </div>
            <p className="text-white/60 text-lg font-medium mb-2">Your vocabulary awaits</p>
            <p className="text-white/30 text-sm mb-6">Generate your first words to begin</p>
            <button
              onClick={() => navigate('/generate')}
              className="rounded-xl bg-white/10 border border-white/20 text-white px-6 py-3 hover:bg-white/20 transition-colors"
            >
              Generate First Words
            </button>
          </div>
        )}

        {/* Quote */}
        <div className="mt-12 mb-8 text-center max-w-2xl mx-auto px-4">
          <p className="text-white/30 text-sm italic">"{quote}"</p>
        </div>
      </div>

      <WordDetailModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onWatchVideo={handleWatchVideo}
      />
    </div>
  )
}
