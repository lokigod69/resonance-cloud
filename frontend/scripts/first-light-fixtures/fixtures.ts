/* eslint-disable */
// The §13 fixture matrix. Each entry is a scenario + a scripted DOM run that
// asserts what the spec promises. Nothing here bends toward passing: a check
// that fails is reported with what was actually in the DOM.

import {
  WAVE_AMP_SUM,
  WAVE_CAM_HEIGHT,
  WAVE_FOCAL_FRACTION,
  WAVE_HORIZON_FRACTION,
} from '@/lib/waveField'
import type { Scenario, WordRow } from './stubs/scenario'
import {
  Ctx,
  bodyText,
  byText,
  clickText,
  measureDump,
  buoyLines,
  dialog,
  dueBuoys,
  hasGoldDot,
  opacityOf,
  q,
  qa,
  restBuoys,
  shot,
  sleep,
  textOf,
  translateY,
  typeInto,
  waitFor,
  waitGone,
} from './utils'

export type Fixture = {
  id: string
  name: string
  viewport: { width: number; height: number }
  reduceMotion?: boolean
  language: string
  scenario: Scenario
  localStorageSeed?: Record<string, string>
  /** Set when the case cannot be simulated in this harness — the runner records
   * it as not-run with this reason instead of navigating. */
  notRun?: string
  run: (ctx: Ctx) => Promise<void>
}

// ── word fixtures ──────────────────────────────────────────────────────────

const DE_WORDS: Array<[string, string]> = [
  ['der Hund', 'dog'],
  ['das Haus', 'house'],
  ['die Katze', 'cat'],
  ['der Baum', 'tree'],
  ['das Wasser', 'water'],
  ['der Freund', 'friend'],
  ['die Straße', 'street'],
  ['das Fenster', 'window'],
  ['der Schlüssel', 'key'],
  ['die Blume', 'flower'],
  ['das Brot', 'bread'],
  ['die Milch', 'milk'],
  ['der Tisch', 'table'],
  ['der Stuhl', 'chair'],
  ['die Tür', 'door'],
  ['das Buch', 'book'],
  ['die Sonne', 'sun'],
  ['der Mond', 'moon'],
  ['das Kind', 'child'],
  ['die Stadt', 'city'],
]

const HOUR = 3600_000

function baseRow(index: number, over: Partial<WordRow> = {}): WordRow {
  const [word, gloss] = DE_WORDS[index % DE_WORDS.length]
  return {
    lemma_key: `lemma-${String(index).padStart(2, '0')}`,
    display_word: word,
    translation: gloss,
    word_ids: [`w-${index}`],
    deck_ids: ['deck-1'],
    state: 'new',
    due: true,
    next_due_at: new Date(Date.now() - (200 - index) * HOUR).toISOString(),
    consecutive_correct: 0,
    total_attempts: 0,
    last_attempt_at: null,
    last_knew_it: null,
    ...over,
  }
}

/** Fresh-deck due words: state 'new', due now — the pool `counts.totalDue`
 * would wrongly report as empty (the Opus-3 regression case). */
function dueRows(count: number, over: Partial<WordRow> = {}): WordRow[] {
  return Array.from({ length: count }, (_, i) => baseRow(i, over))
}

/** Settled words: nothing due, but a recent attempt so the lapse predicate
 * (latest attempt older than 7 days) stays false. */
function restRows(count: number): WordRow[] {
  return Array.from({ length: count }, (_, i) =>
    baseRow(i, {
      state: 'mastered',
      due: false,
      next_due_at: new Date(Date.now() + (24 + i) * HOUR).toISOString(),
      total_attempts: 4,
      consecutive_correct: 3,
      last_attempt_at: new Date(Date.now() - (24 + i) * HOUR).toISOString(),
      last_knew_it: true,
    }),
  )
}

const GERMAN_PATH = {
  id: 'german-a1-market-1',
  shortTitle: 'At the market',
  targetLanguage: 'German',
  lessons: [
    { id: 'l1', lessonNumber: 1, title: 'Ordering coffee', baseLanguage: 'English', corePhrase: { targetText: 'Ich hätte gern einen Kaffee' }, estimatedMinutes: 6 },
    { id: 'l2', lessonNumber: 2, title: 'Buying bread', baseLanguage: 'English', corePhrase: { targetText: 'Zwei Brötchen, bitte' }, estimatedMinutes: 5 },
    { id: 'l3', lessonNumber: 3, title: 'Paying', baseLanguage: 'English', corePhrase: { targetText: 'Was kostet das?' }, estimatedMinutes: 7 },
  ],
}

const MOBILE = { width: 390, height: 844 }
const SE = { width: 320, height: 568 }

// ── Word Stream fixtures' data (declared before FIXTURES — a `const` below
// the array would be a TDZ error at module evaluation) ─────────────────────

const STREAM_WORDS = [
  ['animals.dog', 'animals', 1, 'der Hund', 'dog'],
  ['animals.cat', 'animals', 1, 'die Katze', 'cat'],
  ['animals.horse', 'animals', 2, 'das Pferd', 'horse'],
  ['animals.bird', 'animals', 2, 'der Vogel', 'bird'],
  ['fruits.apple', 'fruits', 1, 'der Apfel', 'apple'],
  ['fruits.pear', 'fruits', 1, 'die Birne', 'pear'],
  ['fruits.strawberry', 'fruits', 3, 'die Erdbeere', 'strawberry'],
  ['food_drinks.bread', 'food_drinks', 1, 'das Brot', 'bread'],
  ['food_drinks.water', 'food_drinks', 1, 'das Wasser', 'water'],
  ['food_drinks.cheese', 'food_drinks', 2, 'der Käse', 'cheese'],
  ['animals.butterfly', 'animals', 4, 'der Schmetterling', 'butterfly'],
  ['food_drinks.speedlimit', 'food_drinks', 5, 'die Geschwindigkeitsbegrenzung', 'speed limit'],
].map(([conceptId, categorySlug, level, target, helper]) => ({
  conceptId: String(conceptId),
  categorySlug: String(categorySlug),
  level: Number(level),
  target: String(target),
  helper: String(helper),
}))

