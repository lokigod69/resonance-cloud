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

// Settings schema — defines all editable fields per stage with their types
const SETTINGS_SCHEMA: Record<string, { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'select'; options?: string[] }[]> = {
  concept: [
    { key: 'lyric_mode', label: 'Lyric Mode', type: 'select', options: ['reliable', 'standard', 'creative'] },
    { key: 'genre', label: 'Genre', type: 'text' },
    { key: 'caption_style', label: 'Caption Style', type: 'select', options: ['production', 'descriptive', 'minimal'] },
    { key: 'vocal_gender', label: 'Vocal Gender', type: 'select', options: ['female', 'male'] },
    { key: 'duration', label: 'Duration (s)', type: 'number' },
    { key: 'llm_model', label: 'LLM Model', type: 'text' },
    { key: 'llm_temperature', label: 'LLM Temperature', type: 'number' },
  ],
  song: [
    { key: 'duration', label: 'Duration (s)', type: 'number' },
    { key: 'batch_size', label: 'Batch Size', type: 'number' },
    { key: 'inference_steps', label: 'Inference Steps', type: 'number' },
    { key: 'guidance_scale', label: 'Guidance Scale', type: 'number' },
    { key: 'thinking', label: 'Thinking', type: 'boolean' },
    { key: 'seed', label: 'Seed', type: 'number' },
    { key: 'bpm', label: 'BPM', type: 'number' },
    { key: 'shift', label: 'Shift', type: 'number' },
    { key: 'lora_id', label: 'LoRA ID', type: 'text' },
    { key: 'lora_id_base_path', label: 'LoRA Base Path', type: 'text' },
    { key: 'lora_checkpoint', label: 'LoRA Checkpoint', type: 'text' },
    { key: 'lora_path', label: 'LoRA Path', type: 'text' },
    { key: 'lora_strength', label: 'LoRA Strength', type: 'number' },
    { key: 'lora_trigger_phrase', label: 'LoRA Trigger', type: 'text' },
  ],
  images: [
    { key: 'creative_direction', label: 'Creative Direction', type: 'select', options: ['auto', 'literal', 'editorial', 'cinematic', 'movie', 'movie_remix', 'provocative', 'minimal'] },
    { key: 'visual_reference', label: 'Visual Reference', type: 'text' },
    { key: 'frame_narrative', label: 'Frame Narrative', type: 'select', options: ['auto', 'series', 'triptych', 'diptych'] },
    { key: 'image_count', label: 'Image Count', type: 'text' },
    { key: 'aspect_ratio', label: 'Aspect Ratio', type: 'select', options: ['16:9', '9:16', '1:1', '4:3'] },
    { key: 'art_style', label: 'Art Style', type: 'select', options: ['photorealistic', 'watercolor', 'oil_painting', 'noir', 'studio_ghibli', 'comic_book', 'pixel_art', 'synthwave', 'ukiyo_e', 'renaissance', 'pen_and_ink', 'retro_90s', 'knitted', 'expressionist', 'vintage_film', 'chiaroscuro', 'disney_animation', 'double_exposure', 'blue_eyed_samurai', 'invincible', 'big_mouth', 'random'] },
    { key: 'word_in_image', label: 'Word in Image', type: 'boolean' },
    { key: 'image_model', label: 'Image Model', type: 'select', options: ['fast', 'quality'] },
    { key: 'llm_model', label: 'LLM Model', type: 'text' },
    { key: 'movie_override', label: 'Movie Override', type: 'text' },
  ],
  video: [
    { key: 'video_mode', label: 'Video Mode', type: 'select', options: ['ltx_fast', 'ltx_quality', 'ken_burns'] },
    { key: 'duration', label: 'Duration (s)', type: 'number' },
    { key: 'resolution', label: 'Resolution', type: 'select', options: ['720p', '1080p'] },
    { key: 'fps', label: 'FPS', type: 'number' },
    { key: 'transition_mode', label: 'Transition Mode', type: 'select', options: ['all_cut', 'all_fade', 'auto'] },
    { key: 'motion_type', label: 'Motion Type', type: 'select', options: ['auto', 'pan', 'zoom', 'static'] },
    { key: 'motion_speed', label: 'Motion Speed', type: 'select', options: ['slow', 'medium', 'fast'] },
    { key: 'negative_prompt', label: 'Negative Prompt', type: 'text' },
  ],
  assembly: [
    { key: 'assembly_mode', label: 'Assembly Mode', type: 'select', options: ['clean', 'word_card'] },
    { key: 'gap_strategy', label: 'Gap Strategy', type: 'select', options: ['ping_pong', 'loop', 'freeze', 'black'] },
    { key: 'overflow_strategy', label: 'Overflow Strategy', type: 'select', options: ['video_full', 'audio_full', 'trim'] },
    { key: 'transition_type', label: 'Transition Type', type: 'select', options: ['cut', 'crossfade'] },
    { key: 'silence_trim', label: 'Silence Trim', type: 'boolean' },
    { key: 'lufs_normalize', label: 'LUFS Normalize', type: 'boolean' },
  ],
  bookend: [
    { key: 'enabled', label: 'Enabled', type: 'boolean' },
    { key: 'model_id', label: 'TTS Model ID', type: 'text' },
    { key: 'voice_id', label: 'Voice ID', type: 'text' },
    { key: 'fade_duration', label: 'Fade Duration (s)', type: 'number' },
    { key: 'display_duration_min', label: 'Display Min (s)', type: 'number' },
    { key: 'display_duration_max', label: 'Display Max (s)', type: 'number' },
  ],
}

