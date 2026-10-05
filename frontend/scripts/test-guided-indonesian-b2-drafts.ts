import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  INDONESIAN_B2_AUTHORITY as A,
  IndonesianB2GateError,
  collectIndonesianB2Warnings,
  validateIndonesianB2Draft,
  verifyIndonesianB2Evidence,
  type IndonesianB2Allocation,
  type IndonesianB2Draft,
  type IndonesianB2Evidence,
} from './lib/guidedIndonesianB2Drafts';
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring';

// Offline gate tests for the Indonesian B2 P1/P2 drafts. Run from orchestrator/frontend.
// Full positive runs validate both repaired paths against the pinned V3 specification.
// Mutation anchors use unchanged valid P1L1 so a mutation code surfaces before any later lesson.

const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const read = (p: string) => readFileSync(p, 'utf8');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const specSrc = read('content-drafts/b2-2026-10/indonesian/specification.json');
const prereqSrc = read('content-drafts/b2-2026-10/native-prerequisites.json');
const b1Src = read('content-drafts/b1-native-2026-10/indonesian/specification.json');
// Literal types widened so mutation tests can assign wrong values without any.
type Loosen<T> = T extends readonly (infer U)[] ? Loosen<U>[] : T extends object ? { -readonly [K in keyof T]: Loosen<T[K]> } : T extends boolean ? boolean : T extends string ? string : T extends number ? number : T;
type Draft = Loosen<IndonesianB2Draft>;
interface SpecShape { trophyLedger: { rows: IndonesianB2Allocation[] } }
interface PrereqEntry { targetLanguage: string; b1Specification: string; b1AllocationSha256: string; forbiddenTrophies: string[] }
interface B1Shape { paths: { pathNumber: number; lessons: { number: number; trophy: string }[] }[] }
interface FrozenLesson { targetLanguage: string; level: string; vibeVariants: Record<string, { trophyWord: { word: string } }> }
const p1 = JSON.parse(read('content-drafts/b2-2026-10/indonesian/p1.json')) as Draft;
const p2 = JSON.parse(read('content-drafts/b2-2026-10/indonesian/p2.json')) as Draft;
const spec = JSON.parse(specSrc) as SpecShape;
const prereq = JSON.parse(prereqSrc) as PrereqEntry[];
const b1 = JSON.parse(b1Src) as B1Shape;
const entry = (): PrereqEntry => {
  const e = prereq.find((x) => x.targetLanguage === A.targetLanguage);
  assert.ok(e, 'Indonesian prerequisite entry');
  return e;
};

// Independent reconstruction of the 300 earlier trophies: the actual 200 frozen A1/A2 Indonesian
// rows of GUIDED_LESSONS (fingerprinted) plus the 100 ordered B1 reservations.
const frozenRows: FrozenLesson[] = (GUIDED_LESSONS as unknown as FrozenLesson[]).filter((l) => l.targetLanguage === A.targetLanguage && (l.level === 'A1' || l.level === 'A2'));
function frozenIndonesianLemmas(): string[] {
  return frozenRows.map((l) => {
    const ws = new Set(Object.values(l.vibeVariants).map((v) => v.trophyWord.word));
    assert.equal(ws.size, 1, 'one trophy word per frozen lesson');
    return [...ws][0];
  });
}
function reservedB1Lemmas(): string[] {
  assert.equal(b1.paths.length, 10);
  return b1.paths.flatMap((p, i) => {
    assert.equal(p.pathNumber, i + 1);
    assert.equal(p.lessons.length, 10);
    return p.lessons.map((l, n) => {
      assert.equal(l.number, n + 1);
      assert.equal(typeof l.trophy, 'string');
      return l.trophy;
    });
  });
}
const frozen = frozenIndonesianLemmas();
const reserved = reservedB1Lemmas();
const earlier = [...frozen, ...reserved];

function evidence(): IndonesianB2Evidence {
  return {
    specificationSource: specSrc,
    specification: clone(spec),
    pathSpecSha256: A.specificationSha256,
    ledgerSha256: A.specificationSha256,
    prerequisitesSource: prereqSrc,
    prerequisites: clone(prereq),
    prerequisitesSha256: A.prerequisitesSha256,
    trophies: clone(spec.trophyLedger.rows),
    earlierTrophies: [...earlier],
  };
}

function expectCode(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof IndonesianB2GateError, 'gate error class');
    assert.equal(e.code, code, e.message);
    return;
  }
  assert.fail('expected ' + code);
}

