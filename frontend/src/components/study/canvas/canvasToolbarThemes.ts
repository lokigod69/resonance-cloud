import type { CanvasMode } from './types'

// Palette per canvas mode. Kept in its own module (no component exports) so the
// shared CanvasToolbar file stays fast-refresh friendly. The toolbar geometry is
// identical across modes; only these colors change, injected as CSS variables.
export type CanvasToolbarTheme = {
  /** Active/hover text + border color */
  accent: string
  /** Inactive control text color */
  dim: string
  /** Inactive control border color */
  border: string
  /** Control background */
  pillBg: string
  /** Toolbar strip background */
  barBg: string
  /** Toolbar bottom border color */
  barBorder: string
  /** Extra classes on the strip (e.g. font-mono for syndicate) */
  fontClass?: string
}

export const CANVAS_TOOLBAR_THEMES: Record<CanvasMode, CanvasToolbarTheme> = {
  ember: {
    accent: '#f97316',
    dim: 'rgba(194, 88, 36, 0.75)',
    border: 'rgba(124, 45, 18, 0.45)',
    pillBg: 'rgba(0, 0, 0, 0.5)',
    barBg: 'rgba(0, 0, 0, 0.45)',
    barBorder: 'rgba(124, 45, 18, 0.3)',
  },
  frost: {
    accent: '#a8d8ea',
    dim: 'rgba(168, 216, 234, 0.45)',
    border: 'rgba(255, 255, 255, 0.12)',
    pillBg: 'rgba(0, 0, 0, 0.5)',
    barBg: 'rgba(0, 0, 0, 0.5)',
    barBorder: 'rgba(255, 255, 255, 0.1)',
  },
  syndicate: {
    accent: '#00fff2',
    dim: 'rgba(0, 255, 242, 0.5)',
    border: 'rgba(0, 255, 242, 0.3)',
    pillBg: 'rgba(0, 0, 0, 0.5)',
    barBg: 'rgba(0, 0, 0, 0.5)',
    barBorder: 'rgba(0, 255, 242, 0.2)',
    fontClass: 'font-mono',
  },
  zen: {
    accent: 'rgba(255, 255, 255, 0.82)',
    dim: 'rgba(255, 255, 255, 0.38)',
    border: 'rgba(255, 255, 255, 0.14)',
    pillBg: 'rgba(10, 10, 10, 0.6)',
    barBg: 'rgba(10, 10, 10, 0.4)',
    barBorder: 'rgba(255, 255, 255, 0.06)',
  },
  wave: {
    accent: '#f7c843',
    dim: 'rgba(214, 160, 96, 0.6)',
    border: 'rgba(242, 79, 19, 0.32)',
    pillBg: 'rgba(10, 6, 14, 0.55)',
    barBg: 'rgba(10, 6, 14, 0.5)',
    barBorder: 'rgba(242, 79, 19, 0.22)',
  },
}
