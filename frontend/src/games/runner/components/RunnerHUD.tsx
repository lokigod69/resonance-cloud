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
    <div className="pointer-events-auto absolute left-3 right-3 top-[max(0.75rem,var(--app-safe-top))] z-40 flex flex-wrap items-center gap-2 text-[#d0f0ff] sm:left-4 sm:right-4">
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

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={paused ? onResume : onPause}
          disabled={!ready}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--runner-border-strong)] bg-[#0f2337]/72 text-[#d0f0ff] transition hover:bg-[#142d46]/90 hover:shadow-[0_0_18px_rgba(79,195,247,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={paused ? 'Resume' : 'Pause'}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            <Play size={18} />
          ) : (
            <img src="/games/runner/branding/hud-pause.png" alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--runner-border-strong)] bg-[#0f2337]/72 text-[#d0f0ff] transition hover:bg-[#142d46]/90 hover:shadow-[0_0_18px_rgba(79,195,247,0.24)]"
          aria-label="Exit"
          title="Exit"
        >
          <img src="/games/runner/branding/hud-exit.png" alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
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
