import type { StudyWord } from '@/hooks/useStudySession'

export type CanvasMode = 'ember' | 'frost' | 'syndicate' | 'zen' | 'wave'
export type CanvasDirection = 'target-visible' | 'base-visible'
export type CanvasAutoReveal = 'on' | 'off'

export interface CanvasLanguagePair {
  target: string | null
  base: string | null
  targetCode: string
  baseCode: string
  isSameLanguage: boolean
}

export interface CanvasModeProps {
  // Data
  words: StudyWord[]
  masteredWordIds: ReadonlySet<string>
  showImages: boolean
  deckType: 'video' | 'card' | 'card_text' | null
  sessionComplete: boolean
  direction: CanvasDirection
  autoReveal: CanvasAutoReveal
  languagePair: CanvasLanguagePair
  canToggleDirection: boolean
  canToggleImages: boolean

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
  onToggleDirection: () => void
  onToggleAutoReveal: () => void
  onExit: () => void
  onContinue: () => void
}

// Wave leads: it is the brand mode and the default canvas (StudyCanvas DEFAULT_MODE).
export const CANVAS_MODES: readonly CanvasMode[] = ['wave', 'ember', 'frost', 'syndicate', 'zen']
