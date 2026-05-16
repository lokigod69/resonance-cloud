/**
 * Stage settings panel — renders all fields for a stage.
 * Field renderer lives in SettingsControls.utils.tsx;
 * form control components live in SettingsControls.controls.tsx;
 * shared style constants live in SettingsControls.styles.ts.
 */

import type { FieldDef } from './fieldConfigs'
import { STAGE_FIELDS } from './fieldConfigs'
import { renderField } from './SettingsControls.utils'

export function StageSettingsPanel({ stage, stageSettings, onChange, labelExtra }: {
  stage: string
  stageSettings: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  labelExtra?: (field: FieldDef) => React.ReactNode
}) {
  const fields = STAGE_FIELDS[stage] || []

  // Merge field defaults into stageSettings so condition functions (e.g. isLtx)
  // work even when the saved profile is missing keys like video_mode.
  const merged: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.default !== undefined) merged[f.key] = f.default
  }
  Object.assign(merged, stageSettings)

  const mainFields = fields.filter(f => !f.advanced)
  const advancedFields = fields.filter(f => f.advanced)

  const visibleMain = mainFields.filter(f => !f.condition || f.condition(merged))
  const visibleAdvanced = advancedFields.filter(f => !f.condition || f.condition(merged))

  return (
    <div className="space-y-0.5">
      <div className="divide-y divide-[var(--border)]">
        {visibleMain.map((field, i) => (
          <div key={`${field.key}-${i}`}>
            {renderField(field, merged[field.key], v => onChange(field.key, v), labelExtra?.(field), merged, onChange)}
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
                {renderField(field, merged[field.key], v => onChange(field.key, v), labelExtra?.(field), merged, onChange)}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
