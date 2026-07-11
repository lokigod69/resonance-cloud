import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Camera, ChevronRight, Library, LogIn, RefreshCw } from 'lucide-react'
import { HomeAccountStrip } from '@/components/dashboard/HomeAccountStrip'
import { HomeWaveBackground } from '@/components/dashboard/HomeWaveBackground'
import { HomeWelcomeCard } from '@/components/dashboard/HomeWelcomeCard'
import { SrsActionTile } from '@/components/dashboard/SrsActionTile'
import { DashboardStreak } from '@/components/dashboard/DashboardStreak'
import { LanguageCluster } from '@/components/dashboard/LanguageCluster'
import WordTide from '@/components/dashboard/WordTide'
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
import { VISUAL_LENS_ENABLED } from '@/lib/productFlags'
import {
  EXPERIENCE_PRESETS,
  PRESET_EMOJI,
  presetLabelKey,
  presetStudyRoute,
  readExperiencePreset,
  writeExperiencePreset,
  type ExperiencePreset,
} from '@/lib/experiencePreset'

type DeckSummary = {
  id: string
  name: string | null
  target_language: string | null
}

export default function DashboardPG() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const navigate = useNavigate()
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

  const newWordDailyCap = normalizeNewWordsPerDay(profile?.new_words_per_day)
  const wordStates = useWordStates(activeLanguage ?? '', { newWordDailyCap })
  const counts = wordStates.counts
  const reviewDue = counts.reviewingDue + counts.masteredDue
  const dueTotal = counts.newDue + counts.totalDue
  const studyStreak = useStudyStreak()
  const tilesDisabled = !activeLanguage || wordStates.loading

  // Empty-home shows when the ACTIVE language has no decks — a brand-new account
  // (no decks, no active language) or a language the learner hasn't started yet.
  const decksInActiveLanguage = useMemo(() => (
    activeLanguage
      ? decks.filter((deck) => canonicalizeLanguageValue(deck.target_language) === activeLanguage)
      : []
  ), [activeLanguage, decks])

  // Which assets this language's words actually carry (same limit-1 probes as
  // the /study configurator) — gates the visual/listening presets so home never
  // offers an experience whose session immediately dead-ends ("no audio
  // available" before the first song exists). null = probe still in flight.
  const [hasImages, setHasImages] = useState<boolean | null>(null)
  const [hasAudio, setHasAudio] = useState<boolean | null>(null)
  const languageDeckIds = useMemo(() => decksInActiveLanguage.map((deck) => deck.id), [decksInActiveLanguage])
  useEffect(() => {
    setHasImages(null)
    setHasAudio(null)
    if (!user || languageDeckIds.length === 0) return
    let cancelled = false
    const probeBase = () => supabase
      .from('words')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .in('deck_id', languageDeckIds)
    void probeBase()
      .not('thumbnail_url', 'is', null)
      .limit(1)
      .then(({ data }) => { if (!cancelled) setHasImages((data?.length ?? 0) > 0) })
    void probeBase()
      .or('suno_storage_url.not.is.null,suno_audio_url.not.is.null')
      .limit(1)
      .then(({ data }) => { if (!cancelled) setHasAudio((data?.length ?? 0) > 0) })
    return () => { cancelled = true }
  }, [user, languageDeckIds])

  const presetAvailable = useCallback((option: ExperiencePreset) => {
    if (option === 'visual') return hasImages === true
    if (option === 'listening') return hasAudio === true
    return true
  }, [hasImages, hasAudio])

  // Per-language experience preset: how quick practice opens from home. Unset →
  // the one-time picker shows in place of the dive-in CTA.
  const [preset, setPreset] = useState<ExperiencePreset | null>(null)
  const [changingPreset, setChangingPreset] = useState(false)
  useEffect(() => {
    setPreset(readExperiencePreset(user?.id, activeLanguage))
    setChangingPreset(false)
  }, [user?.id, activeLanguage])

  const pickPreset = useCallback((next: ExperiencePreset) => {
    writeExperiencePreset(user?.id, activeLanguage, next)
    setPreset(next)
    setChangingPreset(false)
  }, [user?.id, activeLanguage])

  // A stored preset whose assets are confirmed missing (e.g. listening chosen
  // before any song was generated) falls back to the picker instead of driving
  // "Dive in" into a dead end.
  const presetUnusable =
    (preset === 'visual' && hasImages === false) || (preset === 'listening' && hasAudio === false)
  const effectivePreset = presetUnusable ? null : preset

  // Zero-config practice entry: straight into the preset's study mode with
  // everything due now (no queue param = the all-due session). Playful launches
  // the slicer; unset preset falls back to the configurator.
  const diveInHref = (() => {
    if (!activeLanguage) return '/study'
    const lang = encodeURIComponent(activeLanguage)
    if (!effectivePreset) return `/study?lang=${lang}`
    if (effectivePreset === 'playful') return `/games/slicer?returnTo=/dashboard&lang=${lang}`
    return `${presetStudyRoute(effectivePreset)}?lang=${lang}`
  })()
  // Queue tiles deep-link into the preset's mode too (configurator only when
  // playful/unset — the slicer needs its own launch flow).
  const tileModeRoute = effectivePreset && effectivePreset !== 'playful'
    ? presetStudyRoute(effectivePreset) ?? undefined
    : undefined
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
          <h1 className="font-display text-2xl font-semibold">Welcome to Lingwave</h1>
          <p className="text-sm text-[var(--pg-text-dim)]">
            Sign in to view your SRS dashboard and continue studying.
          </p>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
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
          <h1 className="font-display text-xl font-semibold">Dashboard unavailable</h1>
          <p className="text-sm text-[var(--pg-text-dim)]">{dashboardError}</p>
          <Button onClick={loadDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const greeting = t('dashboard.welcomeUser', { name: profile?.display_name || 'Learner' })
  const dashboardLibraryHref = activeLanguage ? `/categories${staticLibraryRouteSuffix(activeLanguage)}` : '/categories'

  return (
    <div className="theme-cosmos dashboard-cosmic px-4 md:px-6">
      <HomeWaveBackground />
      <div
        className={`dashboard-home-stack relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center text-center${
          isFirstRun ? ' dashboard-home-stack--welcome' : ''
        }`}
      >
        <HomeAccountStrip streak={studyStreak.streak} />

        {!decisionResolved ? null : isFirstRun ? (
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
        ) : (
          <>
            <LanguageCluster
              languages={availableLanguages}
              activeLanguage={activeLanguage}
              onSelect={setActiveLanguage}
              onAddLanguage={handleAddLanguage}
            />

            <DashboardStreak streak={studyStreak.streak} />

            {/* The Word Tide: today's words drift over the wave, tap to practice
                inline. The old greeting + mission hero moved out of the way — the
                guided course lives on the Today tab. */}
            {activeLanguage && (
              <WordTide
                userId={user.id}
                language={activeLanguage}
                lemmas={wordStates.data}
                loading={wordStates.loading}
                onGraded={wordStates.refetch}
              />
            )}

            {effectivePreset === null || changingPreset ? (
              <div className="pg-glass w-full max-w-md rounded-2xl px-5 py-4 text-center">
                <p className="font-display text-base font-semibold">{t('home.preset.question')}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{t('home.preset.hint')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {EXPERIENCE_PRESETS.filter(presetAvailable).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => pickPreset(option)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-display text-sm font-semibold transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] ${
                        preset === option
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-glass)]'
                      }`}
                    >
                      <span aria-hidden="true">{PRESET_EMOJI[option]}</span>
                      <span>{t(presetLabelKey(option))}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex w-full max-w-md flex-col items-center gap-2">
                {dueTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate(diveInHref)}
                    disabled={tilesDisabled}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-4 font-display text-base font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('home.tide.diveIn', { count: dueTotal })}
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setChangingPreset(true)}
                  className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label={t('home.preset.changeAria')}
                >
                  {PRESET_EMOJI[effectivePreset]} {t(presetLabelKey(effectivePreset))}
                </button>
              </div>
            )}

            <section className="dashboard-action-grid w-full">
              <div className="dashboard-practice-stack">
                <span className="dashboard-practice-caption">{t('dashboard.practice.caption')}</span>
                <div className="dashboard-study-row">
                  <SrsActionTile
                    label={t('study.queue.review')}
                    count={reviewDue}
                    queue="review"
                    language={activeLanguage ?? ''}
                    tier="compact"
                    accent="cool"
                    disabled={tilesDisabled}
                    modeRoute={tileModeRoute}
                  />
                  <SrsActionTile
                    label={t('study.queue.learn')}
                    count={counts.newDue}
                    queue="learn"
                    language={activeLanguage ?? ''}
                    tier="compact"
                    accent="warm"
                    disabled={tilesDisabled}
                    modeRoute={tileModeRoute}
                  />
                  <SrsActionTile
                    label={t('study.queue.strengthen')}
                    count={counts.learning}
                    queue="strengthen"
                    language={activeLanguage ?? ''}
                    tier="compact"
                    accent="neutral"
                    disabled={tilesDisabled}
                    modeRoute={tileModeRoute}
                  />
                </div>
              </div>
              <Link to={dashboardLibraryHref} className="dashboard-library-tile dashboard-library-action">
                <Library className="dashboard-library-icon" aria-hidden="true" />
                <span className="dashboard-library-copy">
                  <span className="dashboard-library-title">{t('nav.categories')}</span>
                  {activeLanguage ? (
                    <span className="dashboard-library-subtitle">{t(`langName.${activeLanguage}`)}</span>
                  ) : null}
                </span>
              </Link>
              {VISUAL_LENS_ENABLED ? (
                <Link to="/lens" className="dashboard-library-tile dashboard-library-action">
                  <Camera className="dashboard-library-icon" aria-hidden="true" />
                  <span className="dashboard-library-copy">
                    <span className="dashboard-library-title">{t('lens.tile.title')}</span>
                    <span className="dashboard-library-subtitle">{t('lens.tile.subtitle')}</span>
                  </span>
                </Link>
              ) : null}
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
