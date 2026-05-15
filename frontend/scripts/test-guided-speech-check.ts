import assert from 'node:assert/strict'
import { checkGuidedSpeechAnswer } from '../src/lib/guidedSpeechCheck'

const coreConfig = {
  targetAnswer: 'Hi there, do you speak English?',
  acceptedAnswers: [
    'Do you speak English?',
    'Hi, do you speak English?',
    'Hello, do you speak English?',
    'Hi there, do you speak English?',
  ],
  requiredTokens: ['do', 'you', 'speak', 'english'],
  optionalTokens: ['hi', 'hello', 'there'],
}

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'Hi there, do you speak English?', ...coreConfig }).status,
  'correct',
  'exact target match passes',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'hi THERE, do you SPEAK english!', ...coreConfig }).status,
  'correct',
  'punctuation and case differences pass',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'Do you speak English?', ...coreConfig }).status,
  'correct',
  'core required tokens pass even when target includes an optional greeting',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'Hello, do you speak English?', ...coreConfig }).status,
  'correct',
  'accepted answer variant passes',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'Do you speak?', ...coreConfig }).status,
  'close',
  'missing one important core token is close',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'Thank you please', ...coreConfig }).status,
  'incorrect',
  'random transcript fails',
)

assert.equal(
  checkGuidedSpeechAnswer({
    transcript: 'Um, please do you speak English maybe',
    targetAnswer: 'Do you speak English?',
    requiredTokens: ['do', 'you', 'speak', 'english'],
  }).status,
  'correct',
  'edge filler words are ignored',
)

console.log('Guided speech checker tests passed')
