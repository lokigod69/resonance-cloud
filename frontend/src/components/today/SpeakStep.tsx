import { resolveGuidedBaseContent, type GuidedLesson } from '@/data/guidedLessons'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import {
  GuidedSpeechPrompt,
  type GuidedSpeechPromptCheckState,
} from '@/components/today/GuidedSpeechPrompt'

export type SpeakCheckState = GuidedSpeechPromptCheckState

type SpeakStepProps = {
  lesson: GuidedLesson
  onCheckStateChange: (state: SpeakCheckState) => void
}

export function SpeakStep({ lesson, onCheckStateChange }: SpeakStepProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const cueText = resolveGuidedBaseContent(lesson.speak.baseCue, {
    preferredBaseLanguage: profile?.base_language,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  return (
    <GuidedSpeechPrompt
      prompt={t('today.speak.prompt')}
      cueLabel={t('today.speak.cueLabel')}
      cueText={cueText}
      targetAnswer={lesson.speak.targetAnswer ?? lesson.speak.targetPhrase}
      displayAnswer={lesson.speak.displayAnswer ?? lesson.speak.targetAnswer ?? lesson.speak.targetPhrase}
      acceptedAnswers={lesson.speak.acceptedAnswers}
      requiredTokens={lesson.speak.requiredTokens}
      optionalTokens={lesson.speak.optionalTokens}
      language={lesson.speak.language}
      maxRecordingSeconds={lesson.speak.maxRecordingSeconds}
      onCheckStateChange={onCheckStateChange}
    />
  )
}
