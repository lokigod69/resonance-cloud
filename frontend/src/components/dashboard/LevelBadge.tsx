import { getLevelInfo } from '@/lib/levelUtils'
import { getLevelEmblem } from './LevelEmblem'

export default function LevelBadge({ wordCount }: { wordCount: number }) {
  const info = getLevelInfo(wordCount)

  return (
    <div className="inline-flex items-center gap-2">
      {getLevelEmblem(info.level)}
      <span className="text-xs text-muted-foreground">{info.progress}</span>
    </div>
  )
}
