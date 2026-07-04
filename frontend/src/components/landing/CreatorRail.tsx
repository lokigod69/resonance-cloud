import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { waveHeight, waveSlope, WAVE_AMP_SUM } from '@/lib/waveField'
import { curriculumImageUrl } from './landingData'
import ScrollReveal from './ScrollReveal'

// CreatorRail — the memory shelf. Real curriculum renders (same-origin static
// webp, the app's own library imagery) travel horizontally as the user
// scrolls, and the whole rail floats on the shared wave field. Card positions
// are measured once and derived from the scrub value afterwards — the rAF
// loop performs zero layout reads, so scrolling stays smooth.

type RailWord = {
  slug: string
  en: string
  de: string
  fr: string
  lang: 'DE' | 'FR' // which language the big word is shown in
  mastered?: boolean
}

const RAIL_WORDS: RailWord[] = [
  { slug: 'fox', en: 'fox', de: 'Fuchs', fr: 'renard', lang: 'FR' },
  { slug: 'apple', en: 'apple', de: 'Apfel', fr: 'pomme', lang: 'DE' },
  { slug: 'bread', en: 'bread', de: 'Brot', fr: 'pain', lang: 'FR' },
  { slug: 'basketball', en: 'basketball', de: 'Basketball', fr: 'basket-ball', lang: 'DE' },
  { slug: 'hiking', en: 'hiking', de: 'Wandern', fr: 'randonnée', lang: 'FR' },
  { slug: 'rowing', en: 'rowing', de: 'Rudern', fr: 'aviron', lang: 'DE' },
  { slug: 'fencing', en: 'fencing', de: 'Fechten', fr: 'escrime', lang: 'FR' },
  { slug: 'trophy', en: 'trophy', de: 'Trophäe', fr: 'trophée', lang: 'DE', mastered: true },
  { slug: 'lonely', en: 'lonely', de: 'einsam', fr: 'solitaire', lang: 'DE' },
  { slug: 'proud', en: 'proud', de: 'stolz', fr: 'fier', lang: 'FR', mastered: true },
]

const RIDE_PX = 10
const TILT_MAX_DEG = 4
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

// One rAF drives every card's float. Screen positions are measured once per
// resize; each frame derives them from the current horizontal shift, so the
// loop never touches getBoundingClientRect while animating.
function useBuoyLoop(
  rootRef: { current: HTMLElement | null },
  cardRefs: { current: (HTMLDivElement | null)[] },
  hoveredRef: { current: number | null },
  getShift: () => number,
  scale: boolean,
) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let raf = 0
    let running = false
    const start0 = performance.now()
    const lifts: number[] = []
    let baseCenters: number[] = []
    let shift0 = 0

    const measure = () => {
      shift0 = getShift()
      baseCenters = cardRefs.current.map((el) => {
        if (!el) return -1e4
        const r = el.getBoundingClientRect()
        return r.left + r.width / 2
      })
    }

    const frame = () => {
      const t = 30 + (performance.now() - start0) / 1000
      const vw = window.innerWidth
      const delta = getShift() - shift0
      const cards = cardRefs.current

      for (let i = 0; i < cards.length; i++) {
        const el = cards[i]
        if (!el) continue
        const centerX = baseCenters[i] + delta
        if (centerX < -400 || centerX > vw + 400) continue

        const worldX = ((centerX / vw) * 100 - 50) * 0.12
        const z = 4 + i * 2.3
        const depth = 0.55 + ((i * 37) % 10) / 18
        const norm = waveHeight(worldX, z, t) / WAVE_AMP_SUM
        const hovered = hoveredRef.current === i

        lifts[i] = (lifts[i] ?? 0) + ((hovered ? HOVER_LIFT_PX : 0) - (lifts[i] ?? 0)) * 0.15
        const y = -norm * RIDE_PX * depth + lifts[i]
        const tilt = hovered
          ? 0
          : Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, waveSlope(worldX, z, t) * 3))
        const centerDist = Math.min(1, Math.abs(centerX - vw / 2) / (vw / 2))
        const s = scale ? 1 - 0.05 * centerDist : 1

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

    const onResize = () => measure()
    measure()

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? startLoop() : stop()),
      { threshold: 0 },
    )
    observer.observe(root)
    const onVisibility = () => (document.hidden ? stop() : startLoop())
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs and getShift are stable per mount
  }, [])
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

  useBuoyLoop(sectionRef as { current: HTMLElement | null }, cardRefs, hoveredRef, () => x.get(), true)

  return (
    <section ref={sectionRef} className="relative h-[240vh] bg-[var(--app-bg)]">
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-12 overflow-hidden">
        <RailHeading />
        <motion.div ref={railRef} style={{ x }} className="flex w-max items-center gap-6 px-12 will-change-transform">
          {RAIL_WORDS.map((word, i) => (
            <div
              key={word.slug}
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
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const hoveredRef = useRef<number | null>(null)
  const scrollLeftRef = useRef(0)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const onScroll = () => {
      scrollLeftRef.current = scroller.scrollLeft
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  useBuoyLoop(rootRef as { current: HTMLElement | null }, cardRefs, hoveredRef, () => -scrollLeftRef.current, false)

  return (
    <section ref={rootRef} className="bg-[var(--app-bg)] py-20">
      <RailHeading />
      <div
        ref={scrollerRef}
        className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-6 [scrollbar-width:none]"
      >
        {RAIL_WORDS.map((word, i) => (
          <div
            key={word.slug}
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
          <div key={word.slug} className="snap-center">
            <RailCard word={word} />
          </div>
        ))}
      </div>
    </section>
  )
}

/* --------------------------------- card ---------------------------------- */

function RailCard({ word }: { word: RailWord }) {
  const { t, locale } = useLandingLocale()
  const [failed, setFailed] = useState(false)

  const big = word.lang === 'DE' ? word.de : word.fr
  // Caption in the visitor's language; if it would repeat the big word, fall
  // back to English so the card always teaches a pairing.
  const localTerm = locale === 'de' ? word.de : locale === 'fr' ? word.fr : word.en
  const caption = localTerm === big ? word.en : localTerm

  return (
    <figure
      className={`group relative w-[300px] shrink-0 overflow-hidden rounded-2xl border shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-300 md:w-[340px] ${
        word.mastered
          ? 'border-[var(--accent-2)]/45 hover:shadow-[0_0_28px_rgba(247,200,67,0.22)]'
          : 'border-white/10 hover:border-[var(--accent-2)]/35 hover:shadow-[0_0_24px_var(--accent-glow)]'
      }`}
    >
      <div className="aspect-video w-full bg-gradient-to-b from-[#1c0f22] to-[#0a060e]">
        {!failed && (
          <img
            src={curriculumImageUrl(word.slug)}
            alt={`${big} — ${caption}`}
            width={840}
            height={472}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover opacity-95 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>
      <figcaption className="flex items-baseline justify-between gap-3 bg-[#120b17] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{big}</p>
          <p className="truncate text-sm text-white/55">{caption}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          {word.lang}
        </span>
      </figcaption>
      {word.mastered && (
        <span className="absolute right-3 top-3 rounded-full border border-[var(--accent-2)]/50 bg-black/45 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
          {t('landing.railMastered')}
        </span>
      )}
    </figure>
  )
}
