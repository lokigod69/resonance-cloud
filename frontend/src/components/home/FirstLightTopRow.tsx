import { Link } from 'react-router-dom'
import { Coins, User } from 'lucide-react'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LanguageCluster } from '@/components/dashboard/LanguageCluster'
import { useDialogs } from '@/contexts/DialogContext'
import { useAuth } from '@/hooks/useAuth'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import { useTranslation } from '@/hooks/useTranslation'

// FirstLightTopRow — brand · language pill · credits · avatar (§3).
// The sky's one chrome row on mobile. No streak flame (locked out of D-02);
// the credits coin stays — it is app reality the render omitted. On desktop
// the PolishGlassLayout top nav already carries brand/credits/avatar, so only
// the language pill renders there.

type FirstLightTopRowProps = {
  languages: string[]
  activeLanguage: string | null
  onSelectLanguage: (lang: string) => void
  onAddLanguage: (lang: string) => void
}

export default function FirstLightTopRow({ languages, activeLanguage, onSelectLanguage, onAddLanguage }: FirstLightTopRowProps) {
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
  const credits = typeof profile?.credits === 'number' ? profile.credits : profileLoading ? '...' : 0

  // `.language-picker` carries the classic dashboard's stack spacing (a
  // dvh-scaled margin-bottom). Inside a centered flex row that margin lifts
  // the pill clear of the brand and the avatar — up to ~21px on a tall phone.
  // First Light lays the row out itself, so the inherited spacing is reset
  // here rather than in the shared component.
  const cluster = (
    <div className="flex min-w-0 items-center [&>.lang-cluster]:!m-0">
      <LanguageCluster
        languages={languages}
        activeLanguage={activeLanguage}
        onSelect={onSelectLanguage}
        onAddLanguage={onAddLanguage}
      />
    </div>
  )

  return (
    <>
      {/* Mobile: the row from the lock — brand left, pill + coin + avatar right. */}
      <div className="flex w-full items-center justify-between gap-2 md:hidden" aria-label="Account controls">
        <Link to="/dashboard" className="shrink-0" aria-label="Lingwave home">
          <LingwaveBrand markClassName="h-6" wordmarkClassName="h-5" />
        </Link>
        <div className="flex min-w-0 items-center gap-1.5">
          {cluster}
          <button
            type="button"
            onClick={() => setRedeemOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            aria-label={`${t('credits.heading')}: ${credits}`}
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-[var(--accent-soft)]"
            aria-label={t('profile.heading')}
          >
            <Avatar className="h-8 w-8">
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

      {/* Desktop: the top nav owns brand/credits/avatar — only the pill. */}
      <div className="hidden w-full justify-center md:flex">{cluster}</div>
    </>
  )
}
