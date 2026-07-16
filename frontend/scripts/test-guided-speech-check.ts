import assert from 'node:assert/strict'
import { getCurrentGuidedLesson } from '../src/data/guidedLessons'
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
  checkGuidedSpeechAnswer({ transcript: 'Hi, do you speak English?', ...coreConfig }).status,
  'correct',
  'hi variant passes',
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

assert.notEqual(
  checkGuidedSpeechAnswer({ transcript: 'Do you speak German?', ...coreConfig }).status,
  'correct',
  'wrong language is not correct',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'English', ...coreConfig }).status,
  'incorrect',
  'single token answer fails',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: '', ...coreConfig }).status,
  'incorrect',
  'empty transcript fails',
)

assert.notEqual(
  checkGuidedSpeechAnswer({ transcript: 'English speak you do', ...coreConfig }).status,
  'correct',
  'required tokens out of order are not correct',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'Do you speak?', ...coreConfig }).status,
  'close',
  'near miss is close, not correct',
)

// Japanese: ASR transcripts arrive unspaced — CJK targets must score
// space-insensitively with substring required-token matching.
const japaneseConfig = {
  targetAnswer: 'すみません、駅はどこですか。',
  acceptedAnswers: ['すみません、えきはどこですか'],
  requiredTokens: ['駅', 'どこ', 'ですか'],
}

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'すみません駅はどこですか', ...japaneseConfig }).status,
  'correct',
  'unspaced Japanese transcript matches exactly despite missing punctuation',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'すみません、えきはどこですか。', ...japaneseConfig }).status,
  'correct',
  'kana-only accepted-answer variant passes',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'あの、駅はどこですか', ...japaneseConfig }).status,
  'correct',
  'required tokens found as substrings in order pass',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: 'コーヒーをください', ...japaneseConfig }).status,
  'incorrect',
  'unrelated Japanese transcript fails',
)

assert.notEqual(
  checkGuidedSpeechAnswer({ transcript: 'ですかどこ駅', ...japaneseConfig }).status,
  'correct',
  'Japanese required tokens out of order are not correct',
)

assert.equal(
  checkGuidedSpeechAnswer({ transcript: '駅 は どこ です か', ...japaneseConfig }).status,
  'correct',
  'spaced ASR variance still matches the unspaced target',
)

// Korean must keep whitespace-token behavior (Hangul is not in the CJK class).
assert.equal(
  checkGuidedSpeechAnswer({
    transcript: '혹시 영어를 할 수 있어요',
    targetAnswer: '안녕하세요. 혹시 영어를 할 수 있어요?',
    requiredTokens: ['혹시', '영어를', '있어요'],
  }).status,
  'correct',
  'Korean whitespace token matching is unchanged',
)

for (const vibeId of ['bright', 'wistful', 'sharp'] as const) {
  const lesson = getCurrentGuidedLesson(vibeId)
  assert.equal(
    checkGuidedSpeechAnswer({
      transcript: 'Do you speak English?',
      targetAnswer: lesson.speak.targetAnswer ?? lesson.speak.targetPhrase,
      acceptedAnswers: lesson.speak.acceptedAnswers,
      requiredTokens: lesson.speak.requiredTokens,
      optionalTokens: lesson.speak.optionalTokens,
    }).status,
    'correct',
    `${vibeId} lesson 1 accepts the core do-you-speak-English answer`,
  )
}

console.log('Guided speech checker tests passed')
