import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { HomeVisit } from '@/hooks/useHomeVisit'

// CurrentStrip — status-only text on the waterline (§0/§3). No buttons, no
// taps: navigation lives in the card CTA, the nav, and the buoys. Tokens
// render only for composed segments, and when the line overflows (German
// reaches ~59ch against a 375pt viewport) tokens drop by priority:
// `Next:` first, then completed tokens, then the CURRENT label — the
// progress-in-flight numbers are the last thing standing. Height is fixed so
// dropping tokens never moves the waterline.

type CurrentStripProps = {
  visit: HomeVisit | null
  /** Lesson number for the token — null when the mission snapshot cannot name
   * it honestly (token drops entirely rather than lie). */
  lessonNumber: number | null
  /** Recall segment finished through the pool-empty arm (§4). */
  poolEmpty: boolean
}

export default function CurrentStrip({ visit, lessonNumber, poolEmpty }: CurrentStripProps) {
  const { t } = useTranslation()
  const lineRef = useRef<HTMLDivElement | null>(null)
  const [dropLevel, setDropLevel] = useState(0)

  const segments = visit?.segments
  const recallDone = visit ? visit.graded >= visit.proposed || poolEmpty : false
  const speakPending = Boolean(segments?.speak) && !visit?.speakDone
  const lessonToken = segments?.lesson && lessonNumber !== null
    ? { text: t('home.fl.current.lesson', { lesson: lessonNumber }), done: Boolean(visit?.lessonDone) }
    : null
  const recallToken = segments?.recall && visit
    ? { text: t('home.fl.current.recall', { graded: visit.graded, proposed: visit.proposed }), done: recallDone }
    : null
  const allDone = Boolean(visit) && !speakPending
    && (!segments?.lesson || visit!.lessonDone)
    && (!segments?.recall || recallDone)
    && Object.keys(segments ?? {}).length > 0

  const tokens: Array<{ text: string; done: boolean; kind: 'label' | 'progress' | 'next' }> = []
  if (visit) {
    tokens.push({ text: t('home.fl.current.label'), done: false, kind: 'label' })
    if (lessonToken) tokens.push({ text: lessonToken.done ? `${lessonToken.text} ✓` : lessonToken.text, done: lessonToken.done, kind: 'progress' })
    if (recallToken) tokens.push({ text: recallToken.done ? `${recallToken.text} ✓` : recallToken.text, done: recallToken.done, kind: 'progress' })
    if (allDone) tokens.push({ text: t('home.fl.current.done'), done: false, kind: 'progress' })
    else if (speakPending) tokens.push({ text: t('home.fl.current.next', { step: t('nav.speak') }), done: false, kind: 'next' })
  }

  const visible = tokens.filter((token) => {
    if (dropLevel >= 1 && token.kind === 'next') return false
    if (dropLevel >= 2 && token.kind === 'progress' && token.done) return false
    if (dropLevel >= 3 && token.kind === 'label') return false
    return true
  })

  // Re-fit whenever content or viewport changes: reset, then escalate the drop
  // level until the line fits (or nothing droppable remains).
  const contentKey = tokens.map((token) => token.text).join('|')
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern
    setDropLevel(0)
  }, [contentKey])

  useLayoutEffect(() => {
    const el = lineRef.current
    if (!el) return
    const fit = () => {
      if (el.scrollWidth > el.clientWidth + 1) {
        setDropLevel((level) => (level < 3 ? level + 1 : level))
      }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [contentKey, dropLevel])

  return (
    <div className="flex min-h-6 w-full items-center justify-center px-4">
      <div
        ref={lineRef}
        className="flex max-w-full items-center gap-2 overflow-hidden whitespace-nowrap font-display text-[13px] font-medium tracking-wide text-[var(--accent-2)]"
        style={{ textShadow: '0 2px 14px rgba(5,2,8,0.6)' }}
      >
        <span aria-hidden="true" className="opacity-60">···</span>
        {visible.map((token, index) => (
          <span key={token.text} className={token.kind === 'label' ? 'uppercase tracking-[0.18em]' : undefined}>
            {index > 0 ? <span aria-hidden="true" className="mr-2 opacity-60">·</span> : null}
            {token.text}
          </span>
        ))}
        <span aria-hidden="true" className="opacity-60">···</span>
      </div>
    </div>
  )
}
