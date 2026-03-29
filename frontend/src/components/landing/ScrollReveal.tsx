import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'blur'
}

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion()

  const initial = reducedMotion
    ? {}
    : direction === 'blur'
      ? { opacity: 0, filter: 'blur(10px)' }
      : { opacity: 0, y: 40 }

  const animate = direction === 'blur'
    ? { opacity: 1, filter: 'blur(0px)' }
    : { opacity: 1, y: 0 }

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut' as const, delay }}
    >
      {children}
    </motion.div>
  )
}
