import { useState } from 'react'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

export default function EmberCanvas({
  words,
  showImages,
  sessionComplete,
  currentPage,
  totalPages,
  activeMode,
  onPass,
  onFail,
  onPrevPage,
  onNextPage,
  onSwitchMode,
  onToggleImages,
  onExit,
  onContinue,
}: CanvasModeProps) {
  // Local mirror of which cards on this page have been passed, so the row
  // greys out immediately. Resets automatically because the shell remounts
  // this component on page / mode / shuffle change via the `key` prop.
  const [localPassed, setLocalPassed] = useState<Set<string>>(new Set())

  const handlePass = (id: string) => {
    onPass(id)
    setLocalPassed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  if (sessionComplete) {
    return (
      <div className="fixed inset-0 z-40 bg-orange-950 text-orange-100 flex flex-col items-center justify-center select-none">
        <h1 className="text-5xl font-light tracking-[0.3em] mb-3">GARDEN COMPLETE</h1>
        <p className="text-orange-300/70 text-base mb-10">All embers now burn eternal.</p>
        <button
          onClick={onContinue}
          className="px-8 py-3 border border-orange-400/50 text-orange-200 hover:bg-orange-900/50 hover:border-orange-300 transition-colors uppercase tracking-widest text-sm rounded"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-orange-950 text-orange-100 select-none flex flex-col">
      <Toolbar
        activeMode={activeMode}
        showImages={showImages}
        currentPage={currentPage}
        totalPages={totalPages}
        onSwitchMode={onSwitchMode}
        onToggleImages={onToggleImages}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onExit={onExit}
      />

      <main className="flex-1 overflow-y-auto px-6 pt-20 pb-8 flex flex-col items-center">
        {words.length === 0 ? (
          <p className="text-orange-300/60 mt-12">No words on this page.</p>
        ) : (
          <ul className="w-full max-w-2xl space-y-3">
            {words.map((w) => {
              const isPassed = localPassed.has(w.id)
              return (
                <li
                  key={w.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-opacity ${
                    isPassed
                      ? 'border-orange-400/20 opacity-40'
                      : 'border-orange-400/40 hover:border-orange-300/70'
                  }`}
                >
                  <span className="truncate text-lg">{w.word}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handlePass(w.id)}
                      disabled={isPassed}
                      className="w-10 h-10 flex items-center justify-center rounded border border-orange-300/60 text-orange-200 hover:bg-orange-900/40 disabled:cursor-not-allowed"
                      aria-label="Remembered"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onFail(w.id)}
                      disabled={isPassed}
                      className="w-10 h-10 flex items-center justify-center rounded border border-red-400/60 text-red-300 hover:bg-red-900/30 disabled:cursor-not-allowed"
                      aria-label="Review later"
                    >
                      ✗
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

interface ToolbarProps {
  activeMode: CanvasMode
  showImages: boolean
  currentPage: number
  totalPages: number
  onSwitchMode: (mode: CanvasMode) => void
  onToggleImages: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onExit: () => void
}

function Toolbar({
  activeMode,
  showImages,
  currentPage,
  totalPages,
  onSwitchMode,
  onToggleImages,
  onPrevPage,
  onNextPage,
  onExit,
}: ToolbarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-orange-950/80 backdrop-blur-sm border-b border-orange-400/20">
      <button
        onClick={onExit}
        className="px-3 py-1.5 text-xs uppercase tracking-widest border border-orange-400/40 rounded text-orange-200 hover:bg-orange-900/40"
      >
        Exit
      </button>
      <div className="flex gap-1">
        {CANVAS_MODES.map((m) => (
          <button
            key={m}
            onClick={() => onSwitchMode(m)}
            disabled={m === activeMode}
            className={`px-3 py-1.5 text-xs uppercase tracking-widest rounded border transition-colors ${
              m === activeMode
                ? 'border-orange-200 bg-orange-200/10 text-orange-100 cursor-default'
                : 'border-orange-400/30 text-orange-300/70 hover:text-orange-100 hover:border-orange-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleImages}
          className="w-10 h-8 flex items-center justify-center text-xs border border-orange-400/40 rounded text-orange-200 hover:bg-orange-900/40"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? 'Aa' : 'Img'}
        </button>
        {totalPages > 1 && (
          <span className="text-xs text-orange-300/70 px-2">
            Page {currentPage + 1} of {totalPages}
          </span>
        )}
        <button
          onClick={onPrevPage}
          disabled={currentPage === 0}
          className="w-8 h-8 flex items-center justify-center text-xs border border-orange-400/40 rounded text-orange-200 hover:bg-orange-900/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages - 1}
          className="w-8 h-8 flex items-center justify-center text-xs border border-orange-400/40 rounded text-orange-200 hover:bg-orange-900/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}
