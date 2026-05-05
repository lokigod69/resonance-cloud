import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Sparkles } from 'lucide-react'
import LevelBadge from '@/components/dashboard/LevelBadge'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import WordDetailModal, { type LibraryWord } from '@/components/dashboard/WordDetailModal'
import WordLibrary from '@/components/dashboard/WordLibrary'
import { QUOTES } from '@/data/quotes'
import type { Locale } from '@/lib/translations'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const queryWordId = searchParams.get('word')
  const queryLang = searchParams.get('lang')

  const { t, locale } = useTranslation()

  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // Library words for active language
  const [libraryWords, setLibraryWords] = useState<LibraryWord[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [selectedWord, setSelectedWord] = useState<LibraryWord | null>(null)
  const [queryOpenedWordId, setQueryOpenedWordId] = useState<string | null>(null)

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
  }, [user?.id, loadDecks])

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
    if (queryLang && availableLanguages.includes(queryLang)) {
      if (activeLanguage !== queryLang) setActiveLanguage(queryLang)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, queryLang, setActiveLanguage])

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
          .select('id, target_language')
          .eq('user_id', user.id)
          .eq('target_language', activeLanguage)
        const deckIds = (deckRows ?? []).map((d) => d.id)
        const deckLanguageById = new Map((deckRows ?? []).map((d) => [d.id, d.target_language]))
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
        if (!cancelled) {
          setLibraryWords((wordRows ?? []).map((word) => ({
            ...word,
            target_language: deckLanguageById.get(word.deck_id) ?? activeLanguage,
          })) as LibraryWord[])
        }
      } finally {
        if (!cancelled) setLibraryLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, activeLanguage])

  useEffect(() => {
    if (!queryWordId) {
      if (queryOpenedWordId) {
        setSelectedWord(null)
        setQueryOpenedWordId(null)
      }
      return
    }
    if (queryLang && availableLanguages.includes(queryLang) && activeLanguage !== queryLang) return
    if (libraryLoading) return

    const foundWord = libraryWords.find((word) => word.id === queryWordId)
    if (foundWord) {
      setSelectedWord(foundWord)
      setQueryOpenedWordId(foundWord.id)
    } else if (queryOpenedWordId) {
      setSelectedWord(null)
      setQueryOpenedWordId(null)
    }
  }, [activeLanguage, availableLanguages, libraryLoading, libraryWords, queryLang, queryOpenedWordId, queryWordId])

  const globalWordCount = useMemo(
    () => decks.reduce((sum, d) => sum + (d.word_count ?? 0), 0),
    [decks]
  )

  const deckNameMap = useMemo(() => new Map(decks.map(d => [d.id, d.name ?? t('study.untitled')])), [decks, t])

  const handleWatchVideo = (word: LibraryWord) => {
    const params = new URLSearchParams()
    params.set('returnTo', '/dashboard')
    params.set('returnMode', 'wordModal')
    const returnLang = word.target_language ?? activeLanguage
    if (returnLang) params.set('returnLang', returnLang)
    navigate(`/deck/${word.deck_id}/word/${word.id}?${params.toString()}`)
  }

  const handleWordModalClose = () => {
    setSelectedWord(null)
    setQueryOpenedWordId(null)

    if (!searchParams.has('word') && !searchParams.has('lang')) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('word')
    nextParams.delete('lang')
    setSearchParams(nextParams, {
      replace: true,
      preventScrollReset: true,
    })
  }

  const quoteList = QUOTES[locale as Locale] ?? QUOTES.en
  const quote = useMemo(() => quoteList[Math.floor(Math.random() * quoteList.length)], [quoteList])

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col min-h-[calc(100vh-80px)]">
        <div className="classic-dashboard-header">
          <h1 className="break-words">
            {profile?.display_name
              ? t('dashboard.welcomeUser', { name: profile.display_name })
              : t('dashboard.welcome')}
          </h1>
        </div>

        {!showEmptyState && (
          <>
            {/* Level display */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-foreground/70 text-sm font-medium">{t('dashboard.level')}</span>
              <LevelBadge wordCount={globalWordCount} />
            </div>

            {/* Sticky language tabs */}
            {availableLanguages.length > 1 && (
              <div className="sticky top-[var(--glassy-header-offset)] z-10 mb-3 flex justify-center px-1 py-2">
                <div className="inline-flex w-fit max-w-full flex-wrap justify-center gap-2 px-1 py-1">
                  {availableLanguages.map((lang) => {
                    const isActive = lang === activeLanguage
                    return (
                      <button
                        key={lang}
                        onClick={() => setActiveLanguage(lang)}
                        className={`min-h-[44px] px-3 py-2 rounded-full text-sm border transition-all ${
                          isActive
                            ? 'bg-foreground/15 border-foreground/40 text-foreground shadow-sm'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground/90 hover:border-foreground/25'
                        }`}
                      >
                        {t(`langName.${lang}`)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Word count line */}
            {activeLanguage && (
              <p className="text-xs text-muted-foreground mb-4 text-center sm:text-left">
                {t('dashboard.wordsInLanguage', { count: libraryWords.length, language: t(`langName.${activeLanguage}`) })}
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
                  onWordClick={(w) => {
                    setQueryOpenedWordId(null)
                    setSelectedWord(w)
                  }}
                  emptyMessage={
                    activeLanguage
                      ? t('dashboard.noWordsInLanguage', { language: t(`langName.${activeLanguage}`) })
                      : t('dashboard.noWordsYet')
                  }
                />
              )}
            </div>

            {/* Generate button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => navigate('/generate')}
                className="w-full sm:w-auto min-h-[52px] px-8 py-4 rounded-full bg-foreground/10 hover:bg-foreground/15 border border-foreground/25 text-foreground font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles size={16} />
                {t('dashboard.generate')}
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
            <p className="text-foreground text-lg font-medium mb-2">{t('dashboard.vocabularyAwaits')}</p>
            <p className="text-muted-foreground text-sm mb-6">{t('dashboard.generateFirstHint')}</p>
            <button
              onClick={() => navigate('/generate')}
              className="rounded-xl bg-accent/20 border border-border px-6 py-3 hover:bg-accent/30 transition-colors"
            >
              {t('dashboard.generateFirstWords')}
            </button>
          </div>
        )}

        {/* Quote */}
        <div className="mt-auto pt-12 pb-8 text-center max-w-2xl mx-auto px-4">
          <div className="bg-card/80 border border-border/50 rounded-xl p-6">
            <p className="text-base text-muted-foreground italic leading-relaxed">"{quote}"</p>
          </div>
        </div>
      </div>

      <WordDetailModal
        word={selectedWord}
        onClose={handleWordModalClose}
        onWatchVideo={handleWatchVideo}
        deckName={selectedWord ? deckNameMap.get(selectedWord.deck_id) : undefined}
      />
    </div>
  )
}
