// Offline native Korean (ko-KR) B2 gate proposal. node:test, no provider, no runtime, no writes.
// cwd: frontend/. Real fixtures only; no fabricated spec, no deleted lessons. Known current findings are reported
// in the proposal limitations, not encoded as expected behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  KOREAN_B2_AUTHORITY,
  KoreanB2GateError,
  formalEnding,
  koreanB2DraftSchema,
  sinoKorean,
  validateKoreanB2Draft,
  variantTokenEquivalent,
  verifyKoreanB2Evidence,
  whole,
  type KoreanB2Allocation,
  type KoreanB2Draft,
  type KoreanB2Evidence,
  type KoreanB2Warning,
} from './lib/guidedKoreanB2Drafts';
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring';

const B1_LF_SHA = 'aa777ec8c0de4342a5a99827fb963ae616c6ab917f7195221a01e50c61048ddd';
const B1_CRLF_SHA = '5e2ebf52d4fee320839b49c8426d29c81db7af5bbb1d5d3b59f4d1aa962c8bf3';

const ROOT = ((): string => {
  for (const c of [process.cwd(), resolve(process.cwd(), '..')]) if (existsSync(join(c, 'content-drafts', 'b2-2026-10'))) return c;
  throw new Error('content-drafts/b2-2026-10 not found from ' + process.cwd());
})();
const B2 = join(ROOT, 'content-drafts', 'b2-2026-10');
const KO = join(B2, 'korean');
const B1_SPEC = join(ROOT, 'content-drafts', 'b1-native-2026-10', 'korean', 'specification.json');

const shaBytes = (b: Buffer | string): string => createHash('sha256').update(b).digest('hex');
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
function field(v: unknown, key: string, where: string): unknown {
  if (!isRecord(v)) throw new Error(where + ': not an object');
  return v[key];
}
function str(v: unknown, where: string): string {
  if (typeof v !== 'string') throw new Error(where + ': not a string');
  return v;
}
function num(v: unknown, where: string): number {
  if (typeof v !== 'number') throw new Error(where + ': not a number');
  return v;
}
function list(v: unknown, where: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(where + ': not an array');
  return v;
}
const gateCode = (code: string) => (e: unknown): boolean => e instanceof KoreanB2GateError && e.code === code;

// ---- actual frozen A1/A2 rows: independent recompute, no checker reuse ----
const frozenRows: unknown[] = (GUIDED_LESSONS as readonly unknown[]).filter((l) => {
  const level = field(l, 'level', 'lesson');
  return field(l, 'targetLanguage', 'lesson') === 'Korean' && (level === 'A1' || level === 'A2');
});
const frozenTrophies: string[] = frozenRows.map((l, i) => {
  const variants = field(l, 'vibeVariants', 'frozen[' + i + ']');
  if (!isRecord(variants)) throw new Error('frozen[' + i + '] vibeVariants');
  const words = new Set(Object.keys(variants).map((k) => str(field(field(variants[k], 'trophyWord', k), 'word', k), 'frozen[' + i + '].' + k)));
  assert.equal(words.size, 1, 'frozen[' + i + '] vibe variants disagree on trophyWord.word');
  return [...words][0];
});

// ---- B1 reserved ledger: real file, LF/CRLF reversible pin ----
const b1Raw = readFileSync(B1_SPEC);
const b1Text = b1Raw.toString('utf8');
const b1Parsed: unknown = JSON.parse(b1Text);
const reservedB1: string[] = list(field(b1Parsed, 'paths', 'b1'), 'b1.paths').flatMap((p, pi) =>
  list(field(p, 'lessons', 'b1.paths[' + pi + ']'), 'b1.lessons').map((l, li) => str(field(l, 'trophy', 'b1 P' + (pi + 1) + 'L' + (li + 1)), 'b1 trophy')),
);

