import { Check, Flame, Sparkles } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { isDoneForToday } from '@/lib/dailyHabits'

type DailyTodayPanelProps = {
  /** Due reviews remaining today (reviewingDue + masteredDue). */
  reviewDue: number
  /** New words still available within today's daily cap. */
  newDue: number
  /** Whether the active language has any studyable words at all (guards the empty account). */
  hasAnyWords: boolean
  /** Consecutive-day study streak (derived, UTC-day buckets, runner excluded). */
  streak: number
  /** Whether there is study activity on today's UTC day. */
  studiedToday: boolean
}

/**
 * Home "today" panel (shared across both skins): shows the day's remaining work as a small
 * progress representation, flips to a brand celebration once the daily set is cleared, and
 * surfaces the activity streak. Everything is derived from existing counts — no writes.
 */
export function DailyTodayPanel({
  reviewDue,
  newDue,
  hasAnyWords,
  streak,
  studiedToday,
}: DailyTodayPanelProps) {
  const { t } = useTranslation()

  // No daily set to speak of (brand-new / empty account, or no words in this language yet).
  if (!hasAnyWords) return null

  const done = isDoneForToday({ reviewDue, newDue, hasAnyWords })

  const streakChip =
    streak > 0 ? (
      <span className="dashboard-today-streak" aria-label={t('dashboard.streak.aria', { count: streak })}>
        <Flame className="dashboard-today-streak-icon" aria-hidden="true" />
        <span className="dashboard-today-streak-count">{streak}</span>
        <span className="dashboard-today-streak-label">{t('dashboard.streak.label')}</span>
      </span>
    ) : null

  if (done) {
    return (
      <section className="dashboard-today-panel dashboard-today-panel--done" aria-live="polite">
        <span className="dashboard-today-done-icon" aria-hidden="true">
          <Sparkles />
        </span>
        <div className="dashboard-today-done-copy">
          <h2 className="dashboard-today-done-title">
            {studiedToday ? t('dashboard.done.title') : t('dashboard.done.titleCaughtUp')}
          </h2>
          <p className="dashboard-today-done-subtitle">{t('dashboard.done.subtitle')}</p>
        </div>
        {streakChip}
      </section>
    )
  }

  return (
    <section className="dashboard-today-panel" aria-live="polite">
      <div className="dashboard-today-head">
        <h2 className="dashboard-today-title">{t('dashboard.today.title')}</h2>
        {streakChip}
      </div>
      <div className="dashboard-today-stats">
        <TodayStat label={t('study.queue.review')} count={reviewDue} />
        <TodayStat label={t('study.queue.learn')} count={newDue} />
      </div>
    </section>
  )
}

function TodayStat({ label, count }: { label: string; count: number }) {
  const cleared = count === 0
  return (
    <span className={`dashboard-today-stat${cleared ? ' dashboard-today-stat--cleared' : ''}`}>
      {cleared ? (
        <Check className="dashboard-today-stat-icon" aria-hidden="true" />
      ) : (
        <span className="dashboard-today-stat-count">{count}</span>
      )}
      <span className="dashboard-today-stat-label">{label}</span>
    </span>
  )
}
