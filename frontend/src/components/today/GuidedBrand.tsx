import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import dimensions from '../../../public/guided/brand/manifest.json'

export type GuidedBrandKind = keyof typeof dimensions

/** Decoration only: readable labels and ordinary buttons carry every interaction. */
export function GuidedBrand({ kind, className }: { kind: GuidedBrandKind; className?: string }) {
  return <img
    src={`/guided/brand/${kind}.webp`}
    width={dimensions[kind].width}
    height={dimensions[kind].height}
    alt=""
    aria-hidden="true"
    draggable={false}
    decoding="async"
    className={cn('today-brand-art', className)}
  />
}

export function GuidedFeedback({ status, children, id }: {
  status: 'idle' | 'correct' | 'wrong' | 'revealed'
  children: ReactNode
  id?: string
}) {
  return <div id={id} aria-live="polite" className="today-answer-feedback today-brand-feedback" data-feedback={status}>
    {status !== 'idle' && <GuidedBrand key={status} kind={status === 'correct' ? 'success-ribbon' : status === 'wrong' ? 'retry-ribbon' : 'current-crest'} />}
    <span>{children}</span>
  </div>
}
