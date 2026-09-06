import assert from 'node:assert/strict'
import { prepareCorrectionsTranscript } from '../src/lib/speakCorrections'

const longSession = Array.from({ length: 64 }, (_, index) => ({
  role: index % 2 ? 'assistant' : 'user', content: `Turn ${index}`,
}))
const result = prepareCorrectionsTranscript(longSession)
assert.equal(result.length, 40)
assert.deepEqual(result[0], { role: 'user', content: 'Turn 24' })
assert.deepEqual(result.at(-1), { role: 'assistant', content: 'Turn 63' })
assert.equal(longSession.length, 64)
assert.deepEqual(prepareCorrectionsTranscript([
  { role: 'system', content: 'Not learner speech' },
  { role: 'user', content: ' ' },
  { role: 'user', content: 'Bonjour' },
]), [{ role: 'user', content: 'Bonjour' }])
assert.equal(prepareCorrectionsTranscript([{ role: 'user', content: 'a'.repeat(5_000) }])[0].content.length, 4_000)
console.log('Speak corrections: recent context, API limits, role filtering and immutable input passed')
