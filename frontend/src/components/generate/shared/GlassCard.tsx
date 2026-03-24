import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export default function GlassCard({ selected, disabled, onClick, children, className }: GlassCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn(
        'glass rounded-2xl border border-white/10 p-5 text-left transition-colors duration-200',
        selected && 'glass-selected glow-green border-[#4ade80]/40',
        disabled && 'opacity-40 pointer-events-none',
        !selected && !disabled && 'glass-hover cursor-pointer',
        className
      )}
    >
      {children}
    </motion.button>
  )
}
