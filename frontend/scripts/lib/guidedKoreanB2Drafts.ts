import { z } from 'zod';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

// Offline native Korean (ko-KR) B2 authoring gate. Pure data checks bound to the V2 specification
// and the native prerequisite ledger. No runtime registry, frozen corpus, provider or publication imports;
// the exporter/test reconstructs the 200 frozen and 100 reserved B1 trophies independently and passes them in.
// Mechanical only: Hangul string shape, eojeol boundaries, reconstruction, allocation binding.
// Semantics (synonyms, chip permutations, pragmatics, register naturalness) stay with native review.

export const KOREAN_B2_AUTHORITY = Object.freeze({
  targetLanguage: 'Korean',
  code: 'ko-KR',
  level: 'B2',
  authoredBaseLanguage: 'German',
  baseLocales: ['de', 'en'],
  specificationFile: 'B2_KOREAN_P1_P2_AUTHORING_SPEC_V2.json',
  specificationSha256: '771a5732eb71f43a52b83499cf69cc902bdc37f074045170e47a9209467531db',
  prerequisitesFile: 'B2_NATIVE_PREREQUISITES.json',
  prerequisitesSha256: '6685bba9897ddd1c1f72308204dd6c056108f32aea332e2ee9a1402cf4e74f2e',
  b1SpecificationFile: 'B1_NATIVE_KOREAN_SPEC.json',
  b1AllocationSha256: '5e2ebf52d4fee320839b49c8426d29c81db7af5bbb1d5d3b59f4d1aa962c8bf3',
  frozenCorpusSha256: '9b41c66f4133f86831d05a08e7a92468af798fe25f80dc09371ed58f23724848',
  frozenLessonCount: 200,
  reservedB1Count: 100,
  earlierTrophyCount: 300,
  ledgerRowCount: 20,
  lessonsPerPath: 10,
  pathSlugs: ['weighing-options', 'explaining-how-and-why'],
} as const);

export interface KoreanB2Warning {
  code: 'SELF_HONORIFIC_ADVISORY';
  detail: string;
}

export interface KoreanB2Allocation {
  pathNumber: number;
  lessonNumber: number;
  lemma: string;
  familyKey: string;
  pos: string;
}

export interface KoreanB2Evidence {
  specificationSource: string;
  specification: unknown;
  pathSpecSha256: string;
  ledgerSha256: string;
  prerequisitesSource: string;
  prerequisites: unknown;
  prerequisitesSha256: string;
  trophies: readonly KoreanB2Allocation[];
  earlierTrophies: readonly string[];
}

export class KoreanB2GateError extends Error {
  readonly code: string;
  constructor(code: string, detail?: string) {
    super(detail ? code + ': ' + detail : code);
    this.name = 'KoreanB2GateError';
    this.code = code;
  }
}

function fail(code: string, detail?: string): never {
  throw new KoreanB2GateError(code, detail);
}

function demand(condition: unknown, code: string, detail?: string): asserts condition {
  if (!condition) fail(code, detail);
}

const nfc = (s: string): string => s.normalize('NFC');
const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const EDGE = /^[.?,]+|[.?,]+$/g;
const strip = (t: string): string => t.replace(EDGE, '');
const token = (s: string): string[] => s.split(' ').map(strip);
const eojeolCount = (s: string): number => s.split(' ').length;
const norm = (s: string): string => nfc(s).trim().split(/\s+/).map(strip).join(' ').toLowerCase();
const HANGUL_LINE = /^[가-힣 .?,]+$/;
const HANGUL_WORD = /^[가-힣]+$/;
const VARIANT_LINE = /^[가-힣0-9 .?,]+$/;
const BOUNDARY_CHARS = ' .?,';