// ---- Preconditions: real fixtures before any mutation ----
test('fixture: spec V3 and prerequisites are LF and match pinned sha', () => {
  assert.ok(!specSrc.includes('\r') && !prereqSrc.includes('\r'));
  assert.equal(sha(specSrc), A.specificationSha256);
  assert.equal(sha(prereqSrc), A.prerequisitesSha256);
});
test('fixture: B1 spec is the exact LF file and reversibly restores the CRLF allocation sha', () => {
  assert.ok(!b1Src.includes('\r'));
  assert.equal(sha(b1Src), A.b1SpecificationLfSha256);
  const crlf = b1Src.replace(/\n/g, '\r\n');
  assert.equal(sha(crlf), A.b1SpecificationCrlfSha256);
  assert.equal(crlf.replace(/\r\n/g, '\n'), b1Src);
  assert.equal(entry().b1AllocationSha256, A.b1SpecificationCrlfSha256);
  assert.equal(entry().b1Specification, A.b1SpecificationFile);
});
test('fixture: the actual 200 frozen Indonesian A1/A2 rows recompute the pinned corpus fingerprint', () => {
  assert.equal(frozenRows.length, A.frozenLessonCount);
  assert.equal(sha(JSON.stringify(frozenRows)), A.frozenCorpusSha256);
});
test('fixture: 200 frozen + 100 reserved = 300 distinct, equal to the pinned forbidden list', () => {
  assert.equal(frozen.length, A.frozenLessonCount);
  assert.equal(reserved.length, A.reservedB1Count);
  const sorted = [...new Set(earlier.map((s) => s.normalize('NFC').toLowerCase()))].sort();
  assert.equal(sorted.length, A.earlierTrophyCount);
  assert.deepEqual(sorted, entry().forbiddenTrophies);
});
test('fixture: drafts bind to V3 spec and are draft/unreviewed', () => {
  for (const d of [p1, p2]) {
    assert.equal(d.specRef.pathSpec, A.specificationFile);
    assert.equal(d.specRef.pathSpecSha256, A.specificationSha256);
    assert.equal(d.status, 'draft');
    assert.equal(d.lessons.length, A.lessonsPerPath);
  }
  assert.equal(p1.lessons[0].slug, 'sewa-dekat-atau-jauh');
  assert.equal(p1.lessons[0].build.chunks[0], 'sedangkan');
});

// ---- Evidence positive and negatives ----
test('evidence: real evidence verifies with 20 ledger rows and 300 forbidden', () => {
  const v = verifyIndonesianB2Evidence(evidence());
  assert.equal(v.allocations.length, A.ledgerRowCount);
  assert.equal(v.forbidden.size, A.earlierTrophyCount);
  assert.equal(v.allocations[2].surfaceAnchor, 'kelebihannya');
});
test('evidence: authority drift in the spec source fails FULL_SPEC_HASH', () => {
  const e = evidence();
  e.specificationSource = specSrc.replace('"level": "B2"', '"level": "B2" ');
  expectCode(() => verifyIndonesianB2Evidence(e), 'FULL_SPEC_HASH');
});
test('evidence: CRLF spec source fails FULL_SPEC_HASH (sha differs before LF rule)', () => {
  const e = evidence();
  e.specificationSource = specSrc.replace(/\n/g, '\r\n');
  expectCode(() => verifyIndonesianB2Evidence(e), 'FULL_SPEC_HASH');
});
test('evidence: parsed spec drift fails SPEC_PARSED_EQUALITY', () => {
  const e = evidence();
  (e.specification as SpecShape).trophyLedger.rows[0].lemma = 'sedang';
  expectCode(() => verifyIndonesianB2Evidence(e), 'SPEC_PARSED_EQUALITY');
});
test('evidence: prerequisites drift fails PREREQUISITES_HASH', () => {
  const e = evidence();
  e.prerequisitesSource = prereqSrc.replace(A.frozenCorpusSha256, 'c3d1594c493feaaf9bff746bcfa8c75dcb6b1371081dcd0b02939a6d11722008');
  expectCode(() => verifyIndonesianB2Evidence(e), 'PREREQUISITES_HASH');
});
test('evidence: ledger omission fails LEDGER_MISMATCH', () => {
  const e = evidence();
  e.trophies = [...e.trophies].slice(0, 19);
  expectCode(() => verifyIndonesianB2Evidence(e), 'LEDGER_MISMATCH');
});
test('evidence: earlier trophy omission fails EARLIER_TROPHY_COUNT', () => {
  const e = evidence();
  e.earlierTrophies = earlier.slice(1);
  expectCode(() => verifyIndonesianB2Evidence(e), 'EARLIER_TROPHY_COUNT');
});
test('evidence: earlier trophy substitution fails FORBIDDEN_LIST_MISMATCH', () => {
  const e = evidence();
  const list = [...earlier];
  list[0] = 'zzznotatrophy';
  e.earlierTrophies = list;
  expectCode(() => verifyIndonesianB2Evidence(e), 'FORBIDDEN_LIST_MISMATCH');
});

