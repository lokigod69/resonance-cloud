import { useEffect, useState } from 'react'
import styles from '@/components/admin/observability/observability.module.css'
import {
  fetchCostByProvider,
  fetchCostByFeature,
  fetchCostByDay,
  fetchCostByUser,
  fetchWasteByFeatureModel,
  fetchTotalCost,
  type ProviderCost,
  type CostByFeature,
  type CostByDay,
  type CostByUser,
  type WasteByFeatureModel,
} from '@/lib/observability'
import { useFerrariTitle } from '@/layouts/useFerrariTitle'

type CostData = {
  total: number
  byProvider: ProviderCost[]
  byFeature: CostByFeature[]
  byDay: CostByDay[]
  byUser: CostByUser[]
  waste: WasteByFeatureModel[]
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}

export default function ObservabilityCost() {
  useFerrariTitle('Cost rollups')

  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchTotalCost(),
      fetchCostByProvider(),
      fetchCostByFeature(),
      fetchCostByDay(),
      fetchCostByUser(),
      fetchWasteByFeatureModel(),
    ])
      .then(([total, byProvider, byFeature, byDay, byUser, waste]) => {
        if (cancelled) return
        setData({ total, byProvider, byFeature, byDay, byUser, waste })
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

  if (loading) return <p className={styles.loading}>Loading...</p>
  if (error) return <p className={styles.error}>Error: {error}</p>
  if (!data) return <p className={styles.error}>No data loaded</p>

  return (
    <div className={styles.aggregatePage}>
      <section className={styles.heroBand}>
        <p className={styles.heroText}>
          <span className={styles.heroRed}>{usd(data.total)}</span> ESTIMATED SPEND
        </p>
        <div className={styles.heroCaption}>Across the most recent capped event window</div>
      </section>

      <section className={styles.costSection}>
        <h2 className={styles.costSectionTitle}>Spend by provider</h2>
        <div className={styles.costTable}>
          <div className={`${styles.costRow} ${styles.costHeadRow}`}>
            <span>Provider</span>
            <span className={styles.costValue}>Cost</span>
            <span className={styles.costValue}>Share</span>
          </div>
          {data.byProvider.length === 0 ? (
            <div className={styles.emptyFeed}>No cost recorded yet</div>
          ) : (
            data.byProvider.map((row) => (
              <div key={row.model_provider} className={styles.costRow}>
                <span className={styles.costLabel}>{row.model_provider}</span>
                <span className={`${styles.costValue} ${styles.costValueStrong}`}>{usd(row.cost_usd)}</span>
                <span className={styles.costValue}>
                  {data.total > 0 ? `${((row.cost_usd / data.total) * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.costSection}>
        <h2 className={styles.costSectionTitle}>Spend by feature</h2>
        <div className={styles.costTable}>
          <div className={`${styles.costRow} ${styles.costHeadRow}`}>
            <span>Feature</span>
            <span className={styles.costValue}>Cost</span>
            <span className={styles.costValue}>Calls</span>
          </div>
          {data.byFeature.length === 0 ? (
            <div className={styles.emptyFeed}>No cost recorded yet</div>
          ) : (
            data.byFeature.map((row) => (
              <div key={row.feature} className={styles.costRow}>
                <span className={styles.costLabel}>{row.feature}</span>
                <span className={`${styles.costValue} ${styles.costValueStrong}`}>{usd(row.cost_usd)}</span>
                <span className={styles.costValue}>{row.count}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.costSection}>
        <h2 className={styles.costSectionTitle}>Spend by day</h2>
        <div className={styles.costTable}>
          <div className={`${styles.costRow} ${styles.costHeadRow}`}>
            <span>Day</span>
            <span className={styles.costValue}>Cost</span>
            <span className={styles.costValue}>Calls</span>
          </div>
          {data.byDay.length === 0 ? (
            <div className={styles.emptyFeed}>No cost recorded yet</div>
          ) : (
            data.byDay.map((row) => (
              <div key={row.day} className={styles.costRow}>
                <span className={styles.costLabel}>{row.day}</span>
                <span className={`${styles.costValue} ${styles.costValueStrong}`}>{usd(row.cost_usd)}</span>
                <span className={styles.costValue}>{row.count}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.costSection}>
        <h2 className={styles.costSectionTitle}>Top spend by user</h2>
        <div className={styles.costTable}>
          <div className={`${styles.costRow} ${styles.costHeadRow}`}>
            <span>User</span>
            <span className={styles.costValue}>Cost</span>
            <span className={styles.costValue}>Calls</span>
          </div>
          {data.byUser.length === 0 ? (
            <div className={styles.emptyFeed}>No cost recorded yet</div>
          ) : (
            data.byUser.map((row) => (
              <div key={row.user_id} className={styles.costRow}>
                <span className={styles.costLabel}>{row.user_id}</span>
                <span className={`${styles.costValue} ${styles.costValueStrong}`}>{usd(row.cost_usd)}</span>
                <span className={styles.costValue}>{row.count}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.costSection}>
        <h2 className={styles.costSectionTitle}>Waste finder — cost per successful outcome</h2>
        <div className={styles.costTable}>
          <div className={`${styles.costRow} ${styles.costRowWide} ${styles.costHeadRow}`}>
            <span>Feature</span>
            <span>Model</span>
            <span className={styles.costValue}>Cost</span>
            <span className={styles.costValue}>Successes</span>
            <span className={styles.costValue}>Cost / success</span>
          </div>
          {data.waste.length === 0 ? (
            <div className={styles.emptyFeed}>No cost recorded yet</div>
          ) : (
            data.waste.map((row) => (
              <div key={`${row.feature} ${row.model}`} className={`${styles.costRow} ${styles.costRowWide}`}>
                <span className={styles.costLabel}>{row.feature}</span>
                <span className={styles.costLabel}>{row.model}</span>
                <span className={styles.costValue}>{usd(row.cost_usd)}</span>
                <span className={styles.costValue}>{row.success_count}</span>
                <span className={`${styles.costValue} ${styles.costValueStrong}`}>{usd(row.cost_per_success)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
