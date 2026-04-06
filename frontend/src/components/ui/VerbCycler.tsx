import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { getRandomVerb, SPINNER_VERBS_DE } from '@/lib/spinnerVerbs'
import { useTranslation } from '@/hooks/useTranslation'

interface VerbCyclerProps {
  intervalMs?: number
  className?: string
}

export function VerbCycler({ intervalMs = 5000, className }: VerbCyclerProps) {
  const { locale } = useTranslation()
  const verbs = locale === 'de' ? SPINNER_VERBS_DE : undefined  // undefined = default EN list

  const [verb, setVerb] = useState(() => getRandomVerb(undefined, verbs))
  const [visible, setVisible] = useState(true)
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const verbRef = useRef(verb)
  verbRef.current = verb

  useEffect(() => {
    const fadeOut = reducedMotion.current ? 0 : 300

    const interval = setInterval(() => {
      if (reducedMotion.current) {
        setVerb(getRandomVerb(verbRef.current, verbs))
        return
      }
      setVisible(false)
      const timeout = setTimeout(() => {
        setVerb(getRandomVerb(verbRef.current, verbs))
        setVisible(true)
      }, fadeOut)
      return () => clearTimeout(timeout)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs, verbs])

  return (
    <p
      className={cn(
        'text-sm text-muted-foreground text-center transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {verb}...
    </p>
  )
}
