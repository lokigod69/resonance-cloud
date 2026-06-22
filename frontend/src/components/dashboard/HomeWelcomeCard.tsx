import { Link } from 'react-router-dom'
import { ArrowRight, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * HomeWelcomeCard — the first-run greeting card for new accounts (no decks yet).
 * Uses the same frosted glass recipe as the login page (`glass border-border`)
 * so the home screen reads as a continuation of the auth surface. Shared across
 * both skins (classic Dashboard + glassy DashboardPG) to avoid drift.
 */
export function HomeWelcomeCard() {
  const { t } = useTranslation()

  return (
    <Card className="home-welcome-card relative z-10 w-full max-w-md glass border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t('dashboard.firstRun.title')}</CardTitle>
        <CardDescription>{t('dashboard.firstRun.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild variant="glass-vermillion" size="lg">
          <Link to="/today">
            {t('dashboard.firstRun.startLesson')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/generate">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.firstRun.createDeck')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
