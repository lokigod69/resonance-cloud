import type { GuidedLesson } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'

type PhraseMapStepProps = {
  lesson: GuidedLesson
}

export function PhraseMapStep({ lesson }: PhraseMapStepProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t('today.phraseMap.title')}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.phraseMap.subtitle')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {lesson.phraseChunks.map((chunk) => (
          <div
            key={chunk.id}
            className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_68%,transparent)] p-4"
          >
            <p className="break-words text-xl font-semibold leading-snug text-[var(--text-primary)]">
              {chunk.targetText}
            </p>
            <div className="my-3 h-px bg-[var(--border-subtle)]" />
            <p className="break-words text-sm leading-6 text-[var(--text-secondary)]">
              {chunk.baseText}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