// ---- evidence from the real spec + prerequisites ----
const specSource = readFileSync(join(KO, 'specification.json'), 'utf8');
const prereqSource = readFileSync(join(B2, 'native-prerequisites.json'), 'utf8');
const specParsed: unknown = JSON.parse(specSource);
const prereqParsed: unknown = JSON.parse(prereqSource);
const ledgerRows: KoreanB2Allocation[] = list(field(field(specParsed, 'trophyLedger', 'spec'), 'rows', 'spec.trophyLedger'), 'rows').map((r, i) => ({
  pathNumber: num(field(r, 'pathNumber', 'row' + i), 'row' + i),
  lessonNumber: num(field(r, 'lessonNumber', 'row' + i), 'row' + i),
  lemma: str(field(r, 'lemma', 'row' + i), 'row' + i),
  familyKey: str(field(r, 'familyKey', 'row' + i), 'row' + i),
  pos: str(field(r, 'pos', 'row' + i), 'row' + i),
}));
const evidence: KoreanB2Evidence = {
  specificationSource: specSource,
  specification: specParsed,
  pathSpecSha256: shaBytes(specSource),
  ledgerSha256: shaBytes(specSource),
  prerequisitesSource: prereqSource,
  prerequisites: prereqParsed,
  prerequisitesSha256: shaBytes(prereqSource),
  trophies: ledgerRows,
  earlierTrophies: [...frozenTrophies, ...reservedB1],
};
const loadDraft = (name: string): KoreanB2Draft => koreanB2DraftSchema.parse(JSON.parse(readFileSync(join(KO, name), 'utf8')) as unknown);
const p1 = loadDraft('p1.json');
const p2 = loadDraft('p2.json');
const validate = (doc: unknown): KoreanB2Draft => validateKoreanB2Draft(doc, evidence);
const withEvidence = (fn: (e: KoreanB2Evidence) => void): KoreanB2Evidence => { const e = structuredClone(evidence); fn(e); return e; };

