import type { PipelineEvent } from '@/lib/observability'
import styles from './observability.module.css'

export default function FailureNotice({ events }: { events: PipelineEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className={styles.failureNotice}>
      <p className={styles.failureNoticeTitle}>Failed events</p>
      <ul className={styles.failureList}>
        {events.map((event) => (
          <li key={event.id}>
            {event.id} · {event.sub_step ?? 'unknown'} · {event.error_message ?? event.error_type ?? 'Unknown error'}
          </li>
        ))}
      </ul>
    </div>
  )
}
