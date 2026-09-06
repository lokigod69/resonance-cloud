import { bodyText, byText, pressKey, q, qa, shot, sleep, waitFor } from './utils'
import type { FixtureScenario } from './stubs/scenario'

type Fixture = {
  id: string
  name: string
  viewport: { width: number; height: number }
  reduceMotion?: boolean
  scenario: FixtureScenario
  localStorageSeed?: Record<string, string>
  run: (ctx: { check: (name: string, ok: boolean, detail?: unknown) => boolean; note: (text: string) => void }) => Promise<void>
}

const view = (width: number, height: number) => ({ width, height })
const enSpeak: FixtureScenario = { kind: 'speak', locale: 'en', baseLanguage: 'English', activeLanguage: 'German' }
const deSpeak: FixtureScenario = { kind: 'speak', locale: 'de', baseLanguage: 'German', activeLanguage: 'German' }
const frSpeak: FixtureScenario = { kind: 'speak', locale: 'fr', baseLanguage: 'French', activeLanguage: 'German' }
const readySeed = {
  'speak-last-setup-de': JSON.stringify({ kind: 'grok', voice: 'eve', category: 'travel' }),
  'voice-tutor-level-de': 'beginner',
}

async function waitSpeak() {
  await waitFor('Speak selection shell', () => q('.speak-page-shell'))
  await sleep(100)
}

async function checkViewport(ctx: Parameters<Fixture['run']>[0]) {
  ctx.check('document fits viewport width', document.documentElement.scrollWidth <= innerWidth, `${document.documentElement.scrollWidth}/${innerWidth}`)
}

function historyButton() {
  return qa<HTMLButtonElement>('button').find((button) => (button.title || '').toLowerCase().includes('history') || (button.title || '').includes('Verlauf') || (button.title || '').includes('Historique'))
}

async function runListenReplay(
  ctx: Parameters<Fixture['run']>[0],
  labels: { browse: string; reveal: string; replay: string },
) {
  const w = window as unknown as { __replayCalls: number }
  await waitSpeak()
  ;(await waitFor('tutor browser', () => byText('button', labels.browse))).click()
  const tutorButton = await waitFor('style tutor', () => q<HTMLButtonElement>('#speak-browse-panel button'))
  tutorButton.click()
  await waitFor('async Speak chat', () => q('.speak-chat-shell'))
  const reveal = await waitFor('listen-mode reveal', () => q<HTMLButtonElement>('button[data-speak-reveal]'))
  ctx.check('listen-mode reveal is visible and localized', reveal.textContent?.includes(labels.reveal) === true && reveal.getClientRects().length > 0 && getComputedStyle(reveal).opacity !== '0', reveal.outerHTML)
  await shot('listen-hint')
  reveal.focus()
  await pressKey('Enter', 'button[data-speak-reveal]')
  const replay = await waitFor('retained audio replay', () => q<HTMLButtonElement>('button[data-speak-replay]'))
  ctx.check('replay is a native button with localized text', replay.tagName === 'BUTTON' && replay.textContent?.includes(labels.replay) === true, replay.outerHTML)
  replay.focus()
  await pressKey('Enter', 'button[data-speak-replay]')
  await waitFor('replay activation', () => w.__replayCalls === 1)
  ctx.check('Enter activates retained audio replay', w.__replayCalls === 1, w.__replayCalls)
  await shot('replay')
}

