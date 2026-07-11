export type SlicerSessionResult = {
  correct: number
  wrong: number
}

type SessionCompleteProps = {
  result: SlicerSessionResult | null
  onExit: () => void
  // Due-mode sessions exit toward home rather than the picker.
  exitLabel?: string
}

export function SessionComplete({ result, onExit, exitLabel }: SessionCompleteProps) {
  if (!result) return null

  const total = result.correct + result.wrong
  const accuracyLabel = total === 0 ? '—' : `${Math.round((result.correct / total) * 100)}%`

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/60 px-4 text-[#fff1d0] backdrop-blur-md">
      <div className="w-full max-w-xl rounded-lg border border-[rgba(255,107,53,0.34)] bg-black/85 p-7 text-center shadow-[0_0_100px_rgba(255,69,0,0.15)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff9155]/70">Session</p>
        <h2 className="font-serif text-5xl leading-none text-[#ffd700]">Complete</h2>
        <div className="my-6 grid grid-cols-3 gap-3">
          <Summary label="Correct" value={String(result.correct)} />
          <Summary label="Wrong" value={String(result.wrong)} />
          <Summary label="Accuracy" value={accuracyLabel} />
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-lg border border-[rgba(255,107,53,0.34)] bg-[#ff6b35]/15 px-6 text-[#ffd700] transition hover:bg-[#ff6b35]/25"
          >
            {exitLabel ?? 'Exit to decks'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(255,107,53,0.2)] bg-[#ff6b35]/10 p-4">
      <span className="block text-xs uppercase tracking-[0.14em] text-[#ffd2a5]/70">{label}</span>
      <strong className="mt-1 block font-serif text-3xl font-semibold">{value}</strong>
    </div>
  )
}
