import { Check } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { SongLyricMode } from '@/lib/songGeneration'

const DEPTHS: Array<{ mode: SongLyricMode; labelKey: string }> = [
  { mode: 'reliable', labelKey: 'modal.generateSong.depth.short' },
  { mode: 'contextual', labelKey: 'modal.generateSong.depth.phrase' },
  { mode: 'creative', labelKey: 'modal.generateSong.depth.story' },
  { mode: 'dramatic', labelKey: 'modal.generateSong.depth.long' },
]

export function LyricDepthPicker({
  value,
  onChange,
}: {
  value: SongLyricMode
  onChange: (value: SongLyricMode) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {DEPTHS.map((depth) => {
        const selected = value === depth.mode
        return (
          <button
            key={depth.mode}
            type="button"
            onClick={() => onChange(depth.mode)}
            className={[
              'h-10 rounded-md border px-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            {selected && <Check className="h-4 w-4" />}
            {t(depth.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
