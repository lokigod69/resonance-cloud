import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Library } from 'lucide-react'
import { HomeAccountStrip } from '@/components/dashboard/HomeAccountStrip'
import { HomeWaveBackground } from '@/components/dashboard/HomeWaveBackground'
import { HomeWelcomeCard } from '@/components/dashboard/HomeWelcomeCard'
import { SrsActionTile } from '@/components/dashboard/SrsActionTile'
import { DailyTodayPanel } from '@/components/dashboard/DailyTodayPanel'
import { LanguageCluster } from '@/components/dashboard/LanguageCluster'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { useWordStates } from '@/hooks/useWordStates'
import { useStudyStreak } from '@/hooks/useStudyStreak'
import { supabase } from '@/lib/supabase'
import { staticLibraryRouteSuffix } from '@/lib/staticLibraryLanguage'
import { canonicalizeLanguageValue } from '@/lib/languages'
import { normalizeNewWordsPerDay } from '@/lib/dailyHabits'

type DeckSummary = {
  id: string
  name: string | null
  target_language: string | null
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryLang = searchParams.get('lang')

  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setDecks([])
      setDashboardLoading(false)
      return
    }

    setDashboardLoading(true)
    setDashboardError(null)

    try {
      const { data, error } = await supabase
        .from('decks')
        .select('id, name, target_language')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDecks((data ?? []) as DeckSummary[])
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Could not load dashboard')
      setDecks([])
    } finally {
      setDashboardLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const availableLanguages = useMemo(
    () => Array.from(new Set(decks.map((deck) => canonicalizeLanguageValue(deck.target_language)).filter(Boolean))),
    [decks],
  )

  useEffect(() => {
    if (dashboardLoading || availableLanguages.length === 0) return
    const canonicalQueryLang = canonicalizeLanguageValue(queryLang)
    if (canonicalQueryLang && availableLanguages.includes(canonicalQueryLang)) {
      setActiveLanguage(canonicalQueryLang)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [activeLanguage, availableLanguages, dashboardLoading, queryLang, setActiveLanguage])

  const newWordDailyCap = normalizeNewWordsPerDay(profile?.new_words_per_day)
  const wordStates = useWordStates(activeLanguage ?? '', { newWordDailyCap })
  const counts = wordStates.counts
  const reviewDue = counts.reviewingDue + counts.masteredDue
  const hasAnyWords = counts.new + counts.learning + counts.reviewing + counts.mastered > 0
  const studyStreak = useStudyStreak()
  const tilesDisabled = !activeLanguage || wordStates.loading

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">{t('dashboard.signedOut.title')}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {t('dashboard.signedOut.body')}
        </p>
        <Button asChild>
          <Link to="/login">{t('dashboard.signedOut.signIn')}</Link>
        </Button>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">{dashboardError}</p>
        <Button onClick={loadDashboardData}>Try again</Button>
      </div>
    )
  }

  const greeting = t('dashboard.welcomeUser', { name: profile?.display_name || 'Learner' })
  const dashboardLibraryHref = activeLanguage ? `/categories${staticLibraryRouteSuffix(activeLanguage)}` : '/categories'
  // Empty-home shows when the ACTIVE language has no decks — a brand-new account
  // (no decks, no active language) or a language the learner hasn't started yet.
  const decksInActiveLanguage = activeLanguage
    ? decks.filter((deck) => canonicalizeLanguageValue(deck.target_language) === activeLanguage)
    : []
  // Guard the transient where decks have loaded but the active language hasn't been
  // pinned yet (decks exist, activeLanguage still null) so an existing user never
  // flashes the empty card before the pin effect runs.
  const hasResolvedActiveLanguage = Boolean(activeLanguage) || decks.length === 0
  // Until the empty-vs-populated decision is settled (decks still loading, language not yet
  // ready/pinned) we render a neutral home — bare wave background + account strip — rather than
  // flashing the zero-count dashboard. The two-door card or the populated grid appears the
  // instant the decision resolves.
  const decisionResolved = !dashboardLoading && languageReady && hasResolvedActiveLanguage
  const isFirstRun = decisionResolved && decksInActiveLanguage.length === 0

  return (
    <div className="theme-cosmos dashboard-cosmic px-4 md:px-6">
      <HomeWaveBackground />
      <div
        className={`dashboard-home-stack relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center text-center${
          isFirstRun ? ' dashboard-home-stack--welcome' : ''
        }`}
      >
        <HomeAccountStrip />

        {!decisionResolved ? null : isFirstRun ? (
          <div className="dashboard-welcome-center">
            <div className="dashboard-welcome-hero-zone">
              <h1 className="welcome-hero font-display text-[1.75rem] font-bold sm:text-5xl md:text-6xl">
                {greeting}
              </h1>
            </div>
            <HomeWelcomeCard />
          </div>
        ) : (
          <>
            <h1 className="welcome-hero font-display text-[1.75rem] font-bold sm:text-5xl md:text-6xl">
              {greeting}
            </h1>

            <LanguageCluster
              languages={availableLanguages}
              activeLanguage={activeLanguage}
              onSelect={setActiveLanguage}
            />

            <DailyTodayPanel
              reviewDue={reviewDue}
              newDue={counts.newDue}
              reviewPool={counts.reviewing + counts.mastered}
              newPool={counts.new}
              hasAnyWords={hasAnyWords}
              streak={studyStreak.streak}
              studiedToday={studyStreak.studiedToday}
            />

            <section className="dashboard-action-grid grid w-full grid-cols-2 gap-2.5 sm:gap-3">
              <SrsActionTile
                label={t('study.queue.review')}
                count={reviewDue}
                queue="review"
                language={activeLanguage ?? ''}
                tier="compact"
                accent="cool"
                disabled={tilesDisabled}
              />
              <SrsActionTile
                label={t('study.queue.learn')}
                count={counts.newDue}
                queue="learn"
                language={activeLanguage ?? ''}
                tier="compact"
                accent="warm"
                disabled={tilesDisabled}
              />
              <SrsActionTile
                label={t('study.queue.strengthen')}
                count={counts.learning}
                queue="strengthen"
                language={activeLanguage ?? ''}
                tier="compact"
                accent="neutral"
                disabled={tilesDisabled}
              />
              <Link to={dashboardLibraryHref} className="dashboard-library-tile dashboard-library-action">
                <Library className="dashboard-library-icon" aria-hidden="true" />
                <span className="dashboard-library-copy">
                  <span className="dashboard-library-title">{t('nav.categories')}</span>
                  {activeLanguage ? (
                    <span className="dashboard-library-subtitle">{t(`langName.${activeLanguage}`)}</span>
                  ) : null}
                </span>
              </Link>
            </section>

            <div className="dashboard-mastered-pill" aria-live="polite">
              {counts.mastered > 0 ? (
                <button
                  type="button"
                  className="dashboard-mastered-pill-button"
                  disabled={tilesDisabled}
                  onClick={() => {
                    if (tilesDisabled || !activeLanguage) return
                    const params = new URLSearchParams({ queue: 'mastered', lang: activeLanguage })
                    navigate(`/study?${params.toString()}`)
                  }}
                  aria-label={`${counts.mastered} ${t('study.queue.mastered')}`}
                >
                  <span className="dashboard-mastered-count">{counts.mastered}</span>
                  <span className="dashboard-mastered-label">{t('study.queue.mastered')}</span>
                </button>
              ) : (
                <span className="dashboard-mastered-empty">
                  <span className="dashboard-mastered-count">0</span>
                  <span className="dashboard-mastered-label">{t('study.queue.mastered')}</span>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
