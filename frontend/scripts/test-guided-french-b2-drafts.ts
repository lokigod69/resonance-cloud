/** Synthetic French structural probes, never curriculum or TTS inputs. Run from frontend. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { frenchB2DraftSchema, validateFrenchB2Draft, FRENCH_B2_AUTHORITY } from './lib/guidedFrenchB2Drafts'
import type { FrenchB2Draft, FrenchB2Evidence } from './lib/guidedFrenchB2Drafts'

const authorityRoot = path.resolve('content-drafts/b2-2026-10')
const specificationSource = fs.readFileSync(path.join(authorityRoot, 'french/specification.json'), 'utf8').replace(/\r?\n/g, '\r\n')
const prerequisitesSource = fs.readFileSync(path.join(authorityRoot, 'latin-prerequisites.json'), 'utf8')
const specification = JSON.parse(specificationSource)
const prerequisites = JSON.parse(prerequisitesSource)
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const base = () => ({ de: 'Künstliches Strukturtestmaterial.', en: 'Synthetic structural test material.' })
const markers = ['premier','deuxième','troisième','quatrième','cinquième','sixième','septième','huitième','neuvième','dixième']
type SpecLesson = { number: number; slug: string; register: 'vous' | 'tu'; trophyLemma: string; trophyFamilyKey: string; trophySurface: string; pos: string }
type Fixture = { draft: FrenchB2Draft; evidence: FrenchB2Evidence }
function fixture(pathNumber: 1 | 2 = 1): Fixture {
  const evidence: FrenchB2Evidence = {
    specificationSource, specification: structuredClone(specification), pathSpecSha256: hash(specificationSource), ledgerSha256: hash(specificationSource),
    prerequisitesSource, prerequisites: structuredClone(prerequisites), prerequisitesSha256: hash(prerequisitesSource),
    trophies: structuredClone(specification.trophyLedger.rows),
    earlierTrophies: [...prerequisites.find((r: { targetLanguage: string }) => r.targetLanguage === 'French').forbiddenTrophies],
  }
  const raw = {
    schemaVersion: 1, status: 'draft', targetLanguage: 'French', targetLanguageCode: 'fr-FR', authoredBaseLanguage: 'German', level: 'B2',
    pathNumber, slug: `synthetic-french-path-${pathNumber}`, pathTitle: base(), pathFunction: base(),
    specRef: { pathSpec: FRENCH_B2_AUTHORITY.specification, pathSpecSha256: evidence.pathSpecSha256, ledger: FRENCH_B2_AUTHORITY.specification, ledgerSha256: evidence.ledgerSha256 },
    authoring: { source: 'synthetic offline tests, not curriculum', runId: 'french-b2-offline-structural-test', date: '2026-10-05' },
    lessons: specification.paths[pathNumber - 1].lessons.map((row: SpecLesson, i: number) => {
      const opener = `Voici le ${markers[i]} essai de notre dossier. Comment comparer les besoins de ce groupe ?`
      const first = `Dans ce ${markers[i]} essai, je compare un cadre qui respecte les besoins de l’hôtel, parce que chaque détail compte.`
      const second = 'Le groupe demande une réponse précise parce que ce choix concerne toutes les personnes qui participent au projet.'
      const closing = `Pour cet essai, je conclus avec le terme «${row.trophySurface}», car cette formulation permet de résumer le choix.`
      return {
        lessonNumber: i + 1, slug: row.slug, title: base(), situation: base(), episodeShape: pathNumber === 1 ? 'challenge' : 'precision',
        registerPlan: { mode: 'constant', registers: [row.register, row.register, row.register] },
        interlocutors: [{ id: 'probe', role: base(), voiceRole: 'A' }], speakerGender: 'neutral',
        sceneCaption: { de: `Testfrage: «${opener}»`, en: `Test question: «${opener}»` },
        dialogue: [
          { speaker: 'them', interlocutorId: 'probe', targetText: opener, base: base() },
          { speaker: 'you', move: pathNumber === 1 ? 'compare' : 'explain', register: row.register, targetText: first, base: base() },
          { speaker: 'them', interlocutorId: 'probe', targetText: 'Mais quel critère permet de répondre au groupe sans négliger les besoins du projet ?', base: base() },
          { speaker: 'you', move: 'clarify', register: row.register, targetText: second, base: base() },
          { speaker: 'them', interlocutorId: 'probe', targetText: 'Quel terme convient pour résumer le choix à la fin de cet essai ?', base: base() },
          { speaker: 'you', move: 'conclude', register: row.register, targetText: closing, base: base() },
        ],
        build: { framePrefix: `Dans ce ${markers[i]} essai, je `, chunks: ['compare','un cadre','qui respecte','les besoins','de l’hôtel,'], distractors: ['aux besoins','dont le cadre'], frameSuffix: ' parce que chaque détail compte.' },
        cloze: {
          segments: [{ kind: 'text', text: 'Le groupe ' }, { kind: 'blank', index: 0 }, { kind: 'text', text: ' une réponse précise ' }, { kind: 'blank', index: 1 }, { kind: 'text', text: ' ce choix concerne toutes les personnes qui participent au projet.' }],
          blanks: [
            { answer: 'demande', acceptedAnswers: ['demande'], kind: 'form', cue: { de: 'demander, le groupe, Präsens Indikativ', en: 'demander, le groupe, present indicative' } },
            { answer: 'parce que', acceptedAnswers: ['parce que'], kind: 'connector', choices: ['parce que','en raison de','au lieu de','contrairement à'] },
          ], moveBlankIndex: 1,
        },
        synthesis: { segments: [{ kind: 'blank', index: 0 }, { kind: 'text', text: `, je conclus avec le terme «${row.trophySurface}», car cette formulation permet de résumer le choix.` }],
          blanks: [{ answer: 'Pour cet essai', acceptedAnswers: ['Pour cet essai'], kind: 'frame', choices: ['Pour cet essai','Malgré','Au lieu de','Contrairement à'] }], moveBlankIndex: 0 },
        recall: { before: `Dans ce ${markers[i]} essai, je compare un cadre qui respecte les besoins de `, answer: 'l’hôtel',
          acceptedAnswers: ['l’hôtel', "l'hôtel", 'l’hotel', "l'hotel"], after: ', parce que chaque détail compte.', fallbackChoices: ['l’hôtel','hôteliers','hôtelière','hôtelier'] },
        pattern: { moveType: 'clarify', label: base(), rule: base(), examples: [
          { targetText: second, base: base(), highlights: ['parce que'] },
          { targetText: 'Cette formulation précise le critère retenu et permet de justifier le choix proposé au groupe.', base: base(), highlights: ['précise le critère'] },
        ] },
        terms: [
          { targetText: 'parce que', kind: 'connector', base: base() }, { targetText: 'pour cet essai', kind: 'frame', base: base() },
          { targetText: 'cadre', kind: 'noun', base: base() }, { targetText: 'besoins', kind: 'noun', base: base() },
          { targetText: 'l’hôtel', lemma: 'hôtel', kind: 'noun', base: base() }, { targetText: 'groupe', kind: 'noun', base: base() },
          { targetText: 'formulation', kind: 'noun', base: base() }, { targetText: 'projet', kind: 'noun', base: base() },
        ],
        speak: [{ turnIndex: 1, requiredTokens: ['compare','cadre','l’hôtel'], profile: 'b2-long' },
          { turnIndex: 3, requiredTokens: ['groupe','réponse','projet'], profile: 'b2-long' },
          { turnIndex: 5, requiredTokens: [row.trophySurface,'formulation','choix'], profile: 'b2-short' }],
        trophy: { lemma: row.trophyLemma, familyKey: row.trophyFamilyKey, surface: row.trophySurface, pos: row.pos, turnIndex: 5,
          example: { targetText: `Le terme «${row.trophySurface}» figure seulement dans cet exemple de test.`, base: base() }, base: base() },
        review: { flags: Object.fromEntries(['argumentCoherent','challengeGenuine','steerGenuine','b2NotInflatedB1','registerNative','genderClaimVerified','distractorsNotAlsoCorrect','patternTruthful','baseTextsAccurate','ttsReadable','carriersStaged','noFiller'].map(k => [k, false])), verdict: 'pending', failingCriteria: [], reviewers: [], nativeStatus: 'unreviewed', acknowledgedWarnings: [] },
      }
    }),
  }
  return { draft: frenchB2DraftSchema.parse(raw), evidence }
}
let positives = 0, negatives = 0
function passes(label: string, data: Fixture) {
  assert.equal(validateFrenchB2Draft(data.draft, data.evidence).lessons.length, 10, label)
  positives++
}
function rejects(label: string, mutate: (data: Fixture) => void, reason: RegExp, pathNumber: 1 | 2 = 1) {
  const data = fixture(pathNumber)
  mutate(data)
  assert.throws(() => validateFrenchB2Draft(data.draft, data.evidence), reason, label)
  negatives++
}
passes('Genuine French P1, full de/en and vous/tu, whole apostrophe units', fixture(1))
passes('Genuine French P2 with exact inflected allocations', fixture(2))
const passive = fixture(2)
passive.draft.lessons[0].dialogue[2].targetText = 'La demande est acceptée selon cette notice, mais quel document précise la prochaine étape ?'
passes('Inanimate feminine passive is not a learner gender claim', passive)
const subjunctive = fixture(2)
subjunctive.draft.lessons[8].dialogue[2].targetText = 'Il faut que cette demande soit précise, mais comment distinguer ce choix du précédent ?'
passes('Valid embedded subjunctive is not banned by morphology suffix', subjunctive)
const group = fixture(1)
group.draft.lessons[4].dialogue[2].targetText = 'Je vous parle ici à tous, mais quel critère répond aux besoins du groupe ?'
group.draft.lessons[4].review.acknowledgedWarnings.push({ code: 'FR-B2-GROUP-VOUS', reason: 'Synthetic grouped audience: interlocutor addresses everyone, requiring independent semantic inspection.' })
passes('Object vous in tu episode is acknowledged as a group-reference warning', group)

rejects('No Spanish metadata masquerade', x => { x.draft.targetLanguage = 'Spanish' as never }, /French/)
rejects('No English locale masquerade', x => { x.draft.targetLanguageCode = 'en-US' as never }, /fr-FR/)
rejects('No English/Spanish registers', x => { x.draft.lessons[0].registerPlan.registers[0] = 'usted' as never }, /vous|tu/)
rejects('No wrong per-lesson allocation', x => { x.draft.lessons[0].registerPlan.registers.fill('tu'); for (const t of x.draft.lessons[0].dialogue) if (t.speaker === 'you') t.register = 'tu' }, /Register allocation/)
rejects('No informal address leakage', x => { x.draft.lessons[0].dialogue[2].targetText = 'Mais tu peux expliquer quel critère convient aux besoins de ce groupe dans cette situation ?' }, /Informal address/)
rejects('No unacknowledged group vous', x => { x.draft.lessons[4].dialogue[2].targetText = 'Je vous parle ici à tous, mais quel critère répond aux besoins du groupe ?' }, /FR-B2-GROUP-VOUS/)
rejects('No unsupported warning claims', x => { x.draft.lessons[0].review.acknowledgedWarnings.push({ code: 'FAKE-PASS', reason: 'Claimed approval is not source evidence.' }) }, /Unsupported warning/)
const learnerOn = (x: Fixture, verb: string) => {
  const l = x.draft.lessons[0]
  l.dialogue[5].targetText = l.dialogue[5].targetText.replace('je conclus', verb)
  const s = l.synthesis.segments[1]; if (s.kind === 'text') s.text = s.text.replace('je conclus', verb)
}
rejects('No silent learner on in a vous episode', x => learnerOn(x, 'on conclut'), /FR-B2-ON-VOUS/)
rejects('No silent elided learner on in a vous episode', x => learnerOn(x, 'dès qu’on conclut'), /FR-B2-ON-VOUS/)
rejects('No learner on acknowledgement without a stated referent', x => { learnerOn(x, 'on conclut'); x.draft.lessons[0].review.acknowledgedWarnings.push({ code: 'FR-B2-ON-VOUS', reason: 'Reviewed and considered acceptable.' }) }, /FR-B2-ON-VOUS/)
const genericOn = fixture(1)
learnerOn(genericOn, 'on conclut')
genericOn.draft.lessons[0].review.acknowledgedWarnings.push({ code: 'FR-B2-ON-VOUS', reason: 'Synthetic generic on: impersonal subject, not the learner group as nous; referent judged by content review.' })
passes('Learner on in a vous episode passes only with a stated generic/nous referent', genericOn)
rejects('No learner gender claim', x => { x.draft.lessons[0].dialogue[3].targetText = 'Je suis vraiment convaincu que cette réponse convient au groupe, mais il reste une question précise à régler.' }, /speaker-gender/)
rejects('No false native review', x => { x.draft.lessons[0].review.nativeStatus = 'human-reviewed' as never }, /unreviewed/)
rejects('No completed source flags', x => { x.draft.lessons[0].review.flags.argumentCoherent = true }, /claim completed review/)
rejects('No reviewer rows in pending sources', x => { x.draft.lessons[0].review.reviewers.push({ role: 'native-human', id: 'fake', date: '2026-10-05' }) }, /claim completed review/)
rejects('No source self-check field', x => { (x.draft as unknown as Record<string, unknown>).selfCheck = 'PASS' }, /Unrecognized key|unrecognized/i)
rejects('No omitted English base', x => { delete (x.draft.lessons[0].title as { de: string; en?: string }).en }, /de\/en explanation/)
rejects('No partial path', x => { x.draft.lessons.pop() }, /10|ten/)
rejects('No missing sixth turn', x => { x.draft.lessons[0].dialogue.pop() }, /6|six/)
rejects('No inverted roles', x => { x.draft.lessons[0].dialogue[2].speaker = 'you' }, /Speakers must alternate/)
rejects('No duplicate moves', x => { x.draft.lessons[0].dialogue[3].move = 'compare' }, /distinct moves/)
rejects('No path-two first position move', x => { x.draft.lessons[0].dialogue[1].move = 'position' }, /licensed first move/, 2)
rejects('No later relay', x => { x.draft.lessons[0].dialogue[5].move = 'relay' }, /early relay/)
rejects('No mismatched speaker metadata', x => { x.draft.lessons[0].dialogue[2].interlocutorId = 'missing' }, /metadata/)
rejects('No out-of-bound speech', x => { x.draft.lessons[0].dialogue[2].targetText = 'Pourquoi donc ?' }, /length outside/)
rejects('No false specification filename', x => { x.draft.specRef.pathSpec = 'old-french-spec.json' }, /path\/fingerprint/)
rejects('No draft hash substitution', x => { x.draft.specRef.pathSpecSha256 = 'a'.repeat(64) }, /path\/fingerprint/)
rejects('No embedded ledger hash substitution', x => { x.evidence.ledgerSha256 = 'a'.repeat(64) }, /ledger fingerprint/)
rejects('No evidence hash substitution', x => { x.evidence.pathSpecSha256 = 'a'.repeat(64) }, /source fingerprint/)
rejects('No parsed specification drift', x => { (x.evidence.specification as { code: string }).code = 'es-ES' }, /parsed\/source drift/)
rejects('No new bytes authorized by self-recomputed hash', x => { x.evidence.specificationSource += ' '; x.evidence.pathSpecSha256 = hash(x.evidence.specificationSource) }, /source fingerprint/)
rejects('No JSON reserialization claimed as original bytes', x => { x.evidence.specificationSource = JSON.stringify(x.evidence.specification) }, /source fingerprint/)
rejects('No missing source bytes', x => { x.evidence.specificationSource = undefined as never }, /exact UTF-8 source/)
rejects('No prerequisite source drift', x => { x.evidence.prerequisitesSource += ' ' }, /prerequisites: source fingerprint/)
rejects('No parsed prerequisite drift', x => { (x.evidence.prerequisites as Array<{ forbiddenTrophies: string[] }>)[0].forbiddenTrophies.pop() }, /parsed\/source drift/)
rejects('No dummy hundred reservations', x => { x.evidence.earlierTrophies = Array.from({ length: 100 }, (_, i) => `dummy${i}`) }, /hundred reserved B1/)
rejects('No one-entry reservation omission', x => { x.evidence.earlierTrophies.pop() }, /hundred reserved B1/)
rejects('No empty earlier evidence', x => { x.evidence.earlierTrophies = [] }, /hundred reserved B1/)
rejects('No omitted twentieth allocation', x => { x.evidence.trophies.pop() }, /twenty ordered/)
rejects('No changed ledger family', x => { x.evidence.trophies[10].familyKey = x.evidence.trophies[0].familyKey }, /another family/)
rejects('No reserved allocated lemma', x => { x.evidence.earlierTrophies.push(x.evidence.trophies[0].lemma) }, /collides/)
rejects('No cross-path reserved inflected surface', x => { x.evidence.earlierTrophies.push('résilié') }, /collides/)
rejects('No reordered allocations', x => { [x.evidence.trophies[0], x.evidence.trophies[1]] = [x.evidence.trophies[1], x.evidence.trophies[0]] }, /allocation order/)
rejects('No unrelated trophy lemma', x => { x.draft.lessons[0].trophy.lemma = 'hasard' }, /Trophy allocation/)
rejects('No guessed inflection', x => { x.draft.lessons[4].trophy.surface = 'résilions' }, /reviewed specification inflection/, 2)
rejects('No dropped allocated accent', x => { x.draft.lessons[0].trophy.surface = 'inconvenient' }, /reviewed specification inflection/)
rejects('No interlocutor trophy anchoring', x => { x.draft.lessons[0].trophy.turnIndex = 0 }, /declared learner turn/)
rejects('No absent trophy example', x => { x.draft.lessons[0].trophy.example.targetText = 'Cette phrase décrit seulement un exemple sans reprendre le terme alloué.' }, /complete lemma\/surface/)
rejects('No build reconstruction drift', x => { x.draft.lessons[0].build.frameSuffix += ' encore' }, /Build reconstruction/)
rejects('No duplicate chip', x => { x.draft.lessons[0].build.distractors[0] = x.draft.lessons[0].build.chunks[0] }, /chips must be distinct/)
rejects('No oversized chip', x => { const b = x.draft.lessons[0].build; b.chunks[0] += ' un autre mot ajouté ici' }, /Invalid chunk length/)
rejects('No build elision split', x => {
  const b = x.draft.lessons[0].build
  b.framePrefix += b.chunks.slice(0, 4).join(' ') + ' de l’'
  b.chunks = ['hôtel,','parce que','chaque','détail','compte.']; b.frameSuffix = ''
}, /splits a lexical token/)
rejects('No recall elision split', x => { const r = x.draft.lessons[0].recall; r.before += 'l’'; r.answer = 'hôtel'; r.acceptedAnswers = ['hôtel','hotel']; r.fallbackChoices[0] = 'hôtel' }, /Recall answer splits/)
rejects('No lexical fragment speech token', x => { x.draft.lessons[0].speak[0].requiredTokens[2] = 'hôtel' }, /complete speech tokens/)
rejects('No absent speech target', x => { x.draft.lessons[0].speak[2].turnIndex = 3 }, /Speak must cover/)
rejects('No missing trophy speech anchor', x => { x.draft.lessons[0].speak[2].requiredTokens[0] = 'terme' }, /include its trophy surface/)
rejects('No incorrect short speech profile', x => { x.draft.lessons[0].speak[0].profile = 'b2-short' }, /Speak profile/)
rejects('No missing build anchors', x => { x.draft.lessons[0].speak[0].requiredTokens = ['essai','détail'] }, /Two speech tokens/)
rejects('No term substring', x => { x.draft.lessons[0].terms[4].targetText = 'hôtel' }, /Complete term absent/)
rejects('No unattested term', x => { x.draft.lessons[0].terms[3].targetText = 'papillon' }, /Complete term absent/)
rejects('No repeated term', x => { x.draft.lessons[0].terms[3].targetText = x.draft.lessons[0].terms[2].targetText }, /Duplicate terms/)
rejects('No missing discourse coverage', x => { x.draft.lessons[0].terms[0].kind = 'phrase' }, /discourse and lexical/)
rejects('No pattern highlight invention', x => { x.draft.lessons[0].pattern.examples[0].highlights = ['expression absente'] }, /highlight absent/)
rejects('No absent exact pattern example', x => { x.draft.lessons[0].pattern.examples[0].targetText += ' Encore.' }, /reuse exact learner/)
rejects('No copied future turn in situation', x => { x.draft.lessons[0].situation.de += x.draft.lessons[0].dialogue[3].targetText }, /reveals later target/)
rejects('No missing quoted opener', x => { x.draft.lessons[0].sceneCaption = { ...x.draft.lessons[0].sceneCaption, en: 'Only an unrelated caption.' } }, /quote opener/)
rejects('No form cue omission', x => { delete x.draft.lessons[0].cloze.blanks[0].cue }, /Form cues/)
rejects('No cue on a frame', x => { x.draft.lessons[0].synthesis.blanks[0].cue = base() }, /Form cues/)
rejects('No reordered blank indices', x => { x.draft.lessons[0].cloze.segments.reverse() }, /once in order/)
rejects('No repeated blank index', x => { const s = x.draft.lessons[0].cloze.segments[3]; if (s.kind === 'blank') s.index = 0 }, /once in order/)
rejects('No move blank pointing at a form', x => { x.draft.lessons[0].cloze.moveBlankIndex = 0 }, /connector\/frame/)
rejects('No two forced choice blanks', x => { x.draft.lessons[0].cloze.blanks[0].choices = ['demande','demandent','demander','demandant'] }, /At most one choice/)
rejects('No cloze lexical fragment', x => { const c = x.draft.lessons[0].cloze; c.blanks[0].answer = 'dem'; c.blanks[0].acceptedAnswers = ['dem']; const s = c.segments[2]; if (s.kind === 'text') s.text = 'ande' + s.text }, /Cloze blank splits/)
rejects('No synthesis drift', x => { const s = x.draft.lessons[0].synthesis.segments[1]; if (s.kind === 'text') s.text += ' encore' }, /Cloze reconstruction/)
rejects('No punctuation-only recall', x => { const l = x.draft.lessons[0], at = l.dialogue[1].targetText.indexOf(','); l.recall = { before: l.dialogue[1].targetText.slice(0, at), answer: ',', acceptedAnswers: [','], after: l.dialogue[1].targetText.slice(at + 1), fallbackChoices: [',',';','!',':'] } }, /Invalid recall answer/)
rejects('No missing apostrophe combination', x => { x.draft.lessons[0].recall.acceptedAnswers = ['l’hôtel',"l'hôtel",'l’hotel'] }, /explicit French spelling variant/)
rejects('No missing accent-stripped variant', x => { x.draft.lessons[0].recall.acceptedAnswers = ['l’hôtel',"l'hôtel"] }, /explicit French spelling variant/)
rejects('No two accepted choices', x => { x.draft.lessons[0].recall.acceptedAnswers.push('hôtelier','hotelier') }, /exactly one accepted/)
const extra = (n: number) => Array.from({ length: n }, (_, i) => `extra${String.fromCharCode(97 + i)}`)
const sixteen = fixture(1)
sixteen.draft.lessons[0].recall.acceptedAnswers.push(...extra(12))
passes('Sixteen authored recall answers stay within the controlling ceiling', sixteen)
rejects('No seventeenth authored recall answer', x => { x.draft.lessons[0].recall.acceptedAnswers.push(...extra(13)) }, /more than sixteen/)
rejects('No oversized cloze answer list', x => { x.draft.lessons[0].cloze.blanks[0].acceptedAnswers.push(...extra(16)) }, /more than sixteen/)
for (const pair of [['côté','cote'], ['d’un',"d'un"], ['cœur','coeur'], ['mot :','mot:'], ['Mot','mot!']]) {
  // Keep the one accepted canonical choice: the failure must come from colliding wrong choices.
  rejects(`No choice equivalence ${pair.join('/')}`, x => { x.draft.lessons[0].recall.fallbackChoices = [x.draft.lessons[0].recall.answer,pair[0],pair[1],'autre'] }, /distinct with exactly one/)
}
for (const [field, mutation] of [
  ['dialogue', (l: FrenchB2Draft['lessons'][number]) => { l.dialogue[2].targetText += ' [rires]' }],
  ['choice', (l: FrenchB2Draft['lessons'][number]) => { l.recall.fallbackChoices[1] = 'hôtel2' }],
  ['distractor', (l: FrenchB2Draft['lessons'][number]) => { l.build.distractors[0] = 'http://exemple.test' }],
  ['term', (l: FrenchB2Draft['lessons'][number]) => { l.terms[2].targetText = 'cadre🙂' }],
  ['example', (l: FrenchB2Draft['lessons'][number]) => { l.pattern.examples[1].targetText += ' —' }],
  ['trophy example', (l: FrenchB2Draft['lessons'][number]) => { l.trophy.example.targetText += '  encore' }],
] as const) rejects(`No unsafe spoken ${field}`, x => mutation(x.draft.lessons[0]), /illegal canonical/)
rejects('No canonical straight apostrophe', x => { x.draft.lessons[0].dialogue[2].targetText = "L'hôtel demande une réponse précise, mais quel critère répond aux besoins de ce groupe ?" }, /U\+2019/)
rejects('No missing French punctuation space', x => { x.draft.lessons[0].dialogue[2].targetText = x.draft.lessons[0].dialogue[2].targetText.replace(' ?', '?') }, /French punctuation/)
for (const gap of ['\u00a0','\u202f']) rejects('No NBSP contrary to controlling specification', x => { x.draft.lessons[0].dialogue[2].targetText = x.draft.lessons[0].dialogue[2].targetText.replace(' ?', gap + '?') }, /illegal canonical/)
rejects('No hidden explanation controls', x => { x.draft.pathTitle.de += '\u200b' }, /controls/)
rejects('No decomposed canonical accent', x => { x.draft.lessons[0].trophy.surface = 'inconvénient'.normalize('NFD') }, /NFC/)
rejects('No unligated canonical cœur', x => { x.draft.lessons[0].dialogue[2].targetText = 'Le coeur du problème concerne notre choix, mais comment préciser les besoins de ce groupe ?' }, /canonical œ/)

function negationFixture(long: boolean): Fixture {
  const x = fixture(), l = x.draft.lessons[0]
  const first = long ? 'Dans cet essai, je ne le prends pas cette fois parce que ce détail compte pour expliquer notre choix.'
    : 'Dans cet essai, on ne l’achète pas, parce que ce détail change la réponse que nous pouvons proposer au groupe.'
  l.dialogue[1].targetText = first
  l.build = long ? { framePrefix: 'Dans cet essai, ', chunks: ['je ne le prends','pas cette fois','parce que','ce détail','compte'], distractors: ['du détail','dont le choix'], frameSuffix: ' pour expliquer notre choix.' }
    : { framePrefix: 'Dans cet essai, ', chunks: ['on ne l’achète pas,','parce que','ce détail','change','la réponse'], distractors: ['du détail','dont la réponse'], frameSuffix: ' que nous pouvons proposer au groupe.' }
  const answer = long ? 'prends' : 'l’achète', at = first.indexOf(answer)
  l.recall = { before: first.slice(0, at), answer, acceptedAnswers: long ? ['prends'] : ['l’achète',"l'achète",'l’achete',"l'achete"], after: first.slice(at + answer.length), fallbackChoices: long ? ['prends','prendre','prenant','prenons'] : ['l’achète','achètent','acheter','achetant'] }
  l.speak[0].requiredTokens = long ? ['prends','détail','compte'] : ['l’achète','détail','réponse']
  l.terms[2].targetText = 'détail'; l.terms[3].targetText = 'choix'; l.terms[4].targetText = long ? 'prends' : 'l’achète'; l.terms[4].kind = 'verb'; delete l.terms[4].lemma
  if (!long) l.review.acknowledgedWarnings.push({ code: 'FR-B2-ON-VOUS', reason: 'Synthetic generic on in the negation probe, not a nous group reference.' })
  return x
}
passes('Four-token negated clitic group is one chip', negationFixture(false))
passes('Five-token negation keeps subject/clitic/verb and attaches pas forward', negationFixture(true))
for (const long of [false, true]) {
  const x = negationFixture(long), chips = x.draft.lessons[0].build.chunks
  chips.splice(0, 1, long ? 'je ne' : 'on ne', long ? 'le prends' : 'l’achète pas,')
  assert.throws(() => validateFrenchB2Draft(x.draft, x.evidence), /Negated clitic group/, 'No internal negation split')
  negatives++
}

// Exercise the exact five-token named carrier while leaving arbitrary five-token frames rejected.
const named = fixture(2), namedLesson = named.draft.lessons[0]
namedLesson.dialogue[5].targetText = `Je garde cette formulation ; c’est pour cette raison que je conclus avec le terme «${namedLesson.trophy.surface}» pour résumer ce choix.`
namedLesson.synthesis = { segments: [{ kind: 'text', text: 'Je garde cette formulation ; ' }, { kind: 'blank', index: 0 }, { kind: 'text', text: ` je conclus avec le terme «${namedLesson.trophy.surface}» pour résumer ce choix.` }], blanks: [{ answer: 'c’est pour cette raison que', acceptedAnswers: ['c’est pour cette raison que',"c'est pour cette raison que"], kind: 'frame', choices: ['c’est pour cette raison que','en raison de','au lieu de','contrairement à'] }], moveBlankIndex: 0 }
namedLesson.terms[1].targetText = 'c’est pour cette raison que'
passes('Explicit French five-token causal frame', named)
const overlong = structuredClone(named)
overlong.draft.lessons[0].synthesis.blanks[0].answer = 'ce sont plusieurs raisons différentes'
overlong.draft.lessons[0].synthesis.blanks[0].acceptedAnswers = ['ce sont plusieurs raisons différentes','ce sont plusieurs raisons differentes']
assert.throws(() => validateFrenchB2Draft(overlong.draft, overlong.evidence), /Invalid blank answer/, 'No arbitrary widened frame bound')
negatives++

console.log(`PASS: French B2 offline structure; ${positives} synthetic positive probes and ${negatives} reason-asserted rejection probes.`)
// Inspect both exact reviewed copies even when one fails. These are source holds,
// not expected-negative fixtures and never turned into a claim of passing review.
let reviewedFailures = 0
for (const [n, expected] of [[1,'418a42996466b2241dfcda3e8caa62c8444d59d66671de96311c8596b20d475e'],[2,'c54dfc2ad4b5dd6021df6a7da19bb58bf6a2959543513b1099a9a64a99178f5c']] as const) {
  const source = fs.readFileSync(path.join(authorityRoot, `french/p${n}.json`), 'utf8')
  assert.equal(hash(source), expected, `Fable reviewed French P${n} source is immutable`)
  try {
    assert.equal(validateFrenchB2Draft(JSON.parse(source), fixture(n).evidence).lessons.length, 10)
    console.log(`PASS: exact reviewed French P${n} source structure.`)
  } catch (error) {
    reviewedFailures++
    console.error(`FAIL: exact reviewed French P${n} source structure.\n${error instanceof Error ? error.message : String(error)}`)
  }
}
if (reviewedFailures) process.exitCode = 1
console.log('No native, semantic, runtime, TTS or publication approval.')
