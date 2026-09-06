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
  'speak.reconnectSessionHint',
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

const speakSource = readSource('../src/pages/Speak.tsx')
const voiceTutorSource = readSource('../src/hooks/useVoiceTutor.ts')
const grokRealtimeSource = readSource('../src/hooks/useGrokRealtime.ts')
const voiceSampleSource = readSource('../src/components/speak/VoiceSampleButton.tsx')
const historyPanelSource = readSource('../src/components/speak/SpeakHistoryPanel.tsx')
const extractWordsSource = readSource('../src/components/speak/ExtractWordsModal.tsx')
const modalFocusSource = readSource('../src/components/speak/useSpeakModalFocus.ts')
const userFacingSpeakSources = [
  speakSource,
  voiceTutorSource,
  grokRealtimeSource,
  voiceSampleSource,
  historyPanelSource,
].join('\n')

process.stdout.write('\n[speak two-door flow]\n')
assert('casting screen renders the Live door', speakSource.includes('<LiveDoorCard'))
assert('casting screen renders the tutor and voice browser', speakSource.includes('<CharacterGrid'))
assert('ready room exposes one-tap resume', speakSource.includes("speak.ready.startTalking"))
assert('Live reconnect explains the new session boundary', speakSource.includes("speak.reconnectSessionHint"))
assert('provider implementation names are not primary labels', !speakSource.includes("short: 'GROK'") && !speakSource.includes("short: 'VOX'") && !speakSource.includes("short: 'GEM'"))
assert('Voxtral choices use the backend-supported language set', speakSource.includes("new Set(['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'hi', 'ar'])"))
assert('Voxtral cards are gated by exact language support', speakSource.includes('VOXTRAL_LANGUAGE_CODES.has(tutor.language)'))
assert('remembered Voxtral setups are rejected for unsupported languages', speakSource.includes("if (!tutor.language || !VOXTRAL_LANGUAGE_CODES.has(tutor.language)) return null"))
assert('retained assistant audio exposes a native replay button', speakSource.includes('data-speak-replay') && speakSource.includes('tutor.replayMessageAudio(msg)'))
assert('listen-mode reveal cue remains visibly interactive', speakSource.includes('data-speak-reveal') && speakSource.includes("'speak-message-assistant rounded-bl-sm opacity-100'"))

process.stdout.write('\n[speak modal accessibility]\n')
assert('history is portalled and unmounted while closed', historyPanelSource.includes('createPortal(') && historyPanelSource.includes('if (!open) return null'))
assert('history exposes modal semantics', historyPanelSource.includes('role="dialog"') && historyPanelSource.includes('aria-modal="true"'))
assert('extract words exposes modal semantics', extractWordsSource.includes('role="dialog"') && extractWordsSource.includes('aria-modal="true"'))
assert('Speak modal focus traps Tab and handles Escape', modalFocusSource.includes("event.key === 'Escape'") && modalFocusSource.includes("event.key !== 'Tab'"))
assert('Speak modal focus makes the app root inert', modalFocusSource.includes('acquireRootLock(appRoot)') && modalFocusSource.includes('root.inert = true'))
assert('nested Speak modals share root inert ownership', modalFocusSource.includes('rootLocks') && modalFocusSource.includes('lock.holders += 1') && modalFocusSource.includes('lock.holders -= 1'))

process.stdout.write('\n[speak error and corrections contracts]\n')
assert('raw HTTP 429 is not user-facing Speak copy', !userFacingSpeakSources.includes('HTTP 429'))
assert('raw HTTP status fallback is not used in Speak UI errors', !userFacingSpeakSources.includes('HTTP ${res.status}'))
assert('corrections unavailable key is rendered on current Speak page', speakSource.includes('speak.correctionsUnavailable'))
assert('history corrections unavailable key is rendered', historyPanelSource.includes('speak.history.correctionsUnavailable'))
assert('corrections failure does not write an empty correction list', !speakSource.includes('setCorrections([])'))
assert('current corrections use bounded transcript preparation', speakSource.includes('prepareCorrectionsTranscript(activeMessages)'))
assert('history corrections use bounded transcript preparation', historyPanelSource.includes('prepareCorrectionsTranscript(messages)'))
assert('current corrections are abortable', speakSource.includes('signal,') && speakSource.includes('CORRECTIONS_TIMEOUT_MS, controller.signal'))
assert('history corrections are abortable', historyPanelSource.includes('signal,') && historyPanelSource.includes('CORRECTIONS_TIMEOUT_MS, controller.signal'))

process.stdout.write(`\n${passes} passed, ${failures} failed\n`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}
