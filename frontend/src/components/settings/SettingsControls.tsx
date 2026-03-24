/**
 * Shared settings control components and field renderer.
 * Used by both BatchSettings (global defaults) and StageSettings (per-word overrides).
 */

import { useState, useEffect } from 'react'
import type { FieldDef } from './fieldConfigs'
import { STAGE_FIELDS } from './fieldConfigs'
import { getLoras, getVoices } from '../../api'
import type { LoraInfo, Voice } from '../../api'

/* ── shared styles ── */

const selectClass = 'w-40 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring appearance-none cursor-pointer [&>option]:bg-background [&>option]:text-foreground'
const inputClass = 'w-40 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring text-right'
const labelClass = 'text-xs text-muted-foreground'
const rowClass = 'flex items-center py-1.5 gap-4'
const helperClass = 'text-[10px] text-muted-foreground mt-0.5'

/* ── control components ── */

function DropdownControl({ value, options, onChange, labels }: {
  value: unknown
  options: (string | number)[]
  onChange: (v: string | number) => void
  labels?: Record<string, string>
}) {
  return (
    <select
      value={String(value ?? '')}
      onChange={e => {
        const raw = e.target.value
        const numOpt = options.find(o => String(o) === raw && typeof o === 'number')
        onChange(numOpt !== undefined ? numOpt : raw)
      }}
      className={selectClass}
    >
      {options.map(o => <option key={String(o)} value={String(o)}>{labels?.[String(o)] ?? String(o)}</option>)}
    </select>
  )
}

function ComboControl({ value, options, presets, presetGroups, labels, onChange }: {
  value: unknown
  options: (string | number)[]
  presets?: (string | number)[]
  presetGroups?: { label: string; items: (string | number)[] }[]
  labels?: Record<string, string>
  onChange: (v: string | null) => void
}) {
  const allFixed = [...options, ...(presets || []), ...(presetGroups || []).flatMap(g => g.items)]
  const rawVal = value === null || value === undefined ? '' : String(value)
  const strVal = rawVal === '' && options.includes('none') ? 'none' : rawVal
  const isCustom = strVal !== '' && !allFixed.includes(strVal) && !allFixed.includes(Number(strVal))
  const [showCustom, setShowCustom] = useState(isCustom)
  const [customVal, setCustomVal] = useState(isCustom ? strVal : '')

  useEffect(() => {
    const rv = value === null || value === undefined ? '' : String(value)
    const sv = rv === '' && options.includes('none') ? 'none' : rv
    const custom = sv !== '' && !allFixed.includes(sv) && !allFixed.includes(Number(sv))
    setShowCustom(custom)
    if (custom) setCustomVal(sv)
  }, [value])

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={showCustom ? '__other__' : strVal}
        onChange={e => {
          if (e.target.value === '__other__') {
            setShowCustom(true)
            setCustomVal('')
          } else {
            setShowCustom(false)
            onChange(e.target.value === 'none' ? '' : (e.target.value || null))
          }
        }}
        className={selectClass}
      >
        {options.map(o => <option key={String(o)} value={String(o)}>{labels?.[String(o)] ?? String(o)}</option>)}
        {presetGroups
          ? presetGroups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map(o => <option key={String(o)} value={String(o)}>{labels?.[String(o)] ?? String(o)}</option>)}
              </optgroup>
            ))
          : presets?.map(o => <option key={String(o)} value={String(o)}>{labels?.[String(o)] ?? String(o)}</option>)
        }
        <option value="__other__">Other…</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={customVal}
          placeholder="Custom value"
          onChange={e => {
            setCustomVal(e.target.value)
            onChange(e.target.value || null)
          }}
          className={inputClass}
          autoFocus
        />
      )}
    </div>
  )
}

function SliderControl({ value, min, max, step, onChange }: {
  value: unknown
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const num = typeof value === 'number' ? value : min
  const decimals = step < 1 ? String(step).split('.')[1]?.length || 1 : 0
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={num}
        onChange={e => onChange(Number(e.target.value))}
        className="w-24 accent-[var(--ring)]"
      />
      <span className="text-xs text-[var(--foreground)] w-12 text-right font-mono">{num.toFixed(decimals)}</span>
    </div>
  )
}

