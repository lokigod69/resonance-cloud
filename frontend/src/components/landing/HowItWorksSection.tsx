import { motion } from 'framer-motion'
import { Keyboard, Sparkles, Brain } from 'lucide-react'
import { STEPS } from './landingData'
import ScrollReveal from './ScrollReveal'
import StaggerContainer, { staggerItem } from './StaggerContainer'

const ICONS = [Keyboard, Sparkles, Brain]

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-6 border-t border-white/[0.03]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">How it works</h2>
        </ScrollReveal>

        {/* Steps */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line — desktop only */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] border-t border-dashed border-white/10" />

          {STEPS.map((step, i) => {
            const Icon = ICONS[i]
            return (
              <motion.div
                key={step.title}
                variants={staggerItem}
                className="glass rounded-2xl p-8 text-center relative z-10"
              >
                {/* Step number */}
                <span className="inline-block text-xs font-medium text-muted-foreground bg-white/5 rounded-full px-3 py-1 mb-4">
                  Step {i + 1}
                </span>

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
        </StaggerContainer>
      </div>
    </section>
  )
}
