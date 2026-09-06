import assert from 'node:assert/strict'
import { emptyGrokTranscript, grokTranscriptText, mergeGrokTranscript } from '../src/lib/grokTranscript'

for (const order of [['text', 'audio'], ['audio', 'text']] as const) {
  let state = emptyGrokTranscript()
  for (const source of order) {
    for (const part of ['Bonjour', ' tout le monde']) state = mergeGrokTranscript(state, source, part)
  }
  assert.equal(grokTranscriptText(state), 'Bonjour tout le monde')
}
let state = mergeGrokTranscript(emptyGrokTranscript(), 'text', 'Text fallback')
assert.equal(grokTranscriptText(state), 'Text fallback')
state = mergeGrokTranscript(state, 'audio_done', 'Actual spoken words')
state = mergeGrokTranscript(state, 'text', 'Late text')
state = mergeGrokTranscript(state, 'audio', 'Late audio delta')
assert.equal(grokTranscriptText(state), 'Actual spoken words')
state = mergeGrokTranscript(emptyGrokTranscript(), 'audio', 'Bonjour ça va')
state = mergeGrokTranscript(state, 'audio_done', 'Bonjour ! Ça va ?')
assert.equal(grokTranscriptText(state), 'Bonjour ! Ça va ?')
assert.equal(grokTranscriptText(emptyGrokTranscript()), '')
console.log('Grok transcript: dual-channel ordering, text fallback, final audio authority and reset passed')
