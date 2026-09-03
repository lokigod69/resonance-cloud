import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'

// HorizonMoreMarker — `+{N} further out` near the horizon (§0/§3): the
// binding backlog ruling requires the debt visible somewhere; this is its
// minimal form. Backlog state only (duePool > visible buoys). Links to the
// all-due study session — `queue=due` is not a valid StudyQueue.

export default function HorizonMoreMarker({
  count,
  language,
  labelKey = 'home.fl.more',
}: {
  count: number
  language: string
  /** `home.fl.more` beyond visible buoys; `home.stream.due` when the stream
   * owns the water and no due word is visible at all. */
  labelKey?: 'home.fl.more' | 'home.stream.due'
}) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/study?lang=${encodeURIComponent(language)}`}
      className="pointer-events-auto rounded px-2 py-1 font-display text-xs font-medium text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      style={{ textShadow: '0 2px 14px rgba(5,2,8,0.6)' }}
    >
      {t(labelKey, { count })}
    </Link>
  )
}
