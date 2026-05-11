import { useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GameShell } from '@/games/shared/GameShell'
import { useAuth } from '@/hooks/useAuth'

export default function RunnerGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/games'
  const { session, loading } = useAuth()

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Resonance — Runner'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const handleExit = useCallback(() => {
    navigate(returnTo)
  }, [navigate, returnTo])

  return (
    <GameShell
      className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground"
      onExit={handleExit}
    >
      <section className="max-w-md text-center">
        <div className="mx-auto mb-6 h-1 w-20 rounded-full bg-[var(--accent)] shadow-[0_0_24px_var(--accent)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {loading || !session ? 'Loading' : 'Resonance Games'}
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">
          Runner — coming soon
        </h1>
      </section>
    </GameShell>
  )
}
