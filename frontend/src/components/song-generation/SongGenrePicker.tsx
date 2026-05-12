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

      <div className="flex gap-2">
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
          placeholder={t('modal.generateSong.customGenrePlaceholder')}
        />
        <button
          type="button"
          onClick={() => commitCustomGenre(custom)}
          disabled={!custom.trim()}
          className="h-9 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
          aria-label={t('modal.generateSong.genreLabel')}
        >
          <Check className="h-4 w-4" />
        </button>
      </div>

      {isCustom && (
        <p className="text-xs text-muted-foreground">
          {value}
        </p>
      )}
    </div>
  )
}
