import { Play } from 'lucide-react'

type PauseOverlayProps = {
  open: boolean
  onResume: () => void
  onExit: () => void
}

export function PauseOverlay({ open, onResume, onExit }: PauseOverlayProps) {
  if (!open) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/55 px-4 text-[#fff1d0] backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-[rgba(255,107,53,0.34)] bg-black/80 p-7 text-center shadow-[0_0_100px_rgba(255,69,0,0.15)]">
        <h2 className="font-serif text-5xl leading-none">Paused</h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(255,107,53,0.34)] bg-[#ff6b35]/15 px-5 text-[#ffd700] transition hover:bg-[#ff6b35]/25"
          >
            <Play size={17} />
            Resume
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

