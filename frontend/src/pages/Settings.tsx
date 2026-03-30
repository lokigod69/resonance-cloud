import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { useSkin, type SkinId } from '@/contexts/SkinContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Coins, LogOut, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'German', label: 'Deutsch (German)' },
  { value: 'French', label: 'Fran\u00e7ais (French)' },
  { value: 'Italian', label: 'Italiano (Italian)' },
  { value: 'Bisaya', label: 'Bisaya' },
]

export default function Settings() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { skin, setSkin } = useSkin()
  const [baseLanguage, setBaseLanguage] = useState(profile?.base_language || '')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

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
    setSaving(true)
    setSaved(false)

    await supabase
      .from('profiles')
      .update({ base_language: value })
      .eq('id', user!.id)

    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences.</p>
      </div>

      {/* Base Language */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Base Language</h2>
          <p className="text-sm text-muted-foreground">
            The language you speak. Affects future deck translations only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={baseLanguage} onValueChange={handleSaveLanguage}>
            <SelectTrigger className="bg-white/5 border-white/10 max-w-xs">
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
          {saving && <span className="text-sm text-muted-foreground">Saving...</span>}
          {saved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Display Name */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Display Name</h2>
          <p className="text-sm text-muted-foreground">
            Your name shown throughout the app.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveDisplayName()}
            placeholder="Enter your name"
            className="bg-white/5 border-white/10 max-w-xs"
          />
          <Button
            size="sm"
            onClick={handleSaveDisplayName}
            disabled={nameSaving}
          >
            {nameSaving ? 'Saving...' : 'Save'}
          </Button>
          {nameSaved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-muted-foreground">
            Choose how Resonance looks and feels.
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {([
            { id: 'midnight' as Theme, label: 'Midnight', desc: 'Dark & minimal', colors: ['oklch(0.13 0.008 280)', 'oklch(0.7 0.15 280)', 'oklch(0.22 0.015 280)'] },
            { id: 'rainy-day' as Theme, label: 'Rainy Day', desc: 'Steel-blue gradient', colors: ['#263141', '#8EC1D6', '#3D4B5F'] },
            { id: 'deep-blue' as Theme, label: 'Deep Blue', desc: 'Soft navy', colors: ['#111D3A', '#4DA3F7', '#1A3568'] },
            { id: 'red-wine' as Theme, label: 'Red Wine', desc: 'Burgundy & pink', colors: ['#220C15', '#C62F6C', '#4E122A'] },
            { id: 'slate' as Theme, label: 'Slate', desc: 'Muted gray', colors: ['#1E2227', '#9A9894', '#334155'] },
            { id: 'warm-linen' as Theme, label: 'Warm Linen', desc: 'Light & warm', colors: ['#F3EFEB', '#8B7355', '#EBE6E0'] },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                theme === t.id
                  ? 'border-primary glass-selected'
                  : 'border-transparent glass glass-hover'
              }`}
            >
              <div className="flex gap-1.5 mb-3">
                {t.colors.map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-sm border border-white/10" style={{ background: c }} />
                ))}
              </div>
              <div className="font-medium text-sm">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interface Skin */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Interface Skin</h2>
          <p className="text-sm text-muted-foreground">
            Switch between layout styles. Theme colors still apply.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              id: 'classic' as SkinId,
              label: 'Classic',
              desc: 'Clean header navigation',
              colors: ['oklch(0.7 0.15 280)', 'oklch(0.22 0.015 280)', 'oklch(0.13 0.008 280)'],
            },
            {
              id: 'glassy' as SkinId,
              label: 'Glassy',
              desc: 'Cinematic top navigation',
              colors: ['#0de2c3', '#f43f5e', '#fbbf24'],
            },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSkin(s.id)
                // Best-effort Supabase persistence
                if (user?.id) {
                  Promise.resolve(
                    supabase
                      .from('profiles')
                      .update({ skin: s.id } as any)
                      .eq('id', user.id)
                  ).catch(() => {})
                }
              }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                skin === s.id
                  ? s.id === 'glassy'
                    ? 'border-[#0de2c3]/50 shadow-[0_0_15px_rgba(13,226,195,0.2)] glass-selected'
                    : 'border-primary glass-selected'
                  : 'border-transparent glass glass-hover'
              }`}
            >
              <div className="flex gap-1.5 mb-3">
                {s.colors.map((c, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border border-white/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="font-medium text-sm">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-xs font-mono text-muted-foreground">{user?.id?.slice(0, 12)}...</span>
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Credit Balance</h2>
              <p className="text-sm text-muted-foreground">Each word generation costs 1 credit</p>
            </div>
          </div>
          <span className="text-3xl font-bold">{profile?.credits ?? 0}</span>
        </div>
      </div>

      {/* Sign Out */}
      <Button variant="outline" onClick={signOut} className="w-full border-white/10">
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  )
}
