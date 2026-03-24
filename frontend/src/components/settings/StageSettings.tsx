/**
 * Per-word inline settings panel with inherited/overridden indicators.
 * Auto-saves with 500ms debounce.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader, RotateCcw } from 'lucide-react'
import { getWordStageSettings, updateWordSettings, deleteWordStageSettings } from '../../api'
import type { FieldDef } from './fieldConfigs'
import { StageSettingsPanel } from './SettingsControls'

interface StageSettingsProps {
  slug: string
  stage: string
  onOverridesChange?: (hasOverrides: boolean) => void
}

export function StageSettings({ slug, stage, onOverridesChange }: StageSettingsProps) {
  const [effective, setEffective] = useState<Record<string, unknown>>({})
  const [overrides, setOverrides] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getWordStageSettings(slug, stage)
      setEffective(data.effective)
      setOverrides(data.overrides)
      onOverridesChange?.(Object.keys(data.overrides).length > 0)
    } catch {}
    setLoading(false)
  }, [slug, stage, onOverridesChange])

  useEffect(() => {
    setLoading(true)
    fetchSettings()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchSettings])

  const handleChange = (key: string, value: unknown) => {
    // Update local state immediately
    setEffective(prev => ({ ...prev, [key]: value }))
    setOverrides(prev => ({ ...prev, [key]: value }))
    onOverridesChange?.(true)

    // Debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await updateWordSettings(slug, stage, { [key]: value })
      } catch {}
    }, 500)
  }

  const handleReset = async () => {
    setResetting(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    try {
      await deleteWordStageSettings(slug, stage)
      await fetchSettings()
    } catch {}
    setResetting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader size={14} className="animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  const hasOverrides = Object.keys(overrides).length > 0

  const labelExtra = (field: FieldDef) => {
    if (field.key in overrides) {
      return (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] ml-1.5 flex-shrink-0"
          title="Overridden (per-word)"
        />
      )
    }
    return null
  }

  return (
    <div className="border border-[var(--border)] rounded bg-[var(--bg-card)] px-4 py-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Per-word overrides
        </span>
        {hasOverrides && (
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            {resetting ? <Loader size={10} className="animate-spin" /> : <RotateCcw size={10} />}
            Reset to Batch Defaults
          </button>
        )}
      </div>
      <StageSettingsPanel
        stage={stage}
        stageSettings={effective}
        onChange={handleChange}
        labelExtra={labelExtra}
      />
    </div>
  )
}
