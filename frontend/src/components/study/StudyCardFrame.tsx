import type { CSSProperties, ReactNode } from 'react'
import { useSkin } from '@/contexts/SkinContext'
import { cn } from '@/lib/utils'

interface StudyCardFrameProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean
}

// Shared card chrome for the study surfaces — the reference deck-card language:
// classic `.theme-card`, glassy `.pg-glass`, radius `rounded-2xl`, no inline colors.
// Picks the skin class via useSkin so flashcard/audio (and, once the 2×2 is
// consolidated, image study) all sit in the same glass frame the deck library uses.
export function StudyCardFrame({ children, className, style, ...rest }: StudyCardFrameProps) {
  const { skin } = useSkin()
  return (
    <div
      className={cn('rounded-2xl', skin === 'glassy' ? 'pg-glass' : 'theme-card', className)}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
