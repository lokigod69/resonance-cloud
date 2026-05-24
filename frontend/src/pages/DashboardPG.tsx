import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, Flame, LogIn, RefreshCw, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { MasteryDonut } from '@/components/dashboard/MasteryDonut'
import { SrsActionTile } from '@/components/dashboard/SrsActionTile'
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
  const learnCaption = counts.newDue < counts.new ? `${counts.newDue} of ${counts.new} new available today` : undefined
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

  return (
    <div className="w-full px-4 pb-28 pt-4 md:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="pg-glass rounded-2xl p-6">
          <p className="text-sm font-medium text-[var(--pg-text-dim)]">
            {t('dashboard.welcomeUser', { name: profile?.display_name || 'Learner' })}
          </p>
        </section>

        <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <MasteryDonut mastered={counts.mastered} total={totalWords} loading={dashboardLoading || wordStates.loading} />
        </section>

        {availableLanguages.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {availableLanguages.map((lang) => {
              const isActive = lang === activeLanguage
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLanguage(lang)}
                  className={`min-h-[40px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-[var(--pg-accent-teal)] bg-[var(--pg-accent-teal)]/20 text-[var(--pg-accent-teal)]'
                      : 'border-white/10 bg-white/5 text-[var(--pg-text-dim)] hover:text-[var(--pg-text)]'
                  }`}
                >
                  {t(`langName.${lang}`)}
                </button>
              )
            })}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SrsActionTile
            label="Review due"
            count={reviewDue}
            queue="review"
            language={activeLanguage ?? ''}
            icon={<RotateCcw className="h-5 w-5" />}
            disabled={tilesDisabled}
          />
          <SrsActionTile
            label="Learn new"
            count={counts.newDue}
            queue="learn"
            language={activeLanguage ?? ''}
            icon={<Sparkles className="h-5 w-5" />}
            disabled={tilesDisabled}
            caption={learnCaption}
          />
          <SrsActionTile
            label="Strengthen"
            count={counts.learning}
            queue="strengthen"
            language={activeLanguage ?? ''}
            icon={<Flame className="h-5 w-5" />}
            disabled={tilesDisabled}
          />
          <SrsActionTile
            label="Mastered"
            count={counts.mastered}
            queue="mastered"
            language={activeLanguage ?? ''}
            variant="muted"
            icon={<Trophy className="h-5 w-5" />}
            disabled={tilesDisabled}
          />
        </section>
      </div>
    </div>
  )
}
