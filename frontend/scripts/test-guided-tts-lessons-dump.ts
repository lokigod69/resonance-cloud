import assert from 'node:assert/strict'
import { buildGuidedTtsLessonsDump } from './guided-tts-lessons-dump.ts'

const payload = buildGuidedTtsLessonsDump()
assert.equal(payload.length, 2500, 'TTS generation dump must include all 2,500 authored lessons')
assert(payload.some((lesson) => lesson.id === 'english-a1-practical-001-first-contact'), 'TTS dump must include the first English lesson')
assert(payload.some((lesson) => lesson.id.startsWith('german-b1-practical-')), 'TTS dump must include B1 dialogue lessons')
assert(payload.every((lesson) => Object.keys(lesson.vibeVariants).length > 0), 'Every dumped lesson must retain its vibe variants')

console.log(`Guided TTS lesson dump tests passed (${payload.length} lessons)`)
