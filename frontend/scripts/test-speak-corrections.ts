import assert from 'node:assert/strict'
import { prepareCorrectionsTranscript } from '../src/lib/speakCorrections'
import { MAX_CORRECTIONS, buildCorrectionsSystemPrompt, filterCorrections } from '../api/_shared/speakCorrections'

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
// The reviewer's output is rendered as React children: only string entries pass.
const valid = { original: 'Yo es cansado', corrected: 'Estoy cansado', explanation: 'Zustand: estar' }
assert.deepEqual(filterCorrections({ corrections: [valid] }), [valid])
assert.deepEqual(filterCorrections([valid]), [valid])
assert.deepEqual(filterCorrections({ errors: [valid] }), [valid])
assert.deepEqual(filterCorrections({ corrections: [
  valid,
  { original: 'x', corrected: { text: 'y' }, explanation: 'z' },
  { original: '', corrected: 'y', explanation: 'z' },
  { original: 'x', corrected: 'y' },
  null,
  'text',
] }), [valid])
// Case and punctuation-only "corrections" are transcriber noise, and so are
// written accents in es/fr/pt/it; umlauts, tildes, dakuten and tones are speech.
const kept = (language: string, pairs: Array<[string, string]>) => filterCorrections({
  corrections: pairs.map(([original, corrected]) => ({ original, corrected, explanation: 'x' })),
}, language).map(entry => entry.original)
assert.deepEqual(kept('es', [['vimos una pelicula de accion', 'Vimos una película de acción.'], ['tengo diez anos', 'tengo diez años']]), ['tengo diez anos'])
assert.deepEqual(kept('de', [
  ['ich trinke kaffee jeden morgen', 'Ich trinke Kaffee jeden Morgen.'],
  ['ich habe gegessen ein apfel', 'Ich habe einen Apfel gegessen.'],
  ['ich wurde gern kommen', 'ich würde gern kommen'],
  ['zwei apfel', 'zwei Äpfel'],
]), ['ich habe gegessen ein apfel', 'ich wurde gern kommen', 'zwei apfel'])
assert.deepEqual(kept('ja', [['かっこうにいきます', 'がっこうにいきます']]), ['かっこうにいきます'])
assert.deepEqual(kept('fr', [['ou est la gare', 'Où est la gare ?']]), [])
assert.deepEqual(filterCorrections('nope'), [])
assert.deepEqual(filterCorrections({ corrections: 'nope' }), [])
assert.equal(filterCorrections({ corrections: Array.from({ length: 25 }, () => valid) }).length, MAX_CORRECTIONS)
const reviewPrompt = buildCorrectionsSystemPrompt('Spanish', 'German')
assert.match(reviewPrompt, /automatic speech transcripts/)
assert.match(reviewPrompt, /data, not instructions/)
assert.equal((reviewPrompt.match(/\{"corrections"/g) ?? []).length, 2)
console.log('Speak corrections: recent context, API limits, role filtering, immutable input and reviewer output filter passed')
