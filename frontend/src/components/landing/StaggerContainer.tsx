import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerContainer } from './StaggerContainer.variants'

interface StaggerContainerProps {
  children: ReactNode
  className?: string
}

export default function StaggerContainer({ children, className }: StaggerContainerProps) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={reducedMotion ? undefined : staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