export function whole(text: string, phrase: string): boolean {
  const a = token(text);
  const b = token(phrase);
  if (b.length === 0 || b.some((t) => t.length === 0)) return false;
  for (let i = 0; i + b.length <= a.length; i += 1) {
    let ok = true;
    for (let j = 0; j < b.length; j += 1) if (a[i + j] !== b[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

function boundary(s: string, i: number): boolean {
  if (i === 0 || i === s.length) return true;
  return BOUNDARY_CHARS.includes(s[i - 1]) || BOUNDARY_CHARS.includes(s[i]);
}

function jongseong(ch: string): number {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : -1;
}

// Formal-ending predicate on NFC precomposed syllables (mechanicalValidationRules[5]).
export function formalEnding(e: string): boolean {
  if (e.endsWith('습니다') || e.endsWith('습니까')) return true;
  const tail = e.slice(-2);
  return e.length >= 3 && (tail === '니다' || tail === '니까') && jongseong(e[e.length - 3]) === 17;
}

function sentenceFinals(text: string): string[] {
  return text.split(/[.?]/).map((s) => s.trim()).filter((s) => s.length > 0).map((s) => { const t = token(s); return t[t.length - 1]; });
}

const FIXED = new Set(['안녕하세요', '죄송합니다', '감사합니다', '알겠습니다']);
const BANMAL = new Set(['어', '아', '야', '지', '니', '자']);
const EMPTY = new Set('이 가 은 는 을 를 에 에서 으로 와 과 도 만 것 수 데 거 건 네 저 그 니까 지만 더라도 으로써'.split(' '));
const STOP = new Set(['네', '저', '그', '좀', '그런데', '그래서']);
const PERMITTED_REMAINDERS = new Set('이 가 은 는 을 를 에 에서 으로 으로는 이에요 이고 됐어요 적 적으로'.split(' '));
const ATTESTED_POS = new Set(['verb', 'adjective']);
const YOU2_MOVES = new Set(['concede', 'rebut', 'clarify', 'explain', 'compare', 'counteroffer']);
const YOU3_MOVES = new Set(['conclude', 'propose', 'summarize', 'counteroffer', 'request']);
const GENDER_BANNED = new Set<string>();
for (const root of ['오빠', '언니', '누나', '형', '아저씨', '아줌마']) for (const suffix of ['', '아', '야', '는', '은', '이', '가', '도', '한테', '들']) GENDER_BANNED.add(root + suffix);
const TURN_BOUNDS: readonly (readonly [number, number])[] = [[5, 15], [11, 20], [5, 15], [9, 18], [5, 15], [8, 17]];
// Bounded literal stage tripwires on learner turns (marker, first path, first lesson); not a grammar parser.
const STAGE_TRIPWIRES: readonly (readonly [string, number, number])[] = [
  ['그렇다고 해서', 1, 9], ['정리하면', 1, 6], ['더라도', 1, 7], ['제 생각에는', 1, 9], ['줄임으로써', 2, 7], ['고름으로써', 2, 7], ['결과적으로', 2, 7],
  ['즉,', 2, 9], ['첫째는', 2, 5], ['둘째는', 2, 5], ['셋째는', 2, 5], ['첫째,', 2, 5], ['둘째,', 2, 5], ['셋째,', 2, 5],
];

// Bounded B1 productive literal surfaces taken from the B1_NATIVE_KOREAN_SPEC staging tables (connectors and frames); not morphology.
const B1_PRODUCTIVE_LITERALS: readonly string[] = ['그런데', '그래서', '그래도', '역시', '그러면', '대신', '그리고', '그다음에', '그때는', '지금은', '것 같아요', '거 같아요', '수 있어요', '-기는 하지만', '-기는 한데', '-아/어도', '-는데도', '-(으)ㄹ 것 같아요'];

// Bounded numeral readings for the inbound digit tolerance of acceptedPhraseVariants only.
const SINO = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const NATIVE: Readonly<Record<number, string>> = { 1: '한', 2: '두', 3: '세', 4: '네', 5: '다섯', 6: '여섯', 7: '일곱', 8: '여덟', 9: '아홉', 10: '열', 11: '열한', 12: '열두', 13: '열세', 14: '열네', 15: '열다섯', 16: '열여섯', 17: '열일곱', 18: '열여덟', 19: '열아홉', 20: '스무' };
export function sinoKorean(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n > 99999999) return '';
  let s = '';
  const man = Math.floor(n / 10000);
  if (man > 0) s += (man === 1 ? '' : sinoKorean(man)) + '만';
  let r = n % 10000;
  for (const [v, c] of [[1000, '천'], [100, '백'], [10, '십']] as const) {
    const d = Math.floor(r / v);
    if (d > 0) s += (d === 1 ? '' : SINO[d]) + c;
    r %= v;
  }
  return s + SINO[r];
}
export function variantTokenEquivalent(canonical: string, variant: string): boolean {
  if (canonical === variant) return true;
  const c = strip(canonical);
  const v = strip(variant);
  const cl = /^[.?,]*/.exec(canonical)?.[0] ?? '';
  const vl = /^[.?,]*/.exec(variant)?.[0] ?? '';
  if (cl !== vl || canonical.slice(cl.length + c.length) !== variant.slice(vl.length + v.length)) return false;
  if ((c === '것' && v === '거') || (c === '그것' && v === '그거')) return true;
  const m = /^(\d+)([가-힣]*)$/.exec(v);
  if (!m) return false;
  const n = Number(m[1]);
  const rest = m[2];
  const sino = sinoKorean(n);
  const native = NATIVE[n];
  // An empty sino reading means unsupported (n = 0 or > 99,999,999); never prove equality from it.
  return (sino !== '' && c === sino + rest) || (native !== undefined && c === native + rest);
}

const baseSchema = z.object({ de: z.string(), en: z.string() }).strict();
const registerSchema = z.enum(['haeyo', 'hapsyo']);
const blankSchema = z.object({
  answer: z.string(),
  acceptedAnswers: z.array(z.string()),
  kind: z.enum(['connector', 'frame', 'form', 'lexical']),
  cue: baseSchema.optional(),
  choices: z.array(z.string()).optional(),
}).strict();
const segmentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }).strict(),
  z.object({ kind: z.literal('blank'), index: z.number().int().nonnegative() }).strict(),
]);
const blankSetSchema = z.object({ segments: z.array(segmentSchema), blanks: z.array(blankSchema), moveBlankIndex: z.number().int().nonnegative() }).strict();
const turnSchema = z.discriminatedUnion('speaker', [
  z.object({ speaker: z.literal('them'), targetText: z.string(), base: baseSchema, interlocutorId: z.string() }).strict(),
  z.object({ speaker: z.literal('you'), targetText: z.string(), base: baseSchema, move: z.string(), register: z.literal('haeyo') }).strict(),
]);
const exampleSchema = z.object({ targetText: z.string(), base: baseSchema, highlights: z.array(z.string()) }).strict();
const termSchema = z.object({
  targetText: z.string(),
  kind: z.enum(['connector', 'frame', 'noun', 'verb', 'adjective', 'adverb', 'phrase']),
  base: baseSchema,
  lemma: z.string().optional(),
  acceptedAnswers: z.array(z.string()).optional(),
}).strict();
const speakSchema = z.object({ turnIndex: z.number().int(), requiredTokens: z.array(z.string()), profile: z.enum(['b2-long', 'b2-short']) }).strict();
const trophySchema = z.object({
  lemma: z.string(), familyKey: z.string(), surface: z.string(), turnIndex: z.number().int(), pos: z.enum(['noun', 'verb', 'adjective', 'adverb', 'connector']),
  example: z.object({ targetText: z.string(), base: baseSchema }).strict(), base: baseSchema, whyThisWord: baseSchema,
  remainder: z.array(z.string()).optional(), surfaceMode: z.literal('attested').optional(),
}).strict();
const flagsSchema = z.object({
  argumentCoherent: z.literal(false), challengeGenuine: z.literal(false), steerGenuine: z.literal(false), b2NotInflatedB1: z.literal(false),
  registerNative: z.literal(false), genderClaimVerified: z.literal(false), distractorsNotAlsoCorrect: z.literal(false), patternTruthful: z.literal(false),
  baseTextsAccurate: z.literal(false), ttsReadable: z.literal(false), carriersStaged: z.literal(false), noFiller: z.literal(false),
}).strict();
const emptyList = z.array(z.unknown()).max(0);
const reviewSchema = z.object({
  flags: flagsSchema, verdict: z.literal('pending'), failingCriteria: emptyList, reviewers: emptyList, nativeStatus: z.literal('unreviewed'), acknowledgedWarnings: emptyList,
}).strict();
const carrierTagSchema = z.object({ surface: z.string(), status: z.enum(['productive', 'recognition']) }).strict();
const lessonSchema = z.object({
  lessonNumber: z.number().int(),
  slug: z.string(),
  title: baseSchema,
  situation: baseSchema,
  episodeShape: z.enum(['challenge', 'precision']),
  registerPlan: z.object({ mode: z.literal('constant'), registers: z.array(z.literal('haeyo')).length(3) }).strict(),
  interlocutors: z.array(z.object({ id: z.string(), role: baseSchema, voiceRole: z.literal('A'), register: registerSchema }).strict()),
  speakerGender: z.literal('neutral'),
  sceneCaption: baseSchema,
  dialogue: z.array(turnSchema),
  build: z.object({ framePrefix: z.string(), chunks: z.array(z.string()), distractors: z.array(z.string()), frameSuffix: z.string() }).strict(),
  cloze: blankSetSchema,
  synthesis: blankSetSchema,
  recall: z.object({ before: z.string(), answer: z.string(), acceptedAnswers: z.array(z.string()), after: z.string(), fallbackChoices: z.array(z.string()) }).strict(),
  pattern: z.object({ moveType: z.string(), label: baseSchema, rule: baseSchema, examples: z.array(exampleSchema) }).strict(),
  terms: z.array(termSchema),
  speak: z.array(speakSchema),
  trophy: trophySchema,
  review: reviewSchema,
  carrierTags: z.array(carrierTagSchema).optional(),
  acceptedPhraseVariants: z.array(z.string()).optional(),
}).strict();

