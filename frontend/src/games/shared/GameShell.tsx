import { useEffect, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { safeInternalPath } from '@/lib/safeInternalPath'

type GameShellProps = {
  children: ReactNode
  className?: string
  onExit?: () => void
}

export function GameShell({ children, className, onExit }: GameShellProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setActiveLanguage } = useLanguage()
  const returnTo = safeInternalPath(searchParams.get('returnTo'), '/dashboard')
  const launchLanguage = searchParams.get('lang')

  useBodyScrollLock(true)

  useEffect(() => {
    if (launchLanguage) setActiveLanguage(launchLanguage)
  }, [launchLanguage, setActiveLanguage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (onExit) {
        onExit()
      } else {
        navigate(returnTo)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, onExit, returnTo])

  return (
    <main className={className} data-game-shell="true">
      {children}
    </main>
  )
}
