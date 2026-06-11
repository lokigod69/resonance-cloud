import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { translations, type Locale } from '../src/lib/translations.ts'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    process.stdout.write(`  ok  ${name}\n`)
    return
  }

  failures += 1
  process.stderr.write(`  FAIL ${name}\n`)
  if (detail !== undefined) process.stderr.write(`        ${formatDetail(detail)}\n`)
}

const activeLocales = Object.keys(translations) as Locale[]
const requiredSpeakKeys = [
  'speak.error.microphoneDenied',
  'speak.error.microphoneUnavailable',
  'speak.error.audioRecordingUnsupported',
  'speak.error.realtimeConnectionFailed',
  'speak.error.tutorAudioPlaybackFailed',
  'speak.error.sessionNotConnected',
  'speak.error.audioTurnDidNotCommit',
  'speak.error.tutorStillResponding',
  'speak.correctionsUnavailable',
  'speak.limitReached',
  'speak.limitReachedRetry',
  'speak.reconnect',
  'speak.mode.live',
  'speak.mode.characters',
  'speak.mode.voices',
] as const

process.stdout.write('\n[speak polish translations]\n')
for (const locale of activeLocales) {
  const localeTranslations = translations[locale]
  const missing = requiredSpeakKeys.filter((key) => !localeTranslations[key])
  assert(`${locale} has Speak polish keys`, missing.length === 0, missing)
  assert(
    `${locale} retry-limit copy preserves time interpolation`,
    localeTranslations['speak.limitReachedRetry']?.includes('{time}') === true,
    localeTranslations['speak.limitReachedRetry'],
  )
}

const providerToggleSource = readSource('../src/components/speak/ProviderToggle.tsx')
const speakSource = readSource('../src/pages/Speak.tsx')
const voiceTutorSource = readSource('../src/hooks/useVoiceTutor.ts')
const grokRealtimeSource = readSource('../src/hooks/useGrokRealtime.ts')
const voiceSampleSource = readSource('../src/components/speak/VoiceSampleButton.tsx')
const historyPanelSource = readSource('../src/components/speak/SpeakHistoryPanel.tsx')
const userFacingSpeakSources = [
  speakSource,
  voiceTutorSource,
  grokRealtimeSource,
  voiceSampleSource,
  historyPanelSource,
].join('\n')

process.stdout.write('\n[speak mode labels]\n')
assert('mode selector uses Live label key', providerToggleSource.includes('speak.mode.live'))
assert('mode selector uses Characters label key', providerToggleSource.includes('speak.mode.characters'))
assert('mode selector uses Voices label key', providerToggleSource.includes('speak.mode.voices'))
assert('mode selector aria label is mode-oriented', !providerToggleSource.includes('TTS provider'))
assert('GROK is not a primary mode label', !providerToggleSource.includes("short: 'GROK'"))
assert('VOX is not a primary mode label', !providerToggleSource.includes("short: 'VOX'"))
assert('GEM is not a primary mode label', !providerToggleSource.includes("short: 'GEM'"))

process.stdout.write('\n[speak error and corrections contracts]\n')
assert('raw HTTP 429 is not user-facing Speak copy', !userFacingSpeakSources.includes('HTTP 429'))
assert('raw HTTP status fallback is not used in Speak UI errors', !userFacingSpeakSources.includes('HTTP ${res.status}'))
assert('corrections unavailable key is rendered on current Speak page', speakSource.includes('speak.correctionsUnavailable'))
assert('history corrections unavailable key is rendered', historyPanelSource.includes('speak.history.correctionsUnavailable'))
assert('corrections failure does not write an empty correction list', !speakSource.includes('setCorrections([])'))

process.stdout.write(`\n${passes} passed, ${failures} failed\n`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}
