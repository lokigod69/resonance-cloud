import { z } from 'zod';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

// Offline authoring gate for Indonesian (id-ID) B2 path drafts. Structural checks only.
// Semantic judgments (idiom, synonyms, scene truth, distractor validity) stay with native review.

export const INDONESIAN_B2_AUTHORITY = Object.freeze({
  targetLanguage: 'Indonesian',
  code: 'id-ID',
  level: 'B2',
  authoredBaseLanguage: 'German',
  baseLocales: ['de', 'en'],
  specificationFile: 'B2_INDONESIAN_P1_P2_AUTHORING_SPEC_V3.json',
  specificationSha256: '0206c8a515a33a7727fb20032e97ef0bb839536a2046a5dd8680af32c89694f5',
  prerequisitesFile: 'B2_NATIVE_PREREQUISITES.json',
  prerequisitesSha256: '6685bba9897ddd1c1f72308204dd6c056108f32aea332e2ee9a1402cf4e74f2e',
  b1SpecificationFile: 'B1_NATIVE_INDONESIAN_SPEC.json',
  b1SpecificationLfSha256: 'fc4ac8d55ec3530344e6a397c4f00ec1290bcb0bbc89243e20962b556241d9ef',
  b1SpecificationCrlfSha256: '35aea8685aac608d5f45380ab8b174d02769add26455330afe16f5d11fee92e2',
  frozenCorpusSha256: 'c3d1594c493feaaf9bff746bcfa8c75dcb6b1371081dcd0b02939a6d11722007',
  frozenLessonCount: 200,
  reservedB1Count: 100,
  earlierTrophyCount: 300,
  ledgerRowCount: 20,
  lessonsPerPath: 10,
} as const);

export interface IndonesianB2Allocation {
  pathNumber: number;
  lessonNumber: number;
  lemma: string;
  familyKey: string;
  pos: string;
  surfaceAnchor?: string;
}

export interface IndonesianB2Evidence {
  specificationSource: string;
  specification: unknown;
  pathSpecSha256: string;
  ledgerSha256: string;
  prerequisitesSource: string;
  prerequisites: unknown;
  prerequisitesSha256: string;
  trophies: readonly IndonesianB2Allocation[];
  earlierTrophies: readonly string[];
}

export class IndonesianB2GateError extends Error {
  readonly code: string;
  constructor(code: string, detail?: string) {
    super(detail ? code + ': ' + detail : code);
    this.name = 'IndonesianB2GateError';
    this.code = code;
  }
}

function fail(code: string, detail?: string): never {
  throw new IndonesianB2GateError(code, detail);
}

function demand(condition: unknown, code: string, detail?: string): asserts condition {
  if (!condition) fail(code, detail);
}

