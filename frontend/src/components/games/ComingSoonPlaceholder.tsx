import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'

export function ComingSoonPlaceholder() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="theme-card w-full max-w-xl rounded-lg border border-[var(--border-subtle)] p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {t('games.runner.title')}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
          {t('study.comingSoon')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Runner is under construction and will return when it is ready for Learners.
        </p>
        <button
          type="button"
          onClick={() => navigate('/games')}
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--accent-soft)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_58%,var(--border-subtle))] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('games.runner.deckPicker.back')}
        </button>
      </section>
    </div>
  )
}