export const koreanB2DraftSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.literal('draft'),
  targetLanguage: z.literal(KOREAN_B2_AUTHORITY.targetLanguage),
  targetLanguageCode: z.literal(KOREAN_B2_AUTHORITY.code),
  authoredBaseLanguage: z.literal(KOREAN_B2_AUTHORITY.authoredBaseLanguage),
  level: z.literal(KOREAN_B2_AUTHORITY.level),
  pathNumber: z.union([z.literal(1), z.literal(2)]),
  slug: z.enum(KOREAN_B2_AUTHORITY.pathSlugs),
  pathTitle: baseSchema,
  pathFunction: baseSchema,
  specRef: z.object({
    pathSpec: z.literal(KOREAN_B2_AUTHORITY.specificationFile),
    pathSpecSha256: z.literal(KOREAN_B2_AUTHORITY.specificationSha256),
    ledger: z.literal(KOREAN_B2_AUTHORITY.specificationFile + '#/trophyLedger/rows'),
    ledgerSha256: z.literal(KOREAN_B2_AUTHORITY.specificationSha256),
  }).strict(),
  authoring: z.object({ source: z.string(), runId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict(),
  lessons: z.array(lessonSchema),
}).strict();

export type KoreanB2Draft = z.infer<typeof koreanB2DraftSchema>;
type Lesson = KoreanB2Draft['lessons'][number];
type BlankSet = Lesson['cloze'];

const allocationSchema = z.object({ pathNumber: z.number().int(), lessonNumber: z.number().int(), lemma: z.string(), familyKey: z.string(), pos: z.string() }).strict();
const specLessonSchema = z.object({
  number: z.number().int(),
  slug: z.string(),
  register: z.literal('haeyo'),
  openingMove: z.object({ them: z.string(), you1: z.string(), move: z.string() }).passthrough(),
  challenge: z.object({ them: z.string() }).passthrough(),
  answerMove: z.object({ you2: z.string(), move: z.string() }).passthrough(),
  steer: z.object({ them: z.string() }).passthrough(),
  closingMove: z.object({ you3: z.string(), move: z.string() }).passthrough(),
  trophyLemma: z.string(),
  trophySurface: z.string(),
  trophyFamilyKey: z.string(),
  pos: z.string(),
  requiredCarrier: z.string(),
  recycles: z.string(),
}).passthrough();
const stageSchema = z.object({ lessons: z.string().regex(/^\d+-\d+$/), productive: z.string(), recognitionOnly: z.string() }).passthrough();
const specSchema = z.object({
  targetLanguage: z.literal('Korean'),
  code: z.literal('ko-KR'),
  level: z.literal('B2'),
  authoredBaseLanguage: z.literal('German'),
  carriersStaged: z.object({ P1: z.array(stageSchema), P2: z.array(stageSchema) }).strict(),
  paths: z.array(z.object({ pathNumber: z.number().int(), moveWhitelist: z.array(z.string()), lessons: z.array(specLessonSchema).length(10) }).passthrough()).length(2),
  trophyLedger: z.object({ rows: z.array(allocationSchema).length(20) }).passthrough(),
}).passthrough();
type Specification = z.infer<typeof specSchema>;
const prerequisiteEntrySchema = z.object({
  targetLanguage: z.string(), sourceLocale: z.string(), frozenLessonCount: z.number().int(), activeCorpusSha256: z.string(),
  b1Specification: z.string(), b1AllocationSha256: z.string(), forbiddenTrophies: z.array(z.string()),
}).passthrough();

