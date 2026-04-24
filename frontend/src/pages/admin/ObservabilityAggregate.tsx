import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from '@/components/admin/observability/observability.module.css'
import {
  fetchFailedEvents,
  fetchFailureCountsByStage,
  type FailureCount,
  type PipelineEvent,
} from '@/lib/observability'
import { useFerrariTitle } from '@/layouts/FerrariAdminLayout'

type AggregateData = {
  failures: FailureCount[]
  failedEvents: PipelineEvent[]
}

function formatTimestamp(iso: string) {
  const date = new Date(iso)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export default function ObservabilityAggregate() {
  useFerrariTitle('Failure triage')

  const [data, setData] = useState<AggregateData | null>(null)
  const [stageFilter, setStageFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchFailureCountsByStage(),
      fetchFailedEvents(),
    ])
      .then(([failures, failedEvents]) => {
        if (cancelled) return
        setData({ failures, failedEvents })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const stagesWithFailures = useMemo(() => {
    if (!data) return []
    return data.failures.filter((item) => item.count > 0).map((item) => item.stage)
  }, [data])

  const filteredEvents = useMemo(() => {
    if (!data) return []
    if (stageFilter === 'ALL') return data.failedEvents
    return data.failedEvents.filter((event) => event.stage === stageFilter)
  }, [data, stageFilter])

  const toggleExpanded = (eventId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  if (loading) return <p className={styles.loading}>Loading...</p>
  if (error) return <p className={styles.error}>Error: {error}</p>
  if (!data) return <p className={styles.error}>No data loaded</p>

  const failedCount = data.failedEvents.length
  const failedStageCount = new Set(data.failedEvents.map((event) => event.stage)).size

  return (
    <div className={styles.aggregatePage}>
      <section className={styles.heroBand}>
        {failedCount === 0 ? (
          <p className={styles.heroText}>
            NOTHING HAS FAILED. <span className={styles.heroRed}>ALL CLEAR.</span>
          </p>
        ) : (
          <p className={styles.heroText}>
            <span className={styles.heroRed}>{failedCount}</span> FAILED EVENTS ACROSS {failedStageCount} STAGES
          </p>
        )}
        <div className={styles.heroCaption}>Lifetime</div>
      </section>

      <div className={styles.chips} aria-label="Failure stage filter">
        {['ALL', ...stagesWithFailures].map((stage) => (
          <button
            key={stage}
            type="button"
            className={`${styles.chip} ${stageFilter === stage ? styles.chipActive : ''}`}
            onClick={() => setStageFilter(stage)}
          >
            {stage}
          </button>
        ))}
      </div>

      <section className={styles.feed}>
        {filteredEvents.length === 0 ? (
          <div className={styles.emptyFeed}>No failed events in this filter</div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expanded.has(event.id)
            return (
              <article key={event.id} className={styles.failureRow}>
                <div
                  className={styles.failureButton}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(event.id)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                      keyEvent.preventDefault()
                      toggleExpanded(event.id)
                    }
                  }}
                >
                  <div className={styles.failureTime}>{formatTimestamp(event.created_at)}</div>
                  <div className={styles.failureMain}>
                    <p className={styles.failureTitle}>{event.stage} · {event.sub_step ?? 'unknown'}</p>
                    <p className={styles.failureType}>{event.error_type ?? 'Unknown error'}</p>
                    <p className={`${styles.failureMessage} ${isExpanded ? styles.failureMessageOpen : ''}`}>
                      {event.error_message ?? 'No error message recorded'}
                    </p>
                  </div>
                  <div className={styles.failureSide}>
                    <span>{event.model_name ?? 'unknown model'}</span>
                    <span>{event.model_provider ?? 'unknown provider'}</span>
                    {event.word_id ? (
                      <Link
                        to={`/admin/observability/word/${event.word_id}`}
                        className={styles.ghostLink}
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                      >
                        OPEN WORD
                      </Link>
                    ) : (
                      <span className={styles.orphanTag}>Orphan event</span>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
