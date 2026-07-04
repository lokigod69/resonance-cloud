import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { DEMO_WORDS } from './landingData'
import { waveHeight, waveSlope, WAVE_AMP_SUM } from '@/lib/waveField'
import ScrollReveal from './ScrollReveal'

// CreatorRail — the memory shelf. Real vocabulary cards travel horizontally as
// the user scrolls (scroll is the playhead), and the whole rail floats: every
// card samples the shared wave field at its live screen position, so the
// shelf visibly rides the same ocean as the hero. Mobile keeps a native snap
// scroller; the bob stays because it's transform-only and cheap.

type RailWord = {
  word: string
  translation: string
  language: string
  thumbnail: string
  ipa?: string
  mastered?: boolean
}

const IPA: Record<string, string> = {
  ciel: '/sjɛl/',
  Fuchs: '/fʊks/',
  furz: '/fʊʁts/',
  Peur: '/pœʁ/',
  ferocious: '/fəˈroʊʃəs/',
  'liberté': '/li.bɛʁ.te/',
  oublier: '/u.bli.je/',
  Ferkelchen: '/ˈfɛʁkl̩çən/',
  frigide: '/fʁiˈɡiːdə/',
  chameau: '/ʃa.mo/',
  lahmarschig: '/ˈlaːmˌʔaʁʃɪç/',
}

const MASTERED = new Set(['liberté', 'Fuchs'])

const RAIL_WORDS: RailWord[] = DEMO_WORDS.map((w) => ({
  ...w,
  ipa: IPA[w.word],
  mastered: MASTERED.has(w.word),
}))

const LANG_CODE: Record<string, string> = {
  French: 'FR',
  German: 'DE',
  English: 'EN',
}

const RIDE_PX = 12
const TILT_MAX_DEG = 5
const HOVER_LIFT_PX = -6

function useIsCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = (event: MediaQueryListEvent) => setCompact(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return compact
}

// One rAF drives every card's float: read all rects, then write all
// transforms. Pauses whenever the rail scrolls out of view or the tab hides.
function useBuoyLoop(
  rootRef: { current: HTMLElement | null },
  cardRefs: { current: (HTMLDivElement | null)[] },
  hoveredRef: { current: number | null },
  options: { scale: boolean; enabled: boolean },
) {
  const { scale, enabled } = options
  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    if (!root) return

    let raf = 0
    let running = false
    const start = performance.now()
    const lifts: number[] = []

    const frame = () => {
      const t = 30 + (performance.now() - start) / 1000
      const vw = window.innerWidth
      const cards = cardRefs.current
      const rects: (DOMRect | null)[] = cards.map((el) => (el ? el.getBoundingClientRect() : null))

      for (let i = 0; i < cards.length; i++) {
        const el = cards[i]
        const rect = rects[i]
        if (!el || !rect) continue
        const centerX = rect.left + rect.width / 2
        if (centerX < -rect.width || centerX > vw + rect.width) continue

        const worldX = ((centerX / vw) * 100 - 50) * 0.12
        const z = 4 + i * 2.3
        const depth = 0.55 + ((i * 37) % 10) / 18
        const norm = waveHeight(worldX, z, t) / WAVE_AMP_SUM
        const hovered = hoveredRef.current === i

        lifts[i] = (lifts[i] ?? 0) + ((hovered ? HOVER_LIFT_PX : 0) - (lifts[i] ?? 0)) * 0.15
        const y = -norm * RIDE_PX * depth + lifts[i]
        const tilt = hovered
          ? 0
          : Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, waveSlope(worldX, z, t) * 4))
        const centerDist = Math.min(1, Math.abs(centerX - vw / 2) / (vw / 2))
        const s = scale ? 1 - 0.06 * centerDist : 1

        el.style.transform = `translateY(${y.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) scale(${s.toFixed(3)})`
      }
      raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      running = false
    }
    const startLoop = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? startLoop() : stop()),
      { threshold: 0 },
    )
    observer.observe(root)
    const onVisibility = () => (document.hidden ? stop() : startLoop())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [cardRefs, enabled, hoveredRef, rootRef, scale])
}

export default function CreatorRail() {
  const reducedMotion = useReducedMotion()
  const compact = useIsCompact()

  if (reducedMotion === true) return <RailReduced />
  if (compact) return <RailSnap />
  return <RailScrub />
}

