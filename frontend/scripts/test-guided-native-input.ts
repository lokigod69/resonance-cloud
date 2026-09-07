import assert from 'node:assert/strict'
import { guidedAnswerMatches, normalizeGuidedAnswer } from '../src/data/guidedLessons.ts'

const decomposedDakuten = 'か\u3099'
const decomposedJamo = '한'.normalize('NFD')

assert.equal(normalizeGuidedAnswer(decomposedDakuten), 'が', 'NFC composes Japanese dakuten input')
assert.equal(guidedAnswerMatches(decomposedDakuten, ['が']), true, 'decomposed dakuten matches the composed answer')
assert.equal(normalizeGuidedAnswer(decomposedJamo), '한', 'NFC composes Korean Jamo input')
assert.equal(guidedAnswerMatches(decomposedJamo, ['한']), true, 'decomposed Jamo matches the composed Hangul answer')

assert.equal(guidedAnswerMatches('みず', ['水', 'みず']), true, 'an explicitly accepted kana variant matches')
assert.equal(guidedAnswerMatches('mizu', ['水', 'みず']), false, 'unlisted Japanese romanization is rejected')
assert.equal(guidedAnswerMatches('annyeong', ['안녕']), false, 'unlisted Korean romanization is rejected')
assert.equal(guidedAnswerMatches('あり がとう', ['ありがとう']), false, 'Japanese internal whitespace is not silently folded')

assert.equal(guidedAnswerMatches('еще раз', ['ещё раз', 'еще раз']), true, 'an explicitly accepted е variant matches')
assert.equal(guidedAnswerMatches('все', ['всё']), false, 'е and ё remain distinct without an authored variant')

console.log('test-guided-native-input: OK')
