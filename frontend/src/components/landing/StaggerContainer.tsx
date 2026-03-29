import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export const staggerScaleItem = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

interface StaggerContainerProps {
  children: ReactNode
  className?: string
}

export default function StaggerContainer({ children, className }: StaggerContainerProps) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={reducedMotion ? undefined : container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
