import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type QuotaAction = 'voice_chat' | 'guided_transcribe' | 'suggest_words' | 'grok_token'

type QuotaSettings = {
  enforcement_enabled: boolean
  updated_at: string | null
  updated_by: string | null
}

type QuotaConfig = {
  action: QuotaAction
  per_minute: number
  per_day: number
  hard_max_per_minute: number
  hard_max_per_day: number
  updated_at: string | null
  updated_by: string | null
}

type QuotaUsage = {
  action: QuotaAction
  total: number
}

type QuotaSnapshot = {
  settings: QuotaSettings | null
  config: QuotaConfig[]
  usage_last_24h: QuotaUsage[]
}

type DraftLimits = Record<QuotaAction, { perMinute: string; perDay: string }>

const ACTION_LABELS: Record<QuotaAction, string> = {
  voice_chat: 'voice_chat',
  guided_transcribe: 'Guided Today STT',
  suggest_words: 'suggest_words',
  grok_token: 'grok_token',
}

const ACTION_ORDER: QuotaAction[] = ['voice_chat', 'guided_transcribe', 'suggest_words', 'grok_token']

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function buildDraft(config: QuotaConfig[]): DraftLimits {
  return config.reduce((acc, row) => {
    acc[row.action] = {
      perMinute: String(row.per_minute),
      perDay: String(row.per_day),
    }
    return acc
  }, {} as DraftLimits)
}

function usageByAction(usage: QuotaUsage[]): Record<string, number> {
  return usage.reduce<Record<string, number>>((acc, row) => {
    acc[row.action] = row.total
    return acc
  }, {})
}

export default function Quotas() {
  const [snapshot, setSnapshot] = useState<QuotaSnapshot | null>(null)
  const [draft, setDraft] = useState<DraftLimits>({} as DraftLimits)
  const [loading, setLoading] = useState(true)
  const [savingAction, setSavingAction] = useState<QuotaAction | null>(null)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('get_api_quota_admin_snapshot')
    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }
    const next = data as QuotaSnapshot
    setSnapshot(next)
    setDraft(buildDraft(next.config || []))
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const usageTotals = useMemo(
    () => usageByAction(snapshot?.usage_last_24h || []),
    [snapshot],
  )

  const sortedConfig = useMemo(() => {
    const byAction = new Map((snapshot?.config || []).map((row) => [row.action, row]))
    return ACTION_ORDER.map((action) => byAction.get(action)).filter(Boolean) as QuotaConfig[]
  }, [snapshot])

  const enforcementEnabled = snapshot?.settings?.enforcement_enabled === true

  const toggleEnforcement = async () => {
    setToggling(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('set_api_quota_enforcement', {
      p_enabled: !enforcementEnabled,
    })
    setToggling(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const next = data as QuotaSnapshot
    setSnapshot(next)
    setDraft(buildDraft(next.config || []))
  }

  const updateDraft = (action: QuotaAction, field: 'perMinute' | 'perDay', value: string) => {
    setDraft((current) => ({
      ...current,
      [action]: {
        ...current[action],
        [field]: value,
      },
    }))
  }

  const saveConfig = async (row: QuotaConfig) => {
    const nextMinute = Number(draft[row.action]?.perMinute)
    const nextDay = Number(draft[row.action]?.perDay)
    if (!Number.isInteger(nextMinute) || !Number.isInteger(nextDay) || nextMinute < 1 || nextDay < 1) {
      setError('Quota limits must be positive whole numbers.')
      return
    }
    if (nextMinute > row.hard_max_per_minute || nextDay > row.hard_max_per_day) {
      setError(`${row.action} limits cannot exceed hard maximums.`)
      return
    }

    setSavingAction(row.action)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('update_api_quota_config', {
      p_action: row.action,
      p_per_minute: nextMinute,
      p_per_day: nextDay,
    })
    setSavingAction(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const next = data as QuotaSnapshot
    setSnapshot(next)
    setDraft(buildDraft(next.config || []))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">API Quotas</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Global mode</p>
            <div className="mt-1 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                enforcementEnabled
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}>
                {enforcementEnabled ? 'Enforced / On' : 'Monitor-only / Off'}
              </span>
              <Button size="sm" onClick={toggleEnforcement} disabled={toggling}>
                {toggling ? 'Saving...' : enforcementEnabled ? 'Switch Off' : 'Enforce'}
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Monitor-only records usage but does not block provider calls.</p>
            <p>Enforced blocks over-quota requests before provider calls.</p>
          </div>

          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            <p>Updated: {formatDate(snapshot?.settings?.updated_at ?? null)}</p>
            <p>Updated by: {snapshot?.settings?.updated_by || 'Unknown'}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Recent Usage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {ACTION_ORDER.map((action) => (
              <div key={action} className="rounded-md border border-border px-3 py-3">
                <p className="text-xs text-muted-foreground">{ACTION_LABELS[action]}</p>
                <p className="mt-1 text-2xl font-semibold">{usageTotals[action] || 0}</p>
                <p className="text-xs text-muted-foreground">today / last 24h</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr_1fr] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <span>Action</span>
          <span>Per Minute</span>
          <span>Per Day</span>
          <span>Hard Max / Min</span>
          <span>Hard Max / Day</span>
          <span>Usage</span>
          <span>Updated</span>
        </div>
        <div className="divide-y divide-border">
          {sortedConfig.map((row) => (
            <div
              key={row.action}
              className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr_1fr]"
            >
              <div className="font-medium">{ACTION_LABELS[row.action]}</div>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground md:hidden">Per Minute</span>
                <input
                  type="number"
                  min={1}
                  max={row.hard_max_per_minute}
                  value={draft[row.action]?.perMinute ?? ''}
                  onChange={(event) => updateDraft(row.action, 'perMinute', event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground md:hidden">Per Day</span>
                <input
                  type="number"
                  min={1}
                  max={row.hard_max_per_day}
                  value={draft[row.action]?.perDay ?? ''}
                  onChange={(event) => updateDraft(row.action, 'perDay', event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </label>
              <div className="text-muted-foreground">{row.hard_max_per_minute}</div>
              <div className="text-muted-foreground">{row.hard_max_per_day}</div>
              <div>{usageTotals[row.action] || 0}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(row.updated_at)}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => saveConfig(row)}
                  disabled={savingAction === row.action}
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingAction === row.action ? 'Saving' : 'Save'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
