import { Link } from 'react-router-dom'
import { Coins, Flame, User } from 'lucide-react'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useDialogs } from '@/contexts/DialogContext'
import { useAuth } from '@/hooks/useAuth'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import { useTranslation } from '@/hooks/useTranslation'
import { totalCredits } from '@/lib/credits'

type HomeAccountStripProps = {
  // Day streak shown as a compact chip in the strip's left column — the header
  // carries it on mobile so the home stack below keeps its vertical space.
  streak?: number
}

export function HomeAccountStrip({ streak = 0 }: HomeAccountStripProps) {
  const { profile, profileLoading, user } = useAuth()
  const { t } = useTranslation()
  const { setProfileOpen, setRedeemOpen } = useDialogs()
  const avatarUrl = useProfileAvatarUrl(profile?.avatar_path, profile?.avatar_updated_at)
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const credits = typeof profile?.credits === 'number' ? totalCredits(profile) : profileLoading ? '...' : 0

  return (
    <div className="home-account-strip grid md:hidden" aria-label="Account controls">
      {streak > 0 ? (
        <span className="home-account-streak" aria-label={t('dashboard.streak.aria', { count: streak })}>
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{streak}</span>
        </span>
      ) : null}

      <Link to="/dashboard" className="home-account-brand" aria-label="Lingwave home">
        <LingwaveBrand markClassName="h-6" wordmarkClassName="h-5" />
      </Link>

      <div className="home-account-actions">
        <button
          type="button"
          className="home-account-credit"
          onClick={() => setRedeemOpen(true)}
          aria-label={`${t('credits.heading')}: ${credits}`}
        >
          <Coins className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="home-account-profile"
          onClick={() => setProfileOpen(true)}
          aria-label={t('profile.heading')}
        >
          <Avatar className="h-7 w-7">
            {avatarUrl ? (
              <AvatarImage
                src={avatarUrl}
                alt=""
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {avatarUrl ? <User className="h-3 w-3" aria-hidden="true" /> : initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </div>
  )
}
