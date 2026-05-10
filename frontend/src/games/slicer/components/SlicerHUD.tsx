import { DoorOpen, Pause, Play } from 'lucide-react'

type SlicerHUDProps = {
  deckTitle: string
  roundNumber: number
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

export function SlicerHUD({
  deckTitle,
  roundNumber,
  cardProgress,
  score,
  combo,
  lives,
  paused,
  ready,
  onPause,
  onResume,
  onExit,
}: SlicerHUDProps) {
  const lifeDots = Array.from({ length: 3 }, (_, index) => index < lives)

  return (
    <div className="pointer-events-auto absolute left-3 right-3 top-[max(0.75rem,var(--app-safe-top))] z-40 flex flex-wrap items-center gap-2 text-[#fff1d0] sm:left-4 sm:right-4">
      <div className="min-h-11 min-w-36 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 px-3 py-2 shadow-[0_16px_50px_rgba(26,10,0,0.36)] backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Deck</div>
        <div className="max-w-52 truncate font-serif text-lg leading-5">{deckTitle}</div>
      </div>

      <div className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Round</div>
        <div className="font-serif text-lg leading-5">{roundNumber} / 10</div>
      </div>

      <div className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Card</div>
        <div className="font-serif text-lg leading-5">{cardProgress}</div>
      </div>

      <div className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Score</div>
        <div className="font-serif text-lg leading-5">{score}</div>
      </div>

      <div className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Combo</div>
        <div className="font-serif text-lg leading-5 text-[#ffd700]">{combo}</div>
      </div>

      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md">
        {lifeDots.map((active, index) => (
          <span
            key={index}
            className={`block h-4 w-4 rounded-full ${active ? 'bg-[#ff6b35] shadow-[0_0_16px_rgba(255,69,0,0.58)]' : 'bg-stone-700 opacity-60'}`}
          />
        ))}
      </div>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={paused ? onResume : onPause}
          disabled={!ready}
          className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(255,107,53,0.34)] bg-black/40 text-[#ffd700] transition hover:bg-[#ff6b35]/20 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={paused ? 'Resume' : 'Pause'}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(255,107,53,0.34)] bg-black/40 text-[#ffd700] transition hover:bg-[#ff6b35]/20"
          aria-label="Exit"
          title="Exit"
        >
          <DoorOpen size={18} />
        </button>
      </div>
    </div>
  )
}

