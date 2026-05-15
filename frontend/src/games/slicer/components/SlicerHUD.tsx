import { Play } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

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
  const { t } = useTranslation()
  const lifeDots = Array.from({ length: 3 }, (_, index) => index < lives)
  const pauseLabel = paused ? t('slicer.hud.resume') : t('slicer.hud.pause')
  const exitLabel = t('slicer.hud.exit')

  return (
    <div className="pointer-events-auto absolute left-3 right-3 top-[max(0.75rem,var(--app-safe-top))] z-40 flex flex-wrap items-center gap-1.5 text-[#fff1d0] sm:left-4 sm:right-4 sm:gap-2">
      {/* Mobile collapsed deck/round/card chip */}
      <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-2.5 py-1.5 backdrop-blur-md sm:hidden">
        <div className="flex min-w-0 items-center gap-1 font-serif text-sm leading-tight">
          <span className="min-w-0 truncate">{deckTitle}</span>
          <span className="shrink-0 text-[#ff9155]/60">·</span>
          <span className="shrink-0" aria-label={`Round ${roundNumber} of 10`}>R{roundNumber}</span>
          <span className="shrink-0 text-[#ff9155]/60">·</span>
          <span className="shrink-0" aria-label={`Card ${cardProgress}`}>{cardProgress}</span>
        </div>
      </div>

      {/* Desktop deck chip */}
      <div className="hidden min-h-11 min-w-36 rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/35 px-3 py-2 shadow-[0_16px_50px_rgba(26,10,0,0.36)] backdrop-blur-md sm:block">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Deck</div>
        <div className="max-w-52 truncate font-serif text-lg leading-5">{deckTitle}</div>
      </div>

      {/* Desktop round chip */}
      <div className="hidden min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md sm:block">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Round</div>
        <div className="font-serif text-lg leading-5">{roundNumber} / 10</div>
      </div>

      {/* Desktop card chip */}
      <div className="hidden min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md sm:block">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Card</div>
        <div className="font-serif text-lg leading-5">{cardProgress}</div>
      </div>

      {/* Mobile combined score+combo */}
      <div
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-2.5 py-1.5 font-serif text-base leading-tight backdrop-blur-md sm:hidden"
        aria-label={`Score ${score}, Combo ${combo}`}
      >
        <span>{score}</span>
        <span className="text-[#ffd700]">×{combo}</span>
      </div>

      {/* Desktop score chip */}
      <div className="hidden min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md sm:block">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Score</div>
        <div className="font-serif text-lg leading-5">{score}</div>
      </div>

      {/* Desktop combo chip */}
      <div className="hidden min-h-11 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-3 py-2 backdrop-blur-md sm:block">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#ff9155]/70">Combo</div>
        <div className="font-serif text-lg leading-5 text-[#ffd700]">{combo}</div>
      </div>

      {/* Lives - compact on mobile, full on desktop */}
      <div
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-[rgba(255,107,53,0.2)] bg-black/35 px-2 py-1 backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2"
        aria-label={`${lives} lives remaining`}
      >
        {lifeDots.map((active, index) => (
          <img
            key={index}
            src={active ? '/games/slicer/branding/life-filled.png' : '/games/slicer/branding/life-dimmed.png'}
            alt=""
            aria-hidden="true"
            className="h-5 w-5 object-contain sm:h-6 sm:w-6"
          />
        ))}
      </div>

      <div className="ml-auto flex shrink-0 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={paused ? onResume : onPause}
          disabled={!ready}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-[rgba(255,107,53,0.34)] bg-black/40 text-[#ffd700] transition hover:bg-[#ff6b35]/20 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={pauseLabel}
          title={pauseLabel}
        >
          {paused ? (
            <Play size={18} />
          ) : (
            <img src="/games/slicer/branding/hud-pause.png" alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
          )}
          <span className="mt-0.5 text-[10px] leading-none">{pauseLabel}</span>
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-[rgba(255,107,53,0.34)] bg-black/40 text-[#ffd700] transition hover:bg-[#ff6b35]/20"
          aria-label={exitLabel}
          title={exitLabel}
        >
          <img src="/games/slicer/branding/hud-exit.png" alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
          <span className="mt-0.5 text-[10px] leading-none">{exitLabel}</span>
        </button>
      </div>
    </div>
  )
}
