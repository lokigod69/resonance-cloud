import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import dimensions from '../../../public/guided/brand/manifest.json'

export type GuidedBrandKind = keyof typeof dimensions

/** Decoration only: readable labels and ordinary buttons carry every interaction. */
export function GuidedBrand({ kind, className }: { kind: GuidedBrandKind; className?: string }) {
  const asset = kind === 'success-ribbon' ? 'success-lw-v3' : kind
  return <img
    src={`/guided/brand/${asset}.webp`}
    width={dimensions[asset].width}
    height={dimensions[asset].height}
    alt=""
    aria-hidden="true"
    draggable={false}
    decoding="async"
    onError={(event) => { event.currentTarget.style.visibility = 'hidden' }}
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