const STAGE_LABELS: Record<string, string> = {
  concept: 'Concept',
  song: 'Song',
  images: 'Images',
  video: 'Video',
  assembly: 'Assembly',
  bookend: 'Bookend',
}

const LANGUAGES = [
  'German', 'French', 'Italian', 'Spanish', 'Portuguese', 'Japanese',
  'Korean', 'Mandarin', 'Arabic', 'Russian', 'Turkish', 'Hindi',
  'Dutch', 'Swedish', 'Polish', 'Greek', 'Thai', 'Vietnamese',
]

export default function Profiles() {
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
  const [expandedStage, setExpandedStage] = useState<string | null>('concept')

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
    setEditSettings(structuredClone(p.settings))
    setEditName(p.name)
    setEditNotes(p.notes || '')
  }

  const saveProfile = async () => {
    if (!selected) return
    setSaving(true)
    await supabase.from('language_profiles').update({
      name: editName,
      notes: editNotes || null,
      settings: editSettings,
    }).eq('id', selected.id)
    await fetchProfiles()
    // Re-select to refresh
    const updated = profiles.find(p => p.id === selected.id)
    if (updated) selectProfile({ ...updated, name: editName, notes: editNotes, settings: editSettings })
    setSaving(false)
  }

  const activateProfile = async (profileId: string, language: string) => {
    // Deactivate all profiles for this language first
    await supabase.from('language_profiles').update({ is_active: false }).eq('language', language)
    // Activate this one
    await supabase.from('language_profiles').update({ is_active: true }).eq('id', profileId)
    await fetchProfiles()
    if (selected?.id === profileId) {
      setSelected(prev => prev ? { ...prev, is_active: true } : null)
    }
  }

  const deactivateProfile = async (profileId: string) => {
    await supabase.from('language_profiles').update({ is_active: false }).eq('id', profileId)
    await fetchProfiles()
    if (selected?.id === profileId) {
      setSelected(prev => prev ? { ...prev, is_active: false } : null)
    }
  }

  const duplicateProfile = async (profile: LanguageProfile) => {
    await supabase.from('language_profiles').insert({
      language: profile.language,
      name: `${profile.name} (copy)`,
      is_active: false,
      settings: profile.settings,
      notes: profile.notes,
    })
    await fetchProfiles()
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Delete this profile?')) return
    await supabase.from('language_profiles').delete().eq('id', profileId)
    if (selected?.id === profileId) setSelected(null)
    await fetchProfiles()
  }

  const createProfile = async () => {
    if (!newName.trim()) return
    await supabase.from('language_profiles').insert({
      language: newLanguage,
      name: newName.trim(),
      is_active: false,
      settings: {},
    })
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
        <div className="flex-1 overflow-y-auto space-y-4">
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

          {/* Settings by stage */}
          {Object.entries(SETTINGS_SCHEMA).map(([stage, fields]) => (
            <div key={stage}>
              <button
                className="flex items-center gap-2 w-full text-left py-2 hover:text-foreground transition-colors"
                onClick={() => setExpandedStage(expandedStage === stage ? null : stage)}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${expandedStage === stage ? 'rotate-90' : ''}`}
                />
                <span className="font-semibold text-sm">{STAGE_LABELS[stage]}</span>
              </button>

              {expandedStage === stage && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-6 pb-4">
                  {fields.map(field => {
                    const value = editSettings[stage]?.[field.key]

                    if (field.type === 'boolean') {
                      return (
                        <div key={field.key} className="flex items-center gap-2">
                          <button
                            onClick={() => updateSetting(stage, field.key, !value)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              value ? 'bg-green-600' : 'bg-zinc-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <Label className="text-xs">{field.label}</Label>
                        </div>
                      )
                    }

                    if (field.type === 'select') {
                      return (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{field.label}</Label>
                          <select
                            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                            value={(value as string) ?? ''}
                            onChange={e => updateSetting(stage, field.key, e.target.value)}
                          >
                            <option value="">Default</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      )
                    }

                    return (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{field.label}</Label>
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={(value as string | number) ?? ''}
                          onChange={e => {
                            const v = field.type === 'number'
                              ? (e.target.value === '' ? null : Number(e.target.value))
                              : e.target.value
                            updateSetting(stage, field.key, v)
                          }}
                          className="h-7 text-sm"
                          step={field.type === 'number' ? 'any' : undefined}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          <Separator />

          {/* Save button */}
          <div className="flex justify-end pb-4">
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
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
