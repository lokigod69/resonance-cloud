import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { DEMO_WORDS } from './landingData'
import ScrollReveal from './ScrollReveal'
import { TIDE_EASE } from './landingMotion'

// TideStory — the page's climax: one word rises from the water and becomes a
// song, a scene, and a conversation. Scroll is the playhead: a 340vh section
// with a sticky stage, every element mapped to the scrubbed progress so the
// story plays forward and backward. Mobile and reduced-motion get the same
// story as four quiet stacked panels.

type Bubble = { role: 'user' | 'assistant'; text: string }

type Seed = {
  word: string
  ipa: string
  lang: string
  translationKey: string
  lyric: string
  thumbnail: string
  echoes: { word: string; thumbnail: string }[]
  bubbles: Bubble[]
}

function pickSeed(locale: string): Seed {
  const byWord = (w: string) => DEMO_WORDS.find((d) => d.word === w)
  if (locale === 'fr') {
    // French visitors learn a German word; everyone else learns a French one.
    return {
      word: 'Fuchs',
      ipa: '/fʊks/',
      lang: 'DE',
      translationKey: 'landing.tideSeedTranslation',
      lyric: '♪ der Fuchs tanzt leis durch die Nacht ♪',
      thumbnail: byWord('Fuchs')?.thumbnail ?? '',
      echoes: [
        { word: 'Ferkelchen', thumbnail: byWord('Ferkelchen')?.thumbnail ?? '' },
        { word: 'lahmarschig', thumbnail: byWord('lahmarschig')?.thumbnail ?? '' },
      ],
      bubbles: [
        { role: 'user', text: 'Schau, ein Fuchs!' },
        { role: 'assistant', text: 'Genau! Der Fuchs schläft am Tag und jagt in der Nacht.' },
        { role: 'user', text: 'Der Fuchs — ich erinnere mich!' },
      ],
    }
  }
  return {
    word: 'ciel',
    ipa: '/sjɛl/',
    lang: 'FR',
    translationKey: 'landing.tideSeedTranslation',
    lyric: '♪ le ciel, le ciel bleu — je vole vers le ciel ♪',
    thumbnail: byWord('ciel')?.thumbnail ?? '',
    echoes: [
      { word: 'liberté', thumbnail: byWord('liberté')?.thumbnail ?? '' },
      { word: 'chameau', thumbnail: byWord('chameau')?.thumbnail ?? '' },
    ],
    bubbles: [
      { role: 'user', text: 'Regarde le ciel !' },
      { role: 'assistant', text: 'Oui — le ciel est clair ce soir. Tu vois les étoiles ?' },
      { role: 'user', text: 'Une étoile… et le ciel !' },
    ],
  }
}

const CHAPTER_KEYS = [
  'landing.tideChapterWord',
  'landing.tideChapterSong',
  'landing.tideChapterScene',
  'landing.tideChapterTalk',
]
const TITLE_KEYS = [
  'landing.tideWordTitle',
  'landing.tideSongTitle',
  'landing.tideSceneTitle',
  'landing.tideTalkTitle',
]
const DESC_KEYS = [
  'landing.tideWordDesc',
  'landing.tideSongDesc',
  'landing.tideSceneDesc',
  'landing.tideTalkDesc',
]

const BAR_COUNT = 26
// Static equalizer silhouette — a frozen crest line, gold toward the peaks.
const BAR_PATTERN = Array.from({ length: BAR_COUNT }, (_, i) => {
  const x = (i / (BAR_COUNT - 1)) * Math.PI * 2
  return 0.3 + 0.7 * Math.abs(Math.sin(x * 1.3 + 0.8) * 0.7 + Math.sin(x * 2.7) * 0.3)
})

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

export default function TideStory() {
  const reducedMotion = useReducedMotion()
  const compact = useIsCompact()
  const { locale } = useLandingLocale()
  const seed = pickSeed(locale)

  if (reducedMotion || compact) return <TideStoryStatic seed={seed} />
  return <TideStoryScrub seed={seed} />
}

