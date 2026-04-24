import { useState } from 'react'
import type { PipelineEvent } from '@/lib/observability'
import EventDetail from '../EventDetail'
import EventRow from '../EventRow'
import styles from './wordLayouts.module.css'

export type StageEvents = Record<string, PipelineEvent[]>

export default function WordScrollLayout({
  stages,
  eventsByStage,
}: {
  stages: string[]
  eventsByStage: StageEvents
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (eventId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  return (
    <div className={styles.scrollPage}>
      {stages.map((stage, index) => {
        const events = eventsByStage[stage] ?? []
        const surface = index % 2 === 0 ? 'light' : 'dark'

        return (
          <section
            key={stage}
            className={`${styles.scrollSection} ${surface === 'light' ? styles.lightSection : styles.darkSection}`}
          >
            <div className={styles.scrollInner}>
              <header className={styles.stageHeader}>
                <h2 className={styles.stageTitle}>{stage}</h2>
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
                        <EventRow
                          event={event}
                          expanded={isExpanded}
                          onToggle={() => toggle(event.id)}
                          surface={surface}
                        />
                        {isExpanded && <EventDetail event={event} surface={surface} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
