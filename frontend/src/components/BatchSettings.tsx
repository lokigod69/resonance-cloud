import { useState, useEffect, useRef } from 'react'
import { Save, X, Loader, Lock, Unlock, ChevronDown, SaveAll, Trash2 } from 'lucide-react'
import { getDefaults, updateDefaults, listPresets, loadPreset, savePreset, deletePreset } from '../api'
import type { PresetSummary } from '../api'
import { STAGE_LABELS } from './settings/fieldConfigs'
import { StageSettingsPanel } from './settings/SettingsControls'
import { useToast } from './Toast'

const LS_LOCKED_KEY = 'batchSettingsLocked'
const LS_DATA_KEY = 'batchSettingsData'

interface BatchSettingsProps {
  onClose: () => void
}

type Settings = Record<string, Record<string, unknown>>

export function BatchSettings({ onClose }: BatchSettingsProps) {
  const [settings, setSettings] = useState<Settings>({})
  const [activeStage, setActiveStage] = useState('images')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(() => localStorage.getItem(LS_LOCKED_KEY) === 'true')

  // Presets
  const { toast } = useToast()
  const [presets, setPresets] = useState<PresetSummary[]>([])
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string | null>(null)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [showSaveAsInput, setShowSaveAsInput] = useState(false)
  const [presetNameInput, setPresetNameInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showPresetDropdown) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPresetDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showPresetDropdown])

  // Fetch presets on mount
  useEffect(() => { listPresets().then(setPresets).catch(() => {}) }, [])

  const refreshPresets = () => listPresets().then(setPresets).catch(() => {})

  const handleLoadPreset = async (slug: string) => {
    try {
      const preset = await loadPreset(slug)
      // Auto-unlock on preset load
      localStorage.removeItem(LS_LOCKED_KEY)
      localStorage.removeItem(LS_DATA_KEY)
      setLocked(false)
      setSettings(preset.settings)
      setSelectedPresetSlug(slug)
      setSaved(false)
      toast(`Loaded preset "${preset.name}"`, 'success')
    } catch (err) {
      toast('Failed to load preset', 'error')
    }
  }

  const handleSaveAsPreset = async () => {
    const name = presetNameInput.trim()
    if (!name) return
    try {
      const result = await savePreset(name, settings)
      setSelectedPresetSlug(result.slug)
      setShowSaveAsInput(false)
      setPresetNameInput('')
      await refreshPresets()
      toast(`Saved preset "${result.name}"`, 'success')
    } catch (err) {
      toast('Failed to save preset', 'error')
    }
  }

  const handleDeletePreset = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deletePreset(slug)
      if (selectedPresetSlug === slug) setSelectedPresetSlug(null)
      await refreshPresets()
      toast('Preset deleted', 'success')
    } catch (err) {
      toast('Failed to delete preset', 'error')
    }
  }

  useEffect(() => {
    if (locked) {
      try {
        const stored = localStorage.getItem(LS_DATA_KEY)
        if (stored) {
          setSettings(JSON.parse(stored))
          setLoading(false)
          return
        }
      } catch {}
    }
    getDefaults().then(d => {
      setSettings(d)
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load batch settings:', err)
      setLoading(false)
      setError('Failed to load settings. Please try again.')
    })
  }, [])

  const handleChange = (stage: string, key: string, value: unknown) => {
    setSettings(s => ({
      ...s,
      [stage]: { ...s[stage], [key]: value }
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateDefaults(settings)
      if (locked) {
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(settings))
      }
      setSaved(true)
    } catch (err) {
      console.error('Failed to save batch settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    }
    setSaving(false)
  }

  const toggleLock = () => {
    if (locked) {
      // Unlocking: clear localStorage, re-fetch from API
      localStorage.removeItem(LS_LOCKED_KEY)
      localStorage.removeItem(LS_DATA_KEY)
      setLocked(false)
      setLoading(true)
      setError(null)
      getDefaults().then(d => {
        setSettings(d)
        setLoading(false)
      }).catch(err => {
        console.error('Failed to reload batch settings:', err)
        setLoading(false)
        setError('Failed to reload settings. Please try again.')
      })
    } else {
      // Locking: persist current settings to localStorage
      localStorage.setItem(LS_LOCKED_KEY, 'true')
      localStorage.setItem(LS_DATA_KEY, JSON.stringify(settings))
      setLocked(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg w-[640px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Batch Settings</h2>
            {locked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--warning)]/15 text-[var(--warning)] font-medium">
                Locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLock}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                locked
                  ? 'text-[var(--warning)] bg-[var(--warning)]/10 hover:bg-[var(--warning)]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              title={locked ? 'Unlock: settings will reload from workspace on switch' : 'Lock: settings persist across workspace switches'}
            >
              {locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white rounded text-xs font-medium hover:bg-[var(--accent)]/80 transition-colors cursor-pointer"
            >
              {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
              {saved ? 'Saved \u2713' : 'Save'}
            </button>
            <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Presets bar */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--border)]">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[140px]">
                {presets.find(p => p.slug === selectedPresetSlug)?.name || 'Presets'}
              </span>
              <ChevronDown size={10} />
            </button>
            {showPresetDropdown && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-[var(--bg-card)] border border-[var(--border)] rounded-md shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                {presets.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No presets saved</div>
                ) : (
                  presets.map(p => (
                    <div
                      key={p.slug}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] group"
                    >
                      <button
                        onClick={() => { handleLoadPreset(p.slug); setShowPresetDropdown(false) }}
                        className={`flex-1 text-left text-xs truncate cursor-pointer ${
                          p.slug === selectedPresetSlug ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={(e) => handleDeletePreset(p.slug, e)}
                        className="ml-2 p-0.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all cursor-pointer"
                        title="Delete preset"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {showSaveAsInput ? (
            <form
              onSubmit={e => { e.preventDefault(); handleSaveAsPreset() }}
              className="flex items-center gap-1.5"
            >
              <input
                autoFocus
                value={presetNameInput}
                onChange={e => setPresetNameInput(e.target.value)}
                placeholder="Preset name..."
                className="px-2 py-1 bg-[var(--bg-base)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)] w-40 focus:border-[var(--accent)] outline-none"
              />
              <button
                type="submit"
                disabled={!presetNameInput.trim()}
                className="px-2 py-1 bg-[var(--accent)] text-white rounded text-xs font-medium hover:bg-[var(--accent)]/80 transition-colors cursor-pointer disabled:opacity-40"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveAsInput(false); setPresetNameInput('') }}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSaveAsInput(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              <SaveAll size={11} />
              Save As Preset
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 text-xs text-red-400 bg-red-900/20 border-b border-red-800">
            {error}
          </div>
        )}

        {/* Stage tabs + content */}
        <div className="flex flex-1 min-h-0">
          {/* Stage tabs */}
          <div className="w-36 border-r border-[var(--border)] py-2">
            {Object.keys(STAGE_LABELS).map(stage => (
              <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                  activeStage === stage
                    ? 'text-[var(--text-primary)] bg-[var(--bg-hover)] border-l-2 border-l-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>

          {/* Settings fields */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader size={16} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : (
              <StageSettingsPanel
                stage={activeStage}
                stageSettings={settings[activeStage] || {}}
                onChange={(key, value) => handleChange(activeStage, key, value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