// ---- Full positives: expected to fail until canonical content fixes land (see header) ----
test('positive: path 1 validates completely against V3 evidence', () => {
  const doc = validateIndonesianB2Draft(p1, evidence());
  assert.equal(doc.pathNumber, 1);
  assert.equal(doc.lessons[0].trophy.lemma, 'sedangkan');
});
test('positive: path 2 validates completely against V3 evidence', () => {
  const doc = validateIndonesianB2Draft(p2, evidence());
  assert.equal(doc.pathNumber, 2);
  assert.equal(doc.lessons[1].trophy.surface, 'dipilah');
});

// ---- Draft negatives anchored on P1L1 ----
const l1 = (d: Draft) => d.lessons[0];
const run = (d: Draft) => validateIndonesianB2Draft(d, evidence());
test('draft: status other than draft fails SCHEMA', () => {
  const d = clone(p1);
  d.status = 'reviewed';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SCHEMA');
});
test('draft: review flag pre-set true fails SCHEMA', () => {
  const d = clone(p1);
  l1(d).review.flags.registerNative = true;
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SCHEMA');
});
test('draft: old spec filename in specRef fails SCHEMA (authority binding)', () => {
  const d = clone(p1);
  d.specRef.pathSpec = 'B2_INDONESIAN_P1_P2_AUTHORING_SPEC.json';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SCHEMA');
});
test('draft: kamu in a formal learner turn fails FORMAL_REGISTER', () => {
  const d = clone(p1);
  l1(d).dialogue[1].targetText = l1(d).dialogue[1].targetText.replace('waktu saya', 'waktu kamu');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'FORMAL_REGISTER');
});
test('draft: -mu clitic in a formal learner turn fails FORMAL_REGISTER', () => {
  const d = clone(p1);
  l1(d).dialogue[1].targetText = l1(d).dialogue[1].targetText.replace('waktu saya', 'waktumu');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'FORMAL_REGISTER');
});
test('draft: lowercase anda fails ANDA_CAPITALIZATION', () => {
  const d = clone(p1);
  l1(d).dialogue[0].targetText = l1(d).dialogue[0].targetText.replace('Anda', 'anda');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'ANDA_CAPITALIZATION');
});
test('draft: gendered address term fails GENDER_ADDRESS', () => {
  const d = clone(p1);
  l1(d).dialogue[0].targetText = l1(d).dialogue[0].targetText.replace('Anda cenderung', 'Pak, Anda cenderung');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'GENDER_ADDRESS');
});
test('draft: digit symbol in a voiced turn fails SPOKEN_SCRIPT', () => {
  const d = clone(p1);
  l1(d).dialogue[1].targetText = l1(d).dialogue[1].targetText.replace('dua jam', '2 jam');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SPOKEN_SCRIPT');
});
test('draft: colloquial particle fails BANNED_REGISTER', () => {
  const d = clone(p1);
  l1(d).dialogue[2].targetText = l1(d).dialogue[2].targetText.replace('itu besar.', 'itu besar banget.');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'BANNED_REGISTER');
});
test('draft: canonical turn rewording fails CANONICAL_BEAT_AUTHORITY', () => {
  const d = clone(p1);
  l1(d).dialogue[3].targetText = l1(d).dialogue[3].targetText.replace('juga harus', 'harus');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'CANONICAL_BEAT_AUTHORITY');
});
test('draft: singleton function-word chip fails SINGLE_CHIP', () => {
  const d = clone(p1);
  assert.equal(l1(d).build.chunks[1], 'yang dekat kantor');
  l1(d).build.chunks.splice(1, 1, 'yang', 'dekat kantor');
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SINGLE_CHIP');
});
test('draft: chip reorder breaks BUILD_RECONSTRUCTION', () => {
  const d = clone(p1);
  const c = l1(d).build.chunks;
  [c[1], c[2]] = [c[2], c[1]];
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'BUILD_RECONSTRUCTION');
});
test('draft: cloze blank cut inside a token fails BLANK_BOUNDARY', () => {
  const d = clone(p1);
  const cz = l1(d).cloze;
  cz.blanks[1].answer = 'dihitun';
  cz.blanks[1].acceptedAnswers = ['dihitun'];
  assert.ok('text' in cz.segments[4]);
  cz.segments[4].text = 'g.';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'BLANK_BOUNDARY');
});
test('draft: a third synthesis blank fails BLANK_COUNT', () => {
  const d = clone(p1);
  const sy = l1(d).synthesis;
  assert.ok('text' in sy.segments[4]);
  sy.segments[4].text = ' dari uang tiga juta ';
  sy.segments.push({ kind: 'blank', index: 2 }, { kind: 'text', text: '.' });
  sy.blanks.push({ answer: 'itu', acceptedAnswers: ['itu'], kind: 'lexical' });
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'BLANK_COUNT');
});
test('draft: stop-word cloze answer fails BLANK_STOP (within count bounds)', () => {
  const d = clone(p1);
  const cz = l1(d).cloze;
  assert.ok('text' in cz.segments[2]);
  cz.segments[2].text = ' mahal, tetapi ongkos transportasi dan tenaga ';
  cz.segments.splice(3, 0, { kind: 'blank', index: 1 }, { kind: 'text', text: ' habis di jalan juga harus ' });
  (cz.segments[5] as { index: number }).index = 2;
  cz.blanks.splice(1, 0, { answer: 'yang', acceptedAnswers: ['yang'], kind: 'lexical' });
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'BLANK_STOP');
});
test('draft: fallback choice with a second accepted answer fails CHOICE_ACCEPTED_COUNT', () => {
  const d = clone(p1);
  l1(d).recall.acceptedAnswers = ['sedangkan', 'sebelum'];
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'CHOICE_ACCEPTED_COUNT');
});
test('draft: speak token absent from its turn fails SPEAK_WHOLE_UNIT', () => {
  const d = clone(p1);
  l1(d).speak[1].requiredTokens = ['ongkos', 'tenaga', 'parkir'];
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SPEAK_WHOLE_UNIT');
});
test('draft: speak target off the you-turn scope fails SPEAK_SCOPE', () => {
  const d = clone(p1);
  l1(d).speak[2].turnIndex = 4;
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SPEAK_SCOPE');
});
test('draft: term not whole-unit in corpus fails TERM_SOURCE', () => {
  const d = clone(p1);
  l1(d).terms[5].targetText = 'tenag';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'TERM_SOURCE');
});
test('draft: P1L3 clitic term with wrong lemma fails TERM_LEMMA', () => {
  const d = clone(p1);
  d.lessons[2].terms[2].lemma = 'kelebihannya';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'TERM_LEMMA');
});
test('draft: frame edge cut inside a token fails FRAME_BOUNDARY', () => {
  const d = clone(p1);
  l1(d).build.chunks[4] = 'per ha';
  l1(d).build.frameSuffix = 'ri.';
  expectCode(() => run(d), 'FRAME_BOUNDARY');
});
test('draft: trophy example apostrophe fragment fails TROPHY_EXAMPLE', () => {
  const d = clone(p1);
  l1(d).trophy.example.targetText = "Mobil itu murah, sedangkan'lain mahal.";
  expectCode(() => run(d), 'TROPHY_EXAMPLE');
});
test('draft: punctuation-separated trophy example still attests (positive)', () => {
  const d = clone(p1);
  l1(d).trophy.example.targetText = 'Bus murah; sedangkan, kereta cepat.';
  assert.equal(run(d).lessons[0].trophy.lemma, 'sedangkan');
});
test('draft: missing di-form term lemma fails TERM_LEMMA', () => {
  const d = clone(p1);
  delete l1(d).terms[6].lemma;
  expectCode(() => run(d), 'TERM_LEMMA');
});
test('draft: wrong di-form term lemma fails TERM_LEMMA', () => {
  const d = clone(p1);
  l1(d).terms[6].lemma = 'zzzinvented';
  expectCode(() => run(d), 'TERM_LEMMA');
});
test('draft: distractor phrase present in the learner line fails DISTRACTOR_PRESENT', () => {
  const d = clone(p1);
  l1(d).build.distractors[0] = 'yang dekat';
  expectCode(() => run(d), 'DISTRACTOR_PRESENT');
});
test('draft: empty accepted answer fails SPOKEN_HYGIENE', () => {
  const d = clone(p1);
  l1(d).cloze.blanks[1].acceptedAnswers.push('');
  expectCode(() => run(d), 'SPOKEN_HYGIENE');
});
test('draft: gendered accepted answer fails GENDER_ADDRESS', () => {
  const d = clone(p1);
  l1(d).cloze.blanks[1].acceptedAnswers.push('Pak');
  expectCode(() => run(d), 'GENDER_ADDRESS');
});
test('draft: non-Latin recall choice fails SPOKEN_SCRIPT', () => {
  const d = clone(p1);
  l1(d).recall.fallbackChoices[3] = '\u4e2d';
  expectCode(() => run(d), 'SPOKEN_SCRIPT');
});
test('draft: spaced di- verb fails DI_PREPOSITION', () => {
  const d = clone(p1);
  l1(d).trophy.example.targetText = 'Rumah itu di hitung, sedangkan rumah ini disewa.';
  expectCode(() => run(d), 'DI_PREPOSITION');
});
test('draft: attached di + place fails DI_PREPOSITION', () => {
  const d = clone(p1);
  l1(d).trophy.example.targetText = 'Rumah itu dikota, sedangkan rumah ini di desa.';
  expectCode(() => run(d), 'DI_PREPOSITION');
});
test('draft: uppercase ANDA fails ANDA_CAPITALIZATION', () => {
  const d = clone(p1);
  l1(d).trophy.example.targetText = 'Rumah ANDA murah, sedangkan rumah ini mahal.';
  expectCode(() => run(d), 'ANDA_CAPITALIZATION');
});
test('draft: two-sentence pattern rule fails RULE_SENTENCE', () => {
  const d = clone(p1);
  l1(d).pattern.rule.en += ' This is a second sentence.';
  expectCode(() => run(d), 'RULE_SENTENCE');
});
test('draft: trophy lemma off the ledger row fails TROPHY_ALLOCATION', () => {
  const d = clone(p1);
  l1(d).trophy.lemma = 'daripada';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'TROPHY_ALLOCATION');
});
test('draft: lesson slug drift fails SLUG', () => {
  const d = clone(p1);
  l1(d).slug = 'sewa-dekat';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SLUG');
});
test('draft: swapped episode shape fails NATIVE_EPISODE', () => {
  const d = clone(p1);
  l1(d).episodeShape = 'precision';
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'NATIVE_EPISODE');
});
test('draft: caption revealing a later turn fails SCENE_NO_REVEAL', () => {
  const d = clone(p1);
  l1(d).sceneCaption.en += ' ' + l1(d).dialogue[2].targetText;
  expectCode(() => validateIndonesianB2Draft(d, evidence()), 'SCENE_NO_REVEAL');
});

