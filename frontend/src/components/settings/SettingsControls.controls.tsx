/**
 * Form control components used by the SettingsControls renderer.
 * Split out of SettingsControls.tsx so each .tsx file holds only React
 * components (satisfies react-refresh/only-export-components).
 */

import { useState, useEffect } from 'react'
import { getLoras, getVoices, getSupabaseVoices } from '../../api'
import type { LoraInfo, Voice } from '../../api'
import { selectClass, inputClass } from './SettingsControls.styles'

export function DropdownControl({ value, options, onChange, labels }: {
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

export function ComboControl({ value, options, presets, presetGroups, labels, onChange }: {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options/allFixed are derived fresh each render; tracking only `value` is intentional
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

export function SliderControl({ value, min, max, step, onChange }: {
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

export function ToggleControl({ value, onChange }: { value: unknown; onChange: (v: boolean) => void }) {
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

export function LoraSelector({ value, allSettings, onChangeByKey }: {
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

export function VoiceSelector({ value, onChange }: {
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
    Promise.all([
      getVoices().catch(() => [] as Voice[]),
      getSupabaseVoices().catch(() => [] as Voice[]),
    ]).then(([local, remote]) => {
      const seen = new Set(local.map(v => v.voice_id))
      const merged = [...local, ...remote.filter(v => !seen.has(v.voice_id))]
      setVoices(merged)
      setVoicesLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (voicesLoaded && currentId && !voices.some(v => v.voice_id === currentId)) {
      setShowCustom(true)
      setCustomVal(currentId)
    }
  }, [voicesLoaded, currentId, voices])

  const isInCustomMode = showCustom || (currentId !== '' && !selectedVoice && voicesLoaded)

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
