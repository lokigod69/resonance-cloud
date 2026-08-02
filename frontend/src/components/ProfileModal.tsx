import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteAccount } from '@/hooks/useDeleteAccount'
import { useSkin, type SkinId } from '@/contexts/SkinContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Check, Upload, Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { BASE_LANGUAGES, getDisplayLabel } from '@/lib/languages'
import { useToast } from '@/components/Toast'
import { NewWordsPerDaySelector } from '@/components/profile/NewWordsPerDaySelector'
import { normalizeNewWordsPerDay } from '@/lib/dailyHabits'
import { CLASSIC_SKIN_RETIRED } from '@/lib/productFlags'
import { analytics } from '@/lib/analytics'

const SKINS: { id: SkinId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'glassy', label: 'Glassy' },
]

const THEMES: { id: Theme; label: string; palette: [string, string, string] }[] = [
  { id: 'rainy-day', label: 'Rainy Day', palette: ['#0F1720', '#182432', '#7FAAD4'] },
  { id: 'midnight', label: 'Midnight', palette: ['#07090A', '#101519', '#6FB8AD'] },
  { id: 'red-wine', label: 'Red Wine', palette: ['#16080F', '#251019', '#C65A80'] },
  { id: 'slate', label: 'Slate', palette: ['#121519', '#1d2228', '#b5aa9a'] },
  { id: 'warm-linen', label: 'Warm Linen', palette: ['#EFE6D8', '#F8F1E8', '#8B7256'] },
]

const AVATAR_BUCKET = 'profile-avatars'
const AVATAR_FILENAME = 'avatar.jpg'
const ACCEPTED_INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5 MB
const OUTPUT_DIMENSION = 512
const OUTPUT_QUALITY = 0.9

function avatarObjectPath(userId: string): string {
  return `${userId}/${AVATAR_FILENAME}`
}

async function fileToImage(file: File): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Image decode failed'))
    image.src = objectUrl
  })
  return { image, revoke: () => URL.revokeObjectURL(objectUrl) }
}

