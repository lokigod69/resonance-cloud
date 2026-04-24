import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  fetchPipelineEventsForWord,
  fetchWordWithMetadata,
  type PipelineEvent,
  type WordRow,
} from '@/lib/observability'
import { useFerrariTitle } from '@/layouts/FerrariAdminLayout'

const CANONICAL_STAGES = ['concept', 'images', 'video', 'assembly', 'bookend', 'suno_bakein']

export default function ObservabilityWordDetail() {
  useFerrariTitle('Word detail')

  const { wordId } = useParams()
  const [word, setWord] = useState<WordRow | null>(null)
  const [events, setEvents] = useState<PipelineEvent[]>([])
  const [openStages, setOpenStages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wordId) return

    let cancelled = false

    Promise.all([
      fetchWordWithMetadata(wordId),
      fetchPipelineEventsForWord(wordId),
    ])
      .then(([wordRow, pipelineEvents]) => {
        if (cancelled) return
        setWord(wordRow)
        setEvents(pipelineEvents)
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
  }, [wordId])

  const eventsByStage = useMemo(() => {
    const grouped = new Map<string, PipelineEvent[]>()
    for (const stage of CANONICAL_STAGES) grouped.set(stage, [])
    for (const event of events) {
      const stageEvents = grouped.get(event.stage) ?? []
      stageEvents.push(event)
      grouped.set(event.stage, stageEvents)
    }
    return grouped
  }, [events])

  const failedEvents = useMemo(
    () => events.filter((event) => event.status === 'failed'),
    [events],
  )

  const toggleStage = (stage: string) => {
    setOpenStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  if (!wordId) return <p>Error: Missing word id</p>
  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <div>
      {failedEvents.length > 0 && (
        <div style={{ border: '1px solid red', padding: '1rem', margin: '1rem 0' }}>
          <strong>Failed events</strong>
          <ul>
            {failedEvents.map((event) => (
              <li key={event.id}>
                {event.id} - {event.sub_step ?? 'unknown'} - {event.error_message ?? event.error_type ?? 'Unknown error'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Word observability</h2>
      <pre>{JSON.stringify(word, null, 2)}</pre>

      <h3>Aggregator snapshot</h3>
      <pre>{JSON.stringify(word?.metadata ?? null, null, 2)}</pre>

      {CANONICAL_STAGES.map((stage) => {
        const stageEvents = eventsByStage.get(stage) ?? []
        const isOpen = openStages.has(stage)

        return (
          <section key={stage}>
            <button type="button" onClick={() => toggleStage(stage)}>
              {isOpen ? 'Hide' : 'Show'} {stage} ({stageEvents.length})
            </button>
            {stageEvents.length === 0 ? (
              <p>No events recorded</p>
            ) : isOpen ? (
              stageEvents.map((event) => (
                <pre key={event.id}>{JSON.stringify(event, null, 2)}</pre>
              ))
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
