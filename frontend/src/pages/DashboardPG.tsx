import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, LogIn, RefreshCw } from 'lucide-react'
import { HomeAccountStrip } from '@/components/dashboard/HomeAccountStrip'
import { HomeWaveBackground } from '@/components/dashboard/HomeWaveBackground'
import { HomeWelcomeCard } from '@/components/dashboard/HomeWelcomeCard'
import { LanguageCluster } from '@/components/dashboard/LanguageCluster'
import FirstLightHome from '@/components/home/FirstLightHome'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { useStudyStreak } from '@/hooks/useStudyStreak'
import { supabase } from '@/lib/supabase'
import { canonicalizeLanguageValue } from '@/lib/languages'

type DeckSummary = {
  id: string
  name: string | null
  target_language: string | null
}

export default function DashboardPG() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const [searchParams] = useSearchParams()
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
      setAddedLanguages(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [])
    } catch {
      setAddedLanguages([])
    }
  }, [addedStorageKey])

  const handleAddLanguage = useCallback((lang: string) => {
    const canonical = canonicalizeLanguageValue(lang)
    if (!canonical) return
    setAddedLanguages((prev) => {
      const next = prev.includes(canonical) ? prev : [...prev, canonical]
      if (addedStorageKey) localStorage.setItem(addedStorageKey, JSON.stringify(next))
      return next
    })
    setActiveLanguage(canonical)
  }, [addedStorageKey, setActiveLanguage])

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
    ].filter(Boolean))),
    [decks, addedLanguages],
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
  // First Light carries its own progress line. Avoid downloading up to 5,000
  // recall-attempt timestamps for a streak that only the empty home renders.
  const studyStreak = useStudyStreak({ enabled: isFirstRun })

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

  const greeting = t('dashboard.welcomeUser', { name: profile?.display_name || 'Learner' })
  const isPopulated = decisionResolved && !isFirstRun

  return (
    <div className="theme-cosmos dashboard-cosmic px-4 md:px-6">
      {isPopulated && activeLanguage ? (
        /* The First Light home (design/DESIGN_SPEC.md): sky · waterline ·
           buoys. It renders its own wave background because it drives the
           sea live (dawn/ripples/clock). */
        <FirstLightHome
          userId={user.id}
          activeLanguage={activeLanguage}
          availableLanguages={availableLanguages}
          onSelectLanguage={setActiveLanguage}
          onAddLanguage={handleAddLanguage}
          deckHref={decksInActiveLanguage[0] ? `/deck/${decksInActiveLanguage[0].id}` : '/decks'}
        />
      ) : (
        <>
          <HomeWaveBackground />
          <div
            className={`dashboard-home-stack relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center text-center${
              isFirstRun ? ' dashboard-home-stack--welcome' : ''
            }`}
          >
            <HomeAccountStrip streak={studyStreak.streak} />

            {!decisionResolved ? null : (
              <div className="dashboard-welcome-center">
                <div className="dashboard-welcome-hero-zone">
                  <h1 className="welcome-hero font-display text-[1.75rem] font-bold sm:text-5xl md:text-6xl">
                    {greeting}
                  </h1>
                </div>
                {/* Keep the language picker available on the empty state too — after
                    adding a language the learner lands here and must be able to hop
                    back to a language they already study. */}
                <LanguageCluster
                  languages={availableLanguages}
                  activeLanguage={activeLanguage}
                  onSelect={setActiveLanguage}
                  onAddLanguage={handleAddLanguage}
                />
                <HomeWelcomeCard />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
