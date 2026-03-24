import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
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

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'German', label: 'Deutsch (German)' },
  { value: 'French', label: 'Fran\u00e7ais (French)' },
  { value: 'Italian', label: 'Italiano (Italian)' },
  { value: 'Bisaya', label: 'Bisaya' },
]

export default function Settings() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const [baseLanguage, setBaseLanguage] = useState(profile?.base_language || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
