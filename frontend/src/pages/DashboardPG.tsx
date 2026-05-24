import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, LogIn, RefreshCw } from 'lucide-react'
import { MasteryDonut } from '@/components/dashboard/MasteryDonut'
import { SrsActionTile } from '@/components/dashboard/SrsActionTile'
import { LanguageCluster } from '@/components/dashboard/LanguageCluster'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { useWordStates } from '@/hooks/useWordStates'
import { supabase } from '@/lib/supabase'

type DeckSummary = {
  id: string
  name: string | null
  target_language: string | null
}

export default function DashboardPG() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage } = useLanguage()
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
    () => Array.from(new Set(decks.map((deck) => deck.target_language).filter((lang): lang is string => Boolean(lang)))),
    [decks],
  )

  useEffect(() => {
    if (dashboardLoading || availableLanguages.length === 0) return
    if (queryLang && availableLanguages.includes(queryLang)) {
      setActiveLanguage(queryLang)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [activeLanguage, availableLanguages, dashboardLoading, queryLang, setActiveLanguage])

  const wordStates = useWordStates(activeLanguage ?? '')
  const counts = wordStates.counts
  const totalWords = wordStates.data.length
  const reviewDue = counts.reviewingDue + counts.masteredDue
  const tilesDisabled = !activeLanguage || wordStates.loading

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="pg-glass flex max-w-md flex-col items-center gap-4 rounded-2xl p-8">
          <LogIn className="h-10 w-10 text-[var(--pg-accent-teal)]" />
          <h1 className="font-display text-2xl font-semibold">Welcome to Resonance</h1>
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

  return (
    <div className="theme-cosmos dashboard-cosmic px-4 md:px-6">
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
        <h1 className="welcome-hero font-display text-3xl font-bold sm:text-5xl md:text-6xl">
          {greeting}
        </h1>

        <MasteryDonut
          mastered={counts.mastered}
          total={totalWords}
          loading={dashboardLoading || wordStates.loading}
        />

        <LanguageCluster
          languages={availableLanguages}
          activeLanguage={activeLanguage}
          onSelect={setActiveLanguage}
        />

        <section className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <SrsActionTile
            label={t('study.queue.review')}
            count={reviewDue}
            queue="review"
            language={activeLanguage ?? ''}
            tier="top"
            accent="cool"
            disabled={tilesDisabled}
          />
          <SrsActionTile
            label={t('study.queue.learn')}
            count={counts.newDue}
            queue="learn"
            language={activeLanguage ?? ''}
            tier="top"
            accent="warm"
            disabled={tilesDisabled}
          />
        </section>

        <div className="w-full sm:max-w-xs mx-auto">
          <SrsActionTile
            label={t('study.queue.strengthen')}
            count={counts.learning}
            queue="strengthen"
            language={activeLanguage ?? ''}
            tier="bottom"
            accent="neutral"
            disabled={tilesDisabled}
          />
        </div>

        <div className="mastered-circle">
          {counts.mastered > 0 ? (
            <>
              <button
                type="button"
                className="mastered-circle-disc"
                disabled={tilesDisabled}
                onClick={() => {
                  if (tilesDisabled || !activeLanguage) return
                  const params = new URLSearchParams({ queue: 'mastered', lang: activeLanguage })
                  navigate(`/study?${params.toString()}`)
                }}
                aria-label={`${counts.mastered} ${t('study.queue.mastered')}`}
              >
                {counts.mastered}
              </button>
              <span className="mastered-circle-caption">{t('study.queue.mastered')}</span>
            </>
          ) : (
            <div className="mastered-empty">
              <span className="mastered-empty-ring">0</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--text-primary)_52%,transparent)]">
                {t('study.queue.mastered')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
