import { Flame } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type DashboardStreakProps = {
  streak: number
}

export function DashboardStreak({ streak }: DashboardStreakProps) {
  const { t } = useTranslation()

  if (streak <= 0) return null

  return (
    <div className="dashboard-streak-row" aria-live="polite">
      <span className="dashboard-today-streak" aria-label={t('dashboard.streak.aria', { count: streak })}>
        <Flame className="dashboard-today-streak-icon" aria-hidden="true" />
        <span className="dashboard-today-streak-count">{streak}</span>
        <span className="dashboard-today-streak-label">{t('dashboard.streak.label')}</span>
      </span>
    </div>
  )
}
