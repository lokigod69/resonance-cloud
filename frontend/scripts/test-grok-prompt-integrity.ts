import assert from 'node:assert/strict'
import { GROK_CATEGORIES } from '../src/data/grokCategories'
import { buildGrokSessionConfig } from '../src/lib/grokSessionConfig'

let checked = 0
for (const [language, languageDisplay, nativeLanguageDisplay] of [
  ['de', 'German', 'English'],
  ['es', 'Spanish', 'French'],
  ['fr', 'French', 'German'],
  ['de', 'German', 'German'],
]) {
  for (const level of ['zero', 'beginner', 'intermediate', 'advanced'] as const) {
    for (const category of [null, ...GROK_CATEGORIES.map(item => item.id)]) {
      const { session } = buildGrokSessionConfig({
        language, languageDisplay, nativeLanguageDisplay, level, category, voice: 'eve',
      })
      assert.equal(session.turn_detection, null)
      assert.equal(session.audio.input.format.rate, 24000)
      assert.equal(session.audio.output.format.rate, 24000)
      assert.ok(session.instructions.includes('at most one question'))
      assert.ok(!session.instructions.includes('use the web_search tool'))
      assert.ok(session.instructions.includes('Do not claim to search or invent current facts'))
      assert.ok(!/speech transcripts|Heute|Hund/.test(session.instructions))
      if (level === 'zero' || level === 'beginner') {
        assert.ok(session.instructions.includes('You hear the learner directly'))
        if (languageDisplay !== nativeLanguageDisplay) {
          assert.ok(session.instructions.includes(`natural meaning connector in ${nativeLanguageDisplay}`))
        }
      }
      if (category) {
        assert.ok(session.instructions.includes("Follow the level's language mix throughout, including your opening"))
        assert.ok(!session.instructions.includes(`entering the situation in ${languageDisplay}`))
        assert.ok(!session.instructions.includes('as the primary language of this conversation'))
      }
      if (languageDisplay === nativeLanguageDisplay) {
        assert.ok(session.instructions.includes(`Speak entirely in ${languageDisplay}`))
        assert.ok(!session.instructions.includes('LANGUAGE MIX:'))
      }
      checked++
    }
  }
}
console.log(`Grok prompt integrity: ${checked} language/level/scenario combinations passed`)

const recentConversation = Array.from({ length: 40 }, (_, index) => ({
  role: index % 2 ? 'assistant' as const : 'user' as const,
  content: `message-${index}: ${'word '.repeat(500)}`,
}))
const resumed = buildGrokSessionConfig({
  language: 'de', languageDisplay: 'German', nativeLanguageDisplay: 'English',
  level: 'beginner', category: 'travel', voice: 'eve', recentConversation,
}).session.instructions
assert.ok(resumed.includes('Continue from the recent dialogue'))
assert.ok(!resumed.includes('Start by greeting'))
assert.ok(resumed.includes('message-39:'))
assert.ok(!resumed.includes('message-0:'))
assert.ok(resumed.length < 9_000, 'reconnect context must remain bounded')
assert.equal(recentConversation.length, 40)
console.log('Grok reconnect: recent context retained, bounded, and separate from instructions')
