import type { JsonObject } from '@/lib/observability'
import styles from './observability.module.css'

export default function AggregatorSnapshot({ metadata }: { metadata: JsonObject | null }) {
  return (
    <details className={styles.snapshot}>
      <summary className={styles.snapshotSummary}>Aggregator snapshot</summary>
      <pre className={styles.snapshotPre}>{JSON.stringify(metadata ?? null, null, 2)}</pre>
    </details>
  )
}