function ToggleControl({ value, onChange }: { value: unknown; onChange: (v: boolean) => void }) {
  const on = !!value
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${on ? 'bg-[var(--ring)]' : 'bg-[var(--border)]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  )
}

/* ── LoRA selector ── */

function LoraSelector({ value, allSettings, onChangeByKey }: {
  value: unknown
  allSettings: Record<string, unknown>
  onChangeByKey: (key: string, value: unknown) => void
}) {
  const [loras, setLoras] = useState<LoraInfo[]>([])
  const loraId = String(value ?? '')
  const isCustom = loraId === '__custom__'
  const selectedLora = loras.find(l => l.id === loraId)

  useEffect(() => { getLoras().then(setLoras).catch(e => console.warn('Failed to load LoRAs:', e.message)) }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={loraId}
          onChange={e => {
            const id = e.target.value
            const lora = loras.find(l => l.id === id)
            if (lora) {
              onChangeByKey('lora_id', id)
              onChangeByKey('lora_id_base_path', lora.base_path)
              onChangeByKey('lora_checkpoint', lora.recommended_checkpoint)
              onChangeByKey('lora_strength', lora.recommended_strength)
              onChangeByKey('lora_trigger_phrase', lora.trigger_phrase)
              onChangeByKey('lora_path', '')
            } else if (id === '__custom__') {
              onChangeByKey('lora_id', '__custom__')
              onChangeByKey('lora_id_base_path', '')
              onChangeByKey('lora_checkpoint', '')
            } else {
              onChangeByKey('lora_id', '')
              onChangeByKey('lora_id_base_path', '')
              onChangeByKey('lora_checkpoint', '')
              onChangeByKey('lora_path', '')
              onChangeByKey('lora_strength', 0.75)
              onChangeByKey('lora_trigger_phrase', '')
            }
          }}
          className={selectClass}
        >
          <option value="">None (base model)</option>
          {loras.map(l => (
            <option key={l.id} value={l.id}>{l.display_name}</option>
          ))}
          <option value="__custom__">Custom path…</option>
        </select>
        {selectedLora && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
            {selectedLora.language_code.toUpperCase()} · {selectedLora.gender}
          </span>
        )}
      </div>

      {selectedLora && (
        <div className="flex items-center gap-2 pl-1">
          <span className="text-[10px] text-[var(--muted-foreground)]">Checkpoint</span>
          <select
            value={String(allSettings.lora_checkpoint ?? '')}
            onChange={e => onChangeByKey('lora_checkpoint', e.target.value)}
            className={selectClass + ' !w-32'}
          >
            {selectedLora.checkpoints.map(cp => (
              <option key={cp} value={cp}>
                {cp}{cp === selectedLora.recommended_checkpoint ? ' (rec)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedLora && (
        <p className="text-[10px] text-[var(--muted-foreground)] pl-1">
          Recommended strength: {selectedLora.strength_range[0]} – {selectedLora.strength_range[1]}
        </p>
      )}

      {isCustom && (
        <input
          type="text"
          value={String(allSettings.lora_path ?? '')}
          placeholder="D:\\path\\to\\lora\\checkpoint"
          onChange={e => onChangeByKey('lora_path', e.target.value || '')}
          className={inputClass + ' !w-full'}
        />
      )}
    </div>
  )
}

/* ── Voice selector ── */

function VoiceSelector({ value, onChange }: {
  value: unknown
  onChange: (v: string | null) => void
}) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const currentId = String(value ?? '')
  const selectedVoice = voices.find(v => v.voice_id === currentId)
  const [showCustom, setShowCustom] = useState(false)
  const [customVal, setCustomVal] = useState(currentId)

  useEffect(() => {
    getVoices()
      .then(v => { setVoices(v); setVoicesLoaded(true) })
      .catch(() => { setVoicesLoaded(true) })
  }, [])

  // Sync custom mode once voices are loaded and current value isn't in the registry
  useEffect(() => {
    if (voicesLoaded && currentId && !voices.some(v => v.voice_id === currentId)) {
      setShowCustom(true)
      setCustomVal(currentId)
    }
  }, [voicesLoaded, currentId])

  // Custom mode: explicitly toggled, or value exists but not found in loaded registry
  const isInCustomMode = showCustom || (currentId !== '' && !selectedVoice && voicesLoaded)

  // Group voices by language
  const grouped = voices.reduce<Record<string, Voice[]>>((acc, v) => {
    const lang = v.language || 'Other'
    ;(acc[lang] ??= []).push(v)
    return acc
  }, {})
  const sortedLangs = Object.keys(grouped).sort()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={isInCustomMode ? '__custom__' : (!voicesLoaded && currentId ? '__loading__' : currentId)}
          onChange={e => {
            const val = e.target.value
            if (val === '__custom__') {
              setShowCustom(true)
              setCustomVal('')
              // Don't update the actual setting until user types a value
            } else {
              setShowCustom(false)
              onChange(val || null)
            }
          }}
          className={selectClass}
        >
          <option value="">No voice selected</option>
          {!voicesLoaded && currentId && (
            <option value="__loading__" disabled>Loading voices…</option>
          )}
          {sortedLangs.map(lang => (
            <optgroup key={lang} label={lang}>
              {grouped[lang].map(v => (
                <option key={v.id} value={v.voice_id}>{v.name}</option>
              ))}
            </optgroup>
          ))}
          <option value="__custom__">Use custom ID…</option>
        </select>
        {selectedVoice?.language && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]">
            {selectedVoice.language}
          </span>
        )}
        {isInCustomMode && customVal && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ring)]/15 text-[var(--ring)] border border-[var(--ring)]/30">
            Custom voice
          </span>
        )}
      </div>

      {isInCustomMode && (
        <input
          type="text"
          value={customVal}
          placeholder="Paste ElevenLabs voice ID"
          onChange={e => {
            setCustomVal(e.target.value)
            onChange(e.target.value || null)
          }}
          className={inputClass + ' !w-full'}
          autoFocus
        />
      )}
    </div>
  )
}

