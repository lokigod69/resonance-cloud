import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface OrbSpinnerProps {
  size?: number
  className?: string
  ariaLabel?: string
}

const ORB_GRADIENT =
  'conic-gradient(from 0deg, var(--pg-accent-teal, #0de2c3), var(--pg-accent-violet, #8b5cf6), var(--pg-accent-rose, #f43f5e), var(--pg-accent-teal, #0de2c3))'

export function OrbSpinner({ size = 96, className, ariaLabel = 'Loading' }: OrbSpinnerProps) {
  const reduce = useReducedMotion()

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn('relative inline-block bg-transparent', className)}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="rounded-full"
        style={{ width: size, height: size, background: ORB_GRADIENT }}
        animate={reduce ? { opacity: [0.7, 1, 0.7] } : { rotate: 360 }}
        transition={
          reduce
            ? { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }
            : { repeat: Infinity, duration: 3, ease: 'linear' }
        }
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: ORB_GRADIENT, opacity: reduce ? 0.25 : 0.4 }}
      />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )
}

export default OrbSpinner