// ---- authority ----
test('frozen corpus: exactly 200 Korean A1/A2 rows, 100 each, pinned JSON fingerprint', () => {
  assert.equal(frozenRows.length, 200);
  assert.equal(frozenRows.filter((l) => field(l, 'level', 'l') === 'A1').length, 100);
  assert.equal(shaBytes(JSON.stringify(frozenRows)), KOREAN_B2_AUTHORITY.frozenCorpusSha256);
});
test('B1 ledger: 10 ordered paths x 10 ordered lessons, 100 distinct trophies', () => {
  const paths = list(field(b1Parsed, 'paths', 'b1'), 'b1');
  assert.equal(paths.length, 10);
  paths.forEach((p, pi) => {
    assert.equal(num(field(p, 'pathNumber', 'b1'), 'b1'), pi + 1);
    const lessons = list(field(p, 'lessons', 'b1'), 'b1');
    assert.equal(lessons.length, 10);
    lessons.forEach((l, li) => assert.equal(num(field(l, 'number', 'b1'), 'b1'), li + 1));
  });
  assert.equal(reservedB1.length, 100);
  assert.equal(new Set(reservedB1).size, 100);
});
test('B1 ledger bytes: LF sha or reversible CRLF sha, both derivable', () => {
  const lf = b1Text.replace(/\r\n/g, '\n');
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.ok([B1_LF_SHA, B1_CRLF_SHA].includes(shaBytes(b1Raw)), 'raw B1 bytes match neither pinned sha');
  assert.equal(shaBytes(lf), B1_LF_SHA);
  assert.equal(shaBytes(crlf), B1_CRLF_SHA);
});
test('forbidden union: 200 frozen + 100 reserved = 300 distinct, equal to prerequisite list', () => {
  const union = new Set(evidence.earlierTrophies);
  assert.equal(union.size, 300);
  const entry = list(prereqParsed, 'prereq').find((e) => field(e, 'targetLanguage', 'e') === 'Korean');
  const listed = list(field(entry, 'forbiddenTrophies', 'ko'), 'ko').map((t) => str(t, 'ko'));
  assert.deepEqual([...union].sort(), [...listed].sort());
});
test('verifyKoreanB2Evidence accepts the real bound evidence', () => {
  const v = verifyKoreanB2Evidence(evidence);
  assert.equal(v.allocations.length, 20);
  assert.equal(v.forbidden.size, 300);
});
test('evidence: raw bytes drift -> FULL_SPEC_HASH', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { e.specificationSource = e.specificationSource + ' '; })), gateCode('FULL_SPEC_HASH'));
});
test('evidence: raw+parsed mismatch -> SPEC_PARSED_EQUALITY', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { e.specification = { ...(e.specification as Record<string, unknown>), level: 'B1' }; })), gateCode('SPEC_PARSED_EQUALITY'));
});
test('evidence: prerequisite bytes drift -> PREREQUISITES_HASH', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { e.prerequisitesSource = e.prerequisitesSource.replace('"가게"', '"가게", "가게들"'); e.prerequisites = JSON.parse(e.prerequisitesSource) as unknown; })), gateCode('PREREQUISITES_HASH'));
});
test('evidence: ledger row order swap -> LEDGER_MISMATCH', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { const t = [...e.trophies]; [t[0], t[1]] = [t[1], t[0]]; e.trophies = t; })), gateCode('LEDGER_MISMATCH'));
});
test('evidence: one earlier trophy omitted -> EARLIER_TROPHY_COUNT', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { e.earlierTrophies = e.earlierTrophies.slice(1); })), gateCode('EARLIER_TROPHY_COUNT'));
});
test('evidence: duplicated earlier trophy -> EARLIER_TROPHY_DISTINCT', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { const t = [...e.earlierTrophies]; t[1] = t[0]; e.earlierTrophies = t; })), gateCode('EARLIER_TROPHY_DISTINCT'));
});
test('evidence: substituted earlier trophy -> FORBIDDEN_LIST_MISMATCH', () => {
  assert.throws(() => verifyKoreanB2Evidence(withEvidence((e) => { const t = [...e.earlierTrophies]; t[0] = '장단점'; e.earlierTrophies = t; })), gateCode('FORBIDDEN_LIST_MISMATCH'));
});

// ---- pure predicates ----
test('formalEnding: composed hapsyo via jongseong index 17, not literal ㅂ니다', () => {
  for (const ok of ['둘입니다', '원입니다', '부탁드립니다', '겁니다', '필요합니다', '다릅니다', '됩니까', '결정했습니까', '습니다']) assert.equal(formalEnding(ok), true, ok);
  for (const no of ['니다', '니까', '가나다', '좋아요', '비싸요', '중요하니까요', '안녕하세요']) assert.equal(formalEnding(no), false, no);
});
test('whole: whole-eojeol matching after edge punctuation strip, never substring', () => {
  assert.equal(whole('즉, 시간이 없어요.', '즉'), true);
  assert.equal(whole('장단점이 있어요.', '단점'), false);
  assert.equal(whole('장단점이 있어요.', '장단점이'), true);
  assert.equal(whole('형태가 달라요.', '형태가'), true);
  assert.equal(whole('형태가 달라요.', '형'), false);
  assert.equal(whole('유형이 달라요.', '유형이'), true);
  assert.equal(whole('따라가는 게 맞아요.', '맞아요.'), true);
  assert.equal(whole('아무 말', ''), false);
});
test('sinoKorean: bounded readings used by inbound digit variants', () => {
  assert.equal(sinoKorean(30), '삼십');
  assert.equal(sinoKorean(15), '십오');
  assert.equal(sinoKorean(5), '오');
  assert.equal(sinoKorean(80000), '팔만');
  assert.equal(sinoKorean(160000), '십육만');
  assert.equal(sinoKorean(0), '');
});

