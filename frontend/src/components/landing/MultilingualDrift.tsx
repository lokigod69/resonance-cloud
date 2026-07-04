import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DRIFT_PHRASES } from './landingData'

type DriftLayout = {
  top?: string
  right?: string
  bottom?: string
  left?: string
  sizeClass: string
  opacity: number
  x: number
  delay: number
  duration: number
}

const DESKTOP_LAYOUT: DriftLayout[] = [
  { top: '16%', left: '8%', sizeClass: 'text-2xl', opacity: 0.22, x: 18, delay: 0, duration: 16 },
  { top: '20%', right: '10%', sizeClass: 'text-xl', opacity: 0.18, x: -22, delay: 2.6, duration: 18 },
  { top: '36%', left: '3%', sizeClass: 'text-lg', opacity: 0.16, x: 14, delay: 4.2, duration: 20 },
  { top: '42%', right: '5%', sizeClass: 'text-2xl', opacity: 0.2, x: -18, delay: 1.2, duration: 17 },
  { bottom: '28%', left: '14%', sizeClass: 'text-xl', opacity: 0.14, x: 26, delay: 5.4, duration: 19 },
  { bottom: '24%', right: '16%', sizeClass: 'text-3xl', opacity: 0.24, x: -16, delay: 3.1, duration: 21 },
  { top: '12%', left: '32%', sizeClass: 'text-lg', opacity: 0.14, x: -10, delay: 7.2, duration: 18 },
  { bottom: '15%', left: '34%', sizeClass: 'text-xl', opacity: 0.16, x: 12, delay: 6.1, duration: 20 },
  { top: '62%', right: '9%', sizeClass: 'text-lg', opacity: 0.15, x: -24, delay: 8.4, duration: 22 },
  { top: '58%', left: '10%', sizeClass: 'text-2xl', opacity: 0.18, x: 20, delay: 9.6, duration: 19 },
  { bottom: '11%', right: '31%', sizeClass: 'text-lg', opacity: 0.13, x: -12, delay: 10.8, duration: 18 },
]

const MOBILE_LAYOUT: DriftLayout[] = [
  { top: '18%', left: '6%', sizeClass: 'text-sm', opacity: 0.18, x: 8, delay: 0, duration: 18 },
  { top: '22%', right: '7%', sizeClass: 'text-sm', opacity: 0.16, x: -8, delay: 3, duration: 20 },
  { bottom: '16%', left: '7%', sizeClass: 'text-base', opacity: 0.15, x: 10, delay: 6, duration: 21 },
  { bottom: '12%', right: '8%', sizeClass: 'text-sm', opacity: 0.17, x: -10, delay: 9, duration: 19 },
]

function useMobileDrift() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}

export default function MultilingualDrift() {
  const reducedMotion = useReducedMotion()
  const isMobile = useMobileDrift()
  const layouts = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT
  const phrases = DRIFT_PHRASES.slice(0, layouts.length)

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {phrases.map((phrase, index) => {
        const layout = layouts[index]
        const style = {
          top: layout.top,
          right: layout.right,
          bottom: layout.bottom,
          left: layout.left,
        }

        return (
          <motion.span
            key={`${phrase.lang}-${phrase.text}`}
            lang={phrase.lang}
            className={`font-display absolute select-none whitespace-nowrap text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.18)] ${layout.sizeClass}`}
            style={{ ...style, opacity: reducedMotion ? layout.opacity * 0.55 : 0 }}
            animate={
              reducedMotion
                ? undefined
                : {
                    opacity: [0, layout.opacity, layout.opacity * 0.72, 0],
                    y: [24, -18, -54],
                    x: [0, layout.x],
                  }
            }
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: layout.duration,
                    delay: layout.delay,
                    repeat: Infinity,
                    repeatDelay: 3.5,
                    ease: 'easeInOut' as const,
                  }
            }
          >
            {phrase.text}
          </motion.span>
        )
      })}
    </div>
  )
}
