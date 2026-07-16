import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Lightbulb,
  MessageSquare,
  Mic,
  MessageCircle,
  Sparkles,
  Trophy,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getGuidedMatchPairs, resolveGuidedBaseContent, type GuidedDialogueTurn, type GuidedLesson } from '@/data/guidedLessons'
import { guidedVibes } from '@/data/guidedVibes'
import type { TodayLessonResult } from '@/lib/todayProgress'
import { playGuidedAudio, stopGuidedAudio } from '@/lib/guidedAudio'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { LessonMediaFrame } from '@/components/today/TodayHero'
import { MatchPairsStep } from '@/components/today/MatchPairsStep'
import { BuildPhraseStep, type BuildPhraseCheckState } from '@/components/today/BuildPhraseStep'
import { TypeRecallStep, type TypeRecallCheckState } from '@/components/today/TypeRecallStep'
import { SpeakStep, type SpeakCheckState } from '@/components/today/SpeakStep'
import { PatternStep } from '@/components/today/PatternStep'
import { ComplicationStep, type ComplicationCheckState } from '@/components/today/ComplicationStep'
import { RolePlayStep, type RolePlayCheckState } from '@/components/today/RolePlayStep'
import { canUseGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'
import { getSessionSteps, type TodaySessionStep } from '@/components/today/sessionSteps'
import { cn } from '@/lib/utils'

type TodaySessionProps = {
  lesson: GuidedLesson
  nextLesson?: GuidedLesson
  knownItemIds: Set<string>
  onComplete: (result: TodayLessonResult) => void
  onViewPath: () => void
  onOpenNextLesson: () => void
}

export function TodaySession({
  lesson,
  nextLesson,
  knownItemIds,
  onComplete,
  onViewPath,
  onOpenNextLesson,
}: TodaySessionProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const resolvedLessonTitle = resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text
  const matchPairs = getGuidedMatchPairs(lesson)
  const sessionSteps = getSessionSteps(lesson)
  const [stepIndex, setStepIndex] = useState(0)
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(() => new Set())
  const [buildState, setBuildState] = useState<BuildPhraseCheckState>({ status: 'idle', attempts: 0 })
  const [typeState, setTypeState] = useState<TypeRecallCheckState>({ status: 'idle', attempts: 0, usedFallback: false })
  const [speakState, setSpeakState] = useState<SpeakCheckState>(() => ({
    status: canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported',
    attempts: 0,
    transcriptMatch: 0,
    passed: false,
  }))
  const [clozeState, setClozeState] = useState<ComplicationCheckState>({
    status: 'idle',
    attempts: 0,
    usedFallback: false,
    blanksTotal: 0,
    blanksFirstTry: 0,
  })
  const [rolePlayState, setRolePlayState] = useState<RolePlayCheckState>(() => ({
    status: canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported',
    attempts: 0,
    transcriptMatch: 0,
    passed: false,
    turnsPassed: 0,
  }))
  const step = sessionSteps[stepIndex]
  const stepVisualState = getStepVisualState(step, {
    matchedPairIds,
    matchPairCount: matchPairs.length,
    buildState,
    typeState,
    speakState,
    clozeState,
    rolePlayState,
  })

  useEffect(() => stopGuidedAudio, [])

  const canContinue =
    step === 'scene'
    || step === 'pattern'
    || (step === 'matchPairs' && matchedPairIds.size === matchPairs.length)
    || (step === 'build' && buildState.status === 'correct')
    || (step === 'type' && typeState.status !== 'idle')
    || (step === 'complication' && clozeState.status === 'correct')
    || (step === 'speak' && canContinueFromSpeak(speakState))
    || (step === 'rolePlay' && canContinueFromSpeak(rolePlayState))

  const handleNext = () => {
    if (!canContinue) return

    if (step === 'speak' || step === 'rolePlay') {
      completeLesson()
      return
    }

    setStepIndex((current) => Math.min(current + 1, sessionSteps.length - 1))
  }

  const completeLesson = () => {
    // B1 sessions have no type/speak steps: the cloze feeds the type fields and
    // rolePlay feeds the speak fields, so todayProgress consumers stay unchanged.
    const isB1Session = sessionSteps.includes('rolePlay')
    const completedResult: TodayLessonResult = isB1Session
      ? {
        buildAttempts: buildState.attempts,
        typeAttempts: clozeState.attempts,
        typeUsedFallback: clozeState.usedFallback,
        speakAttempts: rolePlayState.attempts,
        speakTranscriptMatch: rolePlayState.transcriptMatch,
        speakPassed: rolePlayState.passed,
        knownMarkedCount: knownItemIds.size,
        clozeBlanksTotal: clozeState.blanksTotal,
        clozeBlanksFirstTry: clozeState.blanksFirstTry,
        rolePlayTurnsPassed: rolePlayState.turnsPassed,
      }
      : {
        buildAttempts: buildState.attempts,
        typeAttempts: typeState.attempts,
        typeUsedFallback: typeState.usedFallback,
        speakAttempts: speakState.attempts,
        speakTranscriptMatch: speakState.transcriptMatch,
        speakPassed: speakState.passed,
        knownMarkedCount: knownItemIds.size,
      }
    onComplete(completedResult)
    setStepIndex(sessionSteps.indexOf('complete'))
  }

  return (
    <section className="today-session-shell" data-session-step={step} data-step-state={stepVisualState}>
      <header className="today-session-header">
        <div className="today-session-titleRow">
          <div className="min-w-0 flex-1">
            <p className="today-session-kicker">
              {t('today.lessonLabel', { sequence: lesson.lessonNumber })}
            </p>
            <h2 className="today-session-title">
              {resolvedLessonTitle}
            </h2>
          </div>
          <div className="today-session-topActions">
            <button
              type="button"
              className="today-session-backPill"
              onClick={onViewPath}
              aria-label={t('today.path.backToPath')}
              title={t('today.path.backToPath')}
            >
              <ChevronLeft className="today-session-backIcon" aria-hidden="true" />
              <span className="today-session-backLabel">
                {t('today.path.backToPath')}
              </span>
            </button>
            <span className="today-session-countPill">
              {t('today.progressLabel', { current: stepIndex + 1, total: sessionSteps.length })}
            </span>
          </div>
        </div>
        <TodayLessonProgressRail steps={sessionSteps} stepIndex={stepIndex} />
      </header>

      <div key={step} className="today-session-taskCard today-step-stage" data-session-step={step} data-step-state={stepVisualState}>
        {step !== 'complete' && (
          <div className="today-session-taskHeader">
            <TodayLessonStepIcon step={step} compact />
            <h3 className="today-session-taskTitle">
              {t(getStepTitleKey(step, lesson))}
            </h3>
          </div>
        )}
        {step === 'scene' && <SceneStep lesson={lesson} />}
        {step === 'matchPairs' && (
          <MatchPairsStep
            lesson={lesson}
            matchedPairIds={matchedPairIds}
            onMatchedPairIdsChange={setMatchedPairIds}
          />
        )}
        {step === 'pattern' && <PatternStep lesson={lesson} />}
        {step === 'build' && (
          <BuildPhraseStep lesson={lesson} onCheckStateChange={setBuildState} />
        )}
        {step === 'type' && (
          <TypeRecallStep lesson={lesson} onCheckStateChange={setTypeState} />
        )}
        {step === 'complication' && (
          <ComplicationStep lesson={lesson} onCheckStateChange={setClozeState} />
        )}
        {step === 'speak' && (
          <SpeakStep lesson={lesson} onCheckStateChange={setSpeakState} />
        )}
        {step === 'rolePlay' && (
          <RolePlayStep lesson={lesson} onCheckStateChange={setRolePlayState} />
        )}
        {step === 'complete' && (
          <CompleteStep
            lesson={lesson}
            nextLesson={nextLesson}
            onViewPath={onViewPath}
            onOpenNextLesson={onOpenNextLesson}
          />
        )}
      </div>

      {step !== 'complete' && (
        <div className="today-session-footer">
          <Button className="today-session-footerButton" onClick={handleNext} disabled={!canContinue}>
            {t('today.continue')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  )
}

const stepIconMap: Record<TodaySessionStep, LucideIcon> = {
  scene: MessageCircle,
  matchPairs: Sparkles,
  pattern: Lightbulb,
  build: Sparkles,
  type: Keyboard,
  complication: MessageSquare,
  rolePlay: Mic,
  speak: Mic,
  complete: Trophy,
}

function TodayLessonStepIcon({
  step,
  compact = false,
}: {
  step: TodaySessionStep
  compact?: boolean
}) {
  const Icon = stepIconMap[step]

  return (
    <span className={cn('today-session-iconBadge', compact && 'today-session-iconBadge--compact')} aria-hidden="true">
      <span className="today-session-iconAura" />
      <Icon className="today-session-icon" />
    </span>
  )
}

function TodayLessonProgressRail({ steps, stepIndex }: { steps: TodaySessionStep[]; stepIndex: number }) {
  return (
    <div className="today-session-progressRail" aria-hidden="true">
      <span
        className="today-session-progressFill"
        style={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }}
      />
      {steps.map((sessionStep, index) => (
        <span
          key={sessionStep}
          className="today-session-progressNode"
          data-node-state={index < stepIndex ? 'complete' : index === stepIndex ? 'current' : 'upcoming'}
          style={{ left: `${(index / (steps.length - 1)) * 100}%` }}
        >
          {index < stepIndex && <CheckCircle2 className="today-session-progressCheck" />}
        </span>
      ))}
    </div>
  )
}

function getStepTitleKey(step: TodaySessionStep, lesson: GuidedLesson) {
  switch (step) {
    case 'matchPairs':
      return 'today.matchPairs.title'
    case 'pattern':
      return 'today.pattern.title'
    case 'build':
      return 'today.build.title'
    case 'type':
      return 'today.type.title'
    case 'complication':
      return 'today.complication.title'
    case 'speak':
      return 'today.speak.title'
    case 'rolePlay':
      return 'today.rolePlay.title'
    case 'complete':
      return 'today.completion.title'
    case 'scene':
    default:
      // The B1 scene deliberately withholds the core phrase (design doc §3.2 step 1).
      return lesson.level === 'B1' ? 'today.scene.title' : 'today.corePhrase'
  }
}

function getStepVisualState(
  step: TodaySessionStep,
  state: {
    matchedPairIds: Set<string>
    matchPairCount: number
    buildState: BuildPhraseCheckState
    typeState: TypeRecallCheckState
    speakState: SpeakCheckState
    clozeState: ComplicationCheckState
    rolePlayState: RolePlayCheckState
  },
) {
  if (step === 'complete') return 'complete'
  if (step === 'matchPairs') {
    return state.matchedPairIds.size === state.matchPairCount ? 'correct' : 'active'
  }
  if (step === 'build') return state.buildState.status
  if (step === 'type') return state.typeState.status
  if (step === 'complication') return state.clozeState.status
  if (step === 'speak') return state.speakState.status
  if (step === 'rolePlay') return state.rolePlayState.status
  return 'active'
}

function SceneStep({ lesson }: { lesson: GuidedLesson }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const resolvedCoreBase = resolveGuidedBaseContent(lesson.corePhrase.baseText, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text
  const handleListen = () => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'corePhrase',
      surfaceKey: '__self',
      text: lesson.corePhrase.targetText,
      lang: lesson.speak.language,
    })
  }

  // B1 setup mode (design doc §3.2 step 1): situation + them₁ only — the
  // episode's outcome (and the learner's own line) stays hidden until built.
  const themOne = lesson.level === 'B1' ? lesson.dialogue?.[0] : undefined
  if (themOne) {
    return <SceneStepB1 lesson={lesson} themOne={themOne} />
  }

  return (
    <div className="today-scene-step">
      <div className="today-scene-phraseCard today-scene-phraseCard--hero rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_64%,transparent)]">
        <div className="today-scene-phraseTop">
          <p className="today-scene-label">
            {t('today.corePhrase')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleListen}
          >
            <Volume2 className="h-4 w-4" />
            {t('today.listen')}
          </Button>
        </div>
        <p className="today-scene-targetText">
          {lesson.corePhrase.targetText}
        </p>
        <p className="today-scene-baseText">
          {resolvedCoreBase}
        </p>
      </div>
      <div className="today-scene-mediaContext">
        <LessonMediaFrame
          className="today-scene-mediaFrame"
          media={lesson.lessonMedia}
          authoredBaseLanguage={lesson.baseLanguage}
          preferredBaseLanguage={preferredBaseLanguage}
        />
        <div className="today-scene-situationStrip rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_54%,transparent)]">
          <p className="today-scene-label">
            {t('today.scene.situation')}
          </p>
          <p className="today-scene-situationText">
            {lesson.situation.de}
          </p>
        </div>
      </div>
    </div>
  )
}

function SceneStepB1({ lesson, themOne }: { lesson: GuidedLesson; themOne: GuidedDialogueTurn }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const resolvedThemOneBase = resolveGuidedBaseContent(themOne.baseText, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text
  // Unlike the legacy scene (situation.de by convention), the B1 setup must be
  // comprehensible: resolve the situation to the learner's base language.
  const resolvedSituation = resolveGuidedBaseContent(
    { en: lesson.situation.en, de: lesson.situation.de },
    { preferredBaseLanguage, authoredBaseLanguage: lesson.baseLanguage },
  ).text
  const handleListen = () => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'dialogue',
      surfaceKey: 'turn-1',
      text: themOne.targetText,
      lang: lesson.speak.language,
    })
  }

  return (
    <div className="today-scene-step">
      <div className="today-scene-phraseCard today-scene-phraseCard--hero rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_64%,transparent)]">
        <div className="today-scene-phraseTop">
          <p className="today-scene-label">
            {t('today.scene.theyOpen')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleListen}
          >
            <Volume2 className="h-4 w-4" />
            {t('today.listen')}
          </Button>
        </div>
        <p className="today-scene-targetText">
          {themOne.targetText}
        </p>
        <p className="today-scene-baseText">
          {resolvedThemOneBase}
        </p>
      </div>
      <div className="today-scene-mediaContext">
        <LessonMediaFrame
          className="today-scene-mediaFrame"
          media={lesson.lessonMedia}
          authoredBaseLanguage={lesson.baseLanguage}
          preferredBaseLanguage={preferredBaseLanguage}
        />
        <div className="today-scene-situationStrip rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_54%,transparent)]">
          <p className="today-scene-label">
            {t('today.scene.situation')}
          </p>
          <p className="today-scene-situationText">
            {resolvedSituation}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.scene.b1Goal')}
          </p>
        </div>
      </div>
    </div>
  )
}