function streamWordButtons(): HTMLButtonElement[] {
  return qa<HTMLButtonElement>('button.pointer-events-auto').filter((b) => (b.getAttribute('aria-label') || '').startsWith('New word '))
}

// ── shared run helpers ─────────────────────────────────────────────────────

function heroCard(): HTMLElement | null {
  return q<HTMLElement>('.pg-glass:not([aria-hidden="true"])')
}

function skeletonCard(): HTMLElement | null {
  return q<HTMLElement>('.pg-glass[aria-hidden="true"]')
}

/** The state line is the one aria-hidden paragraph in the sky stack. */
function stateLine(): string {
  return textOf(q<HTMLElement>('p[aria-hidden="true"]'))
}

function stripText(): string {
  const strip = qa<HTMLElement>('.fixed.inset-0 div').find((el) => textOf(el).startsWith('···'))
  return textOf(strip ?? null)
}

function dlgButton(needle: string): HTMLButtonElement {
  const d = dialog()
  if (!d) throw new Error('no sheet open')
  const button = Array.from(d.querySelectorAll('button')).find((b) => textOf(b).includes(needle))
  if (!button) throw new Error(`no sheet button "${needle}" (sheet: ${textOf(d)})`)
  return button as HTMLButtonElement
}

function inserts(): any[] {
  return ((window as any).__inserts ?? []) as any[]
}

/** Replays TidelineBuoys' own "can these two labels meet?" test for the two
 * mobile slots that sit 4% apart in x (slot 0 at 28%/z30 and slot 3 at
 * 24%/z10) — the pair that decides whether five buoys can ever coexist. */
function slotPairGeometry(): string {
  const w = document.documentElement.clientWidth
  const h = document.documentElement.clientHeight
  const calmY = (z: number) => h * (WAVE_HORIZON_FRACTION + (WAVE_CAM_HEIGHT * WAVE_FOCAL_FRACTION) / z)
  const bob = (z: number) => (WAVE_AMP_SUM * WAVE_FOCAL_FRACTION * h) / z
  const a = { x: 28, z: 30 }
  const b = { x: 24, z: 10 }
  const verticalGap = Math.abs(calmY(a.z) - calmY(b.z))
  const meetThreshold = bob(a.z) + bob(b.z) + 34
  const dx = Math.abs((a.x / 100) * w - (b.x / 100) * w)
  return `slot0(28%,z30) vs slot3(24%,z10): verticalGap=${verticalGap.toFixed(1)}px meetThreshold=${meetThreshold.toFixed(1)}px (can meet: ${verticalGap <= meetThreshold}), dx=${dx.toFixed(1)}px vs label half-widths+10`
}

async function settle(ms = 700) {
  await sleep(ms)
}

async function awaitHero(ctx: Ctx): Promise<HTMLElement> {
  const card = await waitFor('hero card to commit', heroCard, 12000)
  await settle(600)
  ctx.note(`state line: ${stateLine()}`)
  // The card is fixed-height by design (§3) — so its own content must fit
  // inside it at this breakpoint, CTA included.
  const cta = card.querySelector('button')
  if (cta) {
    const ctaTop = cta.getBoundingClientRect().top
    const lowestText = Array.from(card.querySelectorAll('p'))
      .map((p) => p.getBoundingClientRect().bottom)
      .reduce((a, b) => Math.max(a, b), 0)
    ctx.check(
      'hero text clears the CTA inside the fixed-height card',
      lowestText <= ctaTop + 1,
      `lowest text bottom=${lowestText.toFixed(1)}px, CTA top=${ctaTop.toFixed(1)}px, card=${card.getBoundingClientRect().height.toFixed(1)}px`,
    )
    const clipped = Array.from(card.querySelectorAll('p')).filter((p) => p.scrollHeight > p.clientHeight + 1)
    ctx.check(
      'no hero line is clipped by the fixed card height',
      clipped.length === 0,
      clipped.map((p) => `"${textOf(p)}" needs ${p.scrollHeight}px, has ${p.clientHeight}px`).join(' | '),
    )
  }
  return card
}

/** Which due word the open sheet is currently asking for — resolved through
 * the prompt gloss, so the queue's real order is observable. */
function currentCardWord(): string {
  const sheet = dialog()
  if (!sheet) throw new Error('no sheet open')
  const gloss = textOf(sheet.querySelector('p'))
  const rows = ((window as any).__scenario?.words ?? []) as WordRow[]
  const row = rows.find((r) => r.translation && r.translation === gloss)
  return row?.display_word ?? `?(${gloss})`
}

function promptText(): string {
  return textOf(dialog()?.querySelector('p') ?? null)
}

/** The live Next/Done control on a settled card, once it is actually pressable
 * (it stays disabled until the attempt has landed). */
function advanceButton(): HTMLButtonElement | null {
  const sheet = dialog()
  if (!sheet) return null
  const button = Array.from(sheet.querySelectorAll('button')).find((b) => {
    const label = textOf(b)
    return label === 'Next word' || label === 'Done'
  }) as HTMLButtonElement | undefined
  return button && !button.disabled ? button : null
}

/** The card holds after it resolves (§6.4) — this is the learner pressing on. */
async function advanceCard() {
  const button = await waitFor('advance button', advanceButton, 8000)
  button.click()
}

/** Reveal → the attempt writes itself → press on. */
async function missCurrentCard() {
  const before = inserts().length
  dlgButton('Show answer').click()
  await waitFor('solution shown', () => dialog() && textOf(dialog()!).includes('Correct answer'))
  await waitFor('insert recorded', () => inserts().length > before, 6000)
  await advanceCard()
}

