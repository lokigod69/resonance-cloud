import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Mic,
  Plus,
  Pencil,
  Trash2,
  Check,
  Copy,
  RefreshCw,
  X,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

type Voice = {
  id: string
  voice_id: string
  name: string
  language: string
  language_code: string
  notes: string
  created_at: string
}

const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'German', code: 'de' },
  { name: 'French', code: 'fr' },
  { name: 'Italian', code: 'it' },
  { name: 'Spanish', code: 'es' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' },
  { name: 'Mandarin', code: 'zh' },
  { name: 'Arabic', code: 'ar' },
  { name: 'Russian', code: 'ru' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Dutch', code: 'nl' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Polish', code: 'pl' },
  { name: 'Greek', code: 'el' },
  { name: 'Thai', code: 'th' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Tagalog', code: 'fil' },
  { name: 'Cebuano', code: 'fil' },
]

export default function Voices() {
  const { toast } = useToast()
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Voice | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formVoiceId, setFormVoiceId] = useState('')
  const [formLanguage, setFormLanguage] = useState('')
  const [formLanguageCode, setFormLanguageCode] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const fetchVoices = useCallback(async () => {
    const { data } = await supabase
      .from('voices')
      .select('*')
      .order('language')
      .order('name')
    if (data) setVoices(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVoices()
  }, [fetchVoices])

  const resetForm = () => {
    setFormName('')
    setFormVoiceId('')
    setFormLanguage('')
    setFormLanguageCode('')
    setFormNotes('')
    setEditing(null)
    setShowForm(false)
  }

  const openAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (voice: Voice) => {
    setFormName(voice.name)
    setFormVoiceId(voice.voice_id)
    setFormLanguage(voice.language)
    setFormLanguageCode(voice.language_code)
    setFormNotes(voice.notes)
    setEditing(voice)
    setShowForm(true)
  }

  const handleLanguageChange = (language: string) => {
    setFormLanguage(language)
    const match = LANGUAGES.find(l => l.name === language)
    if (match) setFormLanguageCode(match.code)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formVoiceId.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('voices').update({
          name: formName.trim(),
          voice_id: formVoiceId.trim(),
          language: formLanguage,
          language_code: formLanguageCode,
          notes: formNotes.trim(),
        }).eq('id', editing.id)
        if (error) throw error
        toast('Voice updated', 'success')
      } else {
        const { error } = await supabase.from('voices').insert({
          name: formName.trim(),
          voice_id: formVoiceId.trim(),
          language: formLanguage,
          language_code: formLanguageCode,
          notes: formNotes.trim(),
        })
        if (error) throw error
        toast('Voice added', 'success')
      }
      resetForm()
      await fetchVoices()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('voices').delete().eq('id', id)
      if (error) throw error
      setConfirmDelete(null)
      toast('Voice deleted', 'success')
      await fetchVoices()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(msg, 'error')
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Group voices by language
  const grouped = voices.reduce<Record<string, Voice[]>>((acc, v) => {
    const lang = v.language || 'Other'
    ;(acc[lang] ??= []).push(v)
    return acc
  }, {})
  const sortedLangs = Object.keys(grouped).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          <h1 className="text-lg font-bold">Voice Library</h1>
          <span className="text-xs text-muted-foreground">
            {voices.length} voice{voices.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Voice
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {editing ? 'Edit Voice' : 'Add New Voice'}
            </h3>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g., Marie - bright French"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">ElevenLabs Voice ID *</Label>
              <Input
                value={formVoiceId}
                onChange={e => setFormVoiceId(e.target.value)}
                placeholder="e.g., EXAVITQu4vr4xnSDxMaL"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <select
                value={formLanguage}
                onChange={e => handleLanguageChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Select language...</option>
                {LANGUAGES.map(l => (
                  <option key={l.name + l.code} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Language Code (ElevenLabs)</Label>
              <Input
                value={formLanguageCode}
                onChange={e => setFormLanguageCode(e.target.value)}
                placeholder="e.g., de, fr, fil"
                className="h-8 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Auto-filled from language. Override for special cases (e.g., "fil" for Tagalog).
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="e.g., bright tone, clear pronunciation"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formName.trim() || !formVoiceId.trim()}
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Voice'}
            </Button>
          </div>
        </Card>
      )}

      {/* Voice List */}
      {voices.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No voices yet. Click "Add Voice" to register an ElevenLabs voice for TTS pronunciation.
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedLangs.map(lang => (
            <div key={lang}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1">
                {lang}
              </p>
              <div className="space-y-1">
                {grouped[lang].map(voice => (
                  <Card
                    key={voice.id}
                    className="flex items-center gap-3 px-3 py-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{voice.name}</span>
                        {voice.language_code && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground border border-border">
                            {voice.language_code}
                          </span>
                        )}
                      </div>
                      {voice.notes && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{voice.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyToClipboard(voice.voice_id, voice.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title={voice.voice_id}
                      >
                        {copiedId === voice.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        {voice.voice_id.slice(0, 10)}...
                      </button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => openEdit(voice)}
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </Button>

                      {confirmDelete === voice.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => handleDelete(voice.id)}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-red-400"
                          onClick={() => setConfirmDelete(voice.id)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