function RailHeading() {
  const { t } = useLandingLocale()
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]/80">
        {t('landing.railKicker')}
      </p>
      <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
        {t('landing.railHeading')}
      </h2>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/60">{t('landing.railSub')}</p>
    </div>
  )
}

/* ------------------------- desktop: scrubbed rail ------------------------- */

function RailScrub() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const hoveredRef = useRef<number | null>(null)
  const [shift, setShift] = useState(0)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const sp = useSpring(scrollYProgress, { stiffness: 90, damping: 30, mass: 0.6 })
  const x = useTransform(sp, [0.05, 0.95], [0, -shift])

  useLayoutEffect(() => {
    const measure = () => {
      const rail = railRef.current
      if (!rail) return
      setShift(Math.max(0, rail.scrollWidth - window.innerWidth + 96))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useBuoyLoop(sectionRef as { current: HTMLElement | null }, cardRefs, hoveredRef, {
    scale: true,
    enabled: true,
  })

  return (
    <section ref={sectionRef} className="relative h-[260vh] bg-[var(--app-bg)]">
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-12 overflow-hidden">
        <RailHeading />
        <motion.div ref={railRef} style={{ x }} className="flex w-max items-center gap-6 px-12 will-change-transform">
          {RAIL_WORDS.map((word, i) => (
            <div
              key={word.word}
              ref={(node) => {
                cardRefs.current[i] = node
              }}
              onMouseEnter={() => {
                hoveredRef.current = i
              }}
              onMouseLeave={() => {
                hoveredRef.current = hoveredRef.current === i ? null : hoveredRef.current
              }}
            >
              <RailCard word={word} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* --------------------------- mobile: snap rail ---------------------------- */

function RailSnap() {
  const rootRef = useRef<HTMLElement | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const hoveredRef = useRef<number | null>(null)

  useBuoyLoop(rootRef as { current: HTMLElement | null }, cardRefs, hoveredRef, {
    scale: false,
    enabled: true,
  })

  return (
    <section ref={rootRef} className="bg-[var(--app-bg)] py-20">
      <RailHeading />
      <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-6 [scrollbar-width:none]">
        {RAIL_WORDS.map((word, i) => (
          <div
            key={word.word}
            ref={(node) => {
              cardRefs.current[i] = node
            }}
            className="snap-center"
          >
            <RailCard word={word} />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------ reduced motion: quiet rail ---------------------- */

function RailReduced() {
  return (
    <section className="bg-[var(--app-bg)] py-20">
      <ScrollReveal>
        <RailHeading />
      </ScrollReveal>
      <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-6 [scrollbar-width:none]">
        {RAIL_WORDS.map((word) => (
          <div key={word.word} className="snap-center">
            <RailCard word={word} />
          </div>
        ))}
      </div>
    </section>
  )
}

/* --------------------------------- card ---------------------------------- */

function RailCard({ word }: { word: RailWord }) {
  const { t } = useLandingLocale()
  const [failed, setFailed] = useState(false)
  const code = LANG_CODE[word.language] ?? word.language.slice(0, 2).toUpperCase()

  return (
    <figure
      className={`group relative w-[200px] shrink-0 overflow-hidden rounded-2xl border shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-300 md:w-[240px] ${
        word.mastered
          ? 'border-[var(--accent-2)]/45 hover:shadow-[0_0_28px_rgba(247,200,67,0.22)]'
          : 'border-white/10 hover:border-[var(--accent-2)]/35 hover:shadow-[0_0_24px_var(--accent-glow)]'
      }`}
    >
      <div className="aspect-[3/4] w-full bg-gradient-to-b from-[#1c0f22] to-[#0a060e]">
        {!failed && (
          <img
            src={word.thumbnail}
            alt={`${word.word} — ${word.translation}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-4 pb-3 pt-12">
        <p className="text-lg font-semibold text-white">{word.word}</p>
        <p className="text-sm text-white/55">{word.translation}</p>
        {word.ipa && <p className="mt-0.5 font-mono text-[11px] tracking-widest text-white/40">{word.ipa}</p>}
      </figcaption>
      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm">
        {code}
      </span>
      {word.mastered && (
        <span className="absolute right-3 top-3 rounded-full border border-[var(--accent-2)]/50 bg-[var(--accent-2)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
          {t('landing.railMastered')}
        </span>
      )}
    </figure>
  )
}
