import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, LogIn, RefreshCw } from 'lucide-react'
import { HomeWaveBackground } from '@/components/dashboard/HomeWaveBackground'
import { HomeSky } from '@/components/home/HomeSky'
import HomeRecommendationCard from '@/components/home/HomeRecommendationCard'
import { useTodayMission } from '@/hooks/useTodayMission'
import { staticLibraryRouteSuffix } from '@/lib/staticLibraryLanguage'
import FirstLightHome from '@/components/home/FirstLightHome'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { canonicalizeLanguageValue, isBetaTargetLanguage } from '@/lib/languages'

type DeckSummary = {
  id: string
  name: string | null
  target_language: string | null
}

export default function DashboardPG() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryLang = searchParams.get('lang')

  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // Languages the learner added from the picker before they have any deck in
  // them — persisted per user so the empty/first-run dashboard keeps showing
  // for that language across reloads, exactly like a deck-derived language.
  const addedStorageKey = user ? `lingwave_added_languages_${user.id}` : null
  const [addedLanguages, setAddedLanguages] = useState<string[]>([])

  useEffect(() => {
    if (!addedStorageKey) {
      setAddedLanguages([])
      return
    }
    try {
      const raw = localStorage.getItem(addedStorageKey)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      setAddedLanguages(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').map(canonicalizeLanguageValue) : [])
    } catch {
      setAddedLanguages([])
    }
  }, [addedStorageKey])

  const selectLanguage = (language: string) => {
    // An explicit choice replaces the entry deep link.
    if (queryLang) {
      const params = new URLSearchParams(searchParams)
      params.delete('lang')
      setSearchParams(params, { replace: true })
    }
    setAddedLanguages((previous) => previous.includes(language) ? previous : [...previous, language])
    setActiveLanguage(language)
  }

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
    () => Array.from(new Set([
      ...decks.map((deck) => canonicalizeLanguageValue(deck.target_language)),
      ...addedLanguages,
      activeLanguage ?? '',
    ].filter(Boolean))),
    [decks, addedLanguages, activeLanguage],
  )

  useEffect(() => {
    if (!languageReady || dashboardLoading || availableLanguages.length === 0) return
    const canonicalQueryLang = canonicalizeLanguageValue(queryLang)
    if (canonicalQueryLang && activeLanguage !== canonicalQueryLang && availableLanguages.includes(canonicalQueryLang)) {
      setActiveLanguage(canonicalQueryLang)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [activeLanguage, availableLanguages, dashboardLoading, languageReady, queryLang, setActiveLanguage])

  // Empty-home shows when the ACTIVE language has no decks — a brand-new account
  // (no decks, no active language) or a language the learner hasn't started yet.
  const decksInActiveLanguage = useMemo(() => (
    activeLanguage
      ? decks.filter((deck) => canonicalizeLanguageValue(deck.target_language) === activeLanguage)
      : []
  ), [activeLanguage, decks])

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

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="pg-glass flex max-w-md flex-col items-center gap-4 rounded-2xl p-8">
          <LogIn className="h-10 w-10 text-[var(--pg-accent-teal)]" />
          <h1 className="font-display text-2xl font-semibold">{t('dashboard.signedOut.title')}</h1>
          <p className="text-sm text-[var(--pg-text-dim)]">
            {t('dashboard.signedOut.body')}
          </p>
          <Button asChild>
            <Link to="/login">{t('dashboard.signedOut.signIn')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="pg-glass flex max-w-md flex-col items-center gap-4 rounded-2xl p-8">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="font-display text-xl font-semibold">{t('errors.route.title')}</h1>
          <p className="text-sm text-[var(--pg-text-dim)]">{t('errors.route.body')}</p>
          <Button onClick={loadDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('errors.route.retry')}
          </Button>
        </div>
      </div>
    )
  }

  const isPopulated = decisionResolved && !isFirstRun

  return (
    <div className="theme-cosmos dashboard-cosmic px-4 md:px-6">
      {isPopulated && activeLanguage ? (
        /* The First Light home (design/DESIGN_SPEC.md): sky · waterline ·
           buoys. It renders its own wave background because it drives the
           sea live (dawn/ripples/clock). */
        <FirstLightHome
          key={activeLanguage}
          userId={user.id}
          activeLanguage={activeLanguage}
          availableLanguages={availableLanguages}
          onSelectLanguage={selectLanguage}
          onAddLanguage={selectLanguage}
          deckHref={decksInActiveLanguage[0] ? `/deck/${decksInActiveLanguage[0].id}` : '/decks'}
        />
      ) : (
        <>
          <HomeWaveBackground />
          {decisionResolved && (
            <>
              <HomeSky languages={availableLanguages} activeLanguage={activeLanguage} onSelectLanguage={selectLanguage} onAddLanguage={selectLanguage}>
                <div className="mt-auto w-full max-w-md self-start pb-3 lg:max-w-xl lg:self-center">
                  <StarterLessonCard key={activeLanguage} language={activeLanguage} userId={user.id} baseLanguage={profile?.base_language} />
                </div>
              </HomeSky>
              <div className="relative z-10 mx-auto flex flex-wrap justify-center gap-x-6 gap-y-1 pt-2 text-sm font-semibold text-[var(--text-secondary)]">
                <Link className="inline-flex min-h-11 items-center hover:underline" to={`/categories${activeLanguage ? staticLibraryRouteSuffix(activeLanguage) : ''}`}>{t('dashboard.firstRun.browseLibrary')}</Link>
                <Link className="inline-flex min-h-11 items-center hover:underline" to="/generate">{t('dashboard.firstRun.makeDeck')}</Link>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StarterLessonCard({ language, userId, baseLanguage }: {
  language: string | null
  userId: string
  baseLanguage?: string | null
}) {
  const { mission } = useTodayMission({ activeLanguage: language, userId, baseLanguage, enabled: Boolean(language) })
  const hero = mission && !mission.isPathComplete ? { kind: 'lesson' as const, mission }
    : !language || isBetaTargetLanguage(language) ? { kind: 'start' as const } : { kind: 'discover' as const }
  return <HomeRecommendationCard hero={hero} activeLanguage={language} phraseLang={mission?.phraseLang} />
}