// ---- Staging: non-blocking recognition path (blocking STAGED_TOKEN is spec-pinned, see limitations) ----
test('warnings: early staged token in a non-learner pattern example yields RECOGNITION_ONLY_PATTERN', () => {
  const d = clone(p1);
  l1(d).pattern.examples[1].targetText = 'Rumah ini lebih luas, sedangkan yang dekat stasiun kalaupun mahal menghemat waktu.';
  // Parse-only path: collectIndonesianB2Warnings takes a parsed draft; shape is unchanged by the edit.
  const w = collectIndonesianB2Warnings(d as unknown as IndonesianB2Draft).filter((x) => x.code === 'RECOGNITION_ONLY_PATTERN');
  assert.equal(w.length, 1);
  assert.deepEqual(w[0].lessons, [1]);
  assert.deepEqual(w[0].tokens, ['kalaupun']);
});
test('warnings: unmodified P1 emits no RECOGNITION_ONLY_PATTERN', () => {
  assert.equal(collectIndonesianB2Warnings(clone(p1) as unknown as IndonesianB2Draft).filter((x) => x.code === 'RECOGNITION_ONLY_PATTERN').length, 0);
});
test('warnings: exempted loanwords emit no LOANWORD, an unexempted one does', () => {
  assert.equal(collectIndonesianB2Warnings(clone(p2) as unknown as IndonesianB2Draft).filter((x) => x.code === 'LOANWORD').length, 0);
  const d = clone(p1);
  l1(d).dialogue[0].targetText += ' Modem?';
  const w = collectIndonesianB2Warnings(d as unknown as IndonesianB2Draft).filter((x) => x.code === 'LOANWORD');
  assert.deepEqual(w.map((x) => x.tokens), [['modem']]);
});
