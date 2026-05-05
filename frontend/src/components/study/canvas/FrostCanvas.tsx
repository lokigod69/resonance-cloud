import { useState } from 'react'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

export default function FrostCanvas({
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
      <div className="fixed inset-0 z-40 bg-slate-900 text-slate-100 flex flex-col items-center justify-center select-none">
        <h1 className="text-5xl font-light tracking-[0.3em] mb-3 text-sky-200">WINDOW CLEAR</h1>
        <p className="text-sky-300/70 text-base mb-10">Every word now perfectly visible.</p>
        <button
          onClick={onContinue}
          className="px-8 py-3 border border-sky-400/50 text-sky-200 hover:bg-sky-900/40 hover:border-sky-300 transition-colors uppercase tracking-widest text-sm rounded"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900 text-slate-100 select-none flex flex-col">
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
          <p className="text-sky-300/60 mt-12">No words on this page.</p>
        ) : (
          <ul className="w-full max-w-2xl space-y-3">
            {words.map((w) => {
              const isPassed = localPassed.has(w.id)
              return (
                <li
                  key={w.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-opacity ${
                    isPassed
                      ? 'border-sky-400/20 opacity-40'
                      : 'border-sky-400/40 hover:border-sky-300/70'
                  }`}
                >
                  <span className="truncate text-lg">{w.word}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handlePass(w.id)}
                      disabled={isPassed}
                      className="w-10 h-10 flex items-center justify-center rounded border border-sky-300/60 text-sky-200 hover:bg-sky-900/40 disabled:cursor-not-allowed"
                      aria-label="Remembered"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onFail(w.id)}
                      disabled={isPassed}
                      className="w-10 h-10 flex items-center justify-center rounded border border-rose-400/60 text-rose-300 hover:bg-rose-900/30 disabled:cursor-not-allowed"
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
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-sky-400/20">
      <button
        onClick={onExit}
        className="px-3 py-1.5 text-xs uppercase tracking-widest border border-sky-400/40 rounded text-sky-200 hover:bg-sky-900/40"
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
                ? 'border-sky-200 bg-sky-200/10 text-sky-100 cursor-default'
                : 'border-sky-400/30 text-sky-300/70 hover:text-sky-100 hover:border-sky-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleImages}
          className="w-10 h-8 flex items-center justify-center text-xs border border-sky-400/40 rounded text-sky-200 hover:bg-sky-900/40"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? 'Aa' : 'Img'}
        </button>
        {totalPages > 1 && (
          <span className="text-xs text-sky-300/70 px-2">
            Page {currentPage + 1} of {totalPages}
          </span>
        )}
        <button
          onClick={onPrevPage}
          disabled={currentPage === 0}
          className="w-8 h-8 flex items-center justify-center text-xs border border-sky-400/40 rounded text-sky-200 hover:bg-sky-900/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages - 1}
          className="w-8 h-8 flex items-center justify-center text-xs border border-sky-400/40 rounded text-sky-200 hover:bg-sky-900/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}