/* ── field renderer ── */

export function renderField(
  field: FieldDef,
  value: unknown,
  onChange: (v: unknown) => void,
  labelExtra?: React.ReactNode,
  allSettings?: Record<string, unknown>,
  onChangeByKey?: (key: string, value: unknown) => void,
) {
  const effectiveValue = value !== undefined ? value : field.default

  const labelNode = (
    <span className={`${labelClass} w-44 shrink-0`}>
      {field.label}
      {labelExtra}
    </span>
  )

  switch (field.type) {
    case 'dropdown':
      return (
        <div className={rowClass}>
          {labelNode}
          <DropdownControl
            value={effectiveValue}
            options={field.options!}
            labels={field.optionLabels}
            onChange={v => {
              if (field.sendAsString) onChange(String(v))
              else onChange(v)
            }}
          />
        </div>
      )

    case 'combo':
      return (
        <div className={rowClass}>
          {labelNode}
          <ComboControl
            value={effectiveValue}
            options={field.options!}
            presets={field.comboPresets}
            presetGroups={field.comboPresetGroups}
            labels={field.optionLabels}
            onChange={v => onChange(v)}
          />
        </div>
      )

    case 'slider':
      return (
        <div>
          <div className={rowClass}>
            {labelNode}
            <SliderControl
              value={effectiveValue}
              min={field.min!}
              max={field.max!}
              step={field.step!}
              onChange={v => onChange(v)}
            />
          </div>
          {field.helper && <p className={`${helperClass} text-right`}>{field.helper}</p>}
        </div>
      )

    case 'toggle':
      return (
        <div className={rowClass}>
          {labelNode}
          <ToggleControl value={effectiveValue} onChange={v => onChange(v)} />
        </div>
      )

    case 'number': {
      const numVal = effectiveValue === null || effectiveValue === undefined ? '' : String(effectiveValue)
      return (
        <div>
          <div className={rowClass}>
            {labelNode}
            <input
              type="number"
              value={numVal}
              placeholder={field.placeholder}
              onChange={e => {
                const raw = e.target.value
                if (raw === '') onChange(null)
                else onChange(Number(raw))
              }}
              className={inputClass}
            />
          </div>
          {field.helper && <p className={`${helperClass} text-right`}>{field.helper}</p>}
        </div>
      )
    }

    case 'text':
      return (
        <div className={rowClass}>
          {labelNode}
          <input
            type="text"
            value={effectiveValue === null || effectiveValue === undefined ? '' : String(effectiveValue)}
            placeholder={field.placeholder}
            onChange={e => onChange(e.target.value || null)}
            className={inputClass}
          />
        </div>
      )

    case 'readonly': {
      const txt = typeof field.readonlyText === 'function'
        ? field.readonlyText({})
        : field.readonlyText || ''
      return (
        <div className={rowClass}>
          {labelNode}
          <span className="text-xs text-[var(--muted-foreground)] italic">{txt}</span>
        </div>
      )
    }

    case 'lora':
      return (
        <div className={rowClass}>
          {labelNode}
          <LoraSelector
            value={effectiveValue}
            allSettings={allSettings || {}}
            onChangeByKey={onChangeByKey || (() => {})}
          />
        </div>
      )

    case 'voice':
      return (
        <div>
          <div className={rowClass}>
            {labelNode}
            <VoiceSelector value={effectiveValue} onChange={v => onChange(v)} />
          </div>
          {field.helper && <p className={`${helperClass} text-right`}>{field.helper}</p>}
        </div>
      )
  }
}

/* ── stage settings panel (renders all fields for a stage) ── */

export function StageSettingsPanel({ stage, stageSettings, onChange, labelExtra }: {
  stage: string
  stageSettings: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  labelExtra?: (field: FieldDef) => React.ReactNode
}) {
  const fields = STAGE_FIELDS[stage] || []
  const mainFields = fields.filter(f => !f.advanced)
  const advancedFields = fields.filter(f => f.advanced)

  const visibleMain = mainFields.filter(f => !f.condition || f.condition(stageSettings))
  const visibleAdvanced = advancedFields.filter(f => !f.condition || f.condition(stageSettings))

  return (
    <div className="space-y-0.5">
      <div className="divide-y divide-[var(--border)]">
        {visibleMain.map((field, i) => (
          <div key={`${field.key}-${i}`}>
            {renderField(field, stageSettings[field.key], v => onChange(field.key, v), labelExtra?.(field), stageSettings, onChange)}
          </div>
        ))}
      </div>

      {visibleAdvanced.length > 0 && (
        <details className="mt-3 border border-[var(--border)] rounded">
          <summary className="px-3 py-2 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--muted-foreground)] select-none">
            Advanced Settings
          </summary>
          <div className="px-3 pb-2 divide-y divide-[var(--border)]">
            {visibleAdvanced.map((field, i) => (
              <div key={`${field.key}-${i}`}>
                {renderField(field, stageSettings[field.key], v => onChange(field.key, v), labelExtra?.(field), stageSettings, onChange)}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
