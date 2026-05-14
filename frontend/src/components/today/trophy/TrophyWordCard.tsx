import type { GuidedLessonTrophyWord } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'

type TrophyWordCardProps = {
  trophyWord: GuidedLessonTrophyWord
}

export function TrophyWordCard({ trophyWord }: TrophyWordCardProps) {
  const { t } = useTranslation()

  return (
    <article className="today-trophy-wordCard rounded-lg border border-[var(--border-subtle)] p-3">
      <p className="break-words text-lg font-semibold leading-tight text-[var(--text-primary)]">
        {trophyWord.word}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--today-text-soft)]">
        {trophyWord.meaning}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {trophyWord.example}
      </p>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {t('today.trophy.wordWhy')}
      </p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        {trophyWord.whyThisWord}
      </p>
    </article>
  )
}
