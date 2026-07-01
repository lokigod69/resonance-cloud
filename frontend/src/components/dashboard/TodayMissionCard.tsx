import { Link } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { TodayMission } from '@/hooks/useTodayMission'

type TodayMissionCardProps = {
  mission: TodayMission | null
  loading: boolean
}

/**
 * TodayMissionCard — the home hero. One glass card that answers "what do I do
 * today?": the guided path's progress, the lesson's core phrase in the target
 * language, its meaning in the learner's base language, and a single CTA that
 * drops straight into the session. Renders nothing when guided content has no
 * honest mission for the active language (the practice row then leads).
 */
export function TodayMissionCard({ mission, loading }: TodayMissionCardProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <section className="dashboard-mission-card dashboard-mission-card--loading" aria-hidden="true">
        <span className="dashboard-mission-skeleton dashboard-mission-skeleton--kicker" />
        <span className="dashboard-mission-skeleton dashboard-mission-skeleton--progress" />
        <span className="dashboard-mission-skeleton dashboard-mission-skeleton--phrase" />
        <span className="dashboard-mission-skeleton dashboard-mission-skeleton--title" />
        <span className="dashboard-mission-skeleton dashboard-mission-skeleton--cta" />
      </section>
    )
  }

  if (!mission) return null

  const progressBar = (
    <div
      className="dashboard-mission-progress"
      role="img"
      aria-label={t('dashboard.mission.progressAria', {
        completed: mission.completedCount,
        total: mission.totalLessons,
      })}
    >
      {mission.lessonStatuses.map((status, index) => (
        <span
          key={index}
          className={`dashboard-mission-dot${
            status === 'complete'
              ? ' dashboard-mission-dot--done'
              : status === 'current'
                ? ' dashboard-mission-dot--current'
                : ''
          }`}
        />
      ))}
    </div>
  )

  if (mission.isPathComplete) {
    return (
      <section className="dashboard-mission-card dashboard-mission-card--complete" aria-live="polite">
        <div className="dashboard-mission-head">
          <span className="dashboard-mission-kicker">{t('dashboard.mission.kicker')}</span>
          <span className="dashboard-mission-meta">
            {t('today.path.compactProgress', { completed: mission.completedCount, total: mission.totalLessons })}
          </span>
        </div>
        {progressBar}
        <p className="dashboard-mission-phrase">
          {t('dashboard.mission.pathComplete', { path: mission.pathShortTitle })}
        </p>
        <Link className="dashboard-mission-cta" to={mission.pathHref}>
          {t('dashboard.mission.nextPath')}
          <ChevronRight className="dashboard-mission-cta-icon" aria-hidden="true" />
        </Link>
      </section>
    )
  }

  return (
    <section className="dashboard-mission-card" aria-live="polite">
      <div className="dashboard-mission-head">
        <span className="dashboard-mission-kicker">{t('dashboard.mission.kicker')}</span>
        <span className="dashboard-mission-meta">
          {t('dashboard.mission.lessonOf', { number: mission.lessonNumber, total: mission.totalLessons })}
          {' · '}
          {t('dashboard.mission.minutes', { minutes: mission.estimatedMinutes })}
        </span>
      </div>
      {progressBar}
      <p className="dashboard-mission-phrase" lang={mission.phraseLang} dir="auto">
        {mission.phrase}
      </p>
      <p className="dashboard-mission-title">{mission.lessonTitle}</p>
      <Link className="dashboard-mission-cta" to={mission.startHref}>
        {mission.completedCount > 0 ? t('dashboard.mission.continue') : t('dashboard.mission.start')}
        <ChevronRight className="dashboard-mission-cta-icon" aria-hidden="true" />
      </Link>
      {mission.checkpointPending ? (
        <Link className="dashboard-mission-checkpoint" to={mission.checkpointHref}>
          <Sparkles className="dashboard-mission-checkpoint-icon" aria-hidden="true" />
          {t('dashboard.mission.checkpointReady')}
          <ChevronRight className="dashboard-mission-checkpoint-chevron" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  )
}
