import type { SessionStats } from '../engine/types'

type SessionCompleteProps = {
  stats: SessionStats | null
  maxCombo?: number
  onRestart?: () => void
  onExit: () => void
}

export function SessionComplete({ stats, maxCombo, onRestart, onExit }: SessionCompleteProps) {
  if (!stats) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/50 px-4 text-[#d0f0ff] backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-lg border border-[color:var(--accent)] bg-[var(--surface-glass-strong)] p-7 text-center shadow-[var(--runner-shadow-elevated)] backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.18em] text-[#a8d8ea]/70">Session</p>
        <h2 className="font-[var(--runner-font-display)] text-6xl leading-none text-[#d0f0ff] drop-shadow-[0_0_16px_rgba(168,216,234,0.34)]">Complete</h2>
        <div className="my-6 grid grid-cols-2 gap-3">
          <Summary label="Score" value={stats.score} />
          <Summary label="Correct" value={stats.correct} />
          <Summary label="Missed" value={stats.missed + stats.skipped} />
          <Summary label="Max combo" value={maxCombo ?? stats.combo} />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="min-h-11 rounded-lg border border-[color:var(--accent)] bg-[#2a4a6a]/80 px-5 text-white transition hover:bg-[#2a4a6a]"
            >
              Restart
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-lg border border-[var(--runner-border-subtle)] bg-[#0f2337]/62 px-5 text-[#a8d8ea] transition hover:border-[color:var(--accent)] hover:bg-[#142d46]/82"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--runner-border-subtle)] bg-[#a8d8ea]/5 p-4">
      <span className="block text-xs uppercase tracking-[0.14em] text-[#a8d8ea]/70">{label}</span>
      <strong className="mt-1 block font-[var(--runner-font-display)] text-4xl font-semibold text-[#d0f0ff]">{value}</strong>
    </div>
  )
}