export interface VerifiedKoreanB2Evidence {
  specification: Specification;
  allocations: readonly KoreanB2Allocation[];
  forbidden: ReadonlySet<string>;
}

function parseJsonSource(source: unknown, code: string, expected: string): unknown {
  demand(typeof source === 'string' && sha256(source) === expected, code);
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    return fail(code, error instanceof Error ? error.message : 'unparseable');
  }
}

export function verifyKoreanB2Evidence(evidence: KoreanB2Evidence): VerifiedKoreanB2Evidence {
  const A = KOREAN_B2_AUTHORITY;
  demand(evidence !== null && typeof evidence === 'object', 'EVIDENCE_SHAPE');
  const specParsed = parseJsonSource(evidence.specificationSource, 'FULL_SPEC_HASH', A.specificationSha256);
  demand(isDeepStrictEqual(specParsed, evidence.specification), 'SPEC_PARSED_EQUALITY');
  demand(evidence.pathSpecSha256 === A.specificationSha256 && evidence.ledgerSha256 === A.specificationSha256, 'SPEC_BINDING');
  const specResult = specSchema.safeParse(specParsed);
  if (!specResult.success) fail('SPEC_SHAPE', specResult.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; '));
  const spec = specResult.data;
  demand(spec.paths.every((p, i) => p.pathNumber === i + 1 && p.lessons.every((l, n) => l.number === n + 1)), 'SPEC_PATH_ORDER');
  demand(new Set(spec.paths.flatMap((p) => p.lessons.map((l) => l.slug))).size === 20, 'SPEC_SLUGS');

  const prereqParsed = parseJsonSource(evidence.prerequisitesSource, 'PREREQUISITES_HASH', A.prerequisitesSha256);
  demand(isDeepStrictEqual(prereqParsed, evidence.prerequisites), 'PREREQUISITES_PARSED_EQUALITY');
  demand(evidence.prerequisitesSha256 === A.prerequisitesSha256, 'PREREQUISITES_BINDING');
  demand(Array.isArray(prereqParsed), 'PREREQUISITES_SHAPE');
  const entries = prereqParsed.map((row) => {
    const r = prerequisiteEntrySchema.safeParse(row);
    if (!r.success) fail('PREREQUISITES_SHAPE');
    return r.data;
  });
  const matching = entries.filter((e) => e.targetLanguage === A.targetLanguage);
  demand(matching.length === 1, 'PREREQUISITES_KOREAN_ENTRY');
  const entry = matching[0];
  demand(entry.sourceLocale === A.code && entry.frozenLessonCount === A.frozenLessonCount, 'PREREQUISITES_IDENTITY');
  demand(entry.activeCorpusSha256 === A.frozenCorpusSha256, 'FROZEN_CORPUS_SHA');
  demand(entry.b1Specification === A.b1SpecificationFile && entry.b1AllocationSha256 === A.b1AllocationSha256, 'B1_ALLOCATION_SHA');

  const earlier = evidence.earlierTrophies;
  demand(Array.isArray(earlier) && earlier.length === A.earlierTrophyCount && earlier.every((s) => typeof s === 'string'), 'EARLIER_TROPHY_COUNT');
  const forbidden = new Set(earlier.map(norm));
  demand(forbidden.size === A.earlierTrophyCount, 'EARLIER_TROPHY_DISTINCT');
  const listed = new Set(entry.forbiddenTrophies.map(norm));
  demand(entry.forbiddenTrophies.length === A.earlierTrophyCount && listed.size === A.earlierTrophyCount && [...forbidden].every((t) => listed.has(t)), 'FORBIDDEN_LIST_MISMATCH');

  const rows = spec.trophyLedger.rows;
  demand(Array.isArray(evidence.trophies) && evidence.trophies.length === A.ledgerRowCount && isDeepStrictEqual([...evidence.trophies], rows), 'LEDGER_MISMATCH');
  const lemmas = new Set<string>();
  const families = new Set<string>();
  rows.forEach((row, index) => {
    demand(row.pathNumber === Math.floor(index / A.lessonsPerPath) + 1 && row.lessonNumber === (index % A.lessonsPerPath) + 1, 'LEDGER_ORDER');
    demand(HANGUL_WORD.test(row.lemma) && HANGUL_WORD.test(row.familyKey) && row.lemma === nfc(row.lemma), 'LEDGER_LEMMA', row.lemma);
    const lemma = norm(row.lemma);
    const family = norm(row.familyKey);
    demand(!forbidden.has(lemma) && !forbidden.has(family), 'FROZEN_TROPHY_COLLISION', row.lemma);
    demand(!lemmas.has(lemma) && !families.has(family), 'TROPHY_UNIQUENESS', row.lemma);
    lemmas.add(lemma);
    families.add(family);
    const beat = spec.paths[row.pathNumber - 1].lessons[row.lessonNumber - 1];
    demand(beat.trophyLemma === row.lemma && beat.trophyFamilyKey === row.familyKey && beat.pos === row.pos, 'LEDGER_BEAT_CONSISTENCY', row.lemma);
    demand(HANGUL_WORD.test(beat.trophySurface) && !forbidden.has(norm(beat.trophySurface)), 'LEDGER_SURFACE', row.lemma);
    if (!ATTESTED_POS.has(row.pos)) {
      demand(beat.trophySurface.startsWith(row.lemma), 'LEDGER_SURFACE', row.lemma);
      const rest = beat.trophySurface.slice(row.lemma.length);
      demand(rest === '' || PERMITTED_REMAINDERS.has(rest), 'LEDGER_REMAINDER', row.lemma);
    }
  });
  return { specification: spec, allocations: rows, forbidden };
}

function cleanText(value: string, code: string, edge = false): void {
  demand(edge || value.length > 0, code);
  demand(value === nfc(value) && !value.includes('  '), code, value);
  demand(edge || value === value.trim(), code, value);
  demand(!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value), code);
}

