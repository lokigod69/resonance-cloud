import { Volume2 } from 'lucide-react'
import { resolveGuidedBaseContent, type GuidedLesson, type GuidedPatternSpotlight } from '@/data/guidedLessons'
import { playGuidedAudio } from '@/lib/guidedAudio'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'

type PatternStepProps = {
  lesson: GuidedLesson
}

/**
 * B1 grammar spotlight (design doc §3.2 step 3): anchor label, a one-line
 * rule, 2–3 highlighted examples with audio. Display-only — no check state.
 */
export function PatternStep({ lesson }: PatternStepProps) {
  const { t } = useTranslation()

  if (!lesson.pattern) return null

  return (
    <div className="today-pattern-step grid gap-5">
      <p className="today-step-prompt mx-auto max-w-xl text-center text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.pattern.prompt')}
      </p>
      <PatternSpotlightCard lesson={lesson} pattern={lesson.pattern} />
    </div>
  )
}

export function PatternSpotlightCard({
  lesson,
  pattern,
}: {
  lesson: GuidedLesson
  pattern: GuidedPatternSpotlight
}) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const resolvedRule = resolveGuidedBaseContent(pattern.rule, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  const handleListen = (exampleIndex: number, text: string) => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'pattern',
      surfaceKey: `ex-${exampleIndex + 1}`,
      text,
      lang: lesson.speak.language,
    })
  }

  return (
    <div className="today-pattern-card rounded-lg border border-[color-mix(in_srgb,var(--accent)_38%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-1)_60%,transparent)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="today-pattern-label inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)]">
          {pattern.label}
        </span>
      </div>
      <p className="mt-3 text-base leading-7 text-[var(--text-primary)]">
        {resolvedRule}
      </p>
      <ul className="mt-4 grid gap-3">
        {pattern.examples.map((example, index) => {
          const resolvedExampleBase = resolveGuidedBaseContent(example.baseText, {
            preferredBaseLanguage,
            authoredBaseLanguage: lesson.baseLanguage,
          }).text

          return (
            <li
              key={`${example.targetText}-${index}`}
              className="today-pattern-example rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_48%,transparent)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-lg font-semibold leading-snug text-[var(--text-primary)]">
                  <HighlightedTargetText targetText={example.targetText} highlight={example.highlight} />
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleListen(index, example.targetText)}
                  aria-label={`${t('today.listen')}: ${example.targetText}`}
                  title={`${t('today.listen')}: ${example.targetText}`}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
                {resolvedExampleBase}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function HighlightedTargetText({ targetText, highlight }: { targetText: string; highlight: string }) {
  const highlightIndex = highlight ? targetText.indexOf(highlight) : -1
  if (highlightIndex < 0) return <>{targetText}</>

  return (
    <>
      {targetText.slice(0, highlightIndex)}
      <mark className="today-pattern-highlight rounded bg-[color-mix(in_srgb,var(--accent)_26%,transparent)] px-0.5 text-[var(--text-primary)]">
        {targetText.slice(highlightIndex, highlightIndex + highlight.length)}
      </mark>
      {targetText.slice(highlightIndex + highlight.length)}
    </>
  )
}
