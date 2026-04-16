import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  Layers,
  Zap,
  ArrowUpDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CostEvent = {
  id: string
  stage: string
  provider: string
  model: string | null
  status: string
  estimated_cost_usd: number | null
  usage_metrics: Record<string, unknown> | null
  duration_ms: number | null
  word_slug: string | null
  user_id: string | null
  deck_id: string | null
  word_id: string | null
  created_at: string
}

type CostData = {
  totalSpend: number
  totalEvents: number
  avgCostPerWord: number
  wordsTracked: number
  byStage: Record<string, { count: number; cost: number }>
  byProvider: Record<string, { count: number; cost: number }>
  recentWords: { slug: string; cost: number; stages: number }[]
  monthlySpend: number
  fixedMonthlyCost: number
}

// ---------------------------------------------------------------------------
// Fixed costs — hardcoded for now ($20/mo Railway + Vercel + Supabase + RunPod volumes)
// ---------------------------------------------------------------------------
const FIXED_MONTHLY_COST = 20.0

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUSD(amount: number): string {
  if (amount < 0.01 && amount > 0) return `$${amount.toFixed(4)}`
  if (amount < 1) return `$${amount.toFixed(3)}`
  return `$${amount.toFixed(2)}`
}

function StatCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  subtitle?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
    </Card>
  )
}

