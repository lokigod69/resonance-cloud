import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as genericModule from '../api/prompts/_shared/generic'
import * as roleplayModule from '../api/prompts/_shared/roleplay'
import * as geminiModule from '../api/prompts/gemini'
import * as voxtralModule from '../api/prompts/voxtral'
import * as geminiTtsModule from '../api/_shared/geminiTts'
import * as pedagogyModule from '../api/prompts/_shared/pedagogy'
import { capReplayAudio } from '../src/lib/speakReplayMemory'
import { getGrokLevelInstructions } from '../src/lib/grokPedagogy'

// api/ is compiled as CommonJS by Vercel; tsx exposes those exports under
// default when this ESM contract script imports them.
const generic = (genericModule as typeof genericModule & { default?: typeof genericModule }).default ?? genericModule
const roleplayPrompt = (roleplayModule as typeof roleplayModule & { default?: typeof roleplayModule }).default ?? roleplayModule
const gemini = (geminiModule as typeof geminiModule & { default?: typeof geminiModule }).default ?? geminiModule
const voxtral = (voxtralModule as typeof voxtralModule & { default?: typeof voxtralModule }).default ?? voxtralModule
const geminiTts = (geminiTtsModule as typeof geminiTtsModule & { default?: typeof geminiTtsModule }).default ?? geminiTtsModule
const pedagogy = (pedagogyModule as typeof pedagogyModule & { default?: typeof pedagogyModule }).default ?? pedagogyModule

const normalizeInputTransport = (value: string) => value
  .replaceAll('You receive speech transcripts.', 'INPUT_TRANSPORT.')
  .replaceAll('You hear the learner directly.', 'INPUT_TRANSPORT.')

for (const level of ['zero', 'beginner', 'intermediate', 'advanced'] as const) {
  const asyncInstructions = pedagogy.getLevelInstructions('Spanish', 'French', level)
  const grokInstructions = getGrokLevelInstructions('Spanish', 'French', level)
  assert.equal(
    normalizeInputTransport(grokInstructions),
    normalizeInputTransport(asyncInstructions),
    `${level} mixed-language pedagogy must remain identical across async and Grok after input transport wording`,
  )
  assert.equal(/Heute|Hund|\bmeans\b/.test(grokInstructions), false)
}

const character = {
  name: 'Mira',
  tier: 'persona' as const,
  identity: 'A deliberately long identity that belongs in the system prompt only.',
  directive: 'A deliberately long speaking directive that belongs in the system prompt only.',
}

const expectedMix: Record<string, string> = {
  zero: 'about 70% English and 30% German',
  beginner: 'approximately even mix of English and German',
  intermediate: 'about 80% German and 20% English',
  advanced: 'in German',
}

for (const level of Object.keys(expectedMix)) {
  const input = { level, targetLangName: 'German', nativeLangName: 'English', studyWord: null }
  const greetings = [
    generic.buildGenericGreeting(input),
    gemini.buildGeminiGreeting(input),
    voxtral.buildVoxtralGreeting({ ...input, character }),
  ]
  greetings.forEach((greeting) => assert.match(greeting, new RegExp(expectedMix[level])))
}

const compactVoxtralGreeting = voxtral.buildVoxtralGreeting({
  level: 'beginner',
  targetLangName: 'German',
  nativeLangName: 'English',
  studyWord: null,
  character,
})
assert.equal(compactVoxtralGreeting.includes(character.identity), false)
assert.equal(compactVoxtralGreeting.includes(character.directive), false)
assert.ok(compactVoxtralGreeting.length < 250)

const roleplay = roleplayPrompt.buildRoleplaySystemPrompt({
  language: 'de',
  level: 'zero',
  nativeLanguage: 'en',
  scenarioPrompt: 'You are a café server.',
})
assert.match(roleplay, /70% English, 30% German/)
assert.match(roleplay, /native-language scaffolding/)
assert.equal(roleplay.includes('respond only in German'), false)

const frenchBaseSpanishZero = roleplayPrompt.buildRoleplaySystemPrompt({
  language: 'es',
  level: 'zero',
  nativeLanguage: 'fr',
  scenarioPrompt: 'You are a café server.',
})
assert.match(frenchBaseSpanishZero, /natural meaning connector in French/)
assert.equal(/Heute|Hund|\bmeans\b/.test(frenchBaseSpanishZero), false)

const messages = Array.from({ length: 13 }, (_, index) => index % 2 === 0
  ? { role: 'assistant' as const, content: `assistant-${index}`, audioBase64: `audio-${index}`, audioFormat: 'wav' }
  : { role: 'user' as const, content: `user-${index}` })
const capped = capReplayAudio(messages, 4)
assert.deepEqual(capped.map((message) => message.content), messages.map((message) => message.content))
assert.equal(capped.filter((message) => message.audioBase64).length, 4)
assert.equal(messages.filter((message) => message.audioBase64).length, 7, 'input must not be mutated')
assert.equal(capped.at(-1)?.audioBase64, 'audio-12')

const originalFetch = globalThis.fetch
globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => Promise.resolve(new Response(
  new ReadableStream<Uint8Array>({
    start(controller) {
      init?.signal?.addEventListener(
        'abort',
        () => controller.error(new DOMException('aborted', 'AbortError')),
        { once: true },
      )
    },
  }),
  { status: 200, headers: { 'Content-Type': 'application/json' } },
))) as typeof fetch
const timeoutStartedAt = Date.now()
try {
  await assert.rejects(
    geminiTts.generateGeminiTtsFromPrompt('hello', 'Kore', 'test-key', 25),
    /timed out after 1s/,
  )
  assert.ok(Date.now() - timeoutStartedAt < 500, 'Gemini TTS response body must honor the supplied total budget')
} finally {
  globalThis.fetch = originalFetch
}

const voiceChatSource = readFileSync(resolve('api/voice-chat.ts'), 'utf8')
const voiceTutorSource = readFileSync(resolve('src/hooks/useVoiceTutor.ts'), 'utf8')
assert.match(voiceChatSource, /VOICE_PIPELINE_BUDGET_MS = 40_000/)
assert.match(voiceTutorSource, /VOICE_CHAT_TIMEOUT_MS = 55_000/)
assert.match(voiceTutorSource, /capReplayAudio\(next\)/)
assert.match(
  voiceTutorSource,
  /withClientDeadline\(async \(signal\) => \{[\s\S]*?auth\.getSession\(\)[\s\S]*?assertClientActive\(signal\)[\s\S]*?json = await res\.json\(\)[\s\S]*?return \{ res, json \}[\s\S]*?\}, VOICE_CHAT_TIMEOUT_MS\)/,
  'the tested whole-operation deadline must cover auth, fetch, and body decoding',
)

console.log('Speak async internals: prompt parity, bounded TTS, and replay memory checks passed')
