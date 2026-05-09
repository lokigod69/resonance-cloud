import type { ReactNode } from 'react'
import './hybridA.css'

type HybridAExperimentShellProps = {
  children: ReactNode
}

export function HybridAExperimentShell({ children }: HybridAExperimentShellProps) {
  return (
    <main className="hybrid-a-shell">
      <div className="hybrid-a-atmosphere" aria-hidden="true" />
      {children}
    </main>
  )
}
