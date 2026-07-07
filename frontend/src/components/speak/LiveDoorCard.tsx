import { ArrowRight, Zap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface LiveDoorCardProps {
  onEnter: () => void
  disabled?: boolean
}

/**
 * The "Live" door on the Speak casting screen — Grok realtime presented as
 * the hero premium experience (gold edge, centered) rather than a
 * tech-provider tab. The cost-class distinction stays visible on purpose via
 * the Premium badge; see docs/Product/FABLE_SPEAK_REDESIGN_DECISIONS.md (D3).
 */
export function LiveDoorCard({ onEnter, disabled }: LiveDoorCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onEnter}
      disabled={disabled}
      className="speak-glass-card group relative mx-auto flex w-full max-w-xl flex-col items-center gap-4 overflow-hidden border-[var(--accent-2)]/35 px-6 py-9 text-center shadow-[0_0_60px_var(--accent-glow)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent-2)]/60 hover:bg-[var(--surface-glass-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]/70 disabled:cursor-not-allowed disabled:opacity-50 sm:px-10 sm:py-11"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-2)]/70 to-transparent" />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[var(--accent-2-soft)] blur-3xl"
      />
      <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[var(--accent-2)]/40 bg-[var(--accent-2-soft)] shadow-[0_0_40px_var(--accent-glow)]">
        <Zap className="h-9 w-9 text-[var(--accent-2)]" />
      </span>
      <span className="relative rounded-full border border-[var(--accent-2)]/40 bg-[var(--accent-2-soft)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-2)]">
        {t('speak.live.badge')}
      </span>
      <span className="relative flex flex-col items-center gap-2">
        <span className="text-2xl font-semibold text-[var(--text-primary)] sm:text-[1.75rem]">{t('speak.live.title')}</span>
        <span className="max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">{t('speak.live.subtitle')}</span>
      </span>
      <span className="relative mt-1 inline-flex items-center gap-2 rounded-full border border-[var(--accent-2)]/40 bg-[var(--accent-2-soft)] px-5 py-2.5 text-sm font-bold text-[var(--accent-2)] transition-transform group-hover:translate-y-0">
        {t('speak.live.cta')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