function CostBar({
  label,
  cost,
  count,
  maxCost,
  colorClass,
}: {
  label: string
  cost: number
  count: number
  maxCost: number
  colorClass: string
}) {
  const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-32 truncate capitalize">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-20 text-right">
        {formatUSD(cost)}
      </span>
      <span className="text-xs text-muted-foreground w-12 text-right">
        {count}×
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Process raw data
// ---------------------------------------------------------------------------

function processCosts(events: CostEvent[]): CostData {
  const byStage: Record<string, { count: number; cost: number }> = {}
  const byProvider: Record<string, { count: number; cost: number }> = {}
  const wordCosts: Record<string, { cost: number; stages: number }> = {}

  let totalSpend = 0

  // Only this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  let monthlySpend = 0

  for (const ev of events) {
    const cost = ev.estimated_cost_usd ?? 0

    // By stage
    if (!byStage[ev.stage]) byStage[ev.stage] = { count: 0, cost: 0 }
    byStage[ev.stage].count++
    byStage[ev.stage].cost += cost

    // By provider
    if (!byProvider[ev.provider]) byProvider[ev.provider] = { count: 0, cost: 0 }
    byProvider[ev.provider].count++
    byProvider[ev.provider].cost += cost

    // Per-word
    if (ev.word_slug) {
      if (!wordCosts[ev.word_slug]) wordCosts[ev.word_slug] = { cost: 0, stages: 0 }
      wordCosts[ev.word_slug].cost += cost
      wordCosts[ev.word_slug].stages++
    }

    totalSpend += cost

    if (new Date(ev.created_at) >= monthStart) {
      monthlySpend += cost
    }
  }

  // Words tracked
  const wordSlugs = new Set(events.filter(e => e.word_slug).map(e => e.word_slug!))
  const wordsTracked = wordSlugs.size
  const avgCostPerWord = wordsTracked > 0 ? totalSpend / wordsTracked : 0

  // Recent words — last 10 by highest cost
  const recentWords = Object.entries(wordCosts)
    .map(([slug, d]) => ({ slug, cost: d.cost, stages: d.stages }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 15)

  return {
    totalSpend,
    totalEvents: events.length,
    avgCostPerWord,
    wordsTracked,
    byStage,
    byProvider,
    recentWords,
    monthlySpend,
    fixedMonthlyCost: FIXED_MONTHLY_COST,
  }
}

// ---------------------------------------------------------------------------
// Stage and provider colors
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<string, string> = {
  concept: 'bg-violet-500',
  enrichment: 'bg-purple-500',
  images_storyboard: 'bg-blue-500',
  images_rendering: 'bg-cyan-500',
  song: 'bg-green-500',
  video: 'bg-orange-500',
  video_infrastructure: 'bg-amber-600',
  bookend: 'bg-pink-500',
  assembly: 'bg-teal-500',
}

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: 'bg-violet-500',
  gemini: 'bg-blue-500',
  kie_ai: 'bg-emerald-500',
  fal_ai: 'bg-orange-500',
  runpod: 'bg-amber-500',
  elevenlabs: 'bg-pink-500',
  self_hosted: 'bg-zinc-500',
}

const STAGE_LABELS: Record<string, string> = {
  concept: 'Concept (LLM)',
  enrichment: 'Enrichment (LLM)',
  images_storyboard: 'Storyboard (LLM)',
  images_rendering: 'Image Rendering',
  song: 'Song Generation',
  video: 'Video Generation',
  video_infrastructure: 'GPU Infrastructure',
  bookend: 'Bookend (TTS)',
  assembly: 'Assembly',
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Costs() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortByCount, setSortByCount] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: events, error } = await supabase
      .from('cost_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000)

    if (error) {
      console.error('Failed to load cost events:', error)
      setLoading(false)
      return
    }

    setData(processCosts((events || []) as CostEvent[]))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const maxStageCost = Math.max(...Object.values(data.byStage).map(s => sortByCount ? s.count : s.cost), 0.001)
  const maxProviderCost = Math.max(...Object.values(data.byProvider).map(s => sortByCount ? s.count : s.cost), 0.001)

  // Margin analysis
  const targetPrice = 10.0 // $10/month subscription
  const targetWords = 30   // ~30 words/month
  const variableCostPerWord = data.avgCostPerWord
  const fixedCostPerWord = data.wordsTracked > 0 ? FIXED_MONTHLY_COST / Math.max(data.wordsTracked, 1) : 0
  const totalCostPerWord = variableCostPerWord + fixedCostPerWord
  const revenuePerWord = targetPrice / targetWords
  const marginPerWord = revenuePerWord - totalCostPerWord
  const marginPct = revenuePerWord > 0 ? (marginPerWord / revenuePerWord) * 100 : 0

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Cost Tracking</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortByCount(!sortByCount)}
            className="text-xs gap-1"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortByCount ? 'By Count' : 'By Cost'}
          </Button>
          <Button variant="ghost" size="icon" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* No data state */}
      {data.totalEvents === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold">No cost data yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Cost tracking events will appear here after you generate your first word
            with the instrumented orchestrator deployed.
          </p>
        </Card>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Spend"
              value={formatUSD(data.totalSpend)}
              icon={<DollarSign className="h-4 w-4" />}
              subtitle={`${data.totalEvents} API calls`}
            />
            <StatCard
              label="Avg Cost / Word"
              value={formatUSD(data.avgCostPerWord)}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={`${data.wordsTracked} words tracked`}
            />
            <StatCard
              label="This Month"
              value={formatUSD(data.monthlySpend)}
              icon={<Zap className="h-4 w-4" />}
              subtitle="variable costs"
            />
            <StatCard
              label="Fixed / Month"
              value={formatUSD(FIXED_MONTHLY_COST)}
              icon={<Layers className="h-4 w-4" />}
              subtitle="infra (Railway etc.)"
            />
            <StatCard
              label="Margin / Word"
              value={`${marginPct > 0 ? '+' : ''}${marginPct.toFixed(0)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={`${formatUSD(revenuePerWord)} rev − ${formatUSD(totalCostPerWord)} cost`}
            />
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by Stage */}
            <Card className="p-6 space-y-3">
              <h2 className="text-lg font-semibold">Cost by Pipeline Stage</h2>
              <p className="text-sm text-muted-foreground">
                Where your money goes per generation
              </p>
              {Object.entries(data.byStage)
                .sort(([, a], [, b]) => (sortByCount ? b.count - a.count : b.cost - a.cost))
                .map(([stage, d]) => (
                  <CostBar
                    key={stage}
                    label={STAGE_LABELS[stage] || stage}
                    cost={d.cost}
                    count={d.count}
                    maxCost={sortByCount ? Math.max(...Object.values(data.byStage).map(s => s.count)) : maxStageCost}
                    colorClass={STAGE_COLORS[stage] || 'bg-zinc-500'}
                  />
                ))}
            </Card>

            {/* Cost by Provider */}
            <Card className="p-6 space-y-3">
              <h2 className="text-lg font-semibold">Cost by Provider</h2>
              <p className="text-sm text-muted-foreground">
                Spend across external services
              </p>
              {Object.entries(data.byProvider)
                .sort(([, a], [, b]) => (sortByCount ? b.count - a.count : b.cost - a.cost))
                .map(([provider, d]) => (
                  <CostBar
                    key={provider}
                    label={provider.replace(/_/g, '.')}
                    cost={d.cost}
                    count={d.count}
                    maxCost={sortByCount ? Math.max(...Object.values(data.byProvider).map(s => s.count)) : maxProviderCost}
                    colorClass={PROVIDER_COLORS[provider] || 'bg-zinc-500'}
                  />
                ))}
            </Card>
          </div>

          {/* Per-Word Breakdown */}
          <Card className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Cost Per Word (Top 15)</h2>
            <p className="text-sm text-muted-foreground">
              Most expensive words by total variable cost
            </p>
            {data.recentWords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No per-word data yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentWords.map((w) => {
                  const maxWordCost = data.recentWords[0]?.cost || 0.001
                  const pct = maxWordCost > 0 ? (w.cost / maxWordCost) * 100 : 0
                  return (
                    <div key={w.slug} className="flex items-center gap-3">
                      <span className="text-sm w-40 truncate font-mono">{w.slug}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-20 text-right">
                        {formatUSD(w.cost)}
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {w.stages} calls
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Margin Analysis */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Margin Analysis
            </h2>
            <p className="text-sm text-muted-foreground">
              Based on ${targetPrice}/mo subscription, ~{targetWords} words/mo target
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Revenue / Word</div>
                <div className="text-lg font-semibold text-green-400">{formatUSD(revenuePerWord)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Variable Cost / Word</div>
                <div className="text-lg font-semibold text-orange-400">{formatUSD(variableCostPerWord)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fixed Cost / Word</div>
                <div className="text-lg font-semibold text-amber-400">{formatUSD(fixedCostPerWord)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Net Margin / Word</div>
                <div className={`text-lg font-semibold ${marginPerWord >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatUSD(Math.abs(marginPerWord))} {marginPerWord >= 0 ? '✓' : '✗'}
                </div>
              </div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${marginPct >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(marginPct), 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {marginPct >= 50
                ? '🟢 Healthy margin'
                : marginPct >= 20
                ? '🟡 Acceptable margin'
                : marginPct >= 0
                ? '🟠 Thin margin — review costs'
                : '🔴 Negative margin — pricing adjustment needed'}
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
