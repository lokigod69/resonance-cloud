import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { getScriptsForLanguage } from '@/lib/scriptlab/registry'

export function ScriptPracticeLink({ language }: { language: string | null }) {
  const { t } = useTranslation()
  const script = getScriptsForLanguage(language)[0]
  if (!script) return null
  return (
    <Link
      to={`/alphabet/${script.id}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--border-subtle)] underline-offset-4 hover:decoration-current focus-visible:outline-2"
    >
      <span lang={script.languageCode} aria-hidden="true">{script.emblem}</span>
      {t(`scriptlab.practice.${script.id}`)}
    </Link>
  )
}
