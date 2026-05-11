import { useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type PhraseMapStepProps = {
  lesson: GuidedLesson
}

export function PhraseMapStep({ lesson }: PhraseMapStepProps) {
  const { t } = useTranslation()
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)

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
        {lesson.phraseChunks.map((chunk) => {
          const isActive = activeChunkId === chunk.id

          return (
            <button
              key={chunk.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveChunkId((current) => current === chunk.id ? null : chunk.id)}
              className={cn(
                'min-w-0 rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                isActive
                  ? 'border-[color-mix(in_srgb,var(--accent)_48%,transparent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_68%,transparent)]',
              )}
            >
              <p
                className={cn(
                  'break-words font-semibold leading-snug',
                  isActive
                    ? 'text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]'
                    : 'text-xl text-[var(--text-primary)]',
                )}
              >
                {chunk.targetText}
              </p>
              <div className="my-3 h-px bg-[var(--border-subtle)]" />
              <p
                className={cn(
                  'break-words leading-6',
                  isActive
                    ? 'text-xl font-semibold text-[var(--text-primary)]'
                    : 'text-sm text-[var(--text-secondary)]',
                )}
              >
                {chunk.baseText}
              </p>
              <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                {isActive ? t('today.phraseMap.activeHint') : t('today.phraseMap.tapHint')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
