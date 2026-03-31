import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { getRandomVerb } from '@/lib/spinnerVerbs'

interface VerbCyclerProps {
  intervalMs?: number
  className?: string
}

export function VerbCycler({ intervalMs = 2500, className }: VerbCyclerProps) {
  const [verb, setVerb] = useState(() => getRandomVerb())
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
        setVerb(getRandomVerb(verbRef.current))
        return
      }
      setVisible(false)
      const timeout = setTimeout(() => {
        setVerb(getRandomVerb(verbRef.current))
        setVisible(true)
      }, fadeOut)
      return () => clearTimeout(timeout)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs])

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
