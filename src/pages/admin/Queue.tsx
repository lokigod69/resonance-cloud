import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ListOrdered,
  Play,
  Pause,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'

type Job = {
  id: string
  user_id: string
  deck_id: string
  status: string
  priority: number
  target_language: string
  art_style: string | null
  movie_override: string | null
  words_total: number
  words_completed: number
  words_failed: number
  profile_used: string | null
  settings_override: Record<string, string> | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  profiles?: { display_name: string | null } | null
}

type Word = {
  id: string
  word: string
  translation: string | null
  status: string
  error_message: string | null
}

type SystemSettings = {
  auto_approve: boolean
  queue_paused: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  complete: 'bg-green-500/20 text-green-400',
  partial: 'bg-orange-500/20 text-orange-400',
  failed: 'bg-red-500/20 text-red-400',
  rejected: 'bg-zinc-500/20 text-zinc-400',
}

export default function Queue() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [settings, setSettings] = useState<SystemSettings>({ auto_approve: false, queue_paused: false })
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [jobWords, setJobWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('generation_jobs')
      .select('*, profiles(display_name)')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
    if (data) setJobs(data)
  }, [])

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (data) setSettings(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchJobs(), fetchSettings()])
    setLoading(false)
  }, [fetchJobs, fetchSettings])

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      fetchJobs()
      fetchSettings()
    }, 10_000)
    return () => clearInterval(interval)
  }, [load, fetchJobs, fetchSettings])

  const toggleAutoApprove = async () => {
    const next = !settings.auto_approve
    await supabase.from('system_settings').update({ auto_approve: next }).eq('id', 1)
    setSettings(s => ({ ...s, auto_approve: next }))
  }

  const toggleQueuePaused = async () => {
    const next = !settings.queue_paused
    await supabase.from('system_settings').update({ queue_paused: next }).eq('id', 1)
    setSettings(s => ({ ...s, queue_paused: next }))
  }

  const approveJob = async (jobId: string) => {
    await supabase.from('generation_jobs').update({ status: 'approved' }).eq('id', jobId)
    await fetchJobs()
  }

  const rejectJob = async (jobId: string) => {
    // Refund credits: get job, then refund words_total credits
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', job.user_id)
        .single()
      if (profile) {
        await supabase.from('profiles').update({
          credits: profile.credits + job.words_total,
        }).eq('id', job.user_id)
      }
    }
    await supabase.from('generation_jobs').update({ status: 'rejected' }).eq('id', jobId)
    await fetchJobs()
  }

  const expandJob = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null)
      setJobWords([])
      return
    }
    setExpandedJob(jobId)
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      const { data } = await supabase
        .from('words')
        .select('id, word, translation, status, error_message')
        .eq('deck_id', job.deck_id)
        .order('created_at')
      if (data) setJobWords(data)
    }
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListOrdered className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Job Queue</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm font-medium">Auto-approve</span>
          <button
            onClick={toggleAutoApprove}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.auto_approve ? 'bg-green-600' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.auto_approve ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </Card>

        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm font-medium">Queue</span>
          <Button
            variant={settings.queue_paused ? 'default' : 'secondary'}
            size="sm"
            onClick={toggleQueuePaused}
          >
            {settings.queue_paused ? (
              <><Play className="h-3 w-3 mr-1" /> Resume</>
            ) : (
              <><Pause className="h-3 w-3 mr-1" /> Pause</>
            )}
          </Button>
        </Card>

        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {jobs.filter(j => j.status === 'pending').length} pending
            {' · '}
            {jobs.filter(j => j.status === 'processing').length} processing
            {' · '}
            {jobs.filter(j => j.status === 'approved').length} queued
          </span>
        </Card>
      </div>

      {/* Job List */}
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No generation jobs yet
          </Card>
        ) : (
          jobs.map(job => (
            <Card key={job.id} className="overflow-hidden">
              {/* Job Row */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => expandJob(job.id)}
              >
                {/* Status badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[job.status] || ''}`}>
                  {job.status}
                </span>

                {/* User */}
                <span className="text-sm min-w-[100px] truncate">
                  {job.profiles?.display_name || job.user_id.slice(0, 8)}
                </span>

                {/* Language */}
                <span className="text-sm text-muted-foreground min-w-[80px]">
                  {job.target_language}
                </span>

                {/* Progress */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: job.words_total > 0
                          ? `${((job.words_completed + job.words_failed) / job.words_total) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {job.words_completed}/{job.words_total}
                    {job.words_failed > 0 && (
                      <span className="text-red-400"> ({job.words_failed} failed)</span>
                    )}
                  </span>
                </div>

                {/* Submitted */}
                <span className="text-xs text-muted-foreground hidden lg:block">
                  {formatTime(job.created_at)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {job.status === 'pending' && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => approveJob(job.id)} title="Approve">
                        <Check className="h-4 w-4 text-green-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => rejectJob(job.id)} title="Reject">
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Expand chevron */}
                {expandedJob === job.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Expanded Detail */}
              {expandedJob === job.id && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-accent/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Job ID: </span>
                      <span className="font-mono text-xs">{job.id.slice(0, 8)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Art style: </span>
                      <span>{job.art_style || 'Auto'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Movie: </span>
                      <span>{job.movie_override || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Profile: </span>
                      <span>{job.profile_used || 'Default'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority: </span>
                      <span>{job.priority}</span>
                    </div>
                    {job.settings_override?.creative_direction && (
                      <div>
                        <span className="text-muted-foreground">Direction: </span>
                        <span>{job.settings_override.creative_direction}</span>
                      </div>
                    )}
                    {job.settings_override?.genre && (
                      <div>
                        <span className="text-muted-foreground">Genre: </span>
                        <span>{job.settings_override.genre}</span>
                      </div>
                    )}
                    {job.started_at && (
                      <div>
                        <span className="text-muted-foreground">Started: </span>
                        <span>{formatTime(job.started_at)}</span>
                      </div>
                    )}
                    {job.completed_at && (
                      <div>
                        <span className="text-muted-foreground">Completed: </span>
                        <span>{formatTime(job.completed_at)}</span>
                      </div>
                    )}
                    {job.started_at && job.completed_at && (
                      <div>
                        <span className="text-muted-foreground">Duration: </span>
                        <span>{Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s</span>
                      </div>
                    )}
                    {job.error_message && (
                      <div className="col-span-full">
                        <span className="text-muted-foreground">Error: </span>
                        <span className="text-red-400">{job.error_message}</span>
                      </div>
                    )}
                  </div>

                  {/* Word list */}
                  {jobWords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Words ({jobWords.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {jobWords.map(w => (
                          <span
                            key={w.id}
                            className={`px-2 py-0.5 rounded text-xs ${
                              w.status === 'complete'
                                ? 'bg-green-500/20 text-green-400'
                                : w.status === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : w.status === 'processing'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-zinc-500/20 text-zinc-400'
                            }`}
                            title={w.translation ? `${w.word} → ${w.translation}` : w.word}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