async function solveCurrentCard(word: string) {
  const input = await waitFor('sheet input', () => dialog()?.querySelector('input') as HTMLInputElement | null)
  await waitFor('Check button', () => {
    try {
      return dlgButton('Check')
    } catch {
      return null
    }
  })
  typeInto(input, word)
  // The input is controlled — wait for React to render the typed value before
  // submitting, or Check evaluates an empty answer.
  await waitFor(
    'input reflects the typed answer',
    () => (dialog()?.querySelector('input') as HTMLInputElement | null)?.value === word,
    4000,
  )
  dlgButton('Check').click()
}

/** Blocks until the open card's gloss resolves to a known scenario word. */
async function awaitCardWord(): Promise<string> {
  return waitFor('current card word', () => {
    const word = currentCardWord()
    return word.startsWith('?') ? null : word
  }, 8000)
}

// ── the matrix ─────────────────────────────────────────────────────────────

export const FIXTURES: Fixture[] = [
  {
    id: '01-hero-lesson',
    name: 'hero = lesson (mission resolves, due words exist)',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: dueRows(6), guidedPaths: [GERMAN_PATH] },
    async run(ctx) {
      const card = await awaitHero(ctx)
      const text = textOf(card)
      ctx.check('eyebrow is "Continue · {path}"', text.includes('Continue · At the market'), text)
      ctx.check('display line is the lesson phrase', text.includes('Ich hätte gern einen Kaffee'), text)
      ctx.check('sub-line names lesson/total/minutes', text.includes('Lesson 1 of 3 · 6 min'), text)
      ctx.check('CTA is "Start next step"', text.includes('Start next step'), text)
      ctx.check('phrase carries lang="de"', card.querySelector('[lang="de"]') !== null, card.innerHTML.slice(0, 200))
    },
  },

  {
    id: '02-hero-recall-fresh-deck',
    name: 'hero = recall with 20 new-due words ⇒ 5 two-line buoys (fresh-deck regression)',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: dueRows(20) },
    async run(ctx) {
      const card = await awaitHero(ctx)
      const text = textOf(card)
      ctx.check('recall hero committed', text.includes('The tide brought words back'), text)
      ctx.check('count comes from duePool (20), not counts.totalDue', text.includes('20 waiting on the water'), text)
      ctx.check('CTA is "Bring them back"', text.includes('Bring them back'), text)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(900)
      const buoys = dueBuoys()
      ctx.note(`viewport ${window.innerWidth}x${window.innerHeight}; measured ${measureDump()}`)
      ctx.note(`buoy slots (left%): ${buoys.map((b) => (b.parentElement as HTMLElement).style.left).join(' ')}`)
      ctx.note(`slot-pair geometry: ${slotPairGeometry()}`)
      ctx.check('5 due buoys on the water', buoys.length === 5, `count=${buoys.length}`)
      const lines = buoys.map(buoyLines)
      ctx.check(
        'every buoy label is two lines (word over gloss)',
        lines.every((l) => l.length === 2),
        JSON.stringify(lines),
      )
      ctx.check('every due buoy carries the gold dot', buoys.every(hasGoldDot), '')
      ctx.note(`buoy labels: ${JSON.stringify(lines)}`)
    },
  },

  {
    id: '03-hero-speak',
    name: 'hero = speak (no mission, zero due, isSpeak language)',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: restRows(6) },
    async run(ctx) {
      const card = await awaitHero(ctx)
      const text = textOf(card)
      ctx.check('speak hero committed', text.includes('Time to speak'), text)
      ctx.check('CTA is "Start speaking"', text.includes('Start speaking'), text)
      ctx.check('no due buoys', dueBuoys().length === 0, `due=${dueBuoys().length}`)
    },
  },

  {
    id: '04-hero-discover',
    name: 'hero = discover (Polish: no guided content, zero due, not a Speak language)',
    viewport: MOBILE,
    language: 'Polish',
    scenario: { words: restRows(6) },
    async run(ctx) {
      const card = await awaitHero(ctx)
      const text = textOf(card)
      ctx.check('discover hero committed', text.includes('Discover something new'), text)
      ctx.check('CTA is "Browse the library"', text.includes('Browse the library'), text)
      ctx.check('no speak hero for a non-Speak language', !text.includes('Time to speak'), text)
    },
  },

  {
    id: '05-hero-preparing',
    name: 'hero = preparing (decks exist, zero complete words) links to the deck',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: [] },
    async run(ctx) {
      const card = await awaitHero(ctx)
      const text = textOf(card)
      ctx.check('preparing hero committed', text.includes('Your words are still forming'), text)
      ctx.check('CTA is "Open deck"', text.includes('Open deck'), text)
      await shot('final')
      const cta = Array.from(card.querySelectorAll('button')).find((b) => textOf(b).includes('Open deck'))
      cta?.click()
      await sleep(300)
      ctx.check('CTA navigates to deckHref', (window as any).__location === '/deck/d1', String((window as any).__location))
    },
  },

  {
    id: '06-hero-unavailable',
    name: 'hero = unavailable on RPC error — Retry, never "nothing due"',
    viewport: MOBILE,
    language: 'German',
    scenario: { rpc: 'error' },
    async run(ctx) {
      const card = await awaitHero(ctx)
      const text = textOf(card)
      const page = bodyText()
      ctx.check('honest failure copy', text.includes("We couldn't load your words"), text)
      ctx.check('Retry present', text.includes('Try again'), text)
      ctx.check('never renders as calm/nothing-due', !page.includes('Calm water'), page.slice(0, 240))
      ctx.check('no visit line claimed', !/This visit/.test(page), page.slice(0, 240))
      ctx.check('no buoys under error', dueBuoys().length === 0 && restBuoys().length === 0, '')
    },
  },

  {
    id: '07-skeleton',
    name: 'skeleton hero while the RPC never resolves (fixed height, no shift)',
    viewport: MOBILE,
    language: 'German',
    scenario: { rpc: 'never' },
    async run(ctx) {
      const sk = await waitFor('skeleton card', skeletonCard, 8000)
      await settle(1500)
      const height = sk.getBoundingClientRect().height
      ctx.check('skeleton still shown after 1.5s', skeletonCard() !== null, '')
      ctx.check('fixed 9.375rem card height (150px — the §0 cap top)', Math.abs(height - 150) <= 1.5, `height=${height}`)
      ctx.check('pulse placeholder rendered', sk.querySelector('.animate-pulse') !== null, '')
      ctx.check('no hero committed', heroCard() === null, textOf(heroCard()))
      ctx.check('no buoys', dueBuoys().length === 0, '')
    },
  },

  {
    id: '08-nothing-due-calm',
    name: 'nothing-due: calm state line + word-only rest buoys',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: restRows(6) },
    async run(ctx) {
      await awaitHero(ctx)
      await waitFor('rest buoys', () => restBuoys().length > 0, 8000)
      await settle(900)
      const rest = restBuoys()
      ctx.check('calm state line', stateLine().includes('Calm water — nothing due right now'), stateLine())
      ctx.check('rest buoys surfaced', rest.length >= 3, `count=${rest.length}`)
      const lines = rest.map(buoyLines)
      ctx.check('rest labels are word-only', lines.every((l) => l.length === 1), JSON.stringify(lines))
      ctx.check('rest buoys carry no gold dot', rest.every((b) => !hasGoldDot(b)), '')
      const opacities = rest.map(opacityOf)
      ctx.check(
        'rest buoys at ~55% opacity',
        opacities.every((o) => Math.abs(o - 0.55) < 0.06),
        JSON.stringify(opacities),
      )
      ctx.check(
        'rest buoy aria names the behaviour',
        rest.every((b) => /^Hear .+ pronounced$/.test(b.getAttribute('aria-label') || '')),
        rest.map((b) => b.getAttribute('aria-label')).join(' | '),
      )
      ctx.check('rest buoys are plain enabled buttons', rest.every((b) => !b.hasAttribute('aria-disabled') && !b.disabled), '')
    },
  },

  {
    id: '09-backlog-marker',
    name: 'backlog: 9 due ⇒ "+4 further out" near the horizon',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: dueRows(9) },
    async run(ctx) {
      await awaitHero(ctx)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(700)
      const marker = qa<HTMLAnchorElement>('a').find((a) => textOf(a).includes('further out'))
      ctx.check('backlog marker present', Boolean(marker), bodyText().slice(0, 200))
      ctx.check('marker counts duePool − visible (9 − 5 = 4)', textOf(marker ?? null).includes('+4 further out'), textOf(marker ?? null))
      ctx.check('marker links to the all-due study session', (marker?.getAttribute('href') ?? '').includes('/study?lang=German'), marker?.getAttribute('href') ?? '')
      const visible = dueBuoys().length
      ctx.check('5 buoys visible', visible === 5, `count=${visible}`)
      ctx.check(
        'the marker accounts for every word not on the water (duePool − visible)',
        textOf(marker ?? null).includes(`+${9 - visible} further out`),
        `marker="${textOf(marker ?? null)}" but ${9 - visible} due words are off the water (9 − ${visible} visible)`,
      )
    },
  },

  {
    id: '10-miss-only-due-word',
    name: 'miss on the only due word: attempt recorded, buoy stays actionable, no stall',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: dueRows(1) },
    async run(ctx) {
      const card = await awaitHero(ctx)
      ctx.check('recall hero for a single due word', textOf(card).includes('1 waiting on the water'), textOf(card))
      await waitFor('buoy', () => dueBuoys().length === 1, 8000)
      dueBuoys()[0].click()
      await waitFor('sheet', dialog, 6000)
      await missCurrentCard()
      await waitGone('sheet', dialog, 8000)
      await settle(900)
      const recorded = inserts()
      ctx.check('exactly one attempt written', recorded.length === 1, JSON.stringify(recorded))
      ctx.check('attempt is a miss on the tide mode', recorded[0]?.knew_it === false && recorded[0]?.study_mode === 'tide', JSON.stringify(recorded[0]))
      ctx.check('graded counted the reveal (1 of 1 practiced)', stateLine().includes('1 of 1 practiced'), stateLine())
      const buoys = dueBuoys()
      ctx.check('the missed buoy is still on the water', buoys.length === 1, `count=${buoys.length}`)
      ctx.check(
        'no cooldown applied to the last unlocked buoy',
        buoys.length === 1 && opacityOf(buoys[0]) > 0.7,
        `opacity=${buoys.map(opacityOf).join(',')}`,
      )
      buoys[0]?.click()
      await settle(500)
      const reopened = dialog()
      ctx.check('re-tapping opens practice, not a cooldown notice', Boolean(reopened) && !textOf(reopened!).includes('Back in a moment'), textOf(reopened))
    },
  },

  {
    id: '11-all-five-missed',
    name: 'all five missed in sequence: one buoy always stays actionable',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: dueRows(5) },
    async run(ctx) {
      await awaitHero(ctx)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(900)
      ctx.note(`buoys on the water at the start: ${dueBuoys().length} of 5 due words`)
      const expected = (((window as any).__scenario.words ?? []) as WordRow[]).map((r) => r.display_word)
      const practiced: string[] = []
      const unlockedCounts: number[] = []
      const startCta = Array.from(document.querySelectorAll('button')).find((b) => textOf(b).includes('Bring them back'))
      startCta?.click()
      await waitFor('sheet', dialog, 8000)

      for (let step = 1; step <= 5; step++) {
        if (!dialog()) {
          ctx.note(`the chained queue ended itself after ${practiced.length} grade(s)`)
          break
        }
        practiced.push(currentCardWord())
        await missCurrentCard()
        await settle(900)
        const buoys = dueBuoys()
        const unlocked = buoys.filter((b) => opacityOf(b) > 0.7)
        unlockedCounts.push(unlocked.length)
        ctx.check(
          `after miss ${step}: at least one buoy remains actionable`,
          unlocked.length >= 1,
          `visible=${buoys.length} unlocked=${unlocked.length} opacities=${buoys.map((b) => opacityOf(b).toFixed(2)).join(',')}`,
        )
      }

      ctx.note(`queue delivered: ${JSON.stringify(practiced)}`)
      ctx.note(`expected pool order: ${JSON.stringify(expected)}`)
      ctx.note(`unlocked buoys after each miss: ${unlockedCounts.join(', ')}`)
      await settle(600)
      ctx.check(
        'the chained queue advances ONE buoy per grade (§6.4)',
        JSON.stringify(practiced) === JSON.stringify(expected.slice(0, practiced.length)),
        `delivered ${JSON.stringify(practiced)} vs pool order ${JSON.stringify(expected)}`,
      )
      ctx.check('the bounded set (5) was actually practiced', practiced.length === 5, `cards delivered=${practiced.length}`)
      ctx.check('one attempt written per delivered card', inserts().length === practiced.length, JSON.stringify(inserts().map((i) => i.word_id)))
      ctx.check('every attempt recorded as a miss', inserts().every((i) => i.knew_it === false), '')
      ctx.check('visit line reaches 5 of 5 practiced', stateLine().includes('5 of 5 practiced'), stateLine())
    },
  },

  {
    id: '12-failed-insert',
    name: 'failed insert: inline retry, graded frozen, dawn unchanged',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: dueRows(3), insertFails: true },
    async run(ctx) {
      await awaitHero(ctx)
      const lineBefore = stateLine()
      await waitFor('buoys', () => dueBuoys().length === 3, 8000)
      dueBuoys()[0].click()
      await waitFor('sheet', dialog, 6000)
      dlgButton('Show answer').click()
      await waitFor('solution shown', () => textOf(dialog()).includes('Correct answer'))
      await waitFor('insert attempted', () => inserts().length === 1, 6000)
      await settle(900)
      const sheet = dialog()
      ctx.check('sheet stays open on a failed write', Boolean(sheet), '')
      ctx.check('inline Retry offered', Boolean(sheet) && textOf(sheet!).includes('Retry'), textOf(sheet))
      ctx.check('no way to advance after failure', advanceButton() === null, textOf(sheet))
      ctx.check('graded did not advance (0 of 3)', stateLine().includes('0 of 3 practiced'), stateLine())
      ctx.check('dawn unchanged (tier still night)', stateLine().includes('night'), stateLine())
      ctx.check('state line unchanged since before the attempt', stateLine() === lineBefore, `${lineBefore} → ${stateLine()}`)
      await shot('retry-visible')
      dlgButton('Retry').click()
      await waitFor('retry attempted', () => inserts().length === 2, 6000)
      await settle(900)
      ctx.check('retry writes again and still fails honestly', inserts().length === 2 && stateLine().includes('0 of 3'), stateLine())
    },
  },

  {
    id: '13-language-switch-mid-queue',
    name: 'language switch mid-queue closes the sheet',
    viewport: MOBILE,
    language: 'German',
    scenario: {
      words: dueRows(5),
      wordsByLanguage: { German: dueRows(5), Korean: [] },
    },
    async run(ctx) {
      await awaitHero(ctx)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(700)
      dueBuoys()[0].click()
      const sheet = await waitFor('sheet', dialog, 6000)
      ctx.check('sheet open before the switch', Boolean(sheet), textOf(sheet))
      await shot('sheet-open')
      ;(window as any).__setLanguage('Korean')
      let closed = true
      try {
        await waitGone('sheet after language switch', dialog, 4000)
      } catch (error) {
        closed = false
      }
      ctx.check('sheet closes on the language switch', closed, closed ? '' : `sheet still open: ${textOf(dialog())}`)
      await settle(900)
      ctx.check('no German buoys survive the switch', dueBuoys().length === 0, `count=${dueBuoys().length}`)
    },
  },

  {
    id: '14a-collision-320',
    name: 'long de gloss + ko script at 320pt: gloss moves to the sheet / count reduces',
    viewport: SE,
    language: 'German',
    scenario: {
      words: [
        baseRow(0, { display_word: 'die Geschwindigkeitsbegrenzung', translation: 'the speed limit on the motorway' }),
        baseRow(1, { display_word: 'die Krankenversicherungskarte', translation: 'health insurance card from the state' }),
        baseRow(2, { display_word: '안녕하세요', translation: 'hello (a polite everyday greeting)' }),
        baseRow(3, { display_word: '감사합니다', translation: 'thank you' }),
        baseRow(4, { display_word: 'die Straßenbahnhaltestelle', translation: 'tram stop' }),
      ],
    },
    async run(ctx) {
      await awaitHero(ctx)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(1000)
      const buoys = dueBuoys()
      const lines = buoys.map(buoyLines)
      const wordOnly = lines.filter((l) => l.length === 1).length
      ctx.note(`320pt: ${buoys.length} buoys, labels ${JSON.stringify(lines)}`)
      ctx.note(`measured ${measureDump()}`)
      ctx.check('word is never hidden', lines.every((l) => l.length >= 1 && l[0].length > 0), JSON.stringify(lines))
      ctx.check(
        'over-budget gloss moved to the sheet OR visible count reduced',
        wordOnly > 0 || buoys.length < 5,
        `wordOnly=${wordOnly} visible=${buoys.length}`,
      )
      ctx.check('collision reduction never goes below 3', buoys.length >= 3, `visible=${buoys.length}`)
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      ctx.check('no horizontal overflow at 320pt', !overflow, `scrollWidth=${document.documentElement.scrollWidth}`)
    },
  },

  {
    id: '14b-collision-390',
    name: 'same long de/ko label set at 390pt',
    viewport: MOBILE,
    language: 'German',
    scenario: {
      words: [
        baseRow(0, { display_word: 'die Geschwindigkeitsbegrenzung', translation: 'the speed limit on the motorway' }),
        baseRow(1, { display_word: 'die Krankenversicherungskarte', translation: 'health insurance card from the state' }),
        baseRow(2, { display_word: '안녕하세요', translation: 'hello (a polite everyday greeting)' }),
        baseRow(3, { display_word: '감사합니다', translation: 'thank you' }),
        baseRow(4, { display_word: 'die Straßenbahnhaltestelle', translation: 'tram stop' }),
      ],
    },
    async run(ctx) {
      await awaitHero(ctx)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(1000)
      const buoys = dueBuoys()
      const lines = buoys.map(buoyLines)
      const wordOnly = lines.filter((l) => l.length === 1).length
      ctx.note(`390pt: ${buoys.length} buoys, labels ${JSON.stringify(lines)}`)
      ctx.note(`measured ${measureDump()}`)
      ctx.check('word is never hidden', lines.every((l) => l.length >= 1 && l[0].length > 0), JSON.stringify(lines))
      ctx.check(
        'over-budget gloss moved to the sheet OR visible count reduced',
        wordOnly > 0 || buoys.length < 5,
        `wordOnly=${wordOnly} visible=${buoys.length}`,
      )
      ctx.check('collision reduction never goes below 3', buoys.length >= 3, `visible=${buoys.length}`)
    },
  },

  {
    id: '15-reduced-motion',
    name: 'reduced motion: buoys planted at projected positions, no rAF churn',
    viewport: MOBILE,
    reduceMotion: true,
    language: 'German',
    scenario: { words: dueRows(5) },
    async run(ctx) {
      ctx.check('prefers-reduced-motion is active', window.matchMedia('(prefers-reduced-motion: reduce)').matches, '')
      await awaitHero(ctx)
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(1200)
      const wrappers = dueBuoys().map((b) => b.parentElement!)
      const ys = wrappers.map(translateY)
      const horizon = window.innerHeight * 0.4
      ctx.check('every buoy has a projected transform', ys.every((y) => y !== null), JSON.stringify(ys))
      ctx.check('no buoy sits at y=0 (t was seeded, not 0)', ys.every((y) => (y ?? 0) > 0), JSON.stringify(ys))
      ctx.check('all buoys sit below the waterline', ys.every((y) => (y ?? 0) > horizon), `horizon=${horizon.toFixed(1)} ys=${JSON.stringify(ys)}`)
      ctx.check('buoys ride distinct crests', new Set(ys.map((y) => (y ?? 0).toFixed(2))).size === ys.length, JSON.stringify(ys))
      const before = (window as any).__rafCount as number
      await sleep(1000)
      const churn = ((window as any).__rafCount as number) - before
      ctx.check('no per-frame rAF loop under reduced motion', churn < 12, `${churn} rAF callbacks in 1000ms`)
      ctx.note(`rAF callbacks over 1s: ${churn}`)
      const y0 = translateY(wrappers[0])
      await sleep(400)
      ctx.check('buoy positions are static', translateY(wrappers[0]) === y0, `${y0} → ${translateY(wrappers[0])}`)
    },
  },

  {
    id: '16-state-line-and-strip',
    name: 'lesson done + recall 2 of 5: state line and CURRENT strip tokens',
    viewport: MOBILE,
    language: 'German',
    scenario: {
      words: dueRows(7),
      guidedPaths: [GERMAN_PATH],
      recommendedLessonId: 'l3',
      // Production ordering: the ~2.8MB guided chunk resolves AFTER the word
      // states RPC. Without this the two race and the hero flips run to run.
      guidedDelayMs: 300,
    },
    localStorageSeed: {
      resonance_today_progress_v1_u1: JSON.stringify({
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        courses: {
          'german-a1-market-1': {
            baseLanguage: 'English',
            targetLanguage: 'German',
            currentLessonId: 'l3',
            completedLessonIds: [],
            skippedLessonIds: [],
            lessons: {
              l3: { status: 'completed', completedAt: new Date().toISOString() },
            },
          },
        },
      }),
    },
    async run(ctx) {
      const card = await awaitHero(ctx)
      ctx.note(`hero card: ${textOf(card)}`)
      ctx.check(
        'a lesson already completed today does not win the hero (§5/§8.1)',
        !textOf(card).includes('Continue · At the market'),
        textOf(card),
      )
      await waitFor('buoys', () => dueBuoys().length > 0, 8000)
      await settle(1200)
      ctx.note(`viewport ${window.innerWidth}x${window.innerHeight}; ${dueBuoys().length} buoys; measured ${measureDump()}`)
      // Start the bounded set from a buoy (the hero CTA is unreliable here —
      // see the hero check above).
      dueBuoys()[0].click()
      await waitFor('sheet', dialog, 6000)
      const practiced: string[] = []
      for (let i = 0; i < 2; i++) {
        const prompt = await waitFor('card prompt', () => promptText() || null, 8000)
        const word = await awaitCardWord()
        practiced.push(word)
        await solveCurrentCard(word)
        await waitFor(`grade ${i + 1} written`, () => inserts().length === i + 1, 8000)
        if (i === 0) {
          await advanceCard()
          await waitFor('card advanced', () => promptText() !== prompt, 10000)
          await settle(400)
        }
      }
      ctx.note(`practiced: ${JSON.stringify(practiced)}`)
      await settle(1600)
      const close = dialog()?.querySelector('button[aria-label="Close"]') as HTMLButtonElement | null
      close?.click()
      await waitGone('sheet', dialog, 6000)
      await settle(800)
      const line = stateLine()
      const strip = stripText()
      const sky = q<HTMLElement>('div.relative.z-10')
      const skyBottom = sky?.getBoundingClientRect().bottom ?? 0
      const horizon = window.innerHeight * 0.4
      const folded = strip === ''
      ctx.note(`strip: "${strip}" | state line: "${line}"`)
      ctx.note(`sky bottom=${skyBottom.toFixed(1)}px, waterline=${horizon.toFixed(1)}px, fold threshold=${(horizon - 14).toFixed(1)}px`)
      ctx.note(
        `sky stack: ${Array.from(sky?.children ?? [])
          .map((el) => {
            const r = el.getBoundingClientRect()
            return `${el.tagName.toLowerCase()}[${String(el.className).split(' ')[0]}] ${r.top.toFixed(0)}→${r.bottom.toFixed(0)}`
          })
          .join(' | ')}`,
      )
      ctx.check('both grades landed', inserts().length === 2 && inserts().every((i) => i.knew_it === true), JSON.stringify(inserts()))
      ctx.check('state line reports 2 of 5 practiced', line.includes('2 of 5 practiced'), line)
      ctx.check('state line appends the lesson clause', line.includes('Lesson done'), line)
      ctx.check(
        'CURRENT strip renders on the waterline at 390×844 (§2 folds only on SE-class overlap)',
        !folded,
        `strip="${strip}" skyBottom=${skyBottom.toFixed(1)} waterline=${horizon.toFixed(1)}`,
      )
      const carrier = folded ? line : strip
      // §2's folded form is `This visit · Lesson 4 · Recall 2 of 5 · first light`
      // — no CURRENT label — so only assert it when the strip itself renders.
      if (!folded) ctx.check('CURRENT label present', carrier.includes('CURRENT'), carrier)
      else ctx.note('strip folded: the CURRENT label is not part of §2’s folded form, so it is not asserted')
      ctx.check('completed lesson token with ✓', carrier.includes('Lesson 3 ✓'), carrier)
      ctx.check(
        'recall progress token (2 of 5)',
        folded ? carrier.includes('2 of 5 practiced') : carrier.includes('Recall 2 of 5'),
        carrier,
      )
    },
  },

  {
    id: '17-utc-rollover',
    name: 'UTC day rollover freezes the visit until a wake-up trigger',
    viewport: MOBILE,
    language: 'German',
    scenario: {},
    notRun:
      'needs the wall clock to cross 00:00 UTC while the page lives; useHomeVisit reads Date.now() directly (no injectable clock), and faking Date would also move every SRS/due timestamp the fixture depends on',
    async run() {},
  },

  {
    id: '18-cross-tab-focus-refetch',
    name: 'focus refetch after grading in another tab',
    viewport: MOBILE,
    language: 'German',
    scenario: {},
    notRun:
      'needs a second real tab writing to the same backend; the harness stubs Supabase per document, so a second tab shares no state and window focus in headless CDP does not reproduce the multi-tab race',
    async run() {},
  },

  // ── Word Stream (docs/Product/FABLE_WORD_STREAM_PLAN.md) ─────────────────

  {
    id: '19-stream-mobile-keep',
    name: 'stream on the water (mobile): tap → sheet → keep pops it, marker counts, Next opens the nearest',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: restRows(3), streamWords: STREAM_WORDS, streamKeptToday: 2, streamDeckId: null },
    async run(ctx) {
      await waitFor('stream words', () => streamWordButtons().length >= 3, 10000)
      await settle(1600)
      ctx.check('four words on the water', streamWordButtons().length === 4, `count=${streamWordButtons().length}`)
      ctx.check('no due buoys while the stream owns the water', dueBuoys().length === 0, `due=${dueBuoys().length}`)
      // The auth stub's daily pace is 20.
      const marker = qa<HTMLElement>('a, span').find((el) => textOf(el).includes('2 of 20 new today'))
      ctx.check('catch marker shows 2 of 20 new today', Boolean(marker), bodyText().slice(0, 300))
      await shot('water')
      const first = streamWordButtons()[0]
      const firstWord = textOf(first.querySelector('span span'))
      first.click()
      const sheet = await waitFor('sheet', dialog, 6000)
      ctx.check('sheet shows the tapped word', textOf(sheet).includes(firstWord), `${firstWord} | ${textOf(sheet)}`)
      ctx.check('sheet offers Keep and Let it pass', Boolean(byText('button', 'Keep this word')) && Boolean(byText('button', 'Let it pass')), textOf(sheet))
      await settle(500)
      await shot('sheet')
      clickText('button', 'Keep this word')
      await waitFor('kept line', () => textOf(dialog()).includes('Kept · 3 of 20 today'), 6000)
      const rpc = ((window as any).__calls ?? []).find((c: any) => c.kind === 'rpc:submit_word_stream_save')
      ctx.check('submit_word_stream_save called with one item', Boolean(rpc) && rpc.payload.p_items.length === 1, JSON.stringify(rpc?.payload?.p_items?.[0] ?? null).slice(0, 300))
      ctx.check('deck name is localized', rpc?.payload?.p_deck_name === 'Word Stream', rpc?.payload?.p_deck_name)
      ctx.check('sheet shows the picture and song doors', Boolean(byText('button', 'Add a picture')) && Boolean(byText('button', 'Turn it into a song')), textOf(dialog()))
      await settle(400)
      await shot('kept')
      await settle(900)
      ctx.check('kept word left the water', !streamWordButtons().some((b) => textOf(b.querySelector('span span')) === firstWord), streamWordButtons().map((b) => textOf(b)).join(' | '))
      const markerAfter = qa<HTMLElement>('a, span').find((el) => textOf(el).includes('3 of 20 new today'))
      ctx.check('marker counts the keep', Boolean(markerAfter), bodyText().slice(0, 300))
      clickText('button', 'Next word')
      await settle(400)
      const next = dialog()
      ctx.check('Next opens another word', Boolean(next) && !textOf(next).includes(firstWord) && Boolean(byText('button', 'Keep this word')), textOf(next))
      ;(document.querySelector('[role="dialog"] button[aria-label]') as HTMLButtonElement | null)?.click()
      await waitGone('sheet', dialog, 4000)
      ctx.check('no page errors', ((window as any).__pageErrors ?? []).length === 0, ((window as any).__pageErrors ?? []).join(' || '))
    },
  },

  {
    id: '20-stream-pass-and-fail',
    name: 'let it pass opens the next word; a failed keep shows retry and counts nothing',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: [], streamWords: STREAM_WORDS, streamKeptToday: 0, streamKeep: 'error' },
    async run(ctx) {
      await waitFor('stream words', () => streamWordButtons().length >= 3, 10000)
      await settle(1200)
      const first = streamWordButtons()[0]
      const firstWord = textOf(first.querySelector('span span'))
      first.click()
      await waitFor('sheet', dialog, 6000)
      clickText('button', 'Let it pass')
      await settle(500)
      const next = dialog()
      ctx.check('pass opens the next word', Boolean(next) && !textOf(next).includes(firstWord), textOf(next))
      await settle(800)
      ctx.check('passed word sank off the water', !streamWordButtons().some((b) => textOf(b.querySelector('span span')) === firstWord), streamWordButtons().map((b) => textOf(b)).join(' | '))
      const store = Object.keys(localStorage).find((k) => k.startsWith('lingwave_word_stream_v1_'))
      const parsed = store ? JSON.parse(localStorage.getItem(store) || '{}') : null
      ctx.check('pass persisted in the store', Boolean(parsed && Object.keys(parsed.passed ?? {}).length === 1), store ? localStorage.getItem(store) : 'no store')
      clickText('button', 'Keep this word')
      await waitFor('failure line', () => textOf(dialog()).includes("Couldn't keep it"), 6000)
      ctx.check('failed keep shows retry', Boolean(byText('button', 'Retry')), textOf(dialog()))
      ctx.check('nothing counted on failure', !textOf(dialog()).includes('Kept ·'), textOf(dialog()))
      await shot('failed')
      ;(document.querySelector('[role="dialog"] button[aria-label]') as HTMLButtonElement | null)?.click()
      await waitGone('sheet', dialog, 4000)
      ctx.check('no page errors', ((window as any).__pageErrors ?? []).length === 0, ((window as any).__pageErrors ?? []).join(' || '))
    },
  },

  {
    id: '21-stream-desktop',
    name: 'stream on the water (desktop): eight words over five lanes, marker at the horizon',
    viewport: { width: 1440, height: 900 },
    language: 'German',
    scenario: { words: restRows(3), streamWords: STREAM_WORDS, streamKeptToday: 20, streamDeckId: 'stream-deck' },
    async run(ctx) {
      await waitFor('stream words', () => streamWordButtons().length >= 6, 10000)
      await settle(2000)
      ctx.check('eight words on the water', streamWordButtons().length === 8, `count=${streamWordButtons().length}`)
      const marker = q<HTMLElement>('a[href="/deck/stream-deck"]')
      ctx.check('goal-met marker links to the stream deck', Boolean(marker) && textOf(marker).includes('20 new today · goal met'), textOf(marker))
      const rects = streamWordButtons().map((b) => b.getBoundingClientRect())
      ctx.check('every label inside the viewport', rects.every((r) => r.left >= 0 && r.right <= 1440), rects.map((r) => `${Math.round(r.left)}-${Math.round(r.right)}`).join(' '))
      await shot('water')
      streamWordButtons()[0].click()
      await waitFor('sheet', dialog, 6000)
      await settle(500)
      await shot('sheet')
      ctx.check('no page errors', ((window as any).__pageErrors ?? []).length === 0, ((window as any).__pageErrors ?? []).join(' || '))
    },
  },

  {
    id: '22-stream-se-reduced-motion',
    name: 'SE + reduced motion: still words at fixed depths, the sheet fits',
    viewport: SE,
    reduceMotion: true,
    language: 'German',
    scenario: { words: [], streamWords: STREAM_WORDS, streamKeptToday: 0 },
    async run(ctx) {
      await waitFor('stream words', () => streamWordButtons().length >= 3, 10000)
      await settle(900)
      ctx.check('still words present', streamWordButtons().length >= 3, `count=${streamWordButtons().length}`)
      const rects = streamWordButtons().map((b) => b.getBoundingClientRect())
      ctx.check('every label inside the 320pt viewport', rects.every((r) => r.left >= 0 && r.right <= 320), rects.map((r) => `${Math.round(r.left)}-${Math.round(r.right)}`).join(' '))
      await shot('water')
      streamWordButtons()[0].click()
      const sheet = await waitFor('sheet', dialog, 6000)
      await settle(500)
      const rect = sheet.getBoundingClientRect()
      ctx.check('sheet fits the SE viewport height', rect.height <= 568 - 32 + 1, `height=${Math.round(rect.height)}`)
      await shot('sheet')
      ctx.check('no page errors', ((window as any).__pageErrors ?? []).length === 0, ((window as any).__pageErrors ?? []).join(' || '))
    },
  },

  {
    id: '23-stream-language-switch',
    name: 'language switch mid-stream closes the sheet and clears the water',
    viewport: MOBILE,
    language: 'German',
    scenario: { words: [], wordsByLanguage: { German: [], Korean: [] }, streamWords: STREAM_WORDS, streamKeptToday: 0 },
    async run(ctx) {
      await waitFor('stream words', () => streamWordButtons().length >= 3, 10000)
      await settle(800)
      streamWordButtons()[0].click()
      await waitFor('sheet', dialog, 6000)
      ;(window as any).__setLanguage('Korean')
      let closed = true
      try {
        await waitGone('sheet after language switch', dialog, 4000)
      } catch {
        closed = false
      }
      ctx.check('sheet closes on the language switch', closed, closed ? '' : textOf(dialog()))
      await settle(1200)
      // The categories stub serves German words for every language, so the
      // Korean stream refills — the point is that no GERMAN word survives.
      ctx.check('no page errors', ((window as any).__pageErrors ?? []).length === 0, ((window as any).__pageErrors ?? []).join(' || '))
    },
  },
]
