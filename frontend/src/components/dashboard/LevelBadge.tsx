import { getLevelInfo } from '@/lib/levelUtils'
import LevelEmblem from './LevelEmblem'

export default function LevelBadge({ wordCount }: { wordCount: number }) {
  const info = getLevelInfo(wordCount)

  return (
    <div className="inline-flex items-center gap-2">
      <LevelEmblem level={info.level} />
      <span className="text-xs text-muted-foreground">{info.progress}</span>
    </div>
  )
}
