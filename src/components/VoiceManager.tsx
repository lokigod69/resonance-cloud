import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Copy, Check } from 'lucide-react'
import { getVoices, createVoice, updateVoice, deleteVoice, getSupportedLanguages } from '../api'
import type { Voice } from '../api'

interface VoiceManagerProps {
  onClose: () => void
}

export function VoiceManager({ onClose }: VoiceManagerProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Voice | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formVoiceId, setFormVoiceId] = useState('')
  const [formLanguage, setFormLanguage] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchVoices = () => {
    setError(null)
    getVoices()
      .then(v => { setVoices(v); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  useEffect(() => {
    fetchVoices()
    getSupportedLanguages().then(setLanguages).catch(() => {})
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormVoiceId('')
    setFormLanguage('')
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
    setFormNotes(voice.notes)
    setEditing(voice)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formVoiceId.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateVoice(editing.id, {
          name: formName.trim(),
          voice_id: formVoiceId.trim(),
          language: formLanguage,
          notes: formNotes.trim(),
        })
      } else {
        await createVoice({
          name: formName.trim(),
          voice_id: formVoiceId.trim(),
          language: formLanguage,
          notes: formNotes.trim(),
        })
      }
      resetForm()
      fetchVoices()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      await deleteVoice(id)
      setConfirmDelete(null)
      fetchVoices()
    } catch (e) {
      setError(String(e))
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Group voices by language for display
  const grouped = voices.reduce<Record<string, Voice[]>>((acc, v) => {
    const lang = v.language || 'Other'
    ;(acc[lang] ??= []).push(v)
    return acc
  }, {})
  const sortedLangs = Object.keys(grouped).sort()

  const inputClass = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg w-[720px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Voice Library</h2>
          <div className="flex items-center gap-2">
            {!showForm && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white transition-colors"
              >
                <Plus size={12} />
                Add Voice
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors">
              <X size={14} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 px-3 py-2 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded text-xs text-[var(--error)]">
            {error}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="px-5 py-4 border-b border-[var(--border)] space-y-3">
            <h3 className="text-xs font-medium text-[var(--text-secondary)]">
              {editing ? 'Edit Voice' : 'Add New Voice'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Marie - bright French"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">ElevenLabs Voice ID *</label>
                <input
                  type="text"
                  value={formVoiceId}
                  onChange={e => setFormVoiceId(e.target.value)}
                  placeholder="e.g., EXAVITQu4vr4xnSDxMaL"
                  className={inputClass + ' font-mono text-xs'}
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Language</label>
                <select
                  value={formLanguage}
                  onChange={e => setFormLanguage(e.target.value)}
                  className={inputClass + ' appearance-none cursor-pointer'}
                >
                  <option value="">Select language...</option>
                  {languages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g., quiet voice, good clarity"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={resetForm}
                className="px-3 py-1.5 rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formVoiceId.trim()}
                className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Voice list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">Loading voices…</p>
          ) : voices.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">
              No voices saved yet. Click "Add Voice" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedLangs.map(lang => (
                <div key={lang}>
                  <h4 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    {lang}
                  </h4>
                  <div className="space-y-1">
                    {grouped[lang].map(voice => (
                      <div
                        key={voice.id}
                        className="flex items-center gap-3 px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {voice.name}
                            </span>
                          </div>
                          {voice.notes && (
                            <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{voice.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => copyToClipboard(voice.voice_id, voice.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                            title={voice.voice_id}
                          >
                            {copiedId === voice.id ? <Check size={10} className="text-[var(--success)]" /> : <Copy size={10} />}
                            {voice.voice_id.slice(0, 10)}…
                          </button>

                          <button
                            onClick={() => openEdit(voice)}
                            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>

                          {confirmDelete === voice.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(voice.id)}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--error)] text-white"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 rounded text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(voice.id)}
                              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
