import { useState } from 'react'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

export default function ZenCanvas({
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
      <div className="fixed inset-0 z-40 bg-black text-gray-300 flex flex-col items-center justify-center select-none">
        <h1 className="text-5xl font-extralight tracking-[0.4em] mb-3 text-gray-200">VOID CLEAR</h1>
        <p className="text-gray-500 text-base mb-10 tracking-wide">All words have dissolved into knowing.</p>
        <button
          onClick={onContinue}
          className="px-8 py-3 border border-gray-500 text-gray-300 hover:text-gray-100 hover:border-gray-300 transition-colors uppercase tracking-[0.3em] text-sm rounded"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-black text-gray-400 select-none flex flex-col">
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
          <p className="text-gray-600 mt-12">No words on this page.</p>
        ) : (
          <ul className="w-full max-w-2xl space-y-3">
            {words.map((w) => {
              const isPassed = localPassed.has(w.id)
              return (
                <li
                  key={w.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-opacity ${
                    isPassed
                      ? 'border-gray-700 opacity-40'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span className="truncate text-lg font-light tracking-wide">{w.word}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handlePass(w.id)}
                      disabled={isPassed}
                      className="w-10 h-10 flex items-center justify-center rounded border border-gray-500 text-gray-200 hover:bg-gray-900 disabled:cursor-not-allowed"
                      aria-label="Remembered"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onFail(w.id)}
                      disabled={isPassed}
                      className="w-10 h-10 flex items-center justify-center rounded border border-gray-700 text-gray-400 hover:bg-gray-900 disabled:cursor-not-allowed"
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
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-gray-800">
      <button
        onClick={onExit}
        className="px-3 py-1.5 text-xs uppercase tracking-widest border border-gray-600 text-gray-300 hover:bg-gray-900 rounded"
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
                ? 'border-gray-300 bg-gray-200/10 text-gray-100 cursor-default'
                : 'border-gray-700 text-gray-500 hover:text-gray-200 hover:border-gray-400'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleImages}
          className="w-10 h-8 flex items-center justify-center text-xs border border-gray-600 text-gray-300 hover:bg-gray-900 rounded"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? 'Aa' : 'Img'}
        </button>
        {totalPages > 1 && (
          <span className="text-xs text-gray-500 px-2">
            Page {currentPage + 1} of {totalPages}
          </span>
        )}
        <button
          onClick={onPrevPage}
          disabled={currentPage === 0}
          className="w-8 h-8 flex items-center justify-center text-xs border border-gray-600 text-gray-300 hover:bg-gray-900 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages - 1}
          className="w-8 h-8 flex items-center justify-center text-xs border border-gray-600 text-gray-300 hover:bg-gray-900 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}