export const FIXTURES: Fixture[] = [
  {
    id: '01-speak-casting-320-en', name: 'Speak first-run casting at 320px (EN)', viewport: view(320, 760), scenario: enSpeak,
    async run(ctx) {
      await waitSpeak()
      ctx.check('Live door is the primary first-run choice', Boolean(byText('button', 'Live conversation')), bodyText())
      ctx.check('tutor browser is available', Boolean(byText('button', 'Browse tutors & voices')), bodyText())
      await checkViewport(ctx)
      await shot('casting')
    },
  },
  {
    id: '02-speak-ready-390-de', name: 'Speak returning-user ready room at 390px (DE)', viewport: view(390, 844), scenario: deSpeak, localStorageSeed: readySeed,
    async run(ctx) {
      await waitSpeak()
      ctx.check('ready room offers one-tap resume', Boolean(byText('button', 'Los sprechen')), bodyText())
      ctx.check('remembered level is visible', bodyText().includes('Anfänger'), bodyText())
      await checkViewport(ctx)
      await shot('ready')
    },
  },
  {
    id: '03-speak-active-1440-fr', name: 'Speak active Live session at desktop (FR)', viewport: view(1440, 900), scenario: frSpeak, localStorageSeed: readySeed,
    async run(ctx) {
      await waitSpeak()
      const start = await waitFor('French start button', () => byText('button', 'Commencer à parler'))
      start.click()
      await waitFor('active Speak shell', () => q('.speak-chat-shell'))
      ctx.check('active session exposes the mic CTA', Boolean(q('button[aria-label="Appuyer pour parler"]') || q('button[aria-label*="parler"]')), bodyText())
      await checkViewport(ctx)
      await shot('active')
    },
  },
  {
    id: '04-speak-history-390-en', name: 'Speak history modal keyboard contract at 390px', viewport: view(390, 844), scenario: enSpeak,
    async run(ctx) {
      await waitSpeak()
      const opener = await waitFor('history opener', historyButton)
      opener.focus()
      opener.click()
      const dialog = await waitFor('history dialog', () => q<HTMLElement>('.speak-history-panel[role="dialog"]'))
      await waitFor('history rows', () => q('[role="button"][tabindex="0"]'))
      ctx.check('background is inert while history is open', Boolean(document.getElementById('root')?.inert))
      const focusable = qa<HTMLElement>('.speak-history-panel button:not([disabled]), .speak-history-panel [tabindex="0"]')
        .filter((element) => element.getClientRects().length > 0)
      focusable.at(-1)?.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      ctx.check('Tab wraps within history', document.activeElement === focusable[0], (document.activeElement as HTMLElement | null)?.outerHTML)
      await shot('history')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitFor('history closes', () => !q('.speak-history-panel'))
      await sleep(20)
      ctx.check('root inert is restored after close', !document.getElementById('root')?.inert)
      ctx.check('focus returns to history opener', document.activeElement === opener, (document.activeElement as HTMLElement | null)?.outerHTML)
      void dialog
    },
  },
  {
    id: '05-speak-extract-390-en', name: 'Speak nested extract modal at 390px', viewport: view(390, 844), scenario: enSpeak,
    async run(ctx) {
      await waitSpeak()
      const historyOpener = await waitFor('history opener', historyButton)
      historyOpener.focus()
      historyOpener.click()
      ;(await waitFor('history conversation', () => q<HTMLElement>('.speak-history-panel [role="button"][tabindex="0"]'))).click()
      const extract = await waitFor('extract words action', () => byText('.speak-history-panel button', 'Extract words'))
      extract.click()
      const dialog = await waitFor('extract modal', () => q<HTMLElement>('[aria-labelledby="speak-extract-title"]'))
      ctx.check('extract owns modal focus', dialog.contains(document.activeElement), (document.activeElement as HTMLElement | null)?.outerHTML)
      ctx.check('history is suspended below nested modal', q('.speak-history-panel')?.hasAttribute('inert') === true)
      ctx.check('app remains inert below nested modal', document.getElementById('root')?.inert === true)
      await shot('extract')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitFor('extract closes', () => !q('[aria-labelledby="speak-extract-title"]'))
      await sleep(20)
      ctx.check('focus returns inside history', Boolean(q('.speak-history-panel')?.contains(document.activeElement)))
      ctx.check('app remains inert while history resumes', document.getElementById('root')?.inert === true)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitFor('history closes after nested modal', () => !q('.speak-history-panel'))
      await sleep(20)
      ctx.check('nested modal stack restores root inert state', document.getElementById('root')?.inert === false)
      ctx.check('nested modal stack restores the original opener', document.activeElement === historyOpener, (document.activeElement as HTMLElement | null)?.outerHTML)

      historyOpener.click()
      ;(await waitFor('history conversation after reopen', () => q<HTMLElement>('.speak-history-panel [role="button"][tabindex="0"]'))).click()
      ;(await waitFor('extract words after reopen', () => byText('.speak-history-panel button', 'Extract words'))).click()
      await waitFor('nested modal stack after reopen', () => q('[aria-labelledby="speak-extract-title"]'))
      const w = window as unknown as { __unmountApp: () => void }
      w.__unmountApp()
      await waitFor('app unmounts nested modal stack', () => !q('.speak-history-panel') && !q('[aria-labelledby="speak-extract-title"]'))
      ctx.check('simultaneous nested unmount releases root inert ownership', document.getElementById('root')?.inert === false)
    },
  },
  {
    id: '06-speak-reduced-motion-390-en', name: 'Speak reduced-motion ready room at 390px', viewport: view(390, 844), scenario: enSpeak, localStorageSeed: readySeed, reduceMotion: true,
    async run(ctx) {
      await waitSpeak()
      const button = await waitFor('ready CTA', () => byText('button', 'Start talking'))
      const before = getComputedStyle(button).transform
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      const after = getComputedStyle(button).transform
      ctx.check('reduced motion removes hover transform', before === after && (after === 'none' || after === 'matrix(1, 0, 0, 1, 0, 0)'), `${before} -> ${after}`)
      await shot('reduced-motion')
    },
  },
  {
    id: '07-speak-replay-390-en', name: 'Speak EN listen/replay controls are keyboard operable', viewport: view(390, 844), scenario: { ...enSpeak, speakListenMode: true },
    async run(ctx) {
      await runListenReplay(ctx, { browse: 'Browse tutors & voices', reveal: 'Tap to reveal', replay: 'Tap to hear' })
    },
  },
  {
    id: '08-speak-replay-390-de', name: 'Speak DE listen/replay controls are keyboard operable', viewport: view(390, 844), scenario: { ...deSpeak, speakListenMode: true },
    async run(ctx) {
      await runListenReplay(ctx, { browse: 'Tutoren & Stimmen durchstöbern', reveal: 'Tippen zum Anzeigen', replay: 'Tippen zum Anhören' })
    },
  },
  {
    id: '09-speak-replay-390-fr', name: 'Speak FR listen/replay controls are keyboard operable', viewport: view(390, 844), scenario: { ...frSpeak, speakListenMode: true },
    async run(ctx) {
      await runListenReplay(ctx, { browse: 'Parcourir les tuteurs et voix', reveal: 'Appuie pour afficher', replay: 'Appuie pour écouter' })
    },
  },
  ...(['high', 'low', 'safety', 'error'] as const).map((lensResult, index): Fixture => ({
    id: `${10 + index}-lens-${lensResult}-390-en`,
    name: `Lens ${lensResult} state at 390px (EN)`,
    viewport: view(390, 844),
    scenario: { kind: 'lens', locale: 'en', baseLanguage: 'English', activeLanguage: 'German', lensResult },
    async run(ctx) {
      await waitFor('camera ready', () => q('.lens-shell[data-lens-state="camera_ready"]'))
      q<HTMLButtonElement>('.lens-shutter')?.click()
      await waitFor('Lens analyzing', () => q('.lens-shell[data-lens-state="frozen_analyzing"]'))
      if (lensResult === 'high') await shot('analyzing')
      await waitFor('Lens final state', () => lensResult === 'error'
        ? q('.lens-shell[data-lens-state="error"]')
        : q('.lens-shell[data-lens-state="result"]'))
      ctx.check('Lens state is explicit', q('.lens-shell')?.getAttribute('data-lens-state') === (lensResult === 'error' ? 'error' : 'result'))
      await checkViewport(ctx)
      await shot(lensResult)
      if (lensResult === 'high') {
        const recapOpener = q<HTMLButtonElement>('.lens-topbar .lens-icon-button')
        recapOpener?.focus()
        recapOpener?.click()
        const recap = await waitFor('Lens recap', () => q<HTMLElement>('[aria-labelledby="lens-recap-title"]'))
        await waitFor('recap initial focus', () => recap.contains(document.activeElement))
        ctx.check('recap makes the app root inert', document.getElementById('root')?.inert === true)
        const focusable = qa<HTMLElement>('.lens-recap button:not([disabled]), .lens-recap a[href]')
          .filter((element) => element.getClientRects().length > 0)
        focusable.at(-1)?.focus()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
        ctx.check('recap traps Tab at its boundary', document.activeElement === focusable[0], (document.activeElement as HTMLElement | null)?.outerHTML)
        await shot('recap')
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await waitFor('Lens recap closes', () => !q('[aria-labelledby="lens-recap-title"]'))
        await sleep(20)
        ctx.check('recap restores app inert state', document.getElementById('root')?.inert === false)
        ctx.check('recap restores its opener', document.activeElement === recapOpener, (document.activeElement as HTMLElement | null)?.outerHTML)
      }
    },
  })),
  {
    id: '14-lens-ready-320-de', name: 'Lens camera-ready at 320px (DE)', viewport: view(320, 760),
    scenario: { kind: 'lens', locale: 'de', baseLanguage: 'German', activeLanguage: 'French', lensResult: 'high' },
    async run(ctx) {
      await waitFor('camera ready', () => q('.lens-shell[data-lens-state="camera_ready"]'))
      ctx.check('capture CTA is localized', q('.lens-shutter')?.getAttribute('aria-label') === 'Bild aufnehmen', q('.lens-shutter')?.getAttribute('aria-label'))
      ctx.check('subtitle localizes the target language name', bodyText().includes('Lernen: Französisch'), bodyText())
      const trigger = q<HTMLButtonElement>('.lens-language-trigger')
      await pressKey('ArrowDown', '.lens-language-trigger')
      const menu = await waitFor('Lens language menu', () => q<HTMLElement>('[role="menu"]'))
      const firstFocused = document.activeElement
      ctx.check('ArrowDown opens the menu and focuses an option', menu.contains(firstFocused), (firstFocused as HTMLElement | null)?.outerHTML)
      await pressKey('ArrowDown')
      ctx.check('ArrowDown advances language menu focus', menu.contains(document.activeElement) && document.activeElement !== firstFocused, (document.activeElement as HTMLElement | null)?.outerHTML)
      await pressKey('Escape')
      await waitFor('Lens language menu closes', () => !q('[role="menu"]'))
      ctx.check('Escape restores language trigger focus', document.activeElement === trigger, (document.activeElement as HTMLElement | null)?.outerHTML)
      await checkViewport(ctx)
      await shot('ready')
    },
  },
  {
    id: '15-lens-result-1440-fr', name: 'Lens result at desktop (FR)', viewport: view(1440, 900),
    scenario: { kind: 'lens', locale: 'fr', baseLanguage: 'French', activeLanguage: 'German', lensResult: 'low' },
    async run(ctx) {
      await waitFor('camera ready', () => q('.lens-shell[data-lens-state="camera_ready"]'))
      q<HTMLButtonElement>('.lens-shutter')?.click()
      await waitFor('result', () => q('.lens-shell[data-lens-state="result"]'))
      ctx.check('French result action is visible', bodyText().includes('Scanner encore'), bodyText())
      await checkViewport(ctx)
      await shot('result')
    },
  },
  {
    id: '16-lens-cancel-restarts-390-en', name: 'Lens cancel reacquires camera at 390px', viewport: view(390, 844),
    scenario: { kind: 'lens', locale: 'en', baseLanguage: 'English', activeLanguage: 'German', lensResult: 'high' },
    async run(ctx) {
      const w = window as unknown as { __cameraStreams: MediaStream[] }
      await waitFor('first camera stream', () => q('.lens-shell[data-lens-state="camera_ready"]') && w.__cameraStreams.length === 1)
      q<HTMLButtonElement>('.lens-shutter')?.click()
      await waitFor('analyzing before cancel', () => q('.lens-shell[data-lens-state="frozen_analyzing"]'))
      ;(await waitFor('cancel scan button', () => byText('button', 'Cancel'))).click()
      await waitFor('camera reacquired', () => q('.lens-shell[data-lens-state="camera_ready"]') && w.__cameraStreams.length >= 2)
      const video = q<HTMLVideoElement>('video.lens-preview-media')
      ctx.check('cancel acquires a fresh camera stream', w.__cameraStreams.length >= 2, w.__cameraStreams.length)
      ctx.check('remounted video owns the fresh stream', video?.srcObject === w.__cameraStreams.at(-1), String(video?.srcObject === w.__cameraStreams.at(-1)))
      await shot('cancel-ready')
    },
  },
  {
    id: '17-lens-stale-language-390-en', name: 'Lens ignores stale scan after language switch', viewport: view(390, 844),
    scenario: { kind: 'lens', locale: 'en', baseLanguage: 'English', activeLanguage: 'German', lensResult: 'stale' },
    async run(ctx) {
      const w = window as unknown as { __resolveLensScan: () => void }
      await waitFor('camera ready', () => q('.lens-shell[data-lens-state="camera_ready"]'))
      q<HTMLButtonElement>('.lens-shutter')?.click()
      await waitFor('analyzing before switch', () => q('.lens-shell[data-lens-state="frozen_analyzing"]'))
      q<HTMLButtonElement>('.lens-language-trigger')?.click()
      const otherLanguage = await waitFor('another language', () => qa<HTMLButtonElement>('[role="menuitem"]').find((button) => !button.classList.contains('lens-language-option--active')))
      otherLanguage.click()
      await waitFor('camera ready in new language', () => q('.lens-shell[data-lens-state="camera_ready"]'))
      w.__resolveLensScan()
      await sleep(500)
      ctx.check('stale result stays discarded', q('.lens-shell')?.getAttribute('data-lens-state') === 'camera_ready', q('.lens-shell')?.getAttribute('data-lens-state'))
      q<HTMLButtonElement>('.lens-topbar .lens-icon-button')?.click()
      await sleep(50)
      ctx.check('stale result never enters recap', !q('[aria-labelledby="lens-recap-title"]'))
    },
  },
  {
    id: '18-lens-language-loading-390-de', name: 'Lens waits for hydrated languages before camera access', viewport: view(390, 844),
    scenario: { kind: 'lens', locale: 'de', baseLanguage: 'German', activeLanguage: 'French', languageReady: false, lensResult: 'high' },
    async run(ctx) {
      const w = window as unknown as { __cameraStreams: MediaStream[] }
      await waitFor('Lens permission-pending shell', () => q('.lens-shell[data-lens-state="permission_pending"]'))
      await sleep(300)
      ctx.check('language loading does not request camera access', w.__cameraStreams.length === 0, w.__cameraStreams.length)
      ctx.check('capture stays unavailable before language hydration', !q('.lens-shutter'))
      ctx.check('loading subtitle does not expose a fallback target', !bodyText().includes('Lernen: French'), bodyText())
      await shot('language-loading')
    },
  },
  {
    id: '19-lens-mixed-save-390-en', name: 'Lens maps mixed save receipts to exact recap rows', viewport: view(390, 844),
    scenario: {
      kind: 'lens', locale: 'en', baseLanguage: 'English', activeLanguage: 'German', lensResult: 'high', lensSaveResult: 'mixed',
    },
    async run(ctx) {
      const w = window as unknown as {
        __lensSaveCalls: Array<{ targetLanguage: string; clientIds: string[]; result: { outcomes: Array<{ clientId: string; status: string }> } }>
      }
      await waitFor('camera ready', () => q('.lens-shell[data-lens-state="camera_ready"]'))
      q<HTMLButtonElement>('.lens-shutter')?.click()
      await waitFor('result', () => q('.lens-shell[data-lens-state="result"]'))
      q<HTMLButtonElement>('.lens-topbar .lens-icon-button')?.click()
      await waitFor('Lens recap', () => q('[aria-labelledby="lens-recap-title"]'))
      ;(await waitFor('save unsaved', () => byText('button', 'Save unsaved'))).click()
      await waitFor('exact save receipt', () => w.__lensSaveCalls.length === 1 && bodyText().includes('1 saved, 1 already known'))

      const rows = qa<HTMLElement>('.lens-recap-row')
      const call = w.__lensSaveCalls[0]
      ctx.check('fixture returned one exact outcome per submitted row', call.result.outcomes.length === call.clientIds.length && call.clientIds.length === 2, JSON.stringify(call))
      ctx.check('skipped receipt marks only its matching recap row known', rows[0]?.textContent?.includes('Already in your vocabulary') === true, rows[0]?.textContent)
      ctx.check('inserted receipt marks only its matching recap row saved', rows[1]?.textContent?.includes('Saved') === true, rows[1]?.textContent)
      ctx.check('mixed receipt remains truthful', bodyText().includes('1 saved, 1 already known'), bodyText())
      await shot('mixed-save')
    },
  },
  {
    id: '20-lens-hints-language-scope-390-en', name: 'Lens never applies old-language word hints after a switch', viewport: view(390, 844),
    scenario: {
      kind: 'lens', locale: 'en', baseLanguage: 'English', activeLanguage: 'German', lensResult: 'high',
      lensExistingWords: { German: ['der Schlüssel'], French: [] },
      lensHintDelayMs: { French: 1200 },
    },
    async run(ctx) {
      const w = window as unknown as { __lensHintRequests: string[]; __lensHintResponses: string[] }
      await waitFor('German hints loaded', () => w.__lensHintResponses.includes('German'))
      q<HTMLButtonElement>('.lens-language-trigger')?.click()
      ;(await waitFor('French language option', () => qa<HTMLButtonElement>('[role="menuitem"]').find((button) => button.textContent?.includes('French')))).click()
      await waitFor('French hint lookup started', () => w.__lensHintRequests.includes('French'))
      q<HTMLButtonElement>('.lens-shutter')?.click()
      await waitFor('French scan result before hints resolve', () => q('.lens-shell[data-lens-state="result"]'))

      const saveButton = await waitFor('selected save action', () => (
        qa<HTMLButtonElement>('.lens-actions button').find((button) => button.textContent?.trim() === 'Save')
      ))
      ctx.check('old German hint does not disable the French result', !saveButton.disabled, saveButton.outerHTML)
      ctx.check('old German hint does not label the French result already saved', !bodyText().includes('Already in vocabulary'), bodyText())
      await waitFor('empty French hints resolved', () => w.__lensHintResponses.includes('French'))
      await sleep(40)
      ctx.check('empty French hints keep the result saveable after lookup settles', !saveButton.disabled, saveButton.outerHTML)
      await shot('language-scoped-hints')
    },
  },
]
