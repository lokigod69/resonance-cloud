import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSkin, type SkinId } from '@/contexts/SkinContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
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
import { LogOut, Check } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { BASE_LANGUAGES, getDisplayLabel } from '@/lib/languages'

const SKINS: { id: SkinId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'glassy', label: 'Glassy' },
]

const THEMES: { id: Theme; label: string; palette: [string, string, string] }[] = [
  { id: 'midnight', label: 'Midnight', palette: ['#07090A', '#101519', '#55DCC8'] },
  { id: 'rainy-day', label: 'Rainy Day', palette: ['#0F1720', '#182432', '#8AB8E8'] },
  { id: 'red-wine', label: 'Red Wine', palette: ['#16080F', '#251019', '#C65A80'] },
  { id: 'slate', label: 'Slate', palette: ['#121519', '#1d2228', '#b5aa9a'] },
  { id: 'warm-linen', label: 'Warm Linen', palette: ['#EFE6D8', '#F8F1E8', '#8B7256'] },
]

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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
      setDisplayName(profile?.display_name || '')
      setBaseLanguage(profile?.base_language || '')
    }
  }, [open, profile?.display_name, profile?.base_language])

  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [langSaving, setLangSaving] = useState(false)
  const [langSaved, setLangSaved] = useState(false)

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
          .update({ skin: id } as any)
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
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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