function baseText(value: { de: string; en: string }): void {
  cleanText(value.de, 'BASE_TEXT');
  cleanText(value.en, 'BASE_TEXT');
}

// Canonical spoken-side string: NFC Hangul, single U+0020, .?, only; digits/Latin/% rejected by the class.
function target(value: string, code = 'TARGET_HYGIENE'): void {
  cleanText(value, code);
  demand(!value.includes('십시오'), 'SIPSIO_BANNED', value);
  demand(HANGUL_LINE.test(value) && token(value).every((t) => t.length > 0), code, value);
}

function checkRegister(text: string, allowFormal: boolean, code: string): void {
  demand(!text.includes('십시오'), 'SIPSIO_BANNED', text);
  for (const e of sentenceFinals(text)) {
    demand(!BANMAL.has(e[e.length - 1]), 'BANMAL_FINAL', e);
    demand(e.endsWith('요') || e.endsWith('죠') || FIXED.has(e) || (allowFormal && formalEnding(e)), code, e);
  }
}

function accepted(answer: string, values: readonly string[]): void {
  demand(values.length > 0, 'ACCEPTED_SHAPE', answer);
  for (const v of values) target(v, 'ACCEPTED_HYGIENE');
  demand(values.includes(answer) && new Set(values.map(norm)).size === values.length, 'ACCEPTED_IDENTITY', answer);
}

function choiceSet(answer: string, values: readonly string[], acceptedValues: readonly string[], code: string): void {
  demand(values.length === 4 && new Set(values.map(norm)).size === 4 && values.includes(answer), code, answer);
  for (const v of values) target(v, 'CHOICE_HYGIENE');
  demand(values.every((v) => eojeolCount(v) >= 1 && eojeolCount(v) <= 3 && !EMPTY.has(norm(v))), 'CHOICE_UNIT', answer);
  const acceptedNorm = new Set(acceptedValues.map(norm));
  demand(values.filter((v) => acceptedNorm.has(norm(v))).length === 1, code, answer);
}

function checkBlanks(value: BlankSet, text: string, minimum: number, maximum: number): void {
  const bs = value.blanks;
  demand(bs.length >= minimum && bs.length <= maximum, 'BLANK_COUNT', text);
  demand(value.moveBlankIndex < bs.length, 'MOVE_INDEX', text);
  const moveKind = bs[value.moveBlankIndex].kind;
  demand(moveKind === 'connector' || moveKind === 'frame', 'MOVE_CARRIER_KIND', text);
  let choiceCount = 0;
  for (const b of bs) {
    target(b.answer, 'BLANK_HYGIENE');
    const n = eojeolCount(b.answer);
    demand(n >= 1 && n <= 3 && !EMPTY.has(norm(b.answer)), 'BLANK_UNIT', b.answer);
    demand((b.cue !== undefined) === (b.kind === 'form'), 'FORM_CUE', b.answer);
    if (b.cue) baseText(b.cue);
    accepted(b.answer, b.acceptedAnswers);
    if (b.choices) {
      choiceSet(b.answer, b.choices, b.acceptedAnswers, 'CHOICE_SET');
      choiceCount += 1;
    }
  }
  demand(choiceCount <= 1, 'CHOICE_COUNT', text);
  const seen: number[] = [];
  let rendered = '';
  for (const segment of value.segments) {
    if (segment.kind === 'text') {
      cleanText(segment.text, 'SEGMENT_TEXT', true);
      rendered += segment.text;
      continue;
    }
    demand(segment.index < bs.length && segment.index === seen.length, 'SEGMENT_INDEX_ORDER', text);
    seen.push(segment.index);
    const answer = bs[segment.index].answer;
    const start = rendered.length;
    demand(text.startsWith(rendered + answer), 'BLANK_RECONSTRUCTION', text);
    demand(boundary(text, start) && boundary(text, start + answer.length), 'BLANK_BOUNDARY', answer);
    rendered += answer;
  }
  demand(seen.length === bs.length && rendered === text, 'BLANK_RECONSTRUCTION', text);
}

