import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ScrollReveal from './ScrollReveal'

export default function CtaFooterSection() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="py-32 px-6 text-center bg-[#0a0b12]">
      {/* CTA */}
      <ScrollReveal direction="blur" className="max-w-2xl mx-auto mb-24">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Ready to learn differently?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Sign up free. Create your first music videos.
        </p>
        <motion.div
          className="inline-block rounded-md"
          animate={reducedMotion ? {} : {
            boxShadow: [
              '0 0 20px oklch(0.5 0.15 280 / 0.2)',
              '0 0 40px oklch(0.5 0.15 280 / 0.4)',
              '0 0 20px oklch(0.5 0.15 280 / 0.2)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          <Button size="lg" asChild className="text-lg px-8 py-6">
            <Link to="/login">
              <Sparkles className="h-5 w-5 mr-2" />
              Get started
            </Link>
          </Button>
        </motion.div>
      </ScrollReveal>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-8 text-sm text-muted-foreground space-y-1">
        <p>Resonance · resonanz.pro</p>
        <p>Built with AI. Designed for memory.</p>
      </footer>
    </section>
  )
}