function CompleteStep({
  lesson,
  nextLesson,
  onViewPath,
  onOpenNextLesson,
}: {
  lesson: GuidedLesson
  nextLesson?: GuidedLesson
  onViewPath: () => void
  onOpenNextLesson: () => void
}) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const vibe = guidedVibes[lesson.vibeId]
  const trophyMeaning = resolveGuidedBaseContent(lesson.trophyWord.meaning, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text
  const resolvedCoreBase = resolveGuidedBaseContent(lesson.corePhrase.baseText, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text
  const handleTrophyListen = () => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'trophyWord',
      surfaceKey: '__self',
      text: lesson.trophyWord.word,
      lang: lesson.speak.language,
    })
  }

  return (
    <div className="today-completion-stage grid gap-5 text-center">
      <div className="today-completion-vibeBadge mx-auto" aria-label={vibe.label}>
        {guidedVibes[lesson.vibeId].emblem?.url && (
          <img
            src={guidedVibes[lesson.vibeId].emblem?.url}
            alt=""
            className="today-completion-vibeBadgeImage"
            draggable={false}
          />
        )}
      </div>
      <div>
        <h3 className="text-3xl font-semibold text-[var(--text-primary)]">
          {t('today.completion.title')}
        </h3>
      </div>
      {lesson.dialogue && lesson.dialogue.length === 4 ? (
        <EpisodeRecap lesson={lesson} dialogue={lesson.dialogue} />
      ) : (
        <div className="today-completion-corePhrase mx-auto w-full rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('today.corePhrase')}
          </p>
          <p className="mt-2 break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            {lesson.corePhrase.targetText}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-[var(--text-secondary)]">
            {resolvedCoreBase}
          </p>
        </div>
      )}
      <div className="today-trophy-panel mx-auto w-full max-w-sm rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <Trophy className="h-4 w-4 text-[var(--accent)]" />
          {t('today.trophyWord.title')}
        </p>
        <div className="mt-3">
          <div className="flex min-w-0 items-center justify-center gap-2">
            <p className="min-w-0 break-words text-4xl font-semibold leading-tight text-[var(--text-primary)]">
              {lesson.trophyWord.word}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleTrophyListen}
              aria-label={`${t('today.listen')}: ${lesson.trophyWord.word}`}
              title={`${t('today.listen')}: ${lesson.trophyWord.word}`}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
            {trophyMeaning}
          </p>
          {lesson.trophyWord.example && (
            <p className="mt-2 break-words text-xs leading-5 text-[var(--text-muted)]">
              {lesson.trophyWord.example}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {nextLesson ? (
          <Button onClick={onOpenNextLesson}>
            {t('today.nextLesson')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onViewPath}>
            {t('today.path.backToPath')}
          </Button>
        )}
        {nextLesson && (
          <Button variant="outline" onClick={onViewPath}>
            {t('today.path.backToPath')}
          </Button>
        )}
      </div>
    </div>
  )
}

function EpisodeRecap({ lesson, dialogue }: { lesson: GuidedLesson; dialogue: GuidedDialogueTurn[] }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language

  return (
    <div className="today-completion-recap mx-auto w-full rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] p-4 text-left">
      <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {t('today.completion.recapTitle')}
      </p>
      <ul className="mt-3 grid gap-2">
        {dialogue.map((turn, index) => {
          const resolvedBase = resolveGuidedBaseContent(turn.baseText, {
            preferredBaseLanguage,
            authoredBaseLanguage: lesson.baseLanguage,
          }).text

          return (
            <li
              key={index}
              className={cn(
                'today-completion-recapTurn max-w-[88%] rounded-lg border px-3 py-2',
                turn.speaker === 'you'
                  ? 'justify-self-end border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
                  : 'justify-self-start border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_58%,transparent)]',
              )}
              data-speaker={turn.speaker}
            >
              <p className="break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
                {turn.targetText}
              </p>
              <p className="mt-0.5 break-words text-xs leading-5 text-[var(--text-secondary)]">
                {resolvedBase}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function canContinueFromSpeak(speakState: Pick<SpeakCheckState, 'status'>) {
  return speakState.status === 'passed'
    || speakState.status === 'continued'
    || speakState.status === 'unsupported'
}