// ---- full real paths: positive tests (content/gate arbitration must make them pass) ----
test('P1 weighing-options validates in full', () => { assert.equal(validate(p1).lessons.length, 10); });
test('P2 explaining-how-and-why validates in full', () => { assert.equal(validate(p2).lessons.length, 10); });
test('P2 L9 licensed numeral variant with 자전거 is accepted (no blanket 전 ban)', () => {
  const v = p2.lessons[8].acceptedPhraseVariants ?? [];
  assert.equal(v.length, 1);
  assert.ok(v[0].includes('15 분인데 자전거면 5 분이에요'));
  assert.doesNotThrow(() => validate(p2));
});

// ---- mutations on P1 L1-L8 (processed before the known L9 finding); baseline asserted first ----
function mutation(name: string, doc: KoreanB2Draft, fn: (d: KoreanB2Draft) => void, code: string): void {
  test(name, () => {
    assert.doesNotThrow(() => validate(doc), 'baseline must validate before an isolated mutation is meaningful');
    const c = structuredClone(doc);
    fn(c);
    assert.throws(() => validate(c), gateCode(code));
  });
}
const L = (d: KoreanB2Draft, n: number) => d.lessons[n - 1];
mutation('root: targetLanguage German -> SCHEMA', p1, (d) => { Object.assign(d, { targetLanguage: 'German' }); }, 'SCHEMA');
mutation('root: locale de-DE -> SCHEMA', p1, (d) => { Object.assign(d, { targetLanguageCode: 'de-DE' }); }, 'SCHEMA');
mutation('root: unbound specRef sha -> SCHEMA', p1, (d) => { Object.assign(d.specRef, { pathSpecSha256: '0'.repeat(64) }); }, 'SCHEMA');
mutation('root: slug of other path -> PATH_SLUG', p1, (d) => { d.slug = 'explaining-how-and-why'; }, 'PATH_SLUG');
mutation('lesson: extra key -> SCHEMA', p1, (d) => { Object.assign(L(d, 1), { genderAlternatives: {} }); }, 'SCHEMA');
mutation('lesson: speakerGender female -> SCHEMA', p1, (d) => { Object.assign(L(d, 1), { speakerGender: 'female' }); }, 'SCHEMA');
mutation('review: fabricated registerNative flag -> SCHEMA', p1, (d) => { Object.assign(L(d, 1).review.flags, { registerNative: true }); }, 'SCHEMA');
mutation('turn: ASCII digit in targetText -> TURN_HYGIENE', p1, (d) => { L(d, 1).dialogue[1].targetText = L(d, 1).dialogue[1].targetText.replace('삼십 분', '30 분'); }, 'TURN_HYGIENE');
mutation('turn: them above 15 eojeol -> EOJEOL_TURN_BOUNDS', p1, (d) => { L(d, 1).dialogue[0].targetText = L(d, 1).dialogue[0].targetText + ' 그리고 주차장도 없고 엘리베이터도 없어요.'; }, 'EOJEOL_TURN_BOUNDS');
mutation('register: hapsyo on haeyo-declared them turn (L2) -> INTERLOCUTOR_FINAL_REGISTER', p1, (d) => { L(d, 2).dialogue[0].targetText = '출퇴근 차로 하세요, 지하철로 하세요? 저는 요즘 차가 편합니다.'; }, 'INTERLOCUTOR_FINAL_REGISTER');
mutation('register: composed hapsyo on learner turn -> LEARNER_FINAL_REGISTER', p1, (d) => { L(d, 1).dialogue[5].targetText = '그러면 역 근처 집으로 할게요. 돈보다 시간이 저한테는 더 중요합니다.'; }, 'LEARNER_FINAL_REGISTER');
mutation('register: banmal final -> BANMAL_FINAL', p1, (d) => { L(d, 1).dialogue[5].targetText = '그러면 역 근처 집으로 할게요. 돈보다 시간이 저한테는 더 중요하지.'; }, 'BANMAL_FINAL');
mutation('register: banmal 해 final is caught by the general learner check -> LEARNER_FINAL_REGISTER', p1, (d) => { L(d, 1).dialogue[5].targetText = '그러면 역 근처 집으로 할게요. 돈보다 시간이 저한테는 더 중요해.'; }, 'LEARNER_FINAL_REGISTER');
mutation('gender: 형 as whole-eojeol address -> GENDERED_ADDRESS', p1, (d) => { L(d, 1).dialogue[0].targetText = '형, 두 집 중에 고민되시죠? 역 근처 집은 월세가 비싸고, 외곽 집은 출퇴근이 길어요.'; }, 'GENDERED_ADDRESS');
test('gender: 유형이 (contains 형) validates in a fully coupled path', () => {
  assert.doesNotThrow(() => validate(p1));
  const c = structuredClone(p1);
  const lesson = c.lessons[0];
  const opener = '두 집 유형이 다르죠? 역 근처 집은 월세가 비싸고, 외곽 집은 출퇴근이 길어요.';
  lesson.dialogue[0].targetText = opener;
  lesson.sceneCaption = { de: lesson.situation.de + ' Die andere Person sagt: „' + opener + '“', en: lesson.situation.en + ' The other person says: “' + opener + '”' };
  assert.doesNotThrow(() => validate(c));
});
mutation('moves: you1 outside path whitelist -> INDEPENDENT_MOVE_SETS', p1, (d) => { d.lessons[0].dialogue[1] = { ...L(d, 1).dialogue[1], speaker: 'you', move: 'request', register: 'haeyo', base: L(d, 1).dialogue[1].base, targetText: L(d, 1).dialogue[1].targetText }; }, 'INDEPENDENT_MOVE_SETS');
mutation('staging: 정리하면 in learner turn before P1 L6 -> BOUNDED_CARRIER_STAGE', p1, (d) => { L(d, 1).dialogue[3].targetText = '정리하면, 교통비까지 생각하면 차이가 작기는 하네요. 그래도 시간은 돈으로 못 사요.'; }, 'BOUNDED_CARRIER_STAGE');
mutation('build: broken frame prefix -> BUILD_RECONSTRUCTION', p1, (d) => { L(d, 1).build.framePrefix = '틀린 '; }, 'BUILD_RECONSTRUCTION');
mutation('build: particle-only chunk -> WHOLE_CONTENT_CHUNK', p1, (d) => { L(d, 1).build.chunks[0] = '은'; L(d, 1).build.framePrefix = L(d, 1).build.framePrefix + '외곽 집'; }, 'WHOLE_CONTENT_CHUNK');
mutation('build: distractor equal to a chunk -> DISTINCT_CHIPS', p1, (d) => { L(d, 1).build.distractors[0] = L(d, 1).build.chunks[0]; }, 'DISTINCT_CHIPS');
mutation('build: distractor present whole in you1 -> DISTRACTOR_PRESENT', p1, (d) => { L(d, 1).build.distractors[1] = '매일 한'; }, 'DISTRACTOR_PRESENT');
mutation('cloze: text segment altered -> BLANK_RECONSTRUCTION', p1, (d) => { const s = L(d, 1).cloze.segments[0]; if ('text' in s) s.text = '거짓 '; }, 'BLANK_RECONSTRUCTION');
mutation('cloze: three choices -> CHOICE_SET', p1, (d) => { L(d, 1).cloze.blanks[1].choices = ['작기는 하네요', '크기는 하네요', '작지는 않네요']; }, 'CHOICE_SET');
mutation('cloze: duplicate acceptedAnswers -> ACCEPTED_IDENTITY', p1, (d) => { L(d, 1).cloze.blanks[0].acceptedAnswers = ['생각하면', '생각하면']; }, 'ACCEPTED_IDENTITY');
mutation('cloze: form blank without de+en cue -> FORM_CUE', p1, (d) => { delete L(d, 4).cloze.blanks[1].cue; }, 'FORM_CUE');
mutation('cloze: cue missing de -> SCHEMA', p1, (d) => { const cue = L(d, 4).cloze.blanks[1].cue; if (cue) Object.assign(L(d, 4).cloze.blanks[1], { cue: { en: cue.en } }); }, 'SCHEMA');
mutation('recall: three fallback choices -> FOUR_RECALL_CHOICES', p1, (d) => { L(d, 1).recall.fallbackChoices = ['장단점이', '영수증이', '생일이']; }, 'FOUR_RECALL_CHOICES');
mutation('recall: repeated fallback choice -> FOUR_RECALL_CHOICES', p1, (d) => { L(d, 1).recall.fallbackChoices[1] = '장단점이'; }, 'FOUR_RECALL_CHOICES');
mutation('speak: substring token 곽 -> WHOLE_SPEECH_TARGET', p1, (d) => { L(d, 1).speak[0].requiredTokens[0] = '곽'; }, 'WHOLE_SPEECH_TARGET');
mutation('speak: stop token 네 -> WHOLE_SPEECH_TARGET', p1, (d) => { L(d, 1).speak[0].requiredTokens[0] = '네'; }, 'WHOLE_SPEECH_TARGET');
mutation('terms: substring 단점 -> WHOLE_TERM_ATTESTATION', p1, (d) => { L(d, 1).terms[0].targetText = '단점'; }, 'WHOLE_TERM_ATTESTATION');
mutation('pattern: absent highlight -> PATTERN_HIGHLIGHTS', p1, (d) => { L(d, 1).pattern.examples[0].highlights = ['거짓말']; }, 'PATTERN_HIGHLIGHTS');
mutation('trophy: lemma from frozen A1 (영어) -> EXACT_ALLOCATION', p1, (d) => { L(d, 1).trophy.lemma = '영어'; }, 'EXACT_ALLOCATION');
mutation('trophy: bare lemma instead of attested eojeol 장단점이 -> EXACT_ALLOCATION', p1, (d) => { L(d, 1).trophy.surface = '장단점'; }, 'EXACT_ALLOCATION');
mutation('trophy: fake remainder 는 for 장단점이 -> LITERAL_TROPHY_REMAINDER', p1, (d) => { L(d, 1).trophy.remainder = ['는']; }, 'LITERAL_TROPHY_REMAINDER');
mutation('trophy: attested-mode spoof on noun -> LITERAL_TROPHY_REMAINDER', p1, (d) => { L(d, 1).trophy.surfaceMode = 'attested'; delete L(d, 1).trophy.remainder; }, 'LITERAL_TROPHY_REMAINDER');
mutation('trophy: verb 비해 without surfaceMode -> ATTESTED_SURFACE_MODE', p1, (d) => { delete L(d, 3).trophy.surfaceMode; }, 'ATTESTED_SURFACE_MODE');
mutation('trophy: whyThisWord missing en -> SCHEMA', p1, (d) => { Object.assign(L(d, 1).trophy, { whyThisWord: { de: L(d, 1).trophy.whyThisWord.de } }); }, 'SCHEMA');
mutation('carriers: no explicit 중요하니까요 productive tag -> EXPLICIT_FIRST_NIKKA_TAG', p1, (d) => { delete L(d, 1).carrierTags; }, 'EXPLICIT_FIRST_NIKKA_TAG');
mutation('carriers: recognition tag on learner surface -> RECOGNITION_THEM_ONLY', p1, (d) => { L(d, 1).carrierTags = [{ surface: '중요하니까요', status: 'recognition' }, { surface: '중요하니까요', status: 'productive' }]; }, 'RECOGNITION_THEM_ONLY');
mutation('variants: Latin letter in variant -> VARIANT_HYGIENE', p1, (d) => { L(d, 1).acceptedPhraseVariants = ['두 집 다 장단점이 있어요. 역 근처는 월세가 비싸지만 출퇴근이 A 분이고, 외곽 집은 싸지만 매일 1 시간 넘게 걸려요.']; }, 'VARIANT_HYGIENE');
mutation('variants: unlicensed eojeol change -> EXPLICIT_LICENSED_VARIANT_ONLY', p1, (d) => { L(d, 1).acceptedPhraseVariants = ['두 집 다 장단점이 있어요. 역 근처는 월세가 비싸지만 출퇴근이 30 분이고, 외곽 집은 싸지만 매일 1 시간 넘게 걸립니다.']; }, 'EXPLICIT_LICENSED_VARIANT_ONLY');
mutation('variants: row equal to canonical -> DISTINCT_VARIANT_ROWS', p1, (d) => { L(d, 1).acceptedPhraseVariants = [L(d, 1).dialogue[1].targetText]; }, 'DISTINCT_VARIANT_ROWS');
mutation('variants: 저는 -> 전 pronoun row -> VARIANT_HYGIENE', p1, (d) => { L(d, 2).acceptedPhraseVariants = ['차는 편한 반면에 주차비와 기름값이 많이 들어요. 지하철은 시간이 정확하고 그동안 책도 읽을 수 있어서 전 지하철이 더 나아요.']; }, 'VARIANT_HYGIENE');
mutation('cloze: four-eojeol choice -> CHOICE_UNIT', p1, (d) => { L(d, 1).cloze.blanks[1].choices = ['작기는 하네요', '이 집도 아주 좋아요', '작지는 않네요', '작을 리가 없네요']; }, 'CHOICE_UNIT');
mutation('cloze: bare bound noun choice 것 -> CHOICE_UNIT', p1, (d) => { L(d, 1).cloze.blanks[1].choices = ['작기는 하네요', '것', '작지는 않네요', '작을 리가 없네요']; }, 'CHOICE_UNIT');
mutation('pattern: 십시오 in example -> SIPSIO_BANNED', p1, (d) => { L(d, 1).pattern.examples[1] = { targetText: '집을 보고 결정하십시오.', base: { de: 'Sehen Sie die Wohnung an und entscheiden Sie.', en: 'View the flat and decide.' }, highlights: ['결정하십시오'] }; }, 'SIPSIO_BANNED');
mutation('trophy: 십시오 in trophy example -> SIPSIO_BANNED', p1, (d) => { L(d, 1).trophy.example.targetText = '두 집 다 장단점이 있으니 비교하십시오.'; }, 'SIPSIO_BANNED');
mutation('carriers: untabled productive 덜 피곤해요 at P1 L5 -> CARRIER_STAGE_TABLE', p1, (d) => { L(d, 5).carrierTags = [{ surface: '덜 피곤해요', status: 'productive' }]; }, 'CARRIER_STAGE_TABLE');
test('carriers: B1 productive 그래도 (P1 L1) and recycled 주시니까 (P1 L7) productive tags pass', () => {
  assert.doesNotThrow(() => validate(p1));
  const c = structuredClone(p1);
  c.lessons[0].carrierTags = [...(c.lessons[0].carrierTags ?? []), { surface: '그래도', status: 'productive' }];
  c.lessons[6].carrierTags = [{ surface: '주시니까', status: 'productive' }];
  assert.doesNotThrow(() => validate(c));
});
test('variantTokenEquivalent: identical edge punctuation, licensed readings only', () => {
  assert.equal(variantTokenEquivalent('삼십,', '30,'), true);
  assert.equal(variantTokenEquivalent('분이에요.', '분이에요.'), true);
  assert.equal(variantTokenEquivalent('그것', '그거'), true);
  assert.equal(variantTokenEquivalent('삼십,', '30.'), false);
  assert.equal(variantTokenEquivalent('삼십', '31'), false);
  assert.equal(variantTokenEquivalent('저는', '전'), false);
});
test('variantTokenEquivalent: empty sino conversion (0, >99999999) never proves equality', () => {
  assert.equal(variantTokenEquivalent('월세가', '0월세가'), false);
  assert.equal(variantTokenEquivalent('월세가', '100000000월세가'), false);
  assert.equal(variantTokenEquivalent('월세가', '30월세가'), false);
  assert.equal(variantTokenEquivalent('월세가', '월세가'), true);
  assert.equal(variantTokenEquivalent('삼십', '30'), true);
  assert.equal(variantTokenEquivalent('한', '1'), true);
  assert.equal(variantTokenEquivalent('십육만', '160000'), true);
});
mutation('variants: 0-prefixed eojeol 0월세가 -> EXPLICIT_LICENSED_VARIANT_ONLY', p1, (d) => { L(d, 1).acceptedPhraseVariants = ['두 집 다 장단점이 있어요. 역 근처는 0월세가 비싸지만 출퇴근이 삼십 분이고, 외곽 집은 싸지만 매일 한 시간 넘게 걸려요.']; }, 'EXPLICIT_LICENSED_VARIANT_ONLY');
mutation('variants: out-of-range 100000000월세가 -> EXPLICIT_LICENSED_VARIANT_ONLY', p1, (d) => { L(d, 1).acceptedPhraseVariants = ['두 집 다 장단점이 있어요. 역 근처는 100000000월세가 비싸지만 출퇴근이 삼십 분이고, 외곽 집은 싸지만 매일 한 시간 넘게 걸려요.']; }, 'EXPLICIT_LICENSED_VARIANT_ONLY');
mutation('variants: mismatched numeral 30월세가 still -> EXPLICIT_LICENSED_VARIANT_ONLY', p1, (d) => { L(d, 1).acceptedPhraseVariants = ['두 집 다 장단점이 있어요. 역 근처는 30월세가 비싸지만 출퇴근이 삼십 분이고, 외곽 집은 싸지만 매일 한 시간 넘게 걸려요.']; }, 'EXPLICIT_LICENSED_VARIANT_ONLY');
test('variants: legitimate P1 L1 digit row (30 분 / 1 시간) still validates after the empty-conversion fix', () => {
  const v = p1.lessons[0].acceptedPhraseVariants ?? [];
  assert.equal(v.length, 1);
  assert.ok(v[0].includes('출퇴근이 30 분이고') && v[0].includes('매일 1 시간'));
  assert.doesNotThrow(() => validate(p1));
  const c = structuredClone(p1);
  c.lessons[0].acceptedPhraseVariants = [...v, '두 집 다 장단점이 있어요. 역 근처는 월세가 비싸지만 출퇴근이 30 분이고, 외곽 집은 싸지만 매일 한 시간 넘게 걸려요.'];
  assert.doesNotThrow(() => validate(c));
});
test('advisory: 제가 with -세요 in the same learner sentence emits SELF_HONORIFIC_ADVISORY without blocking', () => {
  const clean: KoreanB2Warning[] = [];
  assert.doesNotThrow(() => validateKoreanB2Draft(p1, evidence, clean));
  assert.equal(clean.length, 0);
  const c = structuredClone(p1);
  const lesson = c.lessons[0];
  lesson.dialogue[5].targetText = '그러면 제가 역 근처 집을 보세요. 돈보다 시간이 저한테는 더 중요하니까요.';
  const seg = lesson.synthesis.segments[0];
  if (seg.kind === 'text') seg.text = '그러면 제가 역 근처 집을 보세요. 돈보다 시간이 저한테는 ';
  const warnings: KoreanB2Warning[] = [];
  assert.doesNotThrow(() => validateKoreanB2Draft(c, evidence, warnings));
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, 'SELF_HONORIFIC_ADVISORY');
});
