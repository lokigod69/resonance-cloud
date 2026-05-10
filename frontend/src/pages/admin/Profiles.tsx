import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Languages,
  Plus,
  Copy,
  Trash2,
  Check,
  Save,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import { StageSettingsPanel } from '@/components/settings/SettingsControls'
import { STAGE_LABELS, STAGE_FIELDS } from '@/components/settings/fieldConfigs'
import { sanitizeDurationSettings } from '@/components/settings/durationSettings'
import { useToast } from '@/components/Toast'

type LanguageProfile = {
  id: string
  language: string
  name: string
  is_active: boolean
  settings: Record<string, Record<string, unknown>>
  notes: string | null
  created_at: string
  updated_at: string
}

type LanguageProfileRpcResult = {
  id: string
  language: string
  name: string
  is_active: boolean
  settings: Record<string, Record<string, unknown>>
  notes: string | null
}

const LANGUAGES = [
  'English', 'German', 'French', 'Italian', 'Spanish', 'Portuguese', 'Japanese',
  'Korean', 'Mandarin', 'Arabic', 'Russian', 'Turkish', 'Hindi',
  'Dutch', 'Swedish', 'Polish', 'Greek', 'Thai', 'Vietnamese', 'Bisaya', 'Indonesian',
]

export default function Profiles() {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<LanguageProfile[]>([])
  const [selected, setSelected] = useState<LanguageProfile | null>(null)
  const [editSettings, setEditSettings] = useState<Record<string, Record<string, unknown>>>({})
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newLanguage, setNewLanguage] = useState(LANGUAGES[0])
  const [newName, setNewName] = useState('')
  const [activeStage, setActiveStage] = useState('concept')

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('language_profiles')
      .select('*')
      .order('language')
      .order('name')
    if (data) setProfiles(data)
  }, [])

  useEffect(() => {
    fetchProfiles().then(() => setLoading(false))
  }, [fetchProfiles])

  const selectProfile = (p: LanguageProfile) => {
    setSelected(p)
    setEditSettings(sanitizeDurationSettings(structuredClone(p.settings)))
    setEditName(p.name)
    setEditNotes(p.notes || '')
  }

  const saveProfile = async () => {
    if (!selected) return
    setSaving(true)
    const cleanSettings = sanitizeDurationSettings(editSettings)
    try {
      const { data, error } = await supabase.rpc('admin_upsert_language_profile', {
        p_profile_id: selected.id,
        p_language: selected.language,
        p_name: editName,
        p_settings: cleanSettings,
        p_notes: editNotes || null,
        p_reason: 'Admin language profile update',
      })
      if (error) throw error
      await fetchProfiles()
      const updated = data as LanguageProfileRpcResult
      selectProfile({ ...selected, ...updated, updated_at: new Date().toISOString() })
      toast('Profile saved', 'success')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const activateProfile = async (profileId: string, language: string) => {
    const { error } = await supabase.rpc('admin_set_language_profile_active', {
      p_profile_id: profileId,
      p_is_active: true,
      p_reason: 'Admin language profile update',
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    await fetchProfiles()
    setProfiles(prev => prev.map(profile =>
      profile.language === language
        ? { ...profile, is_active: profile.id === profileId }
        : profile
    ))
    if (selected?.language === language) {
      setSelected(prev => prev ? { ...prev, is_active: prev.id === profileId } : null)
    }
  }

  const deactivateProfile = async (profileId: string) => {
    const { error } = await supabase.rpc('admin_set_language_profile_active', {
      p_profile_id: profileId,
      p_is_active: false,
      p_reason: 'Admin language profile update',
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    await fetchProfiles()
    if (selected?.id === profileId) {
      setSelected(prev => prev ? { ...prev, is_active: false } : null)
    }
  }

  const duplicateProfile = async (profile: LanguageProfile) => {
    const { error } = await supabase.rpc('admin_upsert_language_profile', {
      p_profile_id: null,
      p_language: profile.language,
      p_name: `${profile.name} (copy)`,
      p_settings: sanitizeDurationSettings(profile.settings),
      p_notes: profile.notes,
      p_reason: 'Admin language profile update',
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    await fetchProfiles()
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Delete this profile?')) return
    const { error } = await supabase.rpc('admin_delete_language_profile', {
      p_profile_id: profileId,
      p_reason: 'Admin language profile update',
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    if (selected?.id === profileId) setSelected(null)
    await fetchProfiles()
  }

  const createProfile = async () => {
    if (!newName.trim()) return
    const { error } = await supabase.rpc('admin_upsert_language_profile', {
      p_profile_id: null,
      p_language: newLanguage,
      p_name: newName.trim(),
      p_settings: {},
      p_notes: null,
      p_reason: 'Admin language profile update',
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    setShowCreate(false)
    setNewName('')
    await fetchProfiles()
  }

  const updateSetting = (stage: string, key: string, value: unknown) => {
    setEditSettings(prev => ({
      ...prev,
      [stage]: {
        ...(prev[stage] || {}),
        [key]: value,
      },
    }))
  }

  // Group profiles by language
  const grouped = profiles.reduce<Record<string, LanguageProfile[]>>((acc, p) => {
    if (!acc[p.language]) acc[p.language] = []
    acc[p.language].push(p)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left Panel: Profile List */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            <h1 className="text-lg font-bold">Profiles</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <Card className="p-3 space-y-2">
            <Label className="text-xs">Language</Label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              value={newLanguage}
              onChange={e => setNewLanguage(e.target.value)}
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <Label className="text-xs">Name</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., German Schlager v1"
              className="h-8 text-sm"
            />
            <Button size="sm" className="w-full" onClick={createProfile} disabled={!newName.trim()}>
              Create
            </Button>
          </Card>
        )}

        {/* Profile list grouped by language */}
        {Object.entries(grouped).map(([language, langProfiles]) => (
          <div key={language}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1">
              {language}
            </p>
            {langProfiles.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                  selected?.id === p.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-muted-foreground'
                }`}
                onClick={() => selectProfile(p)}
              >
                {p.is_active && (
                  <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="Active" />
                )}
                <span className="truncate flex-1">{p.name}</span>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
              </div>
            ))}
          </div>
        ))}

        {profiles.length === 0 && !showCreate && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No profiles yet. Click + to create one.
          </p>
        )}
      </div>

      <Separator orientation="vertical" />

      {/* Right Panel: Editor */}
      {selected ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Profile header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="text-lg font-bold h-9 border-none px-0 focus-visible:ring-0"
              />
              <p className="text-sm text-muted-foreground">
                {selected.language}
                {selected.is_active && ' · Active'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selected.is_active ? (
                <Button variant="secondary" size="sm" onClick={() => deactivateProfile(selected.id)}>
                  Deactivate
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => activateProfile(selected.id, selected.language)}>
                  <Check className="h-3 w-3 mr-1" /> Activate
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => duplicateProfile(selected)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteProfile(selected.id)}>
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Input
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Admin notes about this profile..."
              className="h-8 text-sm"
            />
          </div>

          <Separator />

          {/* Settings: vertical tabs + panel */}
          <div className="flex gap-4 min-h-0 flex-1">
            {/* Vertical tab bar */}
            <div className="w-36 flex-shrink-0 flex flex-col gap-0.5">
              {Object.keys(STAGE_FIELDS).map(stage => (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeStage === stage
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </button>
              ))}
            </div>

            {/* Settings content */}
            <div className="flex-1 overflow-y-auto">
              <StageSettingsPanel
                stage={activeStage}
                stageSettings={editSettings[activeStage] || {}}
                onChange={(key, value) => updateSetting(activeStage, key, value)}
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex-shrink-0 pt-2">
            <Separator className="mb-4" />
            <div className="flex items-center justify-end gap-3 pb-4">
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a profile to edit
        </div>
      )}
    </div>
  )
}
