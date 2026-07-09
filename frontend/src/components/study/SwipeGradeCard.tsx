import { useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion, animate, useMotionValue, useTransform, useReducedMotion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { Check, X } from 'lucide-react'

export type SwipeGrade = 'remembered' | 'reviewLater'

interface SwipeGradeCardProps {
  /**
   * Called when a swipe commits. Must return whether the grade was accepted;
   * on false the card springs back instead of staying flung offscreen.
   */
  onGrade: (grade: SwipeGrade) => boolean
  children: ReactNode
  className?: string
  /** Extra styles (e.g. perspective for a 3D flip child); cannot override x/rotate/touchAction. */
  style?: CSSProperties
}

// Momentum projection (Apple, "Designing Fluid Interfaces"): where the card
// would coast to if released now — exponential decay, so a flick commits from
// a small offset while a slow release near the center springs back.
const DECELERATION_RATE = 0.998
function projectMomentum(velocityPxPerS: number) {
  return ((velocityPxPerS / 1000) * DECELERATION_RATE) / (1 - DECELERATION_RATE)
}

// Grades the current card by dragging it: right = remembered, left = review
// later. Tracks the pointer 1:1, decides commit vs. return from the projected
// resting point (velocity sign wins over position, so a drag pulled back the
// other way commits the other way), and hands the release velocity into the
// spring so there is no seam between finger and animation. Buttons and
// keyboard remain the accessible path; this layer adds no strings.
export function SwipeGradeCard({ onGrade, children, className, style }: SwipeGradeCardProps) {
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const committedRef = useRef(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-280, 280], [-7, 7])

  // Stamp + glow feedback ramps in over the first ~two-thirds of the commit distance
  const rememberedOpacity = useTransform(x, [28, 132], [0, 1])
  const rememberedStampScale = useTransform(x, [28, 132], [0.72, 1])
  const reviewOpacity = useTransform(x, [-132, -28], [1, 0])
  const reviewStampScale = useTransform(x, [-132, -28], [1, 0.72])

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (committedRef.current) return
    const offset = x.get()
    const velocity = info.velocity.x
    const width = containerRef.current?.offsetWidth ?? 320
    const commitDistance = Math.min(width * 0.42, 200)
    const projected = offset + projectMomentum(velocity)

    if (Math.abs(projected) > commitDistance) {
      const dir = projected > 0 ? 1 : -1
      committedRef.current = true
      const accepted = onGrade(dir === 1 ? 'remembered' : 'reviewLater')
      if (accepted) {
        // The exiting clone keeps this animation running while the session
        // state has already advanced underneath it — zero input lockout.
        if (!reducedMotion) {
          void animate(x, dir * Math.max(window.innerWidth, width) * 0.9, {
            type: 'spring', stiffness: 200, damping: 27, velocity,
          })
        }
        return
      }
      committedRef.current = false
    }

    // Spring back carrying the finger's velocity; slight bounce is earned
    // here because the gesture itself had momentum.
    void animate(x, 0, reducedMotion
      ? { duration: 0.18, ease: 'easeOut' }
      : { type: 'spring', stiffness: 400, damping: 30, velocity })
  }

  return (
    <motion.div
      ref={containerRef}
      drag="x"
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ ...style, x, rotate: reducedMotion ? 0 : rotate, touchAction: 'pan-y' }}
      className={className ? `relative ${className}` : 'relative'}
    >
      {children}

      {/* Directional glows — same feedback language as the grading pulse */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          opacity: rememberedOpacity,
          boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.35), 0 0 42px rgba(34, 197, 94, 0.24)',
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          opacity: reviewOpacity,
          boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.35), 0 0 42px rgba(239, 68, 68, 0.24)',
        }}
      />

      {/* Stamps — mirror the grading buttons' visual language, riding the card */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500/60 bg-green-500/20 text-green-400"
        style={{ opacity: rememberedOpacity, scale: rememberedStampScale, y: '-50%' }}
      >
        <Check className="h-7 w-7" />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500/60 bg-red-500/20 text-red-400"
        style={{ opacity: reviewOpacity, scale: reviewStampScale, y: '-50%' }}
      >
        <X className="h-7 w-7" />
      </motion.div>
    </motion.div>
  )
}
