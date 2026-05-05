import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { OrbSpinner } from './OrbSpinner'

interface GenerationWheelLoaderProps {
  label?: string
  sublabel?: string
  size?: number
  className?: string
  labelClassName?: string
}

export function GenerationWheelLoader({
  label,
  sublabel,
  size = 96,
  className,
  labelClassName,
}: GenerationWheelLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-6 text-center', className)}>
      <OrbSpinner size={size} ariaLabel={label || 'Generating'} />
      {(label || sublabel) && (
        <div className="space-y-2">
          {label && (
            <motion.h2
              className={cn('text-3xl font-bold font-display', labelClassName)}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {label}
            </motion.h2>
          )}
          {sublabel && (
            <p className="text-sm text-[var(--pg-text-dim,var(--text-muted))] max-w-sm">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
