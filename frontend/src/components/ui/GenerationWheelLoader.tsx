import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

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
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background:
              'conic-gradient(from 0deg, var(--pg-accent-teal, #0de2c3), var(--pg-accent-violet, #8b5cf6), var(--pg-accent-rose, #f43f5e), var(--pg-accent-teal, #0de2c3))',
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background:
              'conic-gradient(from 0deg, var(--pg-accent-teal, #0de2c3), var(--pg-accent-violet, #8b5cf6), var(--pg-accent-rose, #f43f5e), var(--pg-accent-teal, #0de2c3))',
            opacity: 0.4,
          }}
        />
      </div>
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
