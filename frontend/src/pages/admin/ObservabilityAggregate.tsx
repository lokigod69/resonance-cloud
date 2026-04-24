import { useEffect, useMemo, useState } from 'react'
import {
  fetchCostByProvider,
  fetchFailureCountsByStage,
  fetchRecentEvents,
  fetchStageSubStepStatusCounts,
  type AggregateCount,
  type FailureCount,
  type PipelineEvent,
  type ProviderCost,
} from '@/lib/observability'
import { useFerrariTitle } from '@/layouts/FerrariAdminLayout'

type AggregateData = {
  counts: AggregateCount[]
  costs: ProviderCost[]
  failures: FailureCount[]
  recent: PipelineEvent[]
}

export default function ObservabilityAggregate() {
  useFerrariTitle('Aggregate observability')

  const [data, setData] = useState<AggregateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchStageSubStepStatusCounts(),
      fetchCostByProvider(),
      fetchFailureCountsByStage(),
      fetchRecentEvents(10),
    ])
      .then(([counts, costs, failures, recent]) => {
        if (cancelled) return
        setData({ counts, costs, failures, recent })
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

  const stageCoverage = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    for (const item of data.counts) {
      counts.set(item.stage, (counts.get(item.stage) ?? 0) + item.count)
    }
    return Array.from(counts.entries()).map(([stage, count]) => ({ stage, count }))
  }, [data])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error}</p>
  if (!data) return <p>No data loaded</p>

  return (
    <div>
      <h2>Aggregate observability</h2>

      <h3>Counts by stage, sub_step, status</h3>
      <pre>{JSON.stringify(data.counts, null, 2)}</pre>

      <h3>Cost by model_provider</h3>
      <pre>{JSON.stringify(data.costs, null, 2)}</pre>

      <h3>Failure counts by stage</h3>
      <pre>{JSON.stringify(data.failures, null, 2)}</pre>

      <h3>Recent events</h3>
      <pre>{JSON.stringify(data.recent, null, 2)}</pre>

      <h3>Stage coverage</h3>
      <pre>{JSON.stringify(stageCoverage, null, 2)}</pre>
    </div>
  )
}
