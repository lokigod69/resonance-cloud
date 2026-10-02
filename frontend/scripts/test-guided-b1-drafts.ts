import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { draftTtsLessons, validateB1Draft, type B1Draft } from './lib/guidedB1Drafts'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'

const root = resolve(import.meta.dirname, '../content-drafts/b1-2026-10')
const batches = [
  { slugs: ['english', 'spanish', 'french'], suffix: '' },
  { slugs: ['italian', 'portuguese'], suffix: '-it-pt' },
]
const drafts: B1Draft[] = []
for (const batch of batches) {
  const sources = batch.slugs.map(slug => readFileSync(resolve(root, `${slug}.json`)))
  const group = sources.map(source => validateB1Draft(JSON.parse(source.toString('utf8'))))
  drafts.push(...group)
  const snapshotBytes = readFileSync(resolve(root, `tts-snapshot${batch.suffix}.json`))
  const snapshot = JSON.parse(snapshotBytes.toString('utf8'))
  assert.deepEqual(snapshot, { schemaVersion: 1, status: 'draft', languages: group.map((draft, index) => ({
    targetLanguage: draft.targetLanguage,
    targetLanguageCode: draft.targetLanguageCode,
    sourceSha256: createHash('sha256').update(sources[index]).digest('hex'),
    lessons: draftTtsLessons(draft),
  })) }, 'Saved audio snapshot must exactly match current lesson sources')
  for (const model of ['', '-v4']) {
    const plan = JSON.parse(readFileSync(resolve(root, `tts-plan${batch.suffix}${model}.json`), 'utf8'))
    assert.equal(plan.snapshotSha256, createHash('sha256').update(snapshotBytes).digest('hex'), 'Audio plan fingerprint is stale')
  }
}
for (const draft of drafts) {
  const proposal = JSON.parse(readFileSync(resolve(root, `${draft.targetLanguage.toLowerCase()}-plan.json`), 'utf8')) as {
    targetLanguage: string
    paths: Array<{ pathNumber: number; lessons: Array<{ number: number; trophy: string; beat: string }> }>
  }
  assert.equal(proposal.targetLanguage, draft.targetLanguage)
  assert.deepEqual(proposal.paths.map(path => path.pathNumber), Array.from({ length: 10 }, (_, index) => index + 1))
  const allocated = new Set<string>()
  const used = new Set(GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === draft.targetLanguage)
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [variant.trophyWord.word.toLowerCase().normalize('NFC')] : [])))
  for (const path of proposal.paths) {
    assert.deepEqual(path.lessons.map(lesson => lesson.number), Array.from({ length: 10 }, (_, index) => index + 1))
    for (const lesson of path.lessons) {
      const trophy = lesson.trophy.toLowerCase().normalize('NFC')
      assert(!used.has(trophy) && !allocated.has(trophy), `Invalid trophy allocation: ${draft.targetLanguage}/${trophy}`)
      assert(lesson.beat.trim(), 'Each allocated trophy needs a lesson beat')
      allocated.add(trophy)
    }
  }
  assert.equal(allocated.size, 100)
  assert.deepEqual(draft.lessons.map(lesson => lesson.trophyWord.word), proposal.paths[0].lessons.map(lesson => lesson.trophy))
  const lessons = draftTtsLessons(draft)
  assert.equal(lessons.length, 10)
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 10)
  for (const [index, lesson] of lessons.entries()) {
    assert.equal(lesson.vibeVariants.bright.chunks.length, draft.lessons[index].chunks.length + draft.lessons[index].terms.length)
    assert.equal(lesson.vibeVariants.bright.dialogue.length, 4)
    assert.equal(lesson.vibeVariants.bright.corePhrase.targetText, draft.lessons[index].dialogue[1].targetText)
  }
}

// These subject switches previously admitted the neighbour's person-form chip.
// Keep explicit subjects: the cloze UI does not show the learner-answer gloss.
const spanish = drafts.find(draft => draft.targetLanguage === 'Spanish')!
assert.match(spanish.lessons[4].dialogue[3].targetText, /\by yo pude\b/u, 'Spanish L5 must disambiguate who could find their way')
assert.match(spanish.lessons[6].dialogue[3].targetText, /\by nosotros esperamos\b/u, 'Spanish L7 must disambiguate who waited')

function rejects(label: string, change: (draft: B1Draft) => void) {
  const broken = structuredClone(drafts[0])
  change(broken)
  assert.throws(() => validateB1Draft(broken), label)
}
rejects('broken chunk assembly', draft => { draft.lessons[0].chunks[0].targetText += ' extra' })
rejects('wrong follow-up answer', draft => { draft.lessons[0].dialogue[3].targetText += ' extra' })
rejects('duplicate trophy', draft => { draft.lessons[1].trophyWord = structuredClone(draft.lessons[0].trophyWord) })
rejects('foreign explanation convention', draft => { draft.lessons[0].title.en = 'English leak' })
rejects('spoken token absent', draft => { draft.lessons[0].speakRequired[0] = 'nonexistentword' })
rejects('missing base explanation', draft => { draft.lessons[0].title.de = '' })
rejects('incorrect checkpoint reconstruction', draft => { draft.lessons[0].recall.after += ' extra' })
rejects('duplicate fallback choice', draft => { draft.lessons[0].recall.fallbackChoices[1] = draft.lessons[0].recall.fallbackChoices[0] })
rejects('later dialogue leaked in scene', draft => { draft.lessons[0].sceneCaption.de += draft.lessons[0].dialogue[2].targetText })

// A cue names a visible subject; a substring or a hidden answer cannot supply it.
const portuguese = drafts.find(draft => draft.targetLanguage === 'Portuguese')!
function rejectsSubject(change: (lesson: B1Draft['lessons'][number]) => void) {
  const broken = structuredClone(portuguese)
  const lesson = broken.lessons[0]
  change(lesson)
  lesson.dialogue[3].targetText = lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('')
  assert.throws(() => validateB1Draft(broken), /Form blank needs cue.*whole word in the literal text/)
}
rejectsSubject(lesson => { lesson.cloze[0] = 'Ele recebeu ' })
rejectsSubject(lesson => {
  lesson.cloze.unshift('No fim, ', { kind: 'choice', answer: 'eu', choices: ['eu', 'ela', 'nós', 'eles'] })
  lesson.cloze[2] = ' '
})
const italian = drafts.find(draft => draft.targetLanguage === 'Italian')!
for (const [source, replacement] of [[italian, 'Sono stanco.'], [portuguese, 'Estou cansada.']] as const) {
  const broken = structuredClone(source)
  broken.lessons[0].pattern.examples[1] = { ...broken.lessons[0].pattern.examples[1], targetText: replacement, highlight: replacement }
  assert.throws(() => validateB1Draft(broken), /Banned learner pattern.*in: /, 'Unplanned learner gender must be rejected')
}
console.log('PASS: 500 distinct trophy allocations, 50 staged B1 lessons, current audio snapshots/fingerprints, complete audio surfaces, and 13 rejection cases. No provider calls.')
