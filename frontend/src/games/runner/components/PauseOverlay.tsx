import { Play } from 'lucide-react'

type PauseOverlayProps = {
  open: boolean
  onResume: () => void
  onExit: () => void
}

export function PauseOverlay({ open, onResume, onExit }: PauseOverlayProps) {
  if (!open) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/50 px-4 text-[#d0f0ff] backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[color:var(--accent)] bg-[var(--surface-glass)] p-7 text-center shadow-[var(--runner-shadow-elevated)] backdrop-blur-md">
        <h2 className="font-[var(--runner-font-display)] text-6xl leading-none text-[#d0f0ff] drop-shadow-[0_0_16px_rgba(168,216,234,0.34)]">Paused</h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[color:var(--accent)] bg-[#2a4a6a]/80 px-5 text-white transition hover:bg-[#2a4a6a]"
          >
            <Play size={17} />
            Resume
          </button>
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
