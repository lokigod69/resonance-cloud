// Polls the deck-scoped queue position RPC for the current learner.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type QueueJobStatus = 'pending' | 'approved' | 'processing' | 'complete' | 'partial' | 'failed' | 'rejected' | null

export type QueuePositionState = {
  jobId: string | null
  jobStatus: QueueJobStatus
  jobsAhead: number | null
  queuePaused: boolean
}

const ACTIVE_QUEUE_STATUSES = new Set<QueueJobStatus>(['pending', 'approved'])
const TERMINAL_STATUSES = new Set<QueueJobStatus>(['complete', 'partial', 'failed', 'rejected'])
const POLL_INTERVAL_MS = 10_000
const MISSING_JOB_GRACE_MS = 30_000

const INITIAL_STATE: QueuePositionState = {
  jobId: null,
  jobStatus: null,
  jobsAhead: null,
  queuePaused: false,
}

type RpcRow = {
  job_id: string
  job_status: Exclude<QueueJobStatus, null>
  jobs_ahead: number
  queue_paused: boolean
}

type UseQueuePositionOptions = {
  enabled?: boolean
}

type FetchQueuePositionResult = {
  state: QueuePositionState
  keepPolling: boolean
}

export function useQueuePosition(deckId?: string, options?: UseQueuePositionOptions) {
  const enabled = options?.enabled ?? true
  const [state, setState] = useState<QueuePositionState>(INITIAL_STATE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const missingSinceRef = useRef<number | null>(null)
  const stateRef = useRef(INITIAL_STATE)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const fetchQueuePosition = useCallback(async (): Promise<FetchQueuePositionResult | null> => {
    if (!deckId || !enabled) {
      missingSinceRef.current = null
      setHasChecked(false)
      return { state: INITIAL_STATE, keepPolling: false }
    }

    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_my_queue_position', { p_deck_id: deckId })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return {
        state: stateRef.current,
        keepPolling: true,
      }
    }

    const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null | undefined
    setHasChecked(true)

    if (!row) {
      const now = Date.now()
      if (missingSinceRef.current === null) {
        missingSinceRef.current = now
      }

      const keepPolling = now - missingSinceRef.current < MISSING_JOB_GRACE_MS

      if (!keepPolling) {
        setState(INITIAL_STATE)
      }

      setError(null)
      setLoading(false)
      return { state: INITIAL_STATE, keepPolling }
    }

    missingSinceRef.current = null

    const nextState: QueuePositionState = {
      jobId: row.job_id,
      jobStatus: row.job_status,
      jobsAhead: row.jobs_ahead,
      queuePaused: row.queue_paused,
    }

    setState(nextState)
    setError(null)
    setLoading(false)
    return {
      state: nextState,
      keepPolling: ACTIVE_QUEUE_STATUSES.has(nextState.jobStatus),
    }
  }, [deckId, enabled])

  useEffect(() => {
    if (!deckId || !enabled) {
      missingSinceRef.current = null
      return
    }

    let cancelled = false
    let intervalId: number | null = null
    const clearPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    const tick = async () => {
      const nextResult = await fetchQueuePosition()
      if (cancelled) return
      if (!nextResult?.keepPolling) {
        clearPolling()
      }
    }

    const startPolling = async () => {
      clearPolling()

      if (document.visibilityState === 'hidden') {
        return
      }

      const initialResult = await fetchQueuePosition()
      if (cancelled) return

      if (initialResult?.keepPolling) {
        intervalId = window.setInterval(() => {
          void tick()
        }, POLL_INTERVAL_MS)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearPolling()
        return
      }

      void startPolling()
    }

    void startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearPolling()
    }
  }, [deckId, enabled, fetchQueuePosition])

  const effectiveState = deckId && enabled ? state : INITIAL_STATE
  const effectiveLoading = deckId && enabled ? loading : false
  const effectiveError = deckId && enabled ? error : null
  const effectiveHasChecked = deckId && enabled ? hasChecked : false

  const shouldShowQueue = useMemo(
    () => ACTIVE_QUEUE_STATUSES.has(effectiveState.jobStatus),
    [effectiveState.jobStatus]
  )

  const isTerminal = useMemo(
    () => TERMINAL_STATUSES.has(effectiveState.jobStatus),
    [effectiveState.jobStatus]
  )

  return {
    ...effectiveState,
    loading: effectiveLoading,
    error: effectiveError,
    hasChecked: effectiveHasChecked,
    shouldShowQueue,
    isTerminal,
    refetch: fetchQueuePosition,
  }
}
