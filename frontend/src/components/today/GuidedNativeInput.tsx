import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { getScriptsForLanguage } from '@/lib/scriptlab/registry'

export function GuidedNativeInputSupport({
  targetLanguage,
  showScriptLab,
}: {
  targetLanguage: string | null | undefined
  showScriptLab: boolean
}) {
  const { t } = useTranslation()
  const script = getScriptsForLanguage(targetLanguage)[0]
  if (!script) return null

  return (
    <div
      className="grid justify-items-center gap-1 text-center text-sm leading-5 text-[var(--text-muted)]"
      data-guided-native-input-support={script.languageCode}
    >
      <p>{t('today.type.targetKeyboardHint', { language: t(`langName.${script.language}`) })}</p>
      {showScriptLab && (
        <Link
          to={`/alphabet/${script.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-3 font-semibold text-[var(--accent)] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          data-guided-script-lab-link={script.id}
        >
          {t('today.type.openScriptLab', { script: script.nativeName })}
        </Link>
      )}
    </div>
  )
}
