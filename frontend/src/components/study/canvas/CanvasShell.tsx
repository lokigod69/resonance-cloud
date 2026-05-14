import type { ReactNode } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

type CanvasShellProps = {
  children: ReactNode
}

// Headerless wrapper for /study/canvas. The route is lifted out of the layout
// outlets so the global header does not render; this shell locks body scroll
// while a session is live. Each mode component renders its own fixed-inset
// root inside and owns its own in-toolbar Exit affordance.
export function CanvasShell({ children }: CanvasShellProps) {
  useBodyScrollLock(true)
  return <>{children}</>
}
