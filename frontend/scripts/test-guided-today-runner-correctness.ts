import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

const todaySource = readSource('../src/pages/Today.tsx')
const sessionSource = readSource('../src/components/today/TodaySession.tsx')
const typeRecallSource = readSource('../src/components/today/TypeRecallStep.tsx')
const buildPhraseSource = readSource('../src/components/today/BuildPhraseStep.tsx')

const handleCompleteSource = sliceFunction(todaySource, 'const handleComplete =')
const enterStepSource = sliceFunction(sessionSource, 'const enterStep =')
const typeStepInvocation = sliceBetween(sessionSource, '<TypeRecallStep', '/>')
const buildStepInvocation = sliceBetween(sessionSource, '<BuildPhraseStep', '/>')

process.stdout.write('\n[today completion durability]\n')
assert(
  'failed completion does not install the unsaved progress snapshot',
  installsProgressOnlyAfterSavedGuard(handleCompleteSource),
  handleCompleteSource,
)

process.stdout.write('\n[resumable type recall]\n')
assert(
  'a draft that used the type fallback resumes in the revealed state',
  /typeUsedFallback\s*\?\s*['"]revealed['"]/.test(sessionSource),
)
assert(
  'TodaySession passes restored type status and fallback use into TypeRecallStep',
  /initialStatus\s*=\s*{\s*typeState\.status\s*}/.test(typeStepInvocation)
    && /initialUsedFallback\s*=\s*{\s*typeState\.usedFallback\s*}/.test(typeStepInvocation),
  typeStepInvocation,
)
assert(
  'TypeRecallStep initializes both its visual status and fallback flag from restored state',
  hasRestoredStatusAndFallback(typeRecallSource),
)
assert(
  'restored correct or revealed type state renders the canonical answer',
  /initialStatus\s*===\s*['"]correct['"]\s*\|\|\s*initialStatus\s*===\s*['"]revealed['"][\s\S]{0,160}?lesson\.typeRecall\.answer/.test(typeRecallSource),
)
assert(
  'TypeRecallStep reports usedFallback on every state transition',
  stateReportsPreserveField(typeRecallSource, 'onCheckStateChange', 'usedFallback'),
)

process.stdout.write('\n[B1 draft metric hydration]\n')
for (const key of [
  'typeAttempts',
  'typeUsedFallback',
  'clozeBlanksTotal',
  'clozeBlanksFirstTry',
  'speakAttempts',
  'speakTranscriptMatch',
  'speakPassed',
  'rolePlayTurnsPassed',
]) {
  assert(`TodaySession hydrates ${key} from the draft`, sessionSource.includes(`draft?.result.${key}`))
}

process.stdout.write('\n[runner save-state semantics]\n')
assert(
  'moving between steps clears a stale completion save failure',
  enterStepSource.includes('setSaveFailed(false)'),
  enterStepSource,
)
assert(
  'draft save status begins unknown instead of claiming a successful write',
  !/const\s*\[(?:draftSaved|draftSaveStatus),\s*setDraftSave(?:d|Status)]\s*=\s*useState(?:<[^>]+>)?\(true\)/.test(sessionSource)
    && hasUnknownDraftState(sessionSource),
)
assert(
  'the local-save success message is hidden while draft status is unknown',
  hasConditionalSavedMessage(sessionSource),
)

process.stdout.write('\n[assisted build integrity]\n')
assert(
  'Build uses a distinct revealed state and allows it to advance',
  /status:\s*['"]idle['"]\s*\|\s*['"]correct['"]\s*\|\s*['"]wrong['"]\s*\|\s*['"]revealed['"]/.test(buildPhraseSource)
    && /step\s*===\s*['"]build['"][^\n]*(?:buildState\.status\s*===\s*['"]correct['"])[^\n]*(?:buildState\.status\s*===\s*['"]revealed['"])/.test(sessionSource),
)
assert(
  'TodaySession passes the complete restored build state into BuildPhraseStep',
  /initialStatus\s*=\s*{\s*buildState\.status\s*}/.test(buildStepInvocation)
    && /initialUsedFallback\s*=\s*{\s*buildState\.usedFallback\s*}/.test(buildStepInvocation),
  buildStepInvocation,
)
assert(
  'BuildPhraseStep initializes fallback use from restored state',
  hasRestoredFallback(buildPhraseSource),
)
assert(
  'restored revealed Build state renders the canonical chip selection',
  /initialStatus\s*===\s*['"]correct['"]\s*\|\|\s*initialStatus\s*===\s*['"]revealed['"][\s\S]{0,180}?targetChipCount/.test(buildPhraseSource),
)
assert(
  'BuildPhraseStep reports usedFallback on every state transition',
  stateReportsPreserveField(buildPhraseSource, 'onCheckStateChange', 'usedFallback'),
)
assert(
  'the assisted Build answer is offered only after an unsuccessful attempt',
  /status\s*===\s*['"]wrong['"][^\n]*<Button[^\n]*handleShowAnswer/.test(buildPhraseSource)
    || /{status\s*===\s*['"]wrong['"]\s*&&\s*\([\s\S]{0,240}?handleShowAnswer/.test(buildPhraseSource),
)

process.stdout.write(`\n${passes} passed, ${failures} failed\n`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function sliceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) return ''
  const endIndex = source.indexOf(end, startIndex + start.length)
  return endIndex < 0 ? source.slice(startIndex) : source.slice(startIndex, endIndex + end.length)
}

function sliceFunction(source: string, marker: string) {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const bodyStart = source.indexOf('{', start)
  if (bodyStart < 0) return ''

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }
  return source.slice(start)
}

function installsProgressOnlyAfterSavedGuard(source: string) {
  const installIndex = source.indexOf('setProgress(completion.state)')
  if (installIndex < 0) return false
  const prefix = source.slice(0, installIndex)
  return /if\s*\(\s*completion\.saved\s*\)\s*{[^}]*$/.test(prefix)
    || /if\s*\(\s*!completion\.saved\s*\)[\s\S]*return\s+false[\s\S]*$/.test(prefix)
}

function hasRestoredStatusAndFallback(source: string) {
  const hasSplitContract = /initialStatus\??\s*:/.test(source) && /initialUsedFallback\??\s*:/.test(source)
  const initializesStatus = /useState<TypeRecallCheckState\[['"]status['"]\]>\(initial/.test(source)
  const initializesFallback = /useState\(initialUsedFallback/.test(source)
  return hasSplitContract && initializesStatus && initializesFallback
}

function hasRestoredFallback(source: string) {
  const hasSplitContract = /initialUsedFallback\??\s*:/.test(source)
  const initializesFallback = /useState\(initialUsedFallback/.test(source)
  return hasSplitContract && initializesFallback
}

function stateReportsPreserveField(source: string, callback: string, field: string) {
  const calls = Array.from(source.matchAll(new RegExp(`${callback}\\s*\\(\\s*{([\\s\\S]*?)}\\s*\\)`, 'g')))
  return calls.length > 0 && calls.every((match) => new RegExp(`\\b${field}\\b`).test(match[1] ?? ''))
}

function hasUnknownDraftState(source: string) {
  return /useState<[^>]*(?:null|undefined|['"]?unknown['"]?)[^>]*>\((?:null|undefined|['"]unknown['"])\)/.test(source)
    || /useState\((?:null|undefined|['"]unknown['"])\)/.test(source)
}

function hasConditionalSavedMessage(source: string) {
  return /draftSaveStatus\s*!==\s*['"]unknown['"][\s\S]{0,220}?draftSaveStatus\s*===\s*['"]saved['"][^\n]*today\.practice\.savedLocally/.test(source)
    || /draftSaved\s*===\s*true[^\n]*today\.practice\.savedLocally/.test(source)
    || (
      /draftSaved\s*\?[^:\n]*today\.practice\.savedLocally/.test(source)
      && /draftSaved\s*(?:!==|!=)\s*(?:null|undefined|['"]unknown['"])/.test(source)
    )
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}