function stageRange(lessons: string): readonly [number, number] {
  const [a, b] = lessons.split('-').map(Number);
  return [a, b];
}

function checkLesson(lesson: Lesson, pathNumber: number, verified: VerifiedKoreanB2Evidence, seen: { firsts: Set<string>; lemmas: Set<string>; families: Set<string> }, warnings: KoreanB2Warning[]): void {
  const spec = verified.specification;
  const path = spec.paths[pathNumber - 1];
  const n = lesson.lessonNumber;
  const beat = path.lessons[n - 1];
  const where = 'P' + pathNumber + 'L' + n;
  demand(lesson.slug === beat.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug), 'LESSON_IDENTITY', where);
  demand(lesson.episodeShape === (pathNumber === 1 ? 'challenge' : 'precision'), 'NATIVE_EPISODE', where);
  baseText(lesson.title);
  baseText(lesson.situation);
  baseText(lesson.sceneCaption);
  demand(lesson.interlocutors.length === 1, 'ONE_PARTNER', where);
  const partner = lesson.interlocutors[0];
  baseText(partner.role);
  demand(partner.register === (n === 10 ? 'hapsyo' : 'haeyo'), 'PARTNER_REGISTER', where);

  const turns = lesson.dialogue;
  demand(turns.length === 6, 'SIX_TURNS', where);
  const texts = turns.map((t) => t.targetText);
  const moves: string[] = [];
  turns.forEach((turn, index) => {
    demand(turn.speaker === (index % 2 ? 'you' : 'them'), 'ALTERNATING_ROLE', where);
    target(turn.targetText, 'TURN_HYGIENE');
    baseText(turn.base);
    const [lo, hi] = TURN_BOUNDS[index];
    const count = eojeolCount(turn.targetText);
    demand(count >= lo && count <= hi, 'EOJEOL_TURN_BOUNDS', turn.targetText);
    demand(!token(turn.targetText).some((t) => GENDER_BANNED.has(t)), 'GENDERED_ADDRESS', turn.targetText);
    if (turn.speaker === 'you') {
      moves.push(turn.move);
      checkRegister(turn.targetText, false, 'LEARNER_FINAL_REGISTER');
      for (const sentence of turn.targetText.split(/[.?]/).map((s) => s.trim()).filter((s) => s.length > 0)) {
        const ts = token(sentence);
        const last = ts[ts.length - 1];
        if ((ts.includes('제가') || ts.includes('저는')) && (last.endsWith('세요') || last.endsWith('셨어요') || last.endsWith('십니다'))) warnings.push({ code: 'SELF_HONORIFIC_ADVISORY', detail: where + ': ' + sentence });
      }
    } else {
      demand(turn.interlocutorId === partner.id, 'INTERLOCUTOR_ID', turn.targetText);
      checkRegister(turn.targetText, partner.register === 'hapsyo', 'INTERLOCUTOR_FINAL_REGISTER');
    }
  });
  demand(new Set(moves).size === 3 && path.moveWhitelist.includes(moves[0]) && YOU2_MOVES.has(moves[1]) && YOU3_MOVES.has(moves[2]), 'INDEPENDENT_MOVE_SETS', where);
  const first = texts[1];
  const youTurns = [texts[1], texts[3], texts[5]];
  demand(!seen.firsts.has(first), 'UNIQUE_FIRST_REPLY', where);
  seen.firsts.add(first);
  demand(lesson.sceneCaption.de.includes('„' + texts[0] + '“') && lesson.sceneCaption.en.includes('“' + texts[0] + '”'), 'SCENE_OPENER', where);
  for (const caption of [lesson.sceneCaption.de, lesson.sceneCaption.en, lesson.situation.de, lesson.situation.en]) {
    demand(!texts.slice(1).some((t) => caption.includes(t)), 'NO_LATE_TURN_LEAK', where);
  }
  for (const [marker, p, l] of STAGE_TRIPWIRES) {
    if (pathNumber > p || (pathNumber === p && n >= l)) continue;
    demand(!youTurns.some((t) => t.includes(marker)), 'BOUNDED_CARRIER_STAGE', marker + ' @ ' + where);
  }

  const build = lesson.build;
  cleanText(build.framePrefix, 'FRAME', true);
  cleanText(build.frameSuffix, 'FRAME', true);
  const chunks = build.chunks;
  const focus = chunks.join(' ');
  demand(chunks.length >= 5 && chunks.length <= 8 && build.distractors.length === 2, 'BUILD_COUNTS', where);
  demand(build.framePrefix + focus + build.frameSuffix === first, 'BUILD_RECONSTRUCTION', where);
  const focusCount = eojeolCount(focus);
  demand(focusCount >= 5 && focusCount <= 9, 'FOCUS_BOUNDS', where);
  demand(new Set([...chunks, ...build.distractors].map(norm)).size === chunks.length + 2, 'DISTINCT_CHIPS', where);
  let offset = build.framePrefix.length;
  for (const chunk of chunks) {
    target(chunk, 'CHUNK_HYGIENE');
    const ts = token(chunk);
    demand(ts.length >= 1 && ts.length <= 3 && ts.some((t) => !EMPTY.has(t)), 'WHOLE_CONTENT_CHUNK', chunk);
    demand(boundary(first, offset) && boundary(first, offset + chunk.length), 'CHUNK_BOUNDARY', chunk);
    offset += chunk.length + 1;
  }
  for (const d of build.distractors) {
    target(d, 'DISTRACTOR_HYGIENE');
    const ts = token(d);
    demand(ts.length >= 1 && ts.length <= 3 && ts.some((t) => !EMPTY.has(t)), 'DISTRACTOR_SIZE', d);
    demand(!whole(first, d), 'DISTRACTOR_PRESENT', d);
  }

  checkBlanks(lesson.cloze, texts[3], 2, 4);
  checkBlanks(lesson.synthesis, texts[5], 1, 2);

  const recall = lesson.recall;
  cleanText(recall.before, 'RECALL_EDGE', true);
  cleanText(recall.after, 'RECALL_EDGE', true);
  target(recall.answer, 'RECALL_HYGIENE');
  demand(recall.before + recall.answer + recall.after === first, 'RECALL_RECONSTRUCTION', where);
  const recallUnits = eojeolCount(recall.answer);
  demand(recallUnits >= 1 && recallUnits <= 3 && whole(first, recall.answer) && boundary(first, recall.before.length) && boundary(first, recall.before.length + recall.answer.length) && !EMPTY.has(norm(recall.answer)), 'RECALL_WHOLE_EOJEOL', recall.answer);
  accepted(recall.answer, recall.acceptedAnswers);
  choiceSet(recall.answer, recall.fallbackChoices, recall.acceptedAnswers, 'FOUR_RECALL_CHOICES');
  demand(recall.fallbackChoices.every((c) => eojeolCount(c) === 1), 'FOUR_RECALL_CHOICES', where);

  const pattern = lesson.pattern;
  baseText(pattern.label);
  baseText(pattern.rule);
  const examples = pattern.examples;
  demand(moves.includes(pattern.moveType) && examples.length >= 2 && examples.length <= 3, 'PATTERN_COUNT_MOVE', where);
  demand(new Set(examples.map((e) => e.targetText)).size === examples.length && examples.some((e) => youTurns.includes(e.targetText)), 'PATTERN_TURN_REUSE', where);
  for (const example of examples) {
    target(example.targetText, 'EXAMPLE_HYGIENE');
    baseText(example.base);
    demand(example.highlights.length > 0 && example.highlights.every((h) => h.length > 0 && example.targetText.includes(h)), 'PATTERN_HIGHLIGHTS', example.targetText);
  }
  const spoken = [...texts, ...examples.map((e) => e.targetText)].join(' ');

  const trophy = lesson.trophy;
  const row = verified.allocations[(pathNumber - 1) * KOREAN_B2_AUTHORITY.lessonsPerPath + n - 1];
  demand(trophy.lemma === row.lemma && trophy.familyKey === row.familyKey && trophy.pos === row.pos && trophy.surface === beat.trophySurface && trophy.turnIndex === 1, 'EXACT_ALLOCATION', where);
  demand(!seen.lemmas.has(norm(trophy.lemma)) && !seen.families.has(norm(trophy.familyKey)), 'TROPHY_UNIQUENESS', trophy.lemma);
  demand(![trophy.lemma, trophy.familyKey, trophy.surface].some((s) => verified.forbidden.has(norm(s))), 'FROZEN_TROPHY_COLLISION', trophy.lemma);
  seen.lemmas.add(norm(trophy.lemma));
  seen.families.add(norm(trophy.familyKey));
  target(trophy.example.targetText, 'TROPHY_EXAMPLE_HYGIENE');
  baseText(trophy.example.base);
  baseText(trophy.base);
  baseText(trophy.whyThisWord);
  const firstTokens = token(first);
  const trophyIndex = firstTokens.indexOf(trophy.surface);
  demand(trophyIndex >= 0 && token(trophy.example.targetText).includes(trophy.surface), 'WHOLE_TROPHY_SURFACE', trophy.surface);
  if (ATTESTED_POS.has(trophy.pos)) {
    demand(trophy.surfaceMode === 'attested' && trophy.remainder === undefined, 'ATTESTED_SURFACE_MODE', trophy.surface);
  } else {
    demand(trophy.surfaceMode === undefined && trophy.surface.startsWith(trophy.lemma), 'LITERAL_TROPHY_REMAINDER', trophy.surface);
    const rest = trophy.surface.slice(trophy.lemma.length);
    if (rest === '') demand(trophy.remainder === undefined, 'LITERAL_TROPHY_REMAINDER', trophy.surface);
    else demand(trophy.remainder !== undefined && trophy.remainder.length > 0 && trophy.remainder.includes(rest) && trophy.remainder.every((r) => PERMITTED_REMAINDERS.has(r)) && new Set(trophy.remainder).size === trophy.remainder.length, 'LITERAL_TROPHY_REMAINDER', trophy.surface);
  }
  const recallStart = recall.before.trim() === '' ? 0 : recall.before.trim().split(' ').length;
  const recallEnd = recallStart + recallUnits - 1;
  demand(trophyIndex >= recallStart - 1 && trophyIndex <= recallEnd + 1, 'RECALL_TROPHY_ADJACENCY', where);

  const terms = lesson.terms;
  demand(terms.length >= 8 && terms.length <= 10 && new Set(terms.map((t) => norm(t.targetText))).size === terms.length, 'TERMS_COUNT_DISTINCT', where);
  demand(terms.filter((t) => t.kind === 'frame' || t.kind === 'connector').length >= 2 && terms.filter((t) => ['noun', 'verb', 'adjective', 'adverb'].includes(t.kind)).length >= 3, 'TERM_COVERAGE', where);
  for (const term of terms) {
    target(term.targetText, 'TERM_HYGIENE');
    baseText(term.base);
    demand(whole(spoken, term.targetText), 'WHOLE_TERM_ATTESTATION', term.targetText);
    if (term.lemma !== undefined) {
      demand(HANGUL_WORD.test(term.lemma) && !EMPTY.has(term.lemma), 'TERM_LEMMA', term.targetText);
      if (norm(term.targetText) === norm(trophy.surface)) demand(term.lemma === trophy.lemma, 'TERM_LEMMA', term.targetText);
    }
    if (term.acceptedAnswers) accepted(term.targetText, term.acceptedAnswers);
  }

  demand(isDeepStrictEqual(lesson.speak.map((s) => s.turnIndex), [1, 3, 5]), 'SPEAK_THREE_TURNS', where);
  const focusTokens = token(focus);
  for (const s of lesson.speak) {
    const ws = s.requiredTokens;
    const turnTokens = token(texts[s.turnIndex]);
    demand(ws.length >= 2 && ws.length <= 4 && new Set(ws).size === ws.length && ws.every((w) => HANGUL_WORD.test(w) && !STOP.has(w) && turnTokens.includes(w)), 'WHOLE_SPEECH_TARGET', where + '/turn' + s.turnIndex);
    if (s.turnIndex === 1) demand(ws.filter((w) => focusTokens.includes(w)).length >= 2, 'TWO_FOCUS_SPEECH_TARGETS', where);
  }

  // Carrier tags: literal attested surfaces, bounded to the staging text; not proof of morphology coverage.
  const stages = pathNumber === 1 ? spec.carriersStaged.P1 : spec.carriersStaged.P2;
  const earlierPaths = pathNumber === 1 ? [] : spec.carriersStaged.P1;
  const stagingText = [
    ...earlierPaths.map((s) => s.productive + ' ' + s.recognitionOnly),
    ...stages.filter((s) => stageRange(s.lessons)[0] <= n).map((s) => s.productive),
    ...path.lessons.slice(0, n).flatMap((l) => [l.requiredCarrier, l.recycles]),
    B1_PRODUCTIVE_LITERALS.join(' '),
  ].join('\n');
  const tags = lesson.carrierTags ?? [];
  demand(new Set(tags.map((t) => t.status + ':' + t.surface)).size === tags.length, 'CARRIER_TAG_DISTINCT', where);
  for (const tag of tags) {
    cleanText(tag.surface, 'CARRIER_TAG_TEXT');
    demand(/^[가-힣 .?,]+$/.test(tag.surface), 'CARRIER_TAG_TEXT', tag.surface);
    const inYou = youTurns.some((t) => t.includes(tag.surface));
    const inThem = [texts[0], texts[2], texts[4]].some((t) => t.includes(tag.surface));
    if (tag.status === 'productive') {
      demand(inYou, 'CARRIER_LITERAL_ATTESTED', tag.surface);
      demand(stagingText.includes(tag.surface), 'CARRIER_STAGE_TABLE', tag.surface + ' @ ' + where);
    } else {
      demand(inThem && !inYou, 'RECOGNITION_THEM_ONLY', tag.surface);
    }
  }
  if (pathNumber === 1 && n === 1) demand(tags.some((t) => t.surface === '중요하니까요' && t.status === 'productive'), 'EXPLICIT_FIRST_NIKKA_TAG', where);

  // Authored inbound variants: digits licensed inbound only, never in canonical fields; restoration must be exact.
  const variants = lesson.acceptedPhraseVariants ?? [];
  demand(new Set(variants.map(norm)).size === variants.length && !variants.some((v) => norm(v) === norm(first)), 'DISTINCT_VARIANT_ROWS', where);
  const canonicalTokens = first.split(' ');
  for (const v of variants) {
    cleanText(v, 'VARIANT_HYGIENE');
    const vt = v.split(' ');
    demand(VARIANT_LINE.test(v) && !vt.some((t, i) => strip(t) === '전' && strip(canonicalTokens[i] ?? '') !== '전'), 'VARIANT_HYGIENE', v);
    demand(vt.length === canonicalTokens.length && vt.every((t, i) => variantTokenEquivalent(canonicalTokens[i], t)), 'EXPLICIT_LICENSED_VARIANT_ONLY', v);
  }
}

