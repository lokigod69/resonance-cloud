import { ArrowRight, Zap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface LiveDoorCardProps {
  onEnter: () => void
  disabled?: boolean
}

/**
 * The "Live" door on the Speak casting screen — Grok realtime presented as
 * the premium experience (gold edge) rather than a tech-provider tab. The
 * cost-class distinction stays visible on purpose; see
 * docs/Product/FABLE_SPEAK_REDESIGN_DECISIONS.md (D3).
 */
export function LiveDoorCard({ onEnter, disabled }: LiveDoorCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onEnter}
      disabled={disabled}
      className="speak-glass-card group relative flex w-full items-center gap-4 overflow-hidden border-[var(--accent-2)]/35 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--accent-2)]/60 hover:bg-[var(--surface-glass-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]/70 disabled:cursor-not-allowed disabled:opacity-50 sm:p-6"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-2)]/60 to-transparent" />
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--accent-2)]/40 bg-[var(--accent-2-soft)] shadow-[0_0_28px_var(--accent-glow)]">
        <Zap className="h-6 w-6 text-[var(--accent-2)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-lg font-semibold text-[var(--text-primary)]">{t('speak.live.title')}</span>
          <span className="rounded-full border border-[var(--accent-2)]/40 bg-[var(--accent-2-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-2)]">
            {t('speak.live.badge')}
          </span>
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">{t('speak.live.subtitle')}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-2)]" />
    </button>
  )
}
