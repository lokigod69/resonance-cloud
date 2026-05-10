import type { SessionStats } from '../engine/types'

type SessionCompleteProps = {
  stats: SessionStats | null
  onRestart: () => void
  onExit: () => void
}

export function SessionComplete({ stats, onRestart, onExit }: SessionCompleteProps) {
  if (!stats) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/60 px-4 text-[#fff1d0] backdrop-blur-md">
      <div className="w-full max-w-xl rounded-lg border border-[rgba(255,107,53,0.34)] bg-black/85 p-7 text-center shadow-[0_0_100px_rgba(255,69,0,0.15)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff9155]/70">Session</p>
        <h2 className="font-serif text-5xl leading-none text-[#ffd700]">Complete</h2>
        <div className="my-6 grid grid-cols-2 gap-3">
          <Summary label="Score" value={stats.score} />
          <Summary label="Correct" value={stats.correct} />
          <Summary label="Missed" value={stats.missed + stats.skipped} />
          <Summary label="Max combo" value={stats.maxCombo} />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.34)] bg-[#ff6b35]/15 px-5 text-[#ffd700] transition hover:bg-[#ff6b35]/25"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/30 px-5 text-[#fff1d0] transition hover:bg-white/10"
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
    <div className="rounded-lg border border-[rgba(255,107,53,0.2)] bg-[#ff6b35]/10 p-4">
      <span className="block text-xs uppercase tracking-[0.14em] text-[#ffd2a5]/70">{label}</span>
      <strong className="mt-1 block font-serif text-3xl font-semibold">{value}</strong>
    </div>
  )
}