export function validateKoreanB2Draft(value: unknown, evidence: KoreanB2Evidence, warnings: KoreanB2Warning[] = []): KoreanB2Draft {
  const verified = verifyKoreanB2Evidence(evidence);
  const parsed = koreanB2DraftSchema.safeParse(value);
  if (!parsed.success) fail('SCHEMA', parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; '));
  const doc = parsed.data;
  demand(doc.slug === KOREAN_B2_AUTHORITY.pathSlugs[doc.pathNumber - 1], 'PATH_SLUG', doc.slug);
  baseText(doc.pathTitle);
  baseText(doc.pathFunction);
  for (const field of [doc.authoring.source, doc.authoring.runId, doc.authoring.date]) cleanText(field, 'AUTHORING_TEXT');
  demand(doc.lessons.length === KOREAN_B2_AUTHORITY.lessonsPerPath && doc.lessons.every((l, i) => l.lessonNumber === i + 1), 'LESSON_SCOPE');
  demand(new Set(doc.lessons.map((l) => l.slug)).size === doc.lessons.length, 'UNIQUE_SLUG');
  const seen = { firsts: new Set<string>(), lemmas: new Set<string>(), families: new Set<string>() };
  for (const lesson of doc.lessons) checkLesson(lesson, doc.pathNumber, verified, seen, warnings);
  return doc;
}
