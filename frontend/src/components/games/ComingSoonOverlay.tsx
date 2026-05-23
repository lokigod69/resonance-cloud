import { useTranslation } from '@/hooks/useTranslation'

export function ComingSoonOverlay() {
  const { t } = useTranslation()

  return (
    <span
      className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-[color-mix(in_srgb,var(--accent)_48%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-1)_84%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)] shadow-[0_0_18px_var(--accent-glow)]"
      aria-hidden="true"
    >
      {t('study.comingSoon')}
    </span>
  )
}
