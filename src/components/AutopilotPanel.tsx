import { useState, useEffect, useRef } from 'react'
import { Play, Square, X, Loader, AlertCircle } from 'lucide-react'
import { startAutopilot, cancelAutopilot, resumeAutopilot, getAutopilotStatus, type AutopilotStatus } from '../api'
import type { WordSummary } from '../api'

interface AutopilotPanelProps {
  words: WordSummary[]
  onClose: () => void
  onStatusChange: (status: AutopilotStatus) => void
}

export function AutopilotPanel({ words, onClose, onStatusChange }: AutopilotPanelProps) {
  const [status, setStatus] = useState<AutopilotStatus | null>(null)
  const [selectedWords] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)
  const [pauseAtSong, setPauseAtSong] = useState(false)
  const [starting, setStarting] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await getAutopilotStatus()
        setStatus(s)
        onStatusChange(s)
        if (!s.running) {
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {}
    }
    poll()
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [status?.progress])

  const startPolling = () => {
    pollingRef.current = setInterval(async () => {
      try {
        const s = await getAutopilotStatus()
        setStatus(s)
        onStatusChange(s)
        if (!s.running) {
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {}
    }, 1500)
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      const slugs = selectAll ? undefined : selectedWords
      await startAutopilot(slugs, pauseAtSong)
      startPolling()
    } catch (e: any) {
      alert(e.message)
    }
    setStarting(false)
  }

  const handleCancel = async () => {
    await cancelAutopilot()
  }

  const handleResume = async () => {
    await resumeAutopilot()
  }

  const isRunning = status?.running

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-t-lg w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Autopilot</h2>
            {isRunning && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--warning)]">
                <Loader size={11} className="animate-spin" />
                Running — {status.done}/{status.total} words
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Controls */}
          {!isRunning && (() => {
            const mutedCount = words.filter(w => w.muted).length
            const activeCount = words.length - mutedCount
            const allMuted = mutedCount === words.length && words.length > 0

            return (
              <div className="space-y-2">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={e => setSelectAll(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    {mutedCount > 0
                      ? `${words.length} words (${mutedCount} muted — ${activeCount} will run)`
                      : `All words (${words.length})`}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pauseAtSong}
                      onChange={e => setPauseAtSong(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    Pause at Song selection
                  </label>
                </div>
                {allMuted && (
                  <div className="text-xs text-[var(--warning)] flex items-center gap-1">
                    <AlertCircle size={12} />
                    All words are muted — unmute some words before running.
                  </div>
                )}
              </div>
            )
          })()}

          {/* Progress bar */}
          {status && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{status.current_word ? `${status.current_word} / ${status.current_stage}` : 'Idle'}</span>
                <span>{status.done}/{status.total}</span>
              </div>
              <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: `${status.total > 0 ? (status.done / status.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Pause for song selection */}
          {status?.paused_for_song_selection && (
            <div className="flex items-center justify-between p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded">
              <span className="text-sm text-[var(--warning)]">
                Paused — select a song take for <strong>{status.paused_word}</strong>
              </span>
              <button
                onClick={handleResume}
                className="px-3 py-1.5 text-xs bg-[var(--warning)] text-black rounded font-medium"
              >
                Resume
              </button>
            </div>
          )}

          {/* Log */}
          <div
            ref={logRef}
            className="bg-[var(--bg-base)] border border-[var(--border)] rounded p-3 h-36 overflow-y-auto font-mono text-xs text-[var(--text-muted)] space-y-0.5"
          >
            {status?.progress?.length === 0 && <span className="text-[var(--text-muted)]">No output yet...</span>}
            {status?.progress?.map((line, i) => (
              <div key={i} className={line.includes('✗') ? 'text-[var(--error)]' : line.includes('✓') ? 'text-[var(--success)]' : ''}>
                {line}
              </div>
            ))}
          </div>

          {/* Errors */}
          {status?.errors?.length ? (
            <div className="text-xs text-[var(--error)] space-y-0.5">
              {status.errors.map((e, i) => (
                <div key={i} className="flex items-center gap-1">
                  <AlertCircle size={10} /> {e}
                </div>
              ))}
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={starting || (words.length > 0 && words.every(w => w.muted))}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {starting ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                Run All Words
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--error)]/20 border border-[var(--error)]/30 text-[var(--error)] rounded text-sm font-medium hover:bg-[var(--error)]/30 transition-colors"
              >
                <Square size={14} /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
