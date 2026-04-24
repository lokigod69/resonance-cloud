import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PipelineEvent } from '@/lib/observability'
import styles from './observability.module.css'

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatMetric(event: PipelineEvent) {
  const parts: string[] = []
  if (event.cost_usd !== null) parts.push(`$${event.cost_usd.toFixed(4)}`)
  if (event.latency_ms !== null) parts.push(`${event.latency_ms}ms`)
  return parts.join(' · ') || '—'
}

function pillClass(status: string) {
  if (status === 'success') return styles.pillSuccess
  if (status === 'failed') return styles.pillFailed
  return styles.pillSkipped
}

export default function EventRow({
  event,
  expanded,
  onToggle,
  surface = 'dark',
}: {
  event: PipelineEvent
  expanded: boolean
  onToggle: () => void
  surface?: 'dark' | 'light'
}) {
  const provider = [event.model_provider, event.model_name].filter(Boolean).join(' · ') || '—'
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <button
      type="button"
      className={`${styles.eventRow} ${surface === 'light' ? styles.eventRowLight : ''}`}
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <span className={styles.timestamp}>{formatClock(event.created_at)}</span>
      <span className={styles.subStep}>{event.sub_step ?? 'unknown'}</span>
      <span className={`${styles.pill} ${pillClass(event.status)}`}>{event.status}</span>
      <span className={styles.provider}>{provider}</span>
      <span className={styles.metrics}>{formatMetric(event)}</span>
      <Chevron size={16} aria-hidden="true" />
    </button>
  )
}
