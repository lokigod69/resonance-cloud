import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { GENRES } from '@/components/generate/wizardData'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'

const PRESET_GENRES = GENRES.filter((genre) => genre.value !== 'custom')

export function SongGenrePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const { t } = useTranslation()
  const [custom, setCustom] = useState('')
  const normalizedValue = value || 'auto'
  const presetValues = useMemo(() => PRESET_GENRES.map((genre) => genre.value), [])
  const isCustom = value !== null && !presetValues.includes(value as (typeof presetValues)[number])
  const hasCustomText = Boolean(custom.trim())
  const capturedCustomValue = isCustom ? value : custom.trim().toLowerCase()

  function commitCustomGenre(rawValue: string) {
    const trimmed = rawValue.trim().toLowerCase()
    onChange(trimmed || null)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_GENRES.map((genre) => {
          const selected = normalizedValue === genre.value
          return (
            <button
              key={genre.value}
              type="button"
              onClick={() => onChange(genre.value === 'auto' ? null : genre.value)}
              className={[
                'h-9 rounded-md border px-3 text-sm transition-colors inline-flex items-center gap-2',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {selected && <Check className="h-4 w-4" />}
              {genre.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <div className="relative">
          {hasCustomText && (
            <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          )}
          <Input
            value={custom}
            onChange={(event) => {
              const nextCustom = event.target.value
              setCustom(nextCustom)
              commitCustomGenre(nextCustom)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitCustomGenre(custom)
              }
            }}
            maxLength={40}
            className={hasCustomText ? 'border-primary bg-primary/10 pr-9 text-primary' : ''}
            placeholder={t('modal.generateSong.customGenrePlaceholder')}
          />
        </div>

        {hasCustomText && (
          <div className="flex flex-wrap gap-2">
            <div className="h-9 rounded-md border border-primary bg-primary/10 px-3 text-sm font-medium text-primary transition-colors inline-flex items-center gap-2">
              <Check className="h-4 w-4" />
              {capturedCustomValue}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
