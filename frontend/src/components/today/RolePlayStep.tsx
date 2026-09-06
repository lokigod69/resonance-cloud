import { CheckCircle2, ChevronRight, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  resolveGuidedBaseContent,
  type GuidedClozeSegment,
  type GuidedDialogueTurn,
  type GuidedLesson,
} from '@/data/guidedLessons'
import { playGuidedAudio, stopGuidedAudio } from '@/lib/guidedAudio'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import {
  GuidedSpeechPrompt,
  type GuidedSpeechPromptCheckState,
} from '@/components/today/GuidedSpeechPrompt'
import { canUseGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'
import { tokenizeGuidedSpeech } from '@/lib/guidedSpeechCheck'

export type RolePlayCheckState = {
  status: GuidedSpeechPromptCheckState['status']
  /** summed speech attempts across both turns */
  attempts: number
  /** worst-of-two-turns transcript match */
  transcriptMatch: number
  /** both turns passed */
  passed: boolean
  turnsPassed: number
}

type RolePlayStepProps = {
  lesson: GuidedLesson
  onCheckStateChange: (state: RolePlayCheckState) => void
}

/**
 * B1 step 6 (design doc §3.2): the episode performed end-to-end. them₁ plays,
 * the learner speaks you₁; them₂ plays, the learner speaks you₂ — per-turn
 * retry, pass/continue semantics as today's speak step.
 */
export function RolePlayStep({ lesson, onCheckStateChange }: RolePlayStepProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const dialogue = lesson.dialogue ?? []
  const [turnIndex, setTurnIndex] = useState<0 | 1>(0)
  const [turnStates, setTurnStates] = useState<[GuidedSpeechPromptCheckState, GuidedSpeechPromptCheckState]>(() => {
    const initial: GuidedSpeechPromptCheckState = {
      status: canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported',
      attempts: 0,
      transcriptMatch: 0,
      passed: false,
    }
    return [initial, { ...initial }]
  })

  const currentThemTurn = dialogue[turnIndex === 0 ? 0 : 2]

  // The interlocutor cues each part (design doc §3.2 step 6): them plays as the
  // part opens — best-effort (autoplay policies vary; the Listen button remains).
  useEffect(() => {
    if (!currentThemTurn) return
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'dialogue',
      surfaceKey: turnIndex === 0 ? 'turn-1' : 'turn-3',
      text: currentThemTurn.targetText,
      lang: lesson.speak.language,
    })
    return stopGuidedAudio
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the part only; lesson identity is stable within a session.
  }, [turnIndex])

  if (dialogue.length !== 4) return null

  const themTurn = dialogue[turnIndex === 0 ? 0 : 2]
  const yourTurn = dialogue[turnIndex === 0 ? 1 : 3]
  const themSurfaceKey = turnIndex === 0 ? 'turn-1' : 'turn-3'
  const currentState = turnStates[turnIndex]
  const isTurnComplete = (state: GuidedSpeechPromptCheckState) => state.status === 'passed' || state.status === 'continued'
  const canAdvanceToSecondTurn = turnIndex === 0 && isTurnComplete(turnStates[0])

  const publish = (nextStates: [GuidedSpeechPromptCheckState, GuidedSpeechPromptCheckState], activeIndex: 0 | 1) => {
    const bothPassed = nextStates[0].passed && nextStates[1].passed
    const bothComplete = isTurnComplete(nextStates[0]) && isTurnComplete(nextStates[1])
    // The step passes only when BOTH turns pass — a single turn's 'passed'
    // must never unlock the session footer (the episode is performed whole).
    const activeStatus = nextStates[activeIndex].status
    onCheckStateChange({
      status: bothPassed
        ? 'passed'
        : bothComplete
          ? 'continued'
          : isTurnComplete(nextStates[activeIndex]) ? 'idle' : activeStatus,
      attempts: nextStates[0].attempts + nextStates[1].attempts,
      transcriptMatch: Math.min(nextStates[0].transcriptMatch, nextStates[1].transcriptMatch),
      passed: bothPassed,
      turnsPassed: (nextStates[0].passed ? 1 : 0) + (nextStates[1].passed ? 1 : 0),
    })
  }

  const handleTurnStateChange = (state: GuidedSpeechPromptCheckState) => {
    setTurnStates((current) => {
      const next: [GuidedSpeechPromptCheckState, GuidedSpeechPromptCheckState] =
        turnIndex === 0 ? [state, current[1]] : [current[0], state]
      publish(next, turnIndex)
      return next
    })
  }

  const handleListenThem = () => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'dialogue',
      surfaceKey: themSurfaceKey,
      text: themTurn.targetText,
      lang: lesson.speak.language,
    })
  }

  const yourTurnCue = resolveGuidedBaseContent(yourTurn.baseText, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  return (
    <div className="today-roleplay-step grid gap-5">
      <div className="today-roleplay-turnRow mx-auto flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span
          className="today-roleplay-turnPill inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-3 py-1"
          data-turn-state={isTurnComplete(turnStates[0]) ? 'passed' : turnIndex === 0 ? 'current' : 'upcoming'}
        >
          {isTurnComplete(turnStates[0]) && <CheckCircle2 className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />}
          {t('today.rolePlay.turnLabel', { turn: 1 })}
        </span>
        <span
          className="today-roleplay-turnPill inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-3 py-1"
          data-turn-state={isTurnComplete(turnStates[1]) ? 'passed' : turnIndex === 1 ? 'current' : 'upcoming'}
        >
          {isTurnComplete(turnStates[1]) && <CheckCircle2 className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />}
          {t('today.rolePlay.turnLabel', { turn: 2 })}
        </span>
      </div>

      <div className="today-roleplay-themCard rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('today.rolePlay.theirLine')}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleListenThem}>
            <Volume2 className="h-4 w-4" />
            {t('today.listen')}
          </Button>
        </div>
        <p className="mt-2 break-words text-xl font-semibold leading-snug text-[var(--text-primary)] sm:text-2xl">
          {themTurn.targetText}
        </p>
      </div>

      <GuidedSpeechPrompt
        key={turnIndex}
        prompt={t('today.rolePlay.prompt')}
        cueLabel={t('today.rolePlay.yourTurn')}
        cueText={yourTurnCue}
        targetAnswer={yourTurn.targetText}
        displayAnswer={yourTurn.targetText}
        acceptedAnswers={turnIndex === 0 ? lesson.speak.acceptedAnswers : undefined}
        requiredTokens={turnIndex === 0 ? lesson.speak.requiredTokens : getSecondTurnRequiredTokens(lesson, yourTurn)}
        optionalTokens={turnIndex === 0 ? lesson.speak.optionalTokens : undefined}
        language={lesson.speak.language}
        maxRecordingSeconds={lesson.speak.maxRecordingSeconds}
        allowContinueWhenUnsupported
        onCheckStateChange={handleTurnStateChange}
      />

      {canAdvanceToSecondTurn && (
        <div className="flex justify-center">
          <Button type="button" onClick={() => setTurnIndex(1)}>
            {t('today.rolePlay.nextTurn')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {currentState.status === 'passed' && turnIndex === 0 ? t('today.rolePlay.firstTurnPassed') : ''}
      </div>
    </div>
  )
}

/**
 * you₂ has no authored speakTarget — its salient tokens are the cloze blanks'
 * answers (the anchor forms the learner just produced). Multi-word answers
 * (≤ 3 words, e.g. clause-final verb clusters) contribute each of their tokens.
 */
function getSecondTurnRequiredTokens(lesson: GuidedLesson, yourTurn: GuidedDialogueTurn): string[] | undefined {
  const blankTokens = (lesson.cloze?.segments ?? [])
    .filter((segment): segment is Extract<GuidedClozeSegment, { type: 'blank' }> => segment.type === 'blank')
    .flatMap((segment) => tokenizeGuidedSpeech(segment.blank.answer))

  if (blankTokens.length === 0) return undefined

  const turnTokens = new Set(tokenizeGuidedSpeech(yourTurn.targetText))
  const tokens = [...new Set(blankTokens)].filter((token) => turnTokens.has(token))
  return tokens.length > 0 ? tokens : undefined
}
