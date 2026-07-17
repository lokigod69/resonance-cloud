/**
 * Emit the Guided Today lesson definitions as JSON so the Python generation
 * entry point (src/services/guided_tts/generate.py) can consume them without
 * importing TypeScript.
 *
 * Run via: npx tsx scripts/guided-tts-lessons-dump.ts
 */

import { GUIDED_LESSONS } from '../src/data/guidedLessons.ts'

const payload = GUIDED_LESSONS.map((lesson) => ({
  id: lesson.id,
  pathId: lesson.pathId,
  lessonNumber: lesson.lessonNumber,
  vibeVariants: Object.fromEntries(
    Object.entries(lesson.vibeVariants).map(([vibe, variant]) => [
      vibe,
      variant
        ? {
            corePhrase: { targetText: variant.corePhrase?.targetText ?? '' },
            chunks: (variant.chunks ?? []).map((chunk) => ({
              id: chunk.id,
              targetText: chunk.targetText,
            })),
            speakTarget: { targetPhrase: variant.speakTarget?.targetPhrase ?? '' },
            trophyWord: { word: variant.trophyWord?.word ?? '' },
            // B1 episode surfaces (absent on A1/A2 lessons): the Python side
            // keys turns positionally as turn-1..turn-4 and examples as ex-N.
            ...(variant.dialogue
              ? { dialogue: variant.dialogue.map((turn) => ({ targetText: turn.targetText })) }
              : {}),
            ...(variant.pattern
              ? { pattern: { examples: variant.pattern.examples.map((ex) => ({ targetText: ex.targetText })) } }
              : {}),
          }
        : null,
    ]),
  ),
}))

process.stdout.write(JSON.stringify(payload))
