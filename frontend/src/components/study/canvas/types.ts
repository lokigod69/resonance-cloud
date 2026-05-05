import type { StudyWord } from '@/hooks/useStudySession'

export type CanvasMode = 'ember' | 'frost' | 'syndicate' | 'zen'

export interface CanvasModeProps {
  // Data
  words: StudyWord[]
  showImages: boolean
  sessionComplete: boolean

  // Pagination state
  currentPage: number
  totalPages: number

  // Active mode (for rendering toolbar pills with active state)
  activeMode: CanvasMode

  // Callbacks
  onPass: (wordId: string) => void
  onFail: (wordId: string) => void
  onPrevPage: () => void
  onNextPage: () => void
  onSwitchMode: (mode: CanvasMode) => void
  onToggleImages: () => void
  onExit: () => void
  onContinue: () => void
}

export const CANVAS_MODES: readonly CanvasMode[] = ['ember', 'frost', 'syndicate', 'zen']
