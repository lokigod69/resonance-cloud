import { ScriptPracticeLink } from '@/components/scriptlab/ScriptPracticeLink'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import type { HomeHero } from '@/hooks/useHomeRecommendation'

// HomeRecommendationCard — the one glass card in the sky (§3, §5).
// Eyebrow · display line (target-language `lang` attr) · sub-line · one
// vermillion CTA. Fixed height per breakpoint so the skeleton reserves the
// exact same space — the hero never shifts layout when it commits.

type HomeRecommendationCardProps = {
  activeLanguage: string | null
  /** BCP-47 primary subtag for the display line when it is target-language. */
  phraseLang: string | undefined
  /** The Word Stream is live on the water: the `discover` hero points at it
   * (nearest word) instead of at the Library. */
  onCatchNearest?: () => void
} & (
  | { hero: HomeHero; onStartRecall: () => void; onRetry: () => void }
  | { hero: Extract<HomeHero, { kind: 'lesson' | 'discover' }> | { kind: 'start' }; onStartRecall?: never; onRetry?: never }
)

// 120–150pt cap (§0): 9.375rem = 150pt — the cap's top; two-line displays
// need the room, and §2's own SE budget allows the card up to 150 there too.
// Content FITS the box (clamped lines, CTA on mt-auto); the cap is never met
// by clipping descenders.
const CARD_HEIGHT = 'h-[9.375rem]'

export default function HomeRecommendationCard({ hero, activeLanguage, phraseLang, onStartRecall, onRetry, onCatchNearest }: HomeRecommendationCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (hero.kind === 'skeleton') {
    return (
      <div className={`pg-glass w-full rounded-2xl px-4 py-3 [@media(max-height:720px)]:px-3 ${CARD_HEIGHT}`} aria-hidden="true">
        <div className="flex h-full animate-pulse flex-col items-start justify-between">
          <div className="h-3 w-28 rounded bg-[var(--surface-glass-strong)]" />
          <div className="h-7 w-3/5 rounded bg-[var(--surface-glass-strong)]" />
          <div className="h-3 w-40 rounded bg-[var(--surface-glass-strong)]" />
          <div className="h-11 w-36 rounded-xl bg-[var(--surface-glass-strong)]" />
        </div>
      </div>
    )
  }

  let eyebrow: string
  let display: ReactNode
  let displayLang: string | undefined
  let sub: string | null
  let ctaLabel: string
  let onCta: (() => void) | undefined

  switch (hero.kind) {
    case 'lesson': {
      const m = hero.mission
      eyebrow = (m.hasDraft || m.completedCount > 0) ? t('home.fl.hero.continue', { path: m.pathShortTitle }) : m.pathShortTitle
      display = m.phrase
      displayLang = phraseLang
      sub = t('home.fl.hero.lessonSub', { lesson: m.lessonNumber, total: m.totalLessons, minutes: m.estimatedMinutes })
      ctaLabel = m.hasDraft ? t('today.practice.resume')
        : m.completedCount > 0 ? t('home.fl.hero.cta.start') : t('today.startLesson')
      onCta = () => navigate(m.startHref)
      break
    }
    case 'start':
      eyebrow = t('today.path.yourPath')
      display = t('dashboard.firstRun.title')
      sub = null
      ctaLabel = t('dashboard.firstRun.startLesson')
      onCta = () => navigate('/today')
      break
    case 'recall':
      eyebrow = t('home.fl.hero.recallTitle')
      display = t('home.fl.hero.recallSub', { count: hero.count })
      sub = null
      ctaLabel = t('home.fl.hero.cta.bringBack')
      onCta = onStartRecall
      break
    case 'speak':
      eyebrow = t('home.fl.hero.speakTitle')
      display = t('home.fl.hero.speakSub')
      sub = null
      ctaLabel = t('home.fl.hero.cta.speak')
      onCta = () => navigate('/speak')
      break
    case 'preparing':
      eyebrow = t('home.fl.hero.preparingTitle')
      display = t('home.fl.hero.preparingSub')
      sub = null
      ctaLabel = t('home.fl.hero.cta.openDeck')
      onCta = () => navigate(hero.href)
      break
    case 'unavailable':
      eyebrow = t('home.fl.hero.unavailableTitle')
      display = null
      sub = null
      ctaLabel = t('home.fl.hero.unavailableRetry')
      onCta = onRetry
      break
    case 'stream':
      eyebrow = t('home.stream.hero.title')
      display = t('home.stream.hero.sub')
      sub = null
      ctaLabel = t('home.stream.hero.cta')
      // Never a dead button (§8.1): without the water's callback, the Library.
      onCta = onCatchNearest ?? (() => navigate('/categories'))
      break
    default:
      eyebrow = t('home.fl.hero.discoverTitle')
      display = t('home.fl.hero.discoverSub')
      sub = null
      ctaLabel = t('home.fl.hero.cta.browse')
      onCta = () => navigate('/categories')
  }

  // With a sub-line (lesson) the display is a phrase — one big line; without
  // one it is a sentence — two smaller lines. SE always clamps to one (§2).
  const displayClass = sub !== null
    ? 'line-clamp-1 text-2xl'
    : 'line-clamp-2 text-xl'

  return (
    <div className={`pg-glass flex w-full flex-col items-start gap-1 overflow-hidden rounded-2xl px-4 py-3 text-left [@media(max-height:720px)]:px-3 ${CARD_HEIGHT}`}>
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)] [@media(max-height:720px)]:text-[13px] [@media(max-height:720px)]:normal-case [@media(max-height:720px)]:tracking-normal">
        {eyebrow}
      </p>
      {display !== null && (
        <p
          className={`font-display font-bold leading-tight text-[var(--text-primary)] ${displayClass} [@media(max-height:720px)]:line-clamp-1 [@media(max-height:720px)]:text-xl`}
          lang={displayLang}
          dir="auto"
        >
          {display}
        </p>
      )}
      {sub !== null && (
        <p className="shrink-0 text-sm text-[var(--text-secondary)] [@media(max-height:720px)]:text-[13px]">{sub}</p>
      )}
      <div className="mt-auto flex w-full items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onCta}
          className="lw-swell-cta inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 font-display text-sm font-semibold leading-tight sm:px-5 active:scale-[0.98]"
        >
          {ctaLabel}
        </button>
        <ScriptPracticeLink language={activeLanguage} />
      </div>
    </div>
  )
}
