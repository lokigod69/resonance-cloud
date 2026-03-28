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

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'German', label: 'Deutsch (German)' },
  { value: 'French', label: 'Fran\u00e7ais (French)' },
  { value: 'Italian', label: 'Italiano (Italian)' },
  { value: 'Bisaya', label: 'Bisaya' },
]

const SKINS: { id: SkinId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'glassy', label: 'Glassy' },
  { id: 'orbs', label: 'Orbs' },
]

const THEMES: { id: Theme; label: string; bg: string }[] = [
  { id: 'midnight', label: 'Midnight', bg: 'oklch(0.13 0.008 280)' },
  { id: 'rainy-day', label: 'Rainy Day', bg: 'linear-gradient(to top left, #263141, #3D4B5F)' },
  { id: 'deep-blue', label: 'Deep Blue', bg: 'linear-gradient(to top left, #0A1842, #152D73)' },
  { id: 'red-wine', label: 'Red Wine', bg: 'linear-gradient(145deg, #220C15, #2D1520, #1A0A12)' },
  { id: 'slate', label: 'Slate', bg: '#1E2227' },
]

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { profile, user, signOut, refreshProfile } = useAuth()
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Skin Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Skin</label>
            <div className="grid grid-cols-3 gap-2">
              {SKINS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSkinChange(s.id)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    skin === s.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className={`w-[46px] h-[30px] rounded-md border-2 transition-all ${
                    theme === t.id
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{ background: t.bg }}
                />
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <div className="flex items-center gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveDisplayName()}
                onBlur={handleSaveDisplayName}
                placeholder="Enter your name"
                className="bg-white/5 border-border"
              />
              {nameSaving && <span className="text-xs text-muted-foreground shrink-0">Saving...</span>}
              {nameSaved && (
                <span className="text-xs text-green-400 flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Base Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Base Language</label>
            <div className="flex items-center gap-2">
              <Select value={baseLanguage} onValueChange={handleSaveLanguage}>
                <SelectTrigger className="bg-white/5 border-border">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {langSaving && <span className="text-xs text-muted-foreground shrink-0">Saving...</span>}
              {langSaved && (
                <span className="text-xs text-green-400 flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          {/* Sign Out */}
          <Button variant="outline" onClick={signOut} className="w-full border-border">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
