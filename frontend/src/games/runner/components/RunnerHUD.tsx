import { Play } from 'lucide-react'

type RunnerHUDProps = {
  deckTitle: string
  levelNumber: number
  cardProgress: string
  score: number
  combo: number
  lives: number
  paused: boolean
  ready: boolean
  onPause: () => void
  onResume: () => void
  onExit: () => void
}

export function RunnerHUD({
  deckTitle,
  levelNumber,
  cardProgress,
  score,
  combo,
  lives,
  paused,
  ready,
  onPause,
  onResume,
  onExit,
}: RunnerHUDProps) {
  const lifeDots = Array.from({ length: 3 }, (_, index) => index < lives)

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-[max(0.75rem,var(--app-safe-top))] z-50 text-[#d0f0ff] sm:left-4 sm:right-4">
      <div className="flex max-w-[calc(100%-8.5rem)] flex-wrap items-center gap-2">
        <HudPanel label="Deck" value={deckTitle} wide />
        <HudPanel label="Level" value={`${levelNumber} / 10`} />
        <HudPanel label="Card" value={cardProgress} />
        <HudPanel label="Score" value={score} />
        <HudPanel label="Combo" value={combo} accent />

        <div
          className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--runner-border-subtle)] bg-[var(--surface-glass)] px-3 py-2 shadow-[var(--runner-shadow-soft)] backdrop-blur-md"
          aria-label={`${lives} lives remaining`}
        >
          {lifeDots.map((active, index) => (
            <img
              key={index}
              src={active ? '/games/runner/branding/life-filled.png' : '/games/runner/branding/life-dimmed.png'}
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-auto absolute right-0 top-0 flex gap-2">
        <button
          type="button"
          onClick={paused ? onResume : onPause}
          disabled={!ready}
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-[rgba(208,240,255,0.82)] bg-[#06131f]/95 text-[#d0f0ff] shadow-[0_0_28px_rgba(79,195,247,0.38),inset_0_0_16px_rgba(168,216,234,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-[#183a58] hover:shadow-[0_0_34px_rgba(79,195,247,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:w-16"
          aria-label={paused ? 'Resume' : 'Pause'}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            <Play size={18} />
          ) : (
            <img src="/games/runner/branding/hud-pause.png" alt="" className="h-10 w-10 object-contain sm:h-11 sm:w-11" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-[rgba(208,240,255,0.82)] bg-[#06131f]/95 text-[#d0f0ff] shadow-[0_0_28px_rgba(79,195,247,0.38),inset_0_0_16px_rgba(168,216,234,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-[#183a58] hover:shadow-[0_0_34px_rgba(79,195,247,0.5)] active:scale-95 sm:h-16 sm:w-16"
          aria-label="Back to deck picker"
          title="Back to deck picker"
        >
          <img src="/games/runner/branding/hud-exit.png" alt="" className="h-10 w-10 object-contain sm:h-11 sm:w-11" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function HudPanel({ label, value, accent, wide }: { label: string; value: string | number; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`${wide ? 'min-w-36' : ''} min-h-11 rounded-lg border border-[var(--runner-border-subtle)] bg-[var(--surface-glass)] px-3 py-2 shadow-[var(--runner-shadow-soft)] backdrop-blur-md`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#a8d8ea]/70">{label}</div>
      <div className={`${wide ? 'max-w-52 truncate' : ''} font-[var(--runner-font-display)] text-xl leading-5 ${accent ? 'text-[#d0f0ff]' : 'text-[#d0f0ff]'}`}>{value}</div>
    </div>
  )
}