const nfc = (s: string): string => s.normalize('NFC');
const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const TOKEN = /\p{L}+(?:[-']\p{L}+)*/gu;
const units = (s: string): string[] => nfc(s).match(TOKEN) ?? [];
const words = (s: string): string[] => units(s).map((w) => w.toLowerCase());
const norm = (s: string): string => nfc(s).trim().replace(/\s+/g, ' ').toLowerCase().replace(/[.,!?;:]+$/, '');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const whole = (value: string, text: string): boolean =>
  new RegExp("(?<![\\p{L}\\p{N}_'-])" + escapeRe(nfc(value).toLowerCase()) + "(?![\\p{L}\\p{N}_'-])", 'u').test(nfc(text).toLowerCase());
const boundaryChar = (c: string): boolean => /[\p{L}\p{N}_'-]/u.test(c);

const BANNED = new Set('gue lu nggak gak aja udah banget dong deh sih kok mending gimana awak sila tandas macam'.split(' '));
const GENDER_ADDRESS = new Set(['pak', 'bu', 'mbak', 'mas', 'bapak', 'ibu']);
const STOP = new Set('saya aku kamu anda engkau kau kalian kita kami mereka dia ia beliau diri diriku dirimu dirinya ini itu yang pun kan lah kah pak bu mbak mas bapak ibu satu dua tiga empat lima enam tujuh delapan sembilan sepuluh'.split(' '));
const FORMAL_BANNED = new Set(['aku', 'kamu', 'kalian']);
// Bounded lexical exceptions: dictionary words whose ending only looks like -mu/-ku.
const CLITIC_LOOKALIKES = new Set(['ilmu', 'tamu', 'jemu', 'temu', 'jamu', 'buku', 'suku', 'laku', 'baku', 'saku', 'siku', 'beku', 'paku', 'kaku', 'duku', 'kuku', 'waktu', 'perlu', 'tahu', 'itu', 'satu', 'tentu', 'begitu', 'pintu']);
const SINGLE_CONNECTORS = new Set(['tetapi', 'tapi', 'jadi', 'karena', 'sehingga', 'padahal', 'apalagi']);
const LESSON_SINGLE_CARRIERS: Readonly<Record<string, readonly string[]>> = {
  '1-1': ['sedangkan'], '1-3': ['kelebihannya'], '1-5': ['sedangkan'], '1-6': ['daripada'], '1-8': ['sedangkan'], '2-8': ['berdasarkan'],
};
// Bounded reviewed orthography tables (spec detectors); no morphology inference.
const DI_PLACES = 'sini sana situ depan belakang dalam luar atas bawah samping rumah kantor kota jalan gang blok klinik kompleks kampus laporan pengumuman sekitar ujung meja akhir posisi nomor penawaran pinggir pusat stasiun perpustakaan'.split(' ');
const DI_VERBS = 'hitung jemput buktikan perpanjang latih ingatkan pegang tinjau bagi pilah angkut kerjakan ganti cicil ambil tambah buat bawa undang pakai pikirkan tolak cek ringkas awasi panggil urus daftarkan beri setujui batalkan pisah maksud minta antar'.split(' ');
const DI_ATTACHED_PLACE = new RegExp('\\bdi(?:' + DI_PLACES.join('|') + ')\\b', 'i');
const DI_SPACED_VERB = new RegExp('\\bdi (?:' + DI_VERBS.join('|') + ')\\b', 'i');
const LOANWORDS = new Set('aplikasi provider modem proyektor paralel promo opsi koneksi daring kompleks satpam ojek'.split(' '));
const LOANWORD_EXEMPTIONS: Readonly<Record<string, readonly string[]>> = {
  'mobil-atau-kereta': ['ojek', 'daring'], 'beli-atau-sewa-alat': ['opsi'], 'liburan-dua-rencana': ['promo'], 'tunai-atau-aplikasi': ['aplikasi', 'opsi'],
  'kelas-atau-aplikasi': ['aplikasi'], 'usulan-rapat-warga': ['satpam'], 'cara-memilah-sampah': ['kompleks'], 'proyek-terlambat': ['paralel'],
  'alasan-ganti-internet': ['provider', 'modem', 'koneksi', 'daring'], 'mengajukan-keberatan-denda': ['proyektor'], 'dampak-sepeda-kampus': ['satpam'],
};
// Explicit lemma decisions for this batch; a suffix regex cannot separate a clitic from sebenarnya or apa adanya.
// Reviewed surface-to-lemma table for this batch (clitics, di-/ter- and clipped -kan surfaces); every listed surface must carry exactly this lemma.
const TERM_LEMMAS: Readonly<Record<string, string>> = {
  kelebihannya: 'kelebihan', cicilannya: 'cicilan', potongannya: 'potongan', 'tanggung jawabnya': 'tanggung jawab', 'beda bersihnya': 'beda bersih',
  sebenarnya: 'sebenarnya', singkatnya: 'singkat', sisanya: 'sisa', jaringannya: 'jaringan', modemnya: 'modem', 'apa adanya': 'apa adanya',
  akibatnya: 'akibat', dampaknya: 'dampak', urutannya: 'urutan',
  dihitung: 'menghitung', dijemput: 'menjemput', dibuktikan: 'membuktikan', diperpanjang: 'memperpanjang', dilatih: 'melatih', diingatkan: 'mengingatkan',
  dipegang: 'memegang', ditinjau: 'meninjau', dipilah: 'memilah', diangkut: 'mengangkut', dikerjakan: 'mengerjakan', diganti: 'mengganti', dicicil: 'mencicil',
  diambil: 'mengambil', terjangkau: 'menjangkau', tercatat: 'mencatat', terdaftar: 'mendaftar', terasa: 'merasa', berisiko: 'risiko',
  jadwalkan: 'menjadwalkan', gabungkan: 'menggabungkan',
};
const STAGED: Readonly<Record<number, Readonly<Record<string, number>>>> = {
  1: { kalaupun: 8, terjangkau: 8, sebaliknya: 11 },
  2: { padahal: 4, mengajukan: 4, menyadari: 7, berdasarkan: 7, akibatnya: 7, dimaksud: 7 },
};
const YOU2_MOVES = new Set(['concede', 'rebut', 'clarify', 'explain', 'compare', 'counteroffer']);
const YOU3_MOVES = new Set(['conclude', 'propose', 'summarize', 'counteroffer', 'relay', 'request']);
const TURN_BOUNDS: readonly (readonly [number, number])[] = [[6, 20], [14, 26], [6, 20], [12, 24], [6, 20], [10, 22]];

const baseSchema = z.object({ de: z.string(), en: z.string() }).strict();
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
const registerSchema = z.enum(['formal', 'neutral']);
const turnSchema = z.discriminatedUnion('speaker', [
  z.object({ speaker: z.literal('them'), targetText: z.string(), base: baseSchema, interlocutorId: z.string() }).strict(),
  z.object({ speaker: z.literal('you'), targetText: z.string(), base: baseSchema, move: z.string(), register: registerSchema }).strict(),
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
  lemma: z.string(), familyKey: z.string(), surface: z.string(), turnIndex: z.number().int(), pos: z.string(),
  example: z.object({ targetText: z.string(), base: baseSchema }).strict(), base: baseSchema,
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
const lessonSchema = z.object({
  lessonNumber: z.number().int(),
  slug: z.string(),
  title: baseSchema,
  situation: baseSchema,
  episodeShape: z.enum(['challenge', 'precision']),
  registerPlan: z.object({ mode: z.literal('constant'), registers: z.array(registerSchema) }).strict(),
  interlocutors: z.array(z.object({ id: z.string(), role: baseSchema, voiceRole: z.literal('A') }).strict()),
  speakerGender: z.literal('neutral'),
  sceneCaption: baseSchema,
  dialogue: z.array(turnSchema),
  build: z.object({ framePrefix: z.string(), chunks: z.array(z.string()), distractors: z.array(z.string()), frameSuffix: z.string() }).strict(),
  cloze: blankSetSchema,
  synthesis: blankSetSchema,
  recall: z.object({ before: z.string(), answer: z.string(), after: z.string(), acceptedAnswers: z.array(z.string()), fallbackChoices: z.array(z.string()) }).strict(),
  pattern: z.object({ moveType: z.string(), label: baseSchema, rule: baseSchema, examples: z.array(exampleSchema) }).strict(),
  terms: z.array(termSchema),
  speak: z.array(speakSchema),
  trophy: trophySchema,
  review: reviewSchema,
}).strict();

export const indonesianB2DraftSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.literal('draft'),
  targetLanguage: z.literal(INDONESIAN_B2_AUTHORITY.targetLanguage),
  targetLanguageCode: z.literal(INDONESIAN_B2_AUTHORITY.code),
  authoredBaseLanguage: z.literal(INDONESIAN_B2_AUTHORITY.authoredBaseLanguage),
  level: z.literal(INDONESIAN_B2_AUTHORITY.level),
  pathNumber: z.union([z.literal(1), z.literal(2)]),
  slug: z.string(),
  pathTitle: baseSchema,
  pathFunction: baseSchema,
  specRef: z.object({
    pathSpec: z.literal(INDONESIAN_B2_AUTHORITY.specificationFile),
    pathSpecSha256: z.literal(INDONESIAN_B2_AUTHORITY.specificationSha256),
    ledger: z.literal(INDONESIAN_B2_AUTHORITY.specificationFile),
    ledgerSha256: z.literal(INDONESIAN_B2_AUTHORITY.specificationSha256),
  }).strict(),
  authoring: z.object({ source: z.string(), runId: z.string(), date: z.string() }).strict(),
  lessons: z.array(lessonSchema),
}).strict();

export type IndonesianB2Draft = z.infer<typeof indonesianB2DraftSchema>;
type Lesson = IndonesianB2Draft['lessons'][number];
type BlankSet = Lesson['cloze'];

const allocationSchema = z.object({
  pathNumber: z.number().int(), lessonNumber: z.number().int(), lemma: z.string(), familyKey: z.string(), pos: z.string(), surfaceAnchor: z.string().optional(),
}).strict();
const specLessonSchema = z.object({
  number: z.number().int(),
  slug: z.string(),
  register: registerSchema,
  openingMove: z.object({ them: z.string(), you: z.string(), move: z.string() }).passthrough(),
  challenge: z.string(),
  answerMove: z.object({ you: z.string(), move: z.string() }).passthrough(),
  steer: z.string(),
  closingMove: z.object({ you: z.string(), move: z.string() }).passthrough(),
  trophyLemma: z.string(),
  trophySurface: z.string(),
  trophyFamilyKey: z.string(),
  pos: z.string(),
}).passthrough();
const specSchema = z.object({
  targetLanguage: z.literal('Indonesian'),
  code: z.literal('id-ID'),
  level: z.literal('B2'),
  authoredBaseLanguage: z.literal('German'),
  paths: z.array(z.object({ pathNumber: z.number().int(), moveWhitelist: z.array(z.string()), lessons: z.array(specLessonSchema) }).passthrough()).length(2),
  trophyLedger: z.object({ rows: z.array(allocationSchema).length(20) }).passthrough(),
}).passthrough();
type Specification = z.infer<typeof specSchema>;
const prerequisiteEntrySchema = z.object({
  targetLanguage: z.string(),
  sourceLocale: z.string(),
  frozenLessonCount: z.number().int(),
  activeCorpusSha256: z.string(),
  b1Specification: z.string(),
  b1AllocationSha256: z.string(),
  forbiddenTrophies: z.array(z.string()),
}).passthrough();

export interface VerifiedIndonesianB2Evidence {
  specification: Specification;
  allocations: readonly IndonesianB2Allocation[];
  forbidden: ReadonlySet<string>;
}

function parseJsonSource(source: unknown, shaCode: string, expected: string): unknown {
  demand(typeof source === 'string' && sha256(source) === expected, shaCode);
  demand(!source.includes('\r'), shaCode, 'authority sources are LF');
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    return fail(shaCode, error instanceof Error ? error.message : 'unparseable');
  }
}

export function verifyIndonesianB2Evidence(evidence: IndonesianB2Evidence): VerifiedIndonesianB2Evidence {
  const A = INDONESIAN_B2_AUTHORITY;
  demand(evidence !== null && typeof evidence === 'object', 'EVIDENCE_SHAPE');
  const specParsed = parseJsonSource(evidence.specificationSource, 'FULL_SPEC_HASH', A.specificationSha256);
  demand(isDeepStrictEqual(specParsed, evidence.specification), 'SPEC_PARSED_EQUALITY');
  demand(evidence.pathSpecSha256 === A.specificationSha256 && evidence.ledgerSha256 === A.specificationSha256, 'SPEC_BINDING');
  const specResult = specSchema.safeParse(specParsed);
  if (!specResult.success) fail('SPEC_SHAPE', specResult.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; '));
  const spec = specResult.data;
  demand(spec.paths.every((p, i) => p.pathNumber === i + 1 && p.lessons.length === A.lessonsPerPath && p.lessons.every((l, n) => l.number === n + 1)), 'SPEC_PATH_ORDER');

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
  demand(matching.length === 1, 'PREREQUISITES_INDONESIAN_ENTRY');
  const entry = matching[0];
  demand(entry.sourceLocale === A.code && entry.frozenLessonCount === A.frozenLessonCount, 'PREREQUISITES_IDENTITY');
  demand(entry.activeCorpusSha256 === A.frozenCorpusSha256, 'FROZEN_CORPUS_SHA');
  demand(entry.b1Specification === A.b1SpecificationFile && entry.b1AllocationSha256 === A.b1SpecificationCrlfSha256, 'B1_ALLOCATION_SHA');

  const earlier = evidence.earlierTrophies;
  demand(Array.isArray(earlier) && earlier.length === A.earlierTrophyCount && earlier.every((s) => typeof s === 'string'), 'EARLIER_TROPHY_COUNT');
  const sortedEarlier = [...new Set(earlier.map((s) => nfc(s).toLowerCase()))].sort();
  demand(sortedEarlier.length === A.earlierTrophyCount, 'EARLIER_TROPHY_DISTINCT');
  demand(entry.forbiddenTrophies.length === A.earlierTrophyCount && isDeepStrictEqual(sortedEarlier, entry.forbiddenTrophies), 'FORBIDDEN_LIST_MISMATCH');
  const forbidden = new Set(sortedEarlier);

  const rows = spec.trophyLedger.rows;
  demand(Array.isArray(evidence.trophies) && evidence.trophies.length === A.ledgerRowCount && isDeepStrictEqual([...evidence.trophies], rows), 'LEDGER_MISMATCH');
  const lemmas = new Set<string>();
  const families = new Set<string>();
  rows.forEach((row, index) => {
    demand(row.pathNumber === Math.floor(index / A.lessonsPerPath) + 1 && row.lessonNumber === (index % A.lessonsPerPath) + 1, 'LEDGER_ORDER');
    demand(/^[a-z]+$/.test(row.lemma) && !STOP.has(row.lemma), 'LEDGER_LEMMA');
    const lemma = nfc(row.lemma).toLowerCase();
    const family = nfc(row.familyKey).toLowerCase();
    demand(!forbidden.has(lemma) && !forbidden.has(family), 'FROZEN_TROPHY_COLLISION', row.lemma);
    demand(!lemmas.has(lemma) && !families.has(family), 'TROPHY_UNIQUENESS', row.lemma);
    lemmas.add(lemma);
    families.add(family);
    const beat = spec.paths[row.pathNumber - 1].lessons[row.lessonNumber - 1];
    demand(beat.trophyLemma === row.lemma && beat.trophyFamilyKey === row.familyKey && beat.pos === row.pos, 'LEDGER_BEAT_CONSISTENCY', row.lemma);
    demand(norm(beat.trophySurface) === norm(row.surfaceAnchor ?? row.lemma), 'LEDGER_ANCHOR', row.lemma);
  });
  return { specification: spec, allocations: rows, forbidden };
}

function cleanText(value: string, code: string, edge = false): void {
  demand(edge || value.length > 0, code);
  demand(value === nfc(value) && !value.includes('  '), code);
  demand(edge || value === value.trim(), code);
  demand(!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value), code);
}

function baseText(value: { de: string; en: string }): void {
  cleanText(value.de, 'BASE_TEXT');
  cleanText(value.en, 'BASE_TEXT');
}

function spoken(value: string): void {
  cleanText(value, 'SPOKEN_HYGIENE');
  demand(/^[A-Za-z .,!?;:()'-]+$/.test(value) && units(value).length > 0, 'SPOKEN_SCRIPT', value);
  const ws = new Set(words(value));
  demand(![...BANNED].some((b) => ws.has(b)), 'BANNED_REGISTER', value);
  demand(![...GENDER_ADDRESS].some((b) => ws.has(b)), 'GENDER_ADDRESS', value);
  for (const m of value.match(/\b[Aa][Nn][Dd][Aa]\b/g) ?? []) demand(m === 'Anda', 'ANDA_CAPITALIZATION', value);
  demand(!DI_ATTACHED_PLACE.test(value) && !DI_SPACED_VERB.test(value), 'DI_PREPOSITION', value);
  for (const sentence of value.split(/[.!?]/)) {
    const sw = new Set(words(sentence));
    demand(!((sw.has('walaupun') || sw.has('meskipun')) && (sw.has('tetapi') || sw.has('tapi') || sw.has('namun'))), 'CONCESSION_STACK', value);
  }
}

function cliticLooking(word: string): boolean {
  return word.length > 3 && (word.endsWith('mu') || word.endsWith('ku')) && !CLITIC_LOOKALIKES.has(word);
}

function checkRegister(text: string, register: 'formal' | 'neutral', learner: boolean): void {
  const ws = words(text);
  if (register === 'formal') {
    const code = learner ? 'FORMAL_REGISTER' : 'INTERLOCUTOR_REGISTER';
    demand(!ws.some((w) => FORMAL_BANNED.has(w) || cliticLooking(w)), code, text);
    if (learner) demand(!ws.includes('tapi'), code, text);
  } else {
    demand(!ws.includes('anda'), learner ? 'NEUTRAL_REGISTER' : 'INTERLOCUTOR_REGISTER', text);
  }
}

function accepted(answer: string, values: readonly string[]): void {
  demand(values.length > 0, 'ACCEPTED_SHAPE');
  for (const v of values) spoken(v);
  demand(values.includes(answer) && new Set(values.map(norm)).size === values.length, 'ACCEPTED_IDENTITY', answer);
}

function choices(answer: string, values: readonly string[], acceptedValues: readonly string[]): void {
  demand(values.length === 4 && new Set(values.map(norm)).size === 4, 'CHOICE_DISTINCT', answer);
  for (const v of values) spoken(v);
  const acceptedNorm = new Set(acceptedValues.map(norm));
  demand(values.filter((v) => acceptedNorm.has(norm(v))).length === 1, 'CHOICE_ACCEPTED_COUNT', answer);
  demand(values.includes(answer), 'CHOICE_CANONICAL', answer);
}

function checkBlanks(value: BlankSet, target: string, minimum: number, maximum: number): void {
  const bs = value.blanks;
  demand(bs.length >= minimum && bs.length <= maximum, 'BLANK_COUNT', target);
  demand(value.moveBlankIndex < bs.length, 'MOVE_INDEX', target);
  let choiceCount = 0;
  for (const b of bs) {
    spoken(b.answer);
    demand(units(b.answer).length >= 1 && units(b.answer).length <= 3 && !b.answer.includes('-') && !b.answer.includes("'"), 'BLANK_UNIT', b.answer);
    demand(!STOP.has(norm(b.answer)), 'BLANK_STOP', b.answer);
    demand((b.cue !== undefined) === (b.kind === 'form'), 'FORM_CUE', b.answer);
    if (b.cue) baseText(b.cue);
    accepted(b.answer, b.acceptedAnswers);
    if (b.choices) {
      choices(b.answer, b.choices, b.acceptedAnswers);
      choiceCount += 1;
    }
  }
  demand(choiceCount <= 1, 'CHOICE_COUNT', target);
  const moveKind = bs[value.moveBlankIndex].kind;
  demand(moveKind === 'connector' || moveKind === 'frame', 'MOVE_CARRIER_KIND', target);
  const seen: number[] = [];
  let rendered = '';
  for (const segment of value.segments) {
    if (segment.kind === 'text') {
      cleanText(segment.text, 'SEGMENT_TEXT', true);
      rendered += segment.text;
      continue;
    }
    demand(segment.index < bs.length, 'SEGMENT_INDEX', target);
    seen.push(segment.index);
    demand(seen.every((v, i) => v === i), 'SEGMENT_INDEX_ORDER', target);
    const answer = bs[segment.index].answer;
    const start = rendered.length;
    demand(start + answer.length <= target.length, 'BLANK_RECONSTRUCTION', target);
    const leftOk = start === 0 || !boundaryChar(target[start - 1]);
    const end = start + answer.length;
    const rightOk = end === target.length || !boundaryChar(target[end]);
    demand(leftOk && rightOk, 'BLANK_BOUNDARY', answer);
    rendered += answer;
  }
  demand(seen.length === bs.length && seen.every((v, i) => v === i) && rendered === target, 'BLANK_RECONSTRUCTION', target);
}

function checkLesson(lesson: Lesson, pathNumber: number, spec: Specification, verified: VerifiedIndonesianB2Evidence): void {
  const path = spec.paths[pathNumber - 1];
  const n = lesson.lessonNumber;
  const beat = path.lessons[n - 1];
  demand(lesson.slug === beat.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug), 'SLUG', lesson.slug);
  demand(lesson.episodeShape === (pathNumber === 1 ? 'challenge' : 'precision'), 'NATIVE_EPISODE', lesson.slug);
  baseText(lesson.title);
  baseText(lesson.situation);
  baseText(lesson.sceneCaption);
  demand(isDeepStrictEqual(lesson.registerPlan, { mode: 'constant', registers: [beat.register, beat.register, beat.register] }), 'REGISTER_PLAN', lesson.slug);
  demand(lesson.interlocutors.length === 1, 'INTERLOCUTORS', lesson.slug);
  const interlocutor = lesson.interlocutors[0];
  baseText(interlocutor.role);

  const turns = lesson.dialogue;
  demand(turns.length === 6, 'SIX_TURNS', lesson.slug);
  const canonical = [beat.openingMove.them, beat.openingMove.you, beat.challenge, beat.answerMove.you, beat.steer, beat.closingMove.you];
  const moves = [beat.openingMove.move, beat.answerMove.move, beat.closingMove.move];
  demand(new Set(moves).size === 3 && path.moveWhitelist.includes(moves[0]) && YOU2_MOVES.has(moves[1]) && YOU3_MOVES.has(moves[2]) && !moves.includes('relay'), 'DISTINCT_MOVES', lesson.slug);
  turns.forEach((turn, index) => {
    demand(turn.speaker === (index % 2 ? 'you' : 'them'), 'SPEAKERS', lesson.slug);
    spoken(turn.targetText);
    baseText(turn.base);
    const [lo, hi] = TURN_BOUNDS[index];
    const count = units(turn.targetText).length;
    demand(count >= lo && count <= hi, 'TURN_BOUNDS', turn.targetText);
    if (turn.speaker === 'you') {
      demand(turn.move === moves[(index - 1) / 2] && turn.register === beat.register, 'MOVE_REGISTER', turn.targetText);
      checkRegister(turn.targetText, beat.register, true);
    } else {
      demand(turn.interlocutorId === interlocutor.id, 'INTERLOCUTOR_ID', turn.targetText);
      checkRegister(turn.targetText, beat.register, false);
    }
  });
  demand(isDeepStrictEqual(turns.map((t) => t.targetText), canonical), 'CANONICAL_BEAT_AUTHORITY', lesson.slug);
  const laterTurns = canonical.slice(2);
  for (const caption of [lesson.sceneCaption.de, lesson.sceneCaption.en]) {
    demand(caption.includes(canonical[0]) && !laterTurns.some((t) => caption.toLowerCase().includes(t.toLowerCase())), 'SCENE_NO_REVEAL', lesson.slug);
  }
  for (const situation of [lesson.situation.de, lesson.situation.en]) {
    demand(!canonical.slice(1).some((t) => situation.toLowerCase().includes(t.toLowerCase())), 'SITUATION_NO_REVEAL', lesson.slug);
  }

  const build = lesson.build;
  cleanText(build.framePrefix, 'FRAME', true);
  cleanText(build.frameSuffix, 'FRAME', true);
  const chunks = build.chunks;
  demand(chunks.length >= 5 && chunks.length <= 8 && build.distractors.length === 2, 'BUILD_COUNT', lesson.slug);
  demand(new Set([...chunks, ...build.distractors].map(norm)).size === chunks.length + 2, 'BUILD_DISTINCT', lesson.slug);
  demand(build.framePrefix + chunks.join(' ') + build.frameSuffix === canonical[1], 'BUILD_RECONSTRUCTION', lesson.slug);
  demand((build.framePrefix === '' || !boundaryChar(build.framePrefix[build.framePrefix.length - 1])) && (build.frameSuffix === '' || !boundaryChar(build.frameSuffix[0])), 'FRAME_BOUNDARY', lesson.slug);
  demand(!build.distractors.some((d) => whole(norm(d), canonical[1])), 'DISTRACTOR_PRESENT', lesson.slug);
  const focusCount = units(chunks.join(' ')).length;
  demand(focusCount >= 7 && focusCount <= 12, 'FOCUS_BOUNDS', lesson.slug);
  for (const chip of [...chunks, ...build.distractors]) {
    spoken(chip);
    demand(units(chip).length >= 1 && units(chip).length <= 4, 'CHIP_BOUNDS', chip);
    demand(!chip.includes('-'), 'REDUPLICATION_CHIP', chip);
  }
  const singles = new Set([...SINGLE_CONNECTORS, ...(LESSON_SINGLE_CARRIERS[pathNumber + '-' + n] ?? [])]);
  demand(chunks.every((c) => units(c).length !== 1 || singles.has(norm(c))), 'SINGLE_CHIP', lesson.slug);

  checkBlanks(lesson.cloze, canonical[3], 2, 4);
  checkBlanks(lesson.synthesis, canonical[5], 1, 2);

  const recall = lesson.recall;
  demand(recall.before + recall.answer + recall.after === canonical[1], 'RECALL_RECONSTRUCTION', lesson.slug);
  cleanText(recall.before, 'RECALL_EDGE', true);
  cleanText(recall.after, 'RECALL_EDGE', true);
  spoken(recall.answer);
  demand((recall.before === '' || !boundaryChar(recall.before[recall.before.length - 1])) && (recall.after === '' || !boundaryChar(recall.after[0])), 'RECALL_BOUNDARY', recall.answer);
  demand(units(recall.answer).length >= 1 && units(recall.answer).length <= 3 && !STOP.has(norm(recall.answer)) && !recall.answer.includes('-'), 'RECALL_UNIT', recall.answer);
  accepted(recall.answer, recall.acceptedAnswers);
  choices(recall.answer, recall.fallbackChoices, recall.acceptedAnswers);

  const pattern = lesson.pattern;
  baseText(pattern.label);
  baseText(pattern.rule);
  for (const r of [pattern.rule.de, pattern.rule.en]) demand(/[.!?]$/.test(r) && (r.match(/[.!?](?=\s|$)/g) ?? []).length === 1, 'RULE_SENTENCE', r);
  const youTurns = [canonical[1], canonical[3], canonical[5]];
  demand(moves.includes(pattern.moveType) && pattern.examples.length >= 2 && pattern.examples.length <= 3, 'PATTERN_COUNT_MOVE', lesson.slug);
  const examples = pattern.examples;
  demand(new Set(examples.map((e) => e.targetText)).size === examples.length && examples.some((e) => youTurns.includes(e.targetText)), 'PATTERN_REUSE', lesson.slug);
  for (const example of examples) {
    spoken(example.targetText);
    baseText(example.base);
    demand(example.highlights.length > 0 && example.highlights.every((h) => h.length > 0 && example.targetText.includes(h)), 'PATTERN_HIGHLIGHT', example.targetText);
  }
  const staged = STAGED[pathNumber];
  for (const target of youTurns) {
    const tw = words(target);
    demand(!Object.entries(staged).some(([token, start]) => tw.includes(token) && n < start), 'STAGED_TOKEN', target);
  }

  const terms = lesson.terms;
  demand(terms.length >= 8 && terms.length <= 10 && new Set(terms.map((t) => norm(t.targetText))).size === terms.length, 'TERM_COUNT_DISTINCT', lesson.slug);
  const connectorCount = terms.filter((t) => t.kind === 'connector' || t.kind === 'frame').length;
  const contentCount = terms.filter((t) => ['noun', 'verb', 'adjective', 'adverb'].includes(t.kind)).length;
  demand(connectorCount >= 2 && contentCount >= 3, 'TERM_BALANCE', lesson.slug);
  const corpus = [...canonical, ...examples.map((e) => e.targetText)];
  for (const term of terms) {
    spoken(term.targetText);
    baseText(term.base);
    demand(corpus.some((line) => whole(term.targetText, line)), 'TERM_SOURCE', term.targetText);
    const expectedLemma = TERM_LEMMAS[term.targetText.toLowerCase()];
    if (expectedLemma !== undefined) demand(term.lemma === expectedLemma, 'TERM_LEMMA', term.targetText);
    if (term.acceptedAnswers) accepted(term.targetText, term.acceptedAnswers);
  }

  demand(isDeepStrictEqual(lesson.speak.map((s) => s.turnIndex), [1, 3, 5]), 'SPEAK_SCOPE', lesson.slug);
  for (const target of lesson.speak) {
    const tokens = target.requiredTokens;
    demand(tokens.length >= 2 && tokens.length <= 4 && new Set(tokens.map(norm)).size === tokens.length, 'SPEAK_PROFILE_TOKENS', lesson.slug);
    demand(tokens.every((t) => units(t).length === 1 && !t.includes('-') && !STOP.has(norm(t)) && whole(t, canonical[target.turnIndex])), 'SPEAK_WHOLE_UNIT', tokens.join(' '));
    if (target.turnIndex === 1) demand(tokens.filter((t) => whole(t, chunks.join(' '))).length >= 2, 'SPEAK_FOCUS', tokens.join(' '));
  }

  const trophy = lesson.trophy;
  const row = verified.allocations[(pathNumber - 1) * INDONESIAN_B2_AUTHORITY.lessonsPerPath + n - 1];
  demand(trophy.lemma === row.lemma && trophy.familyKey === row.familyKey && trophy.pos === row.pos, 'TROPHY_ALLOCATION', trophy.lemma);
  demand(trophy.turnIndex === 1 && trophy.surface === beat.trophySurface && whole(trophy.surface, canonical[1]), 'TROPHY_SURFACE', trophy.surface);
  demand(norm(trophy.surface) === norm(row.surfaceAnchor ?? row.lemma), 'TROPHY_ANCHOR', trophy.surface);
  demand(/^[a-z]+$/.test(trophy.lemma) && !STOP.has(trophy.lemma), 'TROPHY_LEMMA', trophy.lemma);
  demand(!verified.forbidden.has(nfc(trophy.lemma).toLowerCase()) && !verified.forbidden.has(nfc(trophy.familyKey).toLowerCase()), 'FROZEN_TROPHY_COLLISION', trophy.lemma);
  baseText(trophy.base);
  spoken(trophy.example.targetText);
  baseText(trophy.example.base);
  demand(whole(trophy.lemma, trophy.example.targetText) || whole(trophy.surface, trophy.example.targetText), 'TROPHY_EXAMPLE', trophy.lemma);
}

export function validateIndonesianB2Draft(value: unknown, evidence: IndonesianB2Evidence): IndonesianB2Draft {
  const verified = verifyIndonesianB2Evidence(evidence);
  const parsed = indonesianB2DraftSchema.safeParse(value);
  if (!parsed.success) fail('SCHEMA', parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; '));
  const doc = parsed.data;
  const spec = verified.specification;
  baseText(doc.pathTitle);
  baseText(doc.pathFunction);
  for (const field of [doc.authoring.source, doc.authoring.runId, doc.authoring.date]) cleanText(field, 'AUTHORING_TEXT');
  demand(spec.paths[doc.pathNumber - 1].pathNumber === doc.pathNumber, 'PATH_SCOPE');
  demand(doc.lessons.length === INDONESIAN_B2_AUTHORITY.lessonsPerPath && doc.lessons.every((l, i) => l.lessonNumber === i + 1), 'LESSON_SCOPE');
  demand(new Set(doc.lessons.map((l) => l.slug)).size === doc.lessons.length, 'SLUG');
  for (const lesson of doc.lessons) checkLesson(lesson, doc.pathNumber, spec, verified);
  const lemmas = new Set(doc.lessons.map((l) => l.trophy.lemma));
  const families = new Set(doc.lessons.map((l) => l.trophy.familyKey));
  demand(lemmas.size === doc.lessons.length && families.size === doc.lessons.length, 'TROPHY_UNIQUENESS');
  return doc;
}

export interface IndonesianB2Warning {
  code: 'RECOGNITION_ONLY_PATTERN' | 'TERM_OVERLAP' | 'LOANWORD';
  pathNumber: number;
  lessons: number[];
  tokens: string[];
  meaning: string;
}

// Non-blocking observations for native review; call after validateIndonesianB2Draft succeeded.
export function collectIndonesianB2Warnings(draft: IndonesianB2Draft): IndonesianB2Warning[] {
  const warnings: IndonesianB2Warning[] = [];
  const staged = STAGED[draft.pathNumber];
  for (const lesson of draft.lessons) {
    const exempt = new Set(LOANWORD_EXEMPTIONS[lesson.slug] ?? []);
    const loan = [...new Set(lesson.dialogue.flatMap((t) => words(t.targetText)).filter((w) => LOANWORDS.has(w) && !exempt.has(w)))].sort();
    if (loan.length > 0) warnings.push({ code: 'LOANWORD', pathNumber: draft.pathNumber, lessons: [lesson.lessonNumber], tokens: loan, meaning: 'Loanword outside the per-lesson exemption list; native review decides.' });
    const youTurns = lesson.dialogue.filter((t) => t.speaker === 'you').map((t) => t.targetText);
    for (const example of lesson.pattern.examples) {
      const ew = words(example.targetText);
      const early = Object.entries(staged).filter(([token, start]) => ew.includes(token) && lesson.lessonNumber < start).map(([token]) => token);
      if (early.length > 0 && !youTurns.includes(example.targetText)) {
        warnings.push({ code: 'RECOGNITION_ONLY_PATTERN', pathNumber: draft.pathNumber, lessons: [lesson.lessonNumber], tokens: early, meaning: 'Allowed only as recognition exposure; native full review must confirm the role.' });
      }
    }
  }
  draft.lessons.forEach((a, i) => {
    for (const b of draft.lessons.slice(i + 1)) {
      const bTerms = new Set(b.terms.map((t) => norm(t.targetText)));
      const overlap = a.terms.map((t) => norm(t.targetText)).filter((t) => bTerms.has(t));
      if (overlap.length / Math.min(a.terms.length, b.terms.length) > 0.3) {
        warnings.push({ code: 'TERM_OVERLAP', pathNumber: draft.pathNumber, lessons: [a.lessonNumber, b.lessonNumber], tokens: [...overlap].sort(), meaning: 'High vocabulary overlap between lessons; review for filler.' });
      }
    }
  });
  return warnings;
}
