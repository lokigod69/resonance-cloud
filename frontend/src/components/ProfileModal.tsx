import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSkin, type SkinId } from '@/contexts/SkinContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import {
  Dialog,
  DialogContent,
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
import { LogOut, Check, Upload, Trash2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { BASE_LANGUAGES, getDisplayLabel } from '@/lib/languages'

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

type AvatarStatus = 'idle' | 'working' | 'success' | 'error'

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const { skin, setSkin } = useSkin()
  const { theme, setTheme } = useTheme()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [baseLanguage, setBaseLanguage] = useState(profile?.base_language || '')

  // Sync state when modal opens or profile data changes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the modal should hydrate editable fields from the current profile snapshot
      setDisplayName(profile?.display_name || '')
      setBaseLanguage(profile?.base_language || '')
    }
  }, [open, profile?.display_name, profile?.base_language])

  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [langSaving, setLangSaving] = useState(false)
  const [langSaved, setLangSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('idle')
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const avatarUrl = useProfileAvatarUrl(profile?.avatar_path, profile?.avatar_updated_at)
  const hasAvatar = Boolean(profile?.avatar_path)

  const displayNameForFallback = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initials = displayNameForFallback
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function flashAvatarStatus(status: AvatarStatus, messageKey: string | null) {
    setAvatarStatus(status)
    setAvatarMessage(messageKey)
    if (status === 'success') {
      window.setTimeout(() => {
        setAvatarStatus('idle')
        setAvatarMessage(null)
      }, 2000)
    }
  }

  async function handleAvatarFile(file: File) {
    if (!user) return

    if (!ACCEPTED_INPUT_TYPES.includes(file.type)) {
      flashAvatarStatus('error', t('profile.avatar.invalid'))
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      flashAvatarStatus('error', t('profile.avatar.tooLarge'))
      return
    }

    setAvatarStatus('working')
    setAvatarMessage(null)

    let resized: Blob
    try {
      resized = await squareCropResizeToJpeg(file)
    } catch {
      flashAvatarStatus('error', t('profile.avatar.invalid'))
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
      flashAvatarStatus('error', t('profile.avatar.uploadFailed'))
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
      flashAvatarStatus('error', t('profile.avatar.uploadFailed'))
      return
    }

    await refreshProfile()
    flashAvatarStatus('success', t('profile.avatar.saved'))
  }

  async function handleAvatarRemove() {
    if (!user) return
    setAvatarStatus('working')
    setAvatarMessage(null)

    const path = avatarObjectPath(user.id)
    await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => {})

    const updatedAt = new Date().toISOString()
    const profileUpdate = await supabase
      .from('profiles')
      .update({ avatar_path: null, avatar_updated_at: updatedAt })
      .eq('id', user.id)

    if (profileUpdate.error) {
      flashAvatarStatus('error', t('profile.avatar.uploadFailed'))
      return
    }

    await refreshProfile()
    flashAvatarStatus('success', t('profile.avatar.saved'))
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
    setBaseLanguage(value)
    setLangSaving(true)
    setLangSaved(false)
    await supabase
      .from('profiles')
      .update({ base_language: value })
      .eq('id', user!.id)
    await refreshProfile()
    setLangSaving(false)
    setLangSaved(true)
    setTimeout(() => setLangSaved(false), 2000)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profile.heading')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Avatar */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar size="lg" className="size-20">
              {avatarUrl && (
                <AvatarImage
                  src={avatarUrl}
                  alt=""
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 border-border"
                  disabled={avatarStatus === 'working'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {hasAvatar ? t('profile.avatar.replace') : t('profile.avatar.upload')}
                </Button>
                {hasAvatar && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 border-border"
                    disabled={avatarStatus === 'working'}
                    onClick={() => void handleAvatarRemove()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('profile.avatar.remove')}
                  </Button>
                )}
              </div>
              <div className="min-h-4 text-xs">
                {avatarStatus === 'working' && (
                  <span className="text-muted-foreground">{t('profile.saving')}</span>
                )}
                {avatarStatus === 'success' && avatarMessage && (
                  <span className="text-[var(--accent-2)] flex items-center gap-1">
                    <Check className="h-3 w-3" /> {avatarMessage}
                  </span>
                )}
                {avatarStatus === 'error' && avatarMessage && (
                  <span className="text-destructive">{avatarMessage}</span>
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
          </div>

          {/* Skin Selector */}
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
                <SelectContent>
                  {BASE_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {getDisplayLabel(lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {langSaving && <span className="text-xs text-muted-foreground shrink-0">{t('profile.saving')}</span>}
              {langSaved && (
                <span className="text-xs text-[var(--accent-2)] flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" /> {t('profile.saved')}
                </span>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">{t('profile.email')}</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          {/* Sign Out */}
          <Button variant="outline" onClick={signOut} className="w-full border-border">
            <LogOut className="h-4 w-4 mr-2" />
            {t('profile.signOut')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
