/**
 * Field renderer used by StageSettingsPanel.
 * Holds only renderField so the .tsx file isn't a Fast Refresh boundary —
 * helper control components live in SettingsControls.controls.tsx.
 */

import type { FieldDef } from './fieldConfigs'
import {
  DropdownControl,
  ComboControl,
  SliderControl,
  ToggleControl,
  LoraSelector,
  VoiceSelector,
} from './SettingsControls.controls'
import { inputClass, labelClass, rowClass, helperClass } from './SettingsControls.styles'

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
        <div>
          <div className={rowClass}>
            {labelNode}
            <ToggleControl value={effectiveValue} onChange={v => onChange(v)} />
          </div>
          {field.helper && <p className={`${helperClass} text-right`}>{field.helper}</p>}
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
