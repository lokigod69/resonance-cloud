import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { GAMES } from '@/games/shared/registry'

export default function GamesHub() {
  const navigate = useNavigate()
  const { activeLanguage } = useLanguage()
  const { t } = useTranslation()
  const enabledGames = GAMES.filter((game) => game.enabled)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{t('study.games.section')}</h1>
          {activeLanguage && (
            <p className="mt-2 text-sm font-medium text-muted-foreground">{activeLanguage}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {enabledGames.map((game) => {
            const params = new URLSearchParams()
            params.set('returnTo', '/games')
            if (activeLanguage) params.set('lang', activeLanguage)

            return (
              <button
                key={game.id}
                type="button"
                onClick={() => navigate(`${game.route}?${params.toString()}`)}
                className="study-mode-card relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6 text-center backdrop-blur transition-all duration-200 hover:scale-[1.03] hover:border-accent hover:bg-accent active:scale-[0.98]"
              >
                <img
                  src={game.iconSrc}
                  alt={t(game.titleKey)}
                  width={88}
                  height={88}
                  loading="eager"
                  decoding="sync"
                  className="h-[88px] w-[88px] rounded-2xl object-contain shadow-[0_0_24px_rgba(255,107,53,0.18)]"
                />
                <div>
                  <h2 className="text-lg font-semibold">{t(game.titleKey)}</h2>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
