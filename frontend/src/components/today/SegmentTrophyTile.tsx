import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import { readGuidedTrophyClozeRecord } from '@/lib/guidedTrophy'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type SegmentTrophyTileProps = {
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibeId: ActiveGuidedVibeId
}

export function SegmentTrophyTile({ pathId, segment, vibeId }: SegmentTrophyTileProps) {
  const { t } = useTranslation()
  const completionRecord = readGuidedTrophyClozeRecord(pathId, vibeId, segment)
  const isComplete = Boolean(completionRecord)
  const assetName = `${vibeId}-trophy.webp`
  const accessibleLabel = t('today.trophy.tileAria', { segment })

  return (
    <Link
      to={`/today/checkpoint?mode=trophy-cloze&path=${pathId}&segment=${segment}&vibe=${vibeId}`}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn(
        'today-segment-trophyTile flex min-w-0 items-center gap-3 rounded-lg border px-3 py-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:px-5 sm:py-5',
        isComplete && 'is-complete',
      )}
      data-trophy-segment={segment}
      data-trophy-completed={isComplete}
    >
      <span className="today-segment-trophyMedia" aria-hidden="true">
        <img
          src={`/guided/trophies/${assetName}`}
          alt=""
          className="today-segment-trophyImage"
          draggable={false}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-base font-semibold leading-tight text-[var(--text-primary)]">
          {t('today.trophy.tileTitle')}
        </span>
      </span>
      {isComplete && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#34d399]" aria-hidden="true" />}
    </Link>
  )
}
