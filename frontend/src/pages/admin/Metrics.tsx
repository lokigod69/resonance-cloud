import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  RefreshCw,
  Users,
  Database,
  CheckCircle,
  Coins,
  Percent,
  Clock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WordRow = {
  id: string
  status: string
  deck_id: string
  metadata: Record<string, unknown> | null
}

type DeckRow = {
  id: string
  target_language: string
}

type ProfileRow = {
  id: string
  credits: number
}

type JobRow = {
  id: string
  status: string
  profile_used: string | null
  started_at: string | null
  completed_at: string | null
}

type MetricsData = {
  totalWordsGenerated: number
  totalDecks: number
  totalUsers: number
  successRate: number
  creditsRemaining: number
  wordsByStatus: Record<string, number>
  wordsByLanguage: Record<string, { total: number; complete: number }>
  jobStats: {
    total: number
    byStatus: Record<string, number>
    avgDurationMs: number | null
  }
  profileUsage: Record<string, number>
  pipelineTiming: Record<string, number> | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-purple-500',
  complete: 'bg-green-500',
  failed: 'bg-red-500',
  draft: 'bg-zinc-500',
  generating: 'bg-blue-500',
  partial: 'bg-orange-500',
  approved: 'bg-blue-500',
  rejected: 'bg-zinc-500',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  processing: 'text-purple-400',
  complete: 'text-green-400',
  failed: 'text-red-400',
  draft: 'text-zinc-400',
  generating: 'text-blue-400',
  partial: 'text-orange-400',
  approved: 'text-blue-400',
  rejected: 'text-zinc-400',
}

