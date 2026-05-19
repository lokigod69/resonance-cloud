import { resolveGuidedBaseContent, type GuidedBaseLanguage, type GuidedLessonTrophyWord } from '@/data/guidedLessons'
import { useAuth } from '@/hooks/useAuth'

type TrophyWordCardProps = {
  trophyWord: GuidedLessonTrophyWord
  authoredBaseLanguage: GuidedBaseLanguage
}

export function TrophyWordCard({ trophyWord, authoredBaseLanguage }: TrophyWordCardProps) {
  const { profile } = useAuth()
  const meaning = resolveGuidedBaseContent(trophyWord.meaning, {
    preferredBaseLanguage: profile?.base_language,
    authoredBaseLanguage,
  }).text

  return (
    <article className="today-trophy-wordCard rounded-lg border border-[var(--border-subtle)] p-3">
      <p className="break-words text-lg font-semibold leading-tight text-[var(--text-primary)]">
        {trophyWord.word}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--today-text-soft)]">
        {meaning}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {trophyWord.example}
      </p>
    </article>
  )
}