/* ------------------------------ scrub stage ------------------------------ */

function TideStoryScrub({ seed }: { seed: Seed }) {
  const { t } = useLandingLocale()
  const sectionRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.6 })

  const [beat, setBeat] = useState(0)
  useMotionValueEvent(p, 'change', (v) => {
    const next = v < 0.12 ? 0 : v < 0.38 ? 1 : v < 0.64 ? 2 : 3
    setBeat((prev) => (prev === next ? prev : next))
  })

  const stageOpacity = useTransform(p, [0, 0.03, 0.93, 1], [0, 1, 1, 0])
  const stageY = useTransform(p, [0.93, 1], [0, -60])

  // 01 — WORD: the seed rises out of the water, blur resolving.
  const wordOpacity = useTransform(p, [0.02, 0.1, 0.36, 0.44], [0, 1, 1, 0])
  const wordY = useTransform(p, [0.02, 0.12], [260, 0])
  const wordScale = useTransform(p, [0.36, 0.44], [1, 0.94])
  const wordBlur = useTransform(p, [0.02, 0.12], [8, 0])
  const wordFilter = useTransform(wordBlur, (b) => `blur(${b.toFixed(2)}px)`)

  // 02 — SONG: the crest line becomes an equalizer under the word.
  const barsOpacity = useTransform(p, [0.13, 0.18, 0.37, 0.43], [0, 1, 1, 0])
  const lyricOpacity = useTransform(p, [0.2, 0.26, 0.37, 0.43], [0, 1, 1, 0])
  const lyricY = useTransform(p, [0.2, 0.26], [14, 0])

  // 03 — SCENE: the word blooms into imagery; echoes fan out behind.
  const sceneOpacity = useTransform(p, [0.4, 0.48, 0.62, 0.7, 0.9, 0.97], [0, 1, 1, 0.4, 0.4, 0])
  const sceneScale = useTransform(p, [0.4, 0.5, 0.62, 0.7], [0.92, 1, 1, 0.9])
  const sceneX = useTransform(p, [0.62, 0.7], [0, -130])
  const echoOpacity = useTransform(p, [0.45, 0.53, 0.62, 0.69], [0, 0.75, 0.75, 0])
  const echoSpread = useTransform(p, [0.44, 0.54], [0, 1])
  const echoRotateL = useTransform(echoSpread, (s) => -13 * s)
  const echoRotateR = useTransform(echoSpread, (s) => 13 * s)
  const echoXL = useTransform(echoSpread, (s) => -120 * s)
  const echoXR = useTransform(echoSpread, (s) => 120 * s)

  // 04 — CONVERSATION.
  const talkOpacity = useTransform(p, [0.9, 0.97], [1, 0])

  return (
    <section ref={sectionRef} className="relative h-[340vh] bg-[var(--app-bg)]" aria-label={t(TITLE_KEYS[0])}>
      <motion.div
        style={{ opacity: stageOpacity, y: stageY }}
        className="sticky top-0 flex h-screen items-center overflow-hidden"
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-12 px-6">
          {/* Copy column */}
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]/80">
                {`0${beat + 1}`}
              </span>
              <span className="h-px w-8 bg-white/20" aria-hidden="true" />
              <motion.span
                key={`chapter-${beat}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: TIDE_EASE }}
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50"
              >
                {t(CHAPTER_KEYS[beat])}
              </motion.span>
            </div>
            <motion.div
              key={`copy-${beat}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.66, ease: TIDE_EASE }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                {t(TITLE_KEYS[beat])}
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/60">
                {t(DESC_KEYS[beat])}
              </p>
            </motion.div>

            {/* Progress hairline */}
            <div className="absolute -left-6 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-white/10 lg:block" aria-hidden="true">
              <motion.div
                style={{ scaleY: p }}
                className="h-full w-full origin-top bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)]"
              />
            </div>
          </div>

          {/* Visual stage */}
          <div className="relative h-[440px]">
            {/* Waterline — the quiet stage floor the word rises out of */}
            <div
              className="absolute inset-x-4 top-[calc(50%+164px)] h-px bg-gradient-to-r from-transparent via-[var(--accent)]/25 to-transparent"
              aria-hidden="true"
            />
            {/* Seed word card */}
            <motion.div
              style={{ opacity: wordOpacity, y: wordY, scale: wordScale, filter: wordFilter }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <SeedWordCard seed={seed} translation={t(seed.translationKey)} />
            </motion.div>

            {/* Equalizer bars growing from the crest line */}
            <motion.div
              style={{ opacity: barsOpacity }}
              className="absolute left-1/2 top-[calc(50%+72px)] flex -translate-x-1/2 items-end gap-[5px]"
              aria-hidden="true"
            >
              {BAR_PATTERN.map((height, i) => (
                <SongBar key={i} p={p} index={i} height={height} />
              ))}
            </motion.div>
            <motion.p
              style={{ opacity: lyricOpacity, y: lyricY }}
              className="absolute left-1/2 top-[calc(50%+128px)] w-max max-w-full -translate-x-1/2 font-mono text-sm tracking-wide text-[var(--accent-2)]/75"
            >
              {seed.lyric}
            </motion.p>

            {/* Echo cards fanning behind the scene */}
            <motion.div
              style={{ opacity: echoOpacity, x: echoXL, rotate: echoRotateL }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              <EchoCard thumbnail={seed.echoes[0]?.thumbnail} word={seed.echoes[0]?.word} />
            </motion.div>
            <motion.div
              style={{ opacity: echoOpacity, x: echoXR, rotate: echoRotateR }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              <EchoCard thumbnail={seed.echoes[1]?.thumbnail} word={seed.echoes[1]?.word} />
            </motion.div>

            {/* Scene image card */}
            <motion.div
              style={{ opacity: sceneOpacity, scale: sceneScale, x: sceneX }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <SceneCard seed={seed} translation={t(seed.translationKey)} />
            </motion.div>

            {/* Conversation bubbles */}
            <motion.div
              style={{ opacity: talkOpacity }}
              className="absolute right-0 top-1/2 flex w-[300px] -translate-y-1/2 flex-col gap-3"
            >
              {seed.bubbles.map((bubble, i) => (
                <TalkBubble key={i} p={p} index={i} bubble={bubble} />
              ))}
              <BubbleIpa p={p} seed={seed} />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function SongBar({ p, index, height }: { p: MotionValue<number>; index: number; height: number }) {
  // Left-to-right sweep: each bar grows slightly after its neighbor.
  const start = 0.14 + index * 0.004
  const grow = useTransform(p, [start, start + 0.08], [0.1, 1])
  const scaleY = useTransform(grow, (g) => g * height)
  const gold = height > 0.78
  return (
    <motion.span
      style={{ scaleY }}
      className={`block w-[4px] origin-bottom rounded-full ${gold ? 'bg-[var(--accent-2)]' : 'bg-[var(--accent)]/70'}`}
    >
      <span className="block h-12" />
    </motion.span>
  )
}

function TalkBubble({ p, index, bubble }: { p: MotionValue<number>; index: number; bubble: Bubble }) {
  const start = 0.66 + index * 0.07
  const opacity = useTransform(p, [start, start + 0.05], [0, 1])
  const y = useTransform(p, [start, start + 0.05], [26, 0])
  const isUser = bubble.role === 'user'
  return (
    <motion.div
      style={{ opacity, y }}
      className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed backdrop-blur-md ${
        isUser
          ? 'self-end rounded-br-md border-[var(--accent)]/35 bg-[var(--accent)]/12 text-white/90'
          : 'self-start rounded-bl-md border-white/10 bg-[var(--surface-glass)] text-white/78'
      }`}
    >
      {bubble.text}
    </motion.div>
  )
}

function BubbleIpa({ p, seed }: { p: MotionValue<number>; seed: Seed }) {
  const opacity = useTransform(p, [0.85, 0.9], [0, 1])
  return (
    <motion.p style={{ opacity }} className="self-end pr-1 font-mono text-xs tracking-widest text-white/40">
      {seed.word} · {seed.ipa}
    </motion.p>
  )
}

/* ------------------------------ shared cards ----------------------------- */

function SeedWordCard({ seed, translation }: { seed: Seed; translation: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[var(--surface-glass)] px-10 py-8 text-center shadow-[var(--shadow-soft)] backdrop-blur-md">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{seed.lang}</span>
      <span className="font-display text-5xl font-bold tracking-tight text-white">{seed.word}</span>
      <span className="font-mono text-sm tracking-widest text-[var(--m-mid)]">{seed.ipa}</span>
      <span className="text-base text-white/55">{translation}</span>
    </div>
  )
}

function SceneCard({ seed, translation }: { seed: Seed; translation: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative w-[260px] overflow-hidden rounded-2xl border border-white/10 shadow-[var(--shadow-soft)]">
      <div className="aspect-[3/4] w-full bg-gradient-to-b from-[#1c0f22] to-[#0a060e]">
        {!failed && seed.thumbnail && (
          <img
            src={seed.thumbnail}
            alt={`${seed.word} — ${translation}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover opacity-90"
          />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-3 pt-10">
        <p className="text-lg font-semibold text-white">{seed.word}</p>
        <p className="text-sm text-white/55">{translation}</p>
      </div>
      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm">
        {seed.lang}
      </span>
    </div>
  )
}

function EchoCard({ thumbnail, word }: { thumbnail?: string; word?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative w-[190px] overflow-hidden rounded-2xl border border-white/10 opacity-90 shadow-[var(--shadow-soft)]">
      <div className="aspect-[3/4] w-full bg-gradient-to-b from-[#1c0f22] to-[#0a060e]">
        {!failed && thumbnail && (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover opacity-70"
          />
        )}
      </div>
      {word && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8">
          <p className="text-sm font-medium text-white/80">{word}</p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ static story ----------------------------- */

function TideStoryStatic({ seed }: { seed: Seed }) {
  const { t } = useLandingLocale()
  return (
    <section className="bg-[var(--app-bg)] px-6 py-20">
      <div className="mx-auto flex max-w-xl flex-col gap-20">
        {CHAPTER_KEYS.map((chapterKey, i) => (
          <ScrollReveal key={chapterKey}>
            <div className="mb-5 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]/80">{`0${i + 1}`}</span>
              <span className="h-px w-8 bg-white/20" aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">{t(chapterKey)}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t(TITLE_KEYS[i])}</h2>
            <p className="mt-3 leading-relaxed text-white/60">{t(DESC_KEYS[i])}</p>
            <div className="mt-8 flex justify-center">
              {i === 0 && <SeedWordCard seed={seed} translation={t(seed.translationKey)} />}
              {i === 1 && (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-end gap-[5px]" aria-hidden="true">
                    {BAR_PATTERN.map((height, k) => (
                      <span
                        key={k}
                        style={{ height: `${Math.round(height * 48)}px` }}
                        className={`block w-[4px] rounded-full ${height > 0.78 ? 'bg-[var(--accent-2)]' : 'bg-[var(--accent)]/70'}`}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-sm tracking-wide text-[var(--accent-2)]/75">{seed.lyric}</p>
                </div>
              )}
              {i === 2 && <SceneCard seed={seed} translation={t(seed.translationKey)} />}
              {i === 3 && (
                <div className="flex w-full max-w-[320px] flex-col gap-3">
                  {seed.bubbles.map((bubble, k) => (
                    <div
                      key={k}
                      className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                        bubble.role === 'user'
                          ? 'self-end rounded-br-md border-[var(--accent)]/35 bg-[var(--accent)]/12 text-white/90'
                          : 'self-start rounded-bl-md border-white/10 bg-[var(--surface-glass)] text-white/78'
                      }`}
                    >
                      {bubble.text}
                    </div>
                  ))}
                  <p className="self-end pr-1 font-mono text-xs tracking-widest text-white/40">
                    {seed.word} · {seed.ipa}
                  </p>
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
