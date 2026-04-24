import { useState } from 'react'
import type { PipelineEvent } from '@/lib/observability'
import EventDetail from '../EventDetail'
import EventRow from '../EventRow'
import type { StageEvents } from './WordScrollLayout'
import styles from './wordLayouts.module.css'

export default function WordTabsLayout({
  stages,
  eventsByStage,
}: {
  stages: string[]
  eventsByStage: StageEvents
}) {
  const [activeStage, setActiveStage] = useState(stages[0])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const events: PipelineEvent[] = eventsByStage[activeStage] ?? []

  const toggle = (eventId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabStrip} role="tablist" aria-label="Pipeline stages">
        {stages.map((stage) => (
          <button
            key={stage}
            type="button"
            role="tab"
            aria-selected={activeStage === stage}
            className={`${styles.tab} ${activeStage === stage ? styles.tabActive : ''}`}
            onClick={() => setActiveStage(stage)}
          >
            {stage}
            <span className={styles.tabCount}>· {eventsByStage[stage]?.length ?? 0}</span>
          </button>
        ))}
      </div>
      <section className={styles.tabPanel}>
        <header className={styles.stageHeader}>
          <h2 className={styles.stageTitle}>{activeStage}</h2>
          <div className={styles.stageMeta}>{events.length} events</div>
        </header>
        {events.length === 0 ? (
          <div className={styles.empty}>No events recorded</div>
        ) : (
          <div className={styles.eventStack}>
            {events.map((event) => {
              const isExpanded = expanded.has(event.id)
              return (
                <div key={event.id} className={styles.eventBlock}>
                  <EventRow event={event} expanded={isExpanded} onToggle={() => toggle(event.id)} />
                  {isExpanded && <EventDetail event={event} />}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
