import { Link } from 'react-router-dom'
import { Library, Sparkles } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { staticLibraryRouteSuffix } from '@/lib/staticLibraryLanguage'

/**
 * HomeWelcomeCard — the empty-home card shown whenever the ACTIVE language has no decks
 * (a brand-new account, or a language the learner hasn't started yet). It offers two calm
 * doors — browse the library (import a ready-made pack) or make your own deck (generation) —
 * and presents them as options without pressure. Uses the same frosted glass recipe as the
 * login page (`glass border-border`) and is shared across both skins (classic Dashboard +
 * glassy DashboardPG) to avoid drift. It renders strictly on top of the dashboard's existing
 * wave/cosmos background.
 */
export function HomeWelcomeCard() {
  const { t } = useTranslation()
  const { activeLanguage } = useLanguage()

  // Library door pre-filters to the active language when there is one; with no language yet,
  // plain /categories lets the library's own selector choose the target.
  const libraryHref = activeLanguage
    ? `/categories${staticLibraryRouteSuffix(activeLanguage)}`
    : '/categories'

  return (
    <Card className="home-welcome-card relative z-10 w-full max-w-md glass border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t('dashboard.firstRun.title')}</CardTitle>
        <CardDescription>{t('dashboard.firstRun.subtitle')}</CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row">
        <Link to={libraryHref} className="home-welcome-door">
          <Library className="home-welcome-door-icon" aria-hidden="true" />
          <span className="home-welcome-door-title">{t('dashboard.firstRun.browseLibrary')}</span>
          <span className="home-welcome-door-hint">{t('dashboard.firstRun.browseLibraryHint')}</span>
        </Link>
        <Link to="/generate" className="home-welcome-door">
          <Sparkles className="home-welcome-door-icon" aria-hidden="true" />
          <span className="home-welcome-door-title">{t('dashboard.firstRun.makeDeck')}</span>
          <span className="home-welcome-door-hint">{t('dashboard.firstRun.makeDeckHint')}</span>
        </Link>
      </div>
    </Card>
  )
}
