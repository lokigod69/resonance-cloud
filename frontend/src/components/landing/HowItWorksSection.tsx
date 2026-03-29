import { motion, useReducedMotion } from 'framer-motion'
import { Keyboard, Sparkles, Brain } from 'lucide-react'
import { STEPS } from './landingData'
import ScrollReveal from './ScrollReveal'

const ICONS = [Keyboard, Sparkles, Brain]

// Desktop: cards converge from left, bottom, right. Mobile: all from bottom.
const directions = [
  { x: -60, y: 0 },  // card 1: from left
  { x: 0, y: 60 },   // card 2: from below
  { x: 60, y: 0 },   // card 3: from right
]

export default function HowItWorksSection() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="py-32 px-6 bg-[#0c0d14]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold">How it works</h2>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 relative">
          {/* Animated SVG connector — desktop only */}
          <svg className="hidden md:block absolute top-16 left-[18%] right-[18%] w-[64%] h-[2px] z-0 overflow-visible">
            <motion.line
              x1="0"
              y1="1"
              x2="100%"
              y2="1"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' as const }}
            />
          </svg>

          {STEPS.map((step, i) => {
            const Icon = ICONS[i]
            const dir = directions[i]
            return (
              <motion.div
                key={step.title}
                initial={reducedMotion ? {} : {
                  opacity: 0,
                  // On mobile (can't detect here, but y fallback works fine for both)
                  x: dir.x,
                  y: dir.y || 40,
                }}
                whileInView={reducedMotion ? {} : { opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: i * 0.2, ease: 'easeOut' as const }}
                className="glass rounded-2xl p-8 text-center relative z-10 hover:-translate-y-1 transition-transform duration-200"
              >
                {/* Step number — spring pop */}
                <motion.span
                  className="inline-block text-xs font-medium text-muted-foreground bg-white/5 rounded-full px-3 py-1 mb-4"
                  initial={reducedMotion ? {} : { scale: 0 }}
                  whileInView={reducedMotion ? {} : { scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring' as const, stiffness: 300, damping: 15, delay: 0.3 + i * 0.2 }}
                >
                  Step {i + 1}
                </motion.span>

                {/* Icon */}
                <div className="mx-auto w-14 h-14 rounded-full glass-strong glow-purple flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-primary" />
                </div>

                {/* Text */}
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
