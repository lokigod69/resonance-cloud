import { useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { GEMINI_ACCENTS, type GeminiAccent } from '@/data/geminiAccents'
import { useTranslation } from '@/hooks/useTranslation'

interface GeminiAccentPickerProps {
  selectedAccentId: string
  onSelect: (accentId: string) => void
  disabled?: boolean
}

const GROUP_LABEL_KEYS: Record<GeminiAccent['group'], string> = {
  none: '',
  regional: 'speak.accent.group.regional',
  theatrical: 'speak.accent.group.theatrical',
}

export function GeminiAccentPicker({
  selectedAccentId,
  onSelect,
  disabled,
}: GeminiAccentPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = GEMINI_ACCENTS.find((a) => a.id === selectedAccentId) ?? GEMINI_ACCENTS[0]
  const hasAccent = selectedAccentId !== 'none'

  const regional = GEMINI_ACCENTS.filter((a) => a.group === 'regional')
  const theatrical = GEMINI_ACCENTS.filter((a) => a.group === 'theatrical')

  return (
    <div className="rounded-xl bg-gray-800/30 border border-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left min-h-[44px] hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {t('speak.accent')}
        </span>
        <span className="text-[11px] text-gray-500">({t('speak.accentOptional')})</span>
        <span className="ml-auto text-xs text-white truncate">
          {hasAccent ? selected.name : t('speak.accent.none')}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 max-h-64 overflow-y-auto p-2 space-y-2">
          <AccentRow
            accent={GEMINI_ACCENTS[0]}
            selected={selectedAccentId === 'none'}
            onSelect={onSelect}
            disabled={disabled}
          />

          <AccentGroup
            label={t(GROUP_LABEL_KEYS.regional)}
            accents={regional}
            selectedAccentId={selectedAccentId}
            onSelect={onSelect}
            disabled={disabled}
          />

          <AccentGroup
            label={t(GROUP_LABEL_KEYS.theatrical)}
            accents={theatrical}
            selectedAccentId={selectedAccentId}
            onSelect={onSelect}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}

interface AccentGroupProps {
  label: string
  accents: readonly GeminiAccent[]
  selectedAccentId: string
  onSelect: (accentId: string) => void
  disabled?: boolean
}

function AccentGroup({ label, accents, selectedAccentId, onSelect, disabled }: AccentGroupProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2 pb-1">
        {label}
      </p>
      <div className="space-y-0.5">
        {accents.map((a) => (
          <AccentRow
            key={a.id}
            accent={a}
            selected={selectedAccentId === a.id}
            onSelect={onSelect}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

interface AccentRowProps {
  accent: GeminiAccent
  selected: boolean
  onSelect: (accentId: string) => void
  disabled?: boolean
}

function AccentRow({ accent, selected, onSelect, disabled }: AccentRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(accent.id)}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-lg text-left transition-colors disabled:opacity-50 ${
        selected
          ? 'bg-cyan-900/30 text-white'
          : 'text-gray-300 hover:bg-white/5'
      }`}
    >
      <span className={`inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-full border ${
        selected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </span>
      <span className="text-sm truncate">{accent.name}</span>
    </button>
  )
}
