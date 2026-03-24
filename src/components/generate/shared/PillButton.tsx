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
        'outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        'disabled:opacity-40 disabled:pointer-events-none',
        variant === 'primary' && [
          'glass-strong text-white',
          'border border-white/15',
          'hover:bg-white/[0.12]',
        ],
        variant === 'secondary' && [
          'glass text-white/70',
          'border border-white/10',
          'hover:text-white/90 hover:bg-white/[0.08]',
        ],
        glow && 'glow-green border-[#4ade80]/30',
        className
      )}
    >
      {children}
    </motion.button>
  )
}
