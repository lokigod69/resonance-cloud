import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PillButtonProps {
  glow?: boolean
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

export default function PillButton({
  glow,
  variant = 'primary',
  className,
  children,
  disabled,
  onClick,
}: PillButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5',
        'text-sm font-medium transition-all duration-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
        'disabled:opacity-40 disabled:pointer-events-none',
        variant === 'primary' && [
          'glass-strong text-foreground',
          'border border-border',
          'hover:bg-accent',
        ],
        variant === 'secondary' && [
          'glass text-foreground/70',
          'border border-border',
          'hover:text-foreground hover:bg-accent',
        ],
        glow && 'border-[var(--accent)]/40 shadow-[0_0_24px_var(--accent-glow)]',
        className
      )}
    >
      {children}
    </motion.button>
  )
}
