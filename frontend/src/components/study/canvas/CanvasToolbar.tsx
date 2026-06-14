import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { DoorOpen } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'
import type { CanvasToolbarTheme } from './canvasToolbarThemes'

// One toolbar for every canvas mode. The geometry (heights, order, spacing,
// radii) is identical across modes so switching modes never shifts the header;
// only the palette changes (see canvasToolbarThemes.ts), injected as CSS vars.

export interface CanvasToolbarProps {
  toolbarRef: RefObject<HTMLDivElement | null>
  theme: CanvasToolbarTheme
  activeMode: CanvasMode
  showImages: boolean
  direction: CanvasModeProps['direction']
  autoReveal: CanvasModeProps['autoReveal']
  languagePair: CanvasModeProps['languagePair']
  canToggleDirection: boolean
  canToggleImages: boolean
  currentPage: number
  totalPages: number
  masteredCount: number
  totalWords: number
  onSwitchMode: (mode: CanvasMode) => void
  onToggleImages: () => void
  onToggleDirection: () => void
  onToggleAutoReveal: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onExit: () => void
}

const CONTROL_BASE =
  'h-9 shrink-0 rounded-lg border bg-[var(--ctb-pill-bg)] text-xs uppercase tracking-widest transition-colors'
const CONTROL_IDLE =
  'text-[var(--ctb-dim)] border-[var(--ctb-border)] hover:text-[var(--ctb-accent)] hover:border-[var(--ctb-accent)]'
const CONTROL_ACTIVE = 'text-[var(--ctb-accent)] border-[var(--ctb-accent)] cursor-default'

function stop(event: ReactMouseEvent, action: () => void) {
  event.stopPropagation()
  action()
}

export function CanvasToolbar({
  toolbarRef,
  theme,
  activeMode,
  showImages,
  direction,
  autoReveal,
  languagePair,
  canToggleDirection,
  canToggleImages,
  currentPage,
  totalPages,
  masteredCount,
  totalWords,
  onSwitchMode,
  onToggleImages,
  onToggleDirection,
  onToggleAutoReveal,
  onPrevPage,
  onNextPage,
  onExit,
}: CanvasToolbarProps) {
  const { t } = useTranslation()
  const exitLabel = t('study.canvas.exit')
  const visibleCode = direction === 'target-visible' ? languagePair.targetCode : languagePair.baseCode
  const hiddenCode = direction === 'target-visible' ? languagePair.baseCode : languagePair.targetCode

  const vars = {
    '--ctb-accent': theme.accent,
    '--ctb-dim': theme.dim,
    '--ctb-border': theme.border,
    '--ctb-pill-bg': theme.pillBg,
  } as CSSProperties

  // Top padding respects the iOS notch; right-anchored Exit is the primary egress.
  return (
    <div
      ref={toolbarRef}
      data-toolbar
      className={`sticky top-0 md:absolute md:top-0 left-0 right-0 z-40 flex items-start gap-2 pb-2 sm:gap-3 sm:pb-3 border-b ${theme.fontClass ?? ''}`}
      style={{
        ...vars,
        background: theme.barBg,
        borderBottomColor: theme.barBorder,
        paddingTop: 'max(0.5rem, calc(env(safe-area-inset-top, 0px) + 0.25rem))',
        paddingLeft: 'max(0.75rem, calc(env(safe-area-inset-left, 0px) + 0.75rem))',
        paddingRight: 'max(0.75rem, calc(env(safe-area-inset-right, 0px) + 0.75rem))',
      }}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
        {/* Mode pills: one horizontal strip that scrolls instead of wrapping,
            so five modes stay on a single stable row on phones. */}
        <div className="flex max-w-full flex-nowrap gap-1 overflow-x-auto pg-scrollbar-hide">
          {CANVAS_MODES.map((mode) => (
            <button
              key={mode}
              onClick={(event) => stop(event, () => onSwitchMode(mode))}
              disabled={mode === activeMode}
              className={`${CONTROL_BASE} px-3 ${mode === activeMode ? CONTROL_ACTIVE : CONTROL_IDLE}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
          {canToggleDirection && (
            <button
              onClick={(event) => stop(event, onToggleDirection)}
              className={`${CONTROL_BASE} px-3 ${CONTROL_IDLE}`}
              title={t('study.canvas.swapPromptAnswer')}
            >
              <span className="text-[var(--ctb-accent)]">{visibleCode}</span>
              <span className="mx-1 text-[var(--ctb-dim)]">→</span>
              <span>{hiddenCode}</span>
            </button>
          )}

          <label
            className={`${CONTROL_BASE} px-3 inline-flex cursor-pointer items-center gap-2 ${CONTROL_IDLE}`}
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={autoReveal === 'off'}
              onChange={onToggleAutoReveal}
              style={{ accentColor: theme.accent }}
            />
            {t('study.canvas.hideAnswer')}
          </label>

          {canToggleImages && (
            <button
              onClick={(event) => stop(event, onToggleImages)}
              className={`${CONTROL_BASE} px-3 ${CONTROL_IDLE}`}
              title={showImages ? t('study.canvas.showText') : t('study.canvas.showImages')}
            >
              {showImages ? 'Aa' : 'Img'}
            </button>
          )}

          {totalWords > 0 && (
            <span className="whitespace-nowrap px-1 text-xs tracking-widest text-[var(--ctb-dim)]">
              {masteredCount}/{totalWords}
            </span>
          )}

          {totalPages > 1 && (
            <>
              <span className="whitespace-nowrap px-1 text-xs tracking-widest text-[var(--ctb-dim)]">
                {t('study.canvas.pageOf', { current: currentPage + 1, total: totalPages })}
              </span>
              <button
                onClick={(event) => stop(event, onPrevPage)}
                disabled={currentPage === 0}
                className={`${CONTROL_BASE} w-9 ${CONTROL_IDLE} disabled:cursor-not-allowed disabled:opacity-30`}
                aria-label={t('study.canvas.previousPage')}
              >
                ‹
              </button>
              <button
                onClick={(event) => stop(event, onNextPage)}
                disabled={currentPage >= totalPages - 1}
                className={`${CONTROL_BASE} w-9 ${CONTROL_IDLE} disabled:cursor-not-allowed disabled:opacity-30`}
                aria-label={t('study.canvas.nextPage')}
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => stop(event, onExit)}
        aria-label={exitLabel}
        title={exitLabel}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--ctb-accent)] bg-[var(--ctb-pill-bg)] text-[var(--ctb-accent)] transition-[box-shadow,filter] hover:brightness-125"
        style={{ boxShadow: '0 0 10px color-mix(in srgb, var(--ctb-accent) 22%, transparent)' }}
      >
        <DoorOpen size={20} aria-hidden="true" />
      </button>
    </div>
  )
}