async function squareCropResizeToJpeg(file: File): Promise<Blob> {
  const { image, revoke } = await fileToImage(file)
  try {
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = Math.floor((image.naturalWidth - sourceSize) / 2)
    const sourceY = Math.floor((image.naturalHeight - sourceSize) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_DIMENSION
    canvas.height = OUTPUT_DIMENSION
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_DIMENSION,
      OUTPUT_DIMENSION,
    )

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY),
    )
    if (!blob) throw new Error('Image encode failed')
    return blob
  } finally {
    revoke()
  }
}

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { skin, setSkin } = useSkin()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { deleteAccount, loading: deleteAccountLoading } = useDeleteAccount()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [baseLanguage, setBaseLanguage] = useState(profile?.base_language || '')
  const [newWordsPerDay, setNewWordsPerDay] = useState(normalizeNewWordsPerDay(profile?.new_words_per_day))
  const [analyticsOptOut, setAnalyticsOptOut] = useState(Boolean(profile?.analytics_opt_out))
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Sync state when modal opens or profile data changes
  useEffect(() => {
    if (open) {

      setDisplayName(profile?.display_name || '')
      setBaseLanguage(profile?.base_language || '')
      setNewWordsPerDay(normalizeNewWordsPerDay(profile?.new_words_per_day))
      setAnalyticsOptOut(Boolean(profile?.analytics_opt_out))
    }
  }, [open, profile?.display_name, profile?.base_language, profile?.new_words_per_day, profile?.analytics_opt_out])

  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteConfirmInput('')
    }
  }, [deleteDialogOpen])

  // Collapse Advanced options whenever the modal closes so it starts collapsed on reopen.
  useEffect(() => {
    if (!open) {
      setAdvancedOpen(false)
    }
  }, [open])

  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [langSaving, setLangSaving] = useState(false)
  const [dailyCapSaving, setDailyCapSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarUrl = useProfileAvatarUrl(profile?.avatar_path, profile?.avatar_updated_at)
  const hasAvatar = Boolean(profile?.avatar_path)

  const displayNameForFallback = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initials = displayNameForFallback
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const deleteConfirmationText = user?.email ?? 'DELETE'
  const normalizedDeleteConfirmInput = deleteConfirmInput.trim()
  const deleteConfirmMatches = normalizedDeleteConfirmInput === 'DELETE'
    || (!!user?.email && normalizedDeleteConfirmInput.toLowerCase() === user.email.toLowerCase())

  async function handleAvatarFile(file: File) {
    if (!user) return

    if (!ACCEPTED_INPUT_TYPES.includes(file.type)) {
      toast(t('profile.avatar.invalid'), 'error')
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast(t('profile.avatar.tooLarge'), 'error')
      return
    }

    setAvatarUploading(true)
    try {
      let resized: Blob
      try {
        resized = await squareCropResizeToJpeg(file)
      } catch {
        toast(t('profile.avatar.invalid'), 'error')
        return
      }

      const path = avatarObjectPath(user.id)
      const uploadResult = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, resized, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })

      if (uploadResult.error) {
        toast(t('profile.avatar.uploadFailed'), 'error')
        return
      }

      const updatedAt = new Date().toISOString()
      const profileUpdate = await supabase
        .from('profiles')
        .update({ avatar_path: path, avatar_updated_at: updatedAt })
        .eq('id', user.id)

      if (profileUpdate.error) {
        // Best-effort cleanup so the row and the bucket stay in sync.
        await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => {})
        toast(t('profile.avatar.uploadFailed'), 'error')
        return
      }

      await refreshProfile()
      toast(t('profile.avatar.saved'), 'success')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleAvatarRemove() {
    if (!user) return
    setAvatarUploading(true)
    try {
      const path = avatarObjectPath(user.id)
      await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => {})

      const updatedAt = new Date().toISOString()
      const profileUpdate = await supabase
        .from('profiles')
        .update({ avatar_path: null, avatar_updated_at: updatedAt })
        .eq('id', user.id)

      if (profileUpdate.error) {
        toast(t('profile.avatar.uploadFailed'), 'error')
        return
      }

      await refreshProfile()
      toast(t('profile.avatar.saved'), 'success')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleSaveDisplayName() {
    if (!user) return
    if ((displayName.trim() || null) === profile?.display_name) return
    setNameSaving(true)
    setNameSaved(false)
    await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)
    await refreshProfile()
    setNameSaving(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleSaveLanguage(value: string) {
    if (!user) return
    const previousBaseLanguage = profile?.base_language || ''
    setBaseLanguage(value)
    setLangSaving(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ base_language: value })
        .eq('id', user.id)
        .select('base_language')
        .single()

      if (error || data?.base_language !== value) {
        console.error('[ProfileModal] base_language update failed', {
          userId: user.id,
          requestedBaseLanguage: value,
          returnedBaseLanguage: data?.base_language,
          error,
        })
        setBaseLanguage(previousBaseLanguage)
        toast(t('profile.saveFailed'), 'error')
        return
      }

      await refreshProfile()
      setBaseLanguage(data.base_language || value)
      toast(t('profile.saved'), 'success')
    } catch (error) {
      console.error('[ProfileModal] base_language update exception', {
        userId: user.id,
        requestedBaseLanguage: value,
        error,
      })
      setBaseLanguage(previousBaseLanguage)
      toast(t('profile.saveFailed'), 'error')
    } finally {
      setLangSaving(false)
    }
  }

  async function handleSaveNewWordsPerDay(value: number) {
    if (!user || value === newWordsPerDay) return
    const previousNewWordsPerDay = newWordsPerDay
    setNewWordsPerDay(value)
    setDailyCapSaving(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ new_words_per_day: value })
        .eq('id', user.id)
        .select('new_words_per_day')
        .single()
      const savedValue = normalizeNewWordsPerDay(data?.new_words_per_day)

      if (error || savedValue !== value) {
        setNewWordsPerDay(previousNewWordsPerDay)
        toast(t('profile.saveFailed'), 'error')
        return
      }

      await refreshProfile()
      setNewWordsPerDay(savedValue)
      toast(t('profile.saved'), 'success')
    } catch {
      setNewWordsPerDay(previousNewWordsPerDay)
      toast(t('profile.saveFailed'), 'error')
    } finally {
      setDailyCapSaving(false)
    }
  }

  async function handleAnalyticsOptOutChange(next: boolean) {
    if (!user || next === analyticsOptOut) return
    const previous = analyticsOptOut
    setAnalyticsOptOut(next)
    // Suppression takes effect immediately; the DB write makes it durable.
    analytics.setOptOut(next)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ analytics_opt_out: next } as { analytics_opt_out: boolean })
        .eq('id', user.id)
        .select('analytics_opt_out')
        .single()

      if (error || Boolean((data as { analytics_opt_out?: boolean } | null)?.analytics_opt_out) !== next) {
        setAnalyticsOptOut(previous)
        analytics.setOptOut(previous)
        toast(t('profile.saveFailed'), 'error')
        return
      }

      await refreshProfile()
      toast(t('profile.saved'), 'success')
    } catch {
      setAnalyticsOptOut(previous)
      analytics.setOptOut(previous)
      toast(t('profile.saveFailed'), 'error')
    }
  }

  function handleSkinChange(id: SkinId) {
    setSkin(id)
    if (user?.id) {
      Promise.resolve(
        supabase
          .from('profiles')
          .update({ skin: id } as { skin: SkinId })
          .eq('id', user.id)
      ).catch(() => {})
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirmMatches || deleteAccountLoading) return

    try {
      await deleteAccount()
      setDeleteDialogOpen(false)
      onOpenChange(false)
      toast(t('profile.deleteAccount.deleted'), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : t('profile.deleteAccount.failed')
      toast(message || t('profile.deleteAccount.failed'), 'error')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="theme-dialog sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile.heading')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <Avatar size="lg" className="size-28">
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    alt=""
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={hasAvatar ? t('profile.avatar.replace') : t('profile.avatar.upload')}
                  title={hasAvatar ? t('profile.avatar.replace') : t('profile.avatar.upload')}
                  className="min-h-11 min-w-11 border-border"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                {hasAvatar && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t('profile.avatar.remove')}
                    title={t('profile.avatar.remove')}
                    className="min-h-11 min-w-11 border-border"
                    disabled={avatarUploading}
                    onClick={() => void handleAvatarRemove()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  // Reset so re-selecting the same file still triggers onChange.
                  e.target.value = ''
                  if (file) void handleAvatarFile(file)
                }}
              />
            </div>

            {/* Skin Selector — hidden while classic is retired (beta ships glassy-only) */}
            {!CLASSIC_SKIN_RETIRED && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('profile.skin')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKINS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSkinChange(s.id)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        skin === s.id
                          ? 'theme-chip-active'
                          : 'theme-chip'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.theme')}</label>
              <div className="flex gap-2">
                {THEMES.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => setTheme(themeOption.id)}
                    aria-label={themeOption.label}
                    title={themeOption.label}
                    className={`relative h-[44px] w-[50px] overflow-hidden rounded-md border-2 transition-all ${
                      theme === themeOption.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${themeOption.palette[0]}, ${themeOption.palette[1]})`,
                      }}
                    />
                    <span
                      className="absolute bottom-1.5 right-1.5 h-3 w-3 rounded-full shadow-[0_0_14px_currentColor]"
                      style={{ background: themeOption.palette[2], color: themeOption.palette[2] }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* New Words Per Day */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.newWordsPerDay')}</label>
              <p className="text-xs text-muted-foreground">{t('profile.newWordsPerDayDescription')}</p>
              <NewWordsPerDaySelector
                value={newWordsPerDay}
                disabled={dailyCapSaving}
                onChange={handleSaveNewWordsPerDay}
              />
              {dailyCapSaving && <span className="text-xs text-muted-foreground">{t('profile.saving')}</span>}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.displayName')}</label>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveDisplayName()}
                  onBlur={() => { if (open) handleSaveDisplayName() }}
                  placeholder={t('profile.displayNamePlaceholder')}
                  className="theme-input"
                />
                {nameSaving && <span className="text-xs text-muted-foreground shrink-0">{t('profile.saving')}</span>}
                {nameSaved && (
                  <span className="text-xs text-[var(--accent-2)] flex items-center gap-1 shrink-0">
                    <Check className="h-3 w-3" /> {t('profile.saved')}
                  </span>
                )}
              </div>
            </div>

            {/* Base Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.baseLanguage')}</label>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Select value={baseLanguage} onValueChange={handleSaveLanguage}>
                  <SelectTrigger className="theme-input">
                    <SelectValue placeholder={t('profile.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent className="theme-popover">
                    {BASE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {getDisplayLabel(lang)}
                      </SelectItem>
                    ))}
                    {/* Legacy base languages (Korean/Spanish/… predate the en/de/fr
                        trim). Keep the stored value visible so the select doesn't
                        render as empty; picking a listed language migrates them. */}
                    {baseLanguage && !BASE_LANGUAGES.some((lang) => lang.value === baseLanguage) && (
                      <SelectItem value={baseLanguage}>{baseLanguage}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {langSaving && <span className="text-xs text-muted-foreground shrink-0">{t('profile.saving')}</span>}
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t('profile.email')}</label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {/* Sign Out — close the modal first (it lives outside the router, so it would
                otherwise float over /login showing a now-blank profile), then sign out and
                land on /login deterministically. */}
            <Button
              variant="outline"
              onClick={async () => {
                onOpenChange(false)
                await signOut()
                navigate('/login', { replace: true })
              }}
              className="w-full border-border"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('profile.signOut')}
            </Button>

            {/* Advanced options — keeps destructive actions (Delete account) out of the way */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                aria-expanded={advancedOpen}
                className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-medium text-muted-foreground"
              >
                {t('profile.advancedOptions')}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {advancedOpen && (
                <div className="pt-3 space-y-4">
                  {/* Analytics opt-out (portfolio analytics; suppresses all emits at source) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t('profile.analyticsOptOut')}</p>
                      <p className="text-xs text-muted-foreground">{t('profile.analyticsOptOutDescription')}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={analyticsOptOut}
                      aria-label={t('profile.analyticsOptOut')}
                      onClick={() => void handleAnalyticsOptOutChange(!analyticsOptOut)}
                      className={`shrink-0 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        analyticsOptOut ? 'theme-chip-active' : 'theme-chip'
                      }`}
                    >
                      {analyticsOptOut ? t('profile.analyticsOptOutOn') : t('profile.analyticsOptOutOff')}
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('profile.deleteAccount')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!deleteAccountLoading) setDeleteDialogOpen(nextOpen)
        }}
      >
        <DialogContent className="theme-dialog sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('profile.deleteAccount.title')}
            </DialogTitle>
            <DialogDescription>
              {t('profile.deleteAccount.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-destructive">{t('profile.deleteAccount.warning')}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('profile.deleteAccount.confirmLabel', { value: deleteConfirmationText })}
              </label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={t('profile.deleteAccount.confirmPlaceholder')}
                className="theme-input"
                disabled={deleteAccountLoading}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-border"
              disabled={deleteAccountLoading}
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('profile.deleteAccount.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteConfirmMatches || deleteAccountLoading}
              onClick={() => void handleDeleteAccount()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteAccountLoading ? t('profile.deleteAccount.deleting') : t('profile.deleteAccount.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
