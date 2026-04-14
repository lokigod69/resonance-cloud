import { getLevelInfo, type LevelTier } from '@/lib/levelUtils'
import { cn } from '@/lib/utils'

const tierStyles: Record<LevelTier, string> = {
  stone:    'bg-slate-500 text-white border-slate-400/60',
  bronze:   'bg-amber-700 text-white border-amber-500/50',
  silver:   'bg-slate-400 text-slate-950 border-slate-300/60',
  gold:     'bg-yellow-500 text-slate-950 border-yellow-400/50',
  emerald:  'bg-emerald-600 text-white border-emerald-400/50',
  amethyst: 'bg-purple-600 text-white border-purple-400/50',
}

export default function LevelBadge({ wordCount }: { wordCount: number }) {
  const info = getLevelInfo(wordCount)

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-sm font-semibold',
          tierStyles[info.tier],
        )}
      >
        {info.label}
      </span>
      <span className="text-xs text-muted-foreground">{info.progress}</span>
    </div>
  )
}