// Pipeline stage labels for metadata timing
const STAGE_LABELS: Record<string, string> = {
  concept: 'Concept',
  images: 'Images',
  song: 'Song',
  video: 'Video',
  assembly: 'Assembly',
  bookend: 'Bookend',
  total: 'Total Pipeline',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes}m ${remaining}s`
}

function StatBar({
  label,
  value,
  max,
  colorClass,
}: {
  label: string
  value: number
  max: number
  colorClass: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 truncate capitalize">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-12 text-right">{value}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Process raw data into metrics
// ---------------------------------------------------------------------------

function processMetrics(
  words: WordRow[],
  decks: DeckRow[],
  profiles: ProfileRow[],
  jobs: JobRow[],
): MetricsData {
  // Words by status
  const wordsByStatus: Record<string, number> = {}
  for (const w of words) {
    wordsByStatus[w.status] = (wordsByStatus[w.status] || 0) + 1
  }

  // Words by language
  const deckLanguageMap: Record<string, string> = {}
  for (const d of decks) {
    deckLanguageMap[d.id] = d.target_language
  }
  const wordsByLanguage: Record<string, { total: number; complete: number }> = {}
  for (const w of words) {
    const lang = deckLanguageMap[w.deck_id] || 'Unknown'
    if (!wordsByLanguage[lang]) wordsByLanguage[lang] = { total: 0, complete: 0 }
    wordsByLanguage[lang].total++
    if (w.status === 'complete') wordsByLanguage[lang].complete++
  }

  // Job stats
  const jobsByStatus: Record<string, number> = {}
  const durations: number[] = []
  for (const j of jobs) {
    jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1
    if (j.started_at && j.completed_at) {
      const dur = new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
      if (dur > 0) durations.push(dur)
    }
  }
  const avgDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null

  // Profile usage
  const profileUsage: Record<string, number> = {}
  for (const j of jobs) {
    if (j.profile_used) {
      profileUsage[j.profile_used] = (profileUsage[j.profile_used] || 0) + 1
    }
  }

  // Pipeline timing from word metadata
  // Metadata structure: { images: { duration_seconds: N }, concept: { duration_seconds: N }, ... }
  // Also check for pipeline_duration_seconds at the top level as "total"
  const stageSums: Record<string, number[]> = {}
  for (const w of words) {
    if (!w.metadata || typeof w.metadata !== 'object') continue
    const meta = w.metadata as Record<string, unknown>

    // Top-level pipeline duration → "total"
    const totalDur = meta.pipeline_duration_seconds
    if (typeof totalDur === 'number' && totalDur > 0) {
      if (!stageSums['total']) stageSums['total'] = []
      stageSums['total'].push(totalDur * 1000) // convert seconds to ms
    }

    // Per-stage durations: meta.<stage>.duration_seconds
    for (const stage of Object.keys(STAGE_LABELS)) {
      if (stage === 'total') continue
      const stageData = meta[stage]
      if (stageData && typeof stageData === 'object') {
        const dur = (stageData as Record<string, unknown>).duration_seconds
        if (typeof dur === 'number' && dur > 0) {
          if (!stageSums[stage]) stageSums[stage] = []
          stageSums[stage].push(dur * 1000) // convert seconds to ms
        }
      }
    }
  }

  let pipelineTiming: Record<string, number> | null = null
  if (Object.keys(stageSums).length > 0) {
    pipelineTiming = {}
    for (const [stage, vals] of Object.entries(stageSums)) {
      pipelineTiming[stage] = vals.reduce((a, b) => a + b, 0) / vals.length
    }
  }

  // Totals
  const totalComplete = wordsByStatus['complete'] || 0
  const totalFailed = wordsByStatus['failed'] || 0
  const denominator = totalComplete + totalFailed
  const successRate = denominator > 0 ? Math.round((totalComplete / denominator) * 100) : 0

  return {
    totalWordsGenerated: totalComplete,
    totalDecks: decks.length,
    totalUsers: profiles.length,
    successRate,
    creditsRemaining: profiles.reduce((sum, p) => sum + p.credits, 0),
    wordsByStatus,
    wordsByLanguage,
    jobStats: {
      total: jobs.length,
      byStatus: jobsByStatus,
      avgDurationMs,
    },
    profileUsage,
    pipelineTiming,
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [wordsRes, decksRes, profilesRes, jobsRes] = await Promise.all([
      supabase.from('words').select('id, status, deck_id, metadata'),
      supabase.from('decks').select('id, target_language'),
      supabase.from('profiles').select('id, credits'),
      supabase
        .from('generation_jobs')
        .select('id, status, profile_used, started_at, completed_at'),
    ])

    const data = processMetrics(
      (wordsRes.data || []) as WordRow[],
      (decksRes.data || []) as DeckRow[],
      (profilesRes.data || []) as ProfileRow[],
      (jobsRes.data || []) as JobRow[],
    )
    setMetrics(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount; load() is also wired to the refresh button via onClick
    load()
  }, [load])

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const maxWordStatus = Math.max(...Object.values(metrics.wordsByStatus), 1)
  const maxLanguage = Math.max(
    ...Object.values(metrics.wordsByLanguage).map(v => v.total),
    1,
  )
  const maxJobStatus = Math.max(...Object.values(metrics.jobStats.byStatus), 1)
  const maxProfileUsage = Math.max(...Object.values(metrics.profileUsage), 1)

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Metrics</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Words Generated"
          value={metrics.totalWordsGenerated}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Total Decks"
          value={metrics.totalDecks}
          icon={<Database className="h-4 w-4" />}
        />
        <StatCard
          label="Total Users"
          value={metrics.totalUsers}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Success Rate"
          value={`${metrics.successRate}%`}
          icon={<Percent className="h-4 w-4" />}
        />
        <StatCard
          label="Credits Remaining"
          value={metrics.creditsRemaining}
          icon={<Coins className="h-4 w-4" />}
        />
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Words by Status */}
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Words by Status</h2>
          {Object.keys(metrics.wordsByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No word data yet
            </p>
          ) : (
            Object.entries(metrics.wordsByStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <StatBar
                  key={status}
                  label={status}
                  value={count}
                  max={maxWordStatus}
                  colorClass={STATUS_COLORS[status] || 'bg-zinc-500'}
                />
              ))
          )}
        </Card>

        {/* Words by Language */}
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Words by Language</h2>
          {Object.keys(metrics.wordsByLanguage).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No word data yet
            </p>
          ) : (
            Object.entries(metrics.wordsByLanguage)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([lang, counts]) => (
                <div key={lang}>
                  <StatBar
                    label={lang}
                    value={counts.total}
                    max={maxLanguage}
                    colorClass="bg-blue-500"
                  />
                  <span className={`text-xs ml-[7.75rem] ${STATUS_TEXT_COLORS['complete']}`}>
                    {counts.complete} complete
                  </span>
                </div>
              ))
          )}
        </Card>

        {/* Generation Jobs Summary */}
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Generation Jobs</h2>
          {metrics.jobStats.total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No jobs yet
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {metrics.jobStats.total} total jobs
                {metrics.jobStats.avgDurationMs != null && (
                  <> &middot; avg duration: {formatDuration(metrics.jobStats.avgDurationMs)}</>
                )}
              </p>
              {Object.entries(metrics.jobStats.byStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <StatBar
                    key={status}
                    label={status}
                    value={count}
                    max={maxJobStatus}
                    colorClass={STATUS_COLORS[status] || 'bg-zinc-500'}
                  />
                ))}
            </>
          )}
        </Card>

        {/* Profile Usage */}
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Profile Usage</h2>
          {Object.keys(metrics.profileUsage).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No profile usage data yet
            </p>
          ) : (
            Object.entries(metrics.profileUsage)
              .sort(([, a], [, b]) => b - a)
              .map(([profile, count]) => (
                <StatBar
                  key={profile}
                  label={profile}
                  value={count}
                  max={maxProfileUsage}
                  colorClass="bg-indigo-500"
                />
              ))
          )}
        </Card>
      </div>

      {/* Pipeline Timing */}
      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pipeline Timing
        </h2>
        {metrics.pipelineTiming ? (
          <>
            <p className="text-sm text-muted-foreground">
              Average duration per pipeline stage (from word metadata)
            </p>
            <div className="space-y-2">
              {Object.entries(metrics.pipelineTiming)
                .sort(([, a], [, b]) => b - a)
                .map(([stage, avgMs]) => (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-sm w-28 truncate">
                      {STAGE_LABELS[stage] || stage}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{
                          width: `${Math.min(
                            (avgMs /
                              Math.max(
                                ...Object.values(metrics.pipelineTiming!),
                              )) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-20 text-right">
                      {formatDuration(avgMs)}
                    </span>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Pipeline timing data will appear after the first generation with metadata tracking
          </p>
        )}
      </Card>
    </div>
  )
}
