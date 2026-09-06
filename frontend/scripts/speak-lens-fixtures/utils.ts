/* eslint-disable */
// DOM driving + assertion helpers for the fixture runs. Everything polls the
// real DOM — no reaching into React internals, no faked timers (the only
// timing knobs are the scenario's guidedDelayMs and real waits).

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function waitFor<T>(label: string, probe: () => T | null | undefined | false, timeoutMs = 8000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    let value: any = null
    try {
      value = probe()
    } catch {
      value = null
    }
    if (value) return value as T
    if (Date.now() > deadline) throw new Error(`timeout after ${timeoutMs}ms waiting for: ${label}`)
    await sleep(40)
  }
}

export async function waitGone(label: string, probe: () => unknown, timeoutMs = 8000): Promise<void> {
  await waitFor(`${label} to disappear`, () => !probe(), timeoutMs)
}

export function bodyText(): string {
  return (document.body.innerText || '').replace(/\s+/g, ' ').trim()
}

export function qa<T extends Element = HTMLElement>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector)) as unknown as T[]
}

export function q<T extends Element = HTMLElement>(selector: string): T | null {
  return document.querySelector(selector) as unknown as T | null
}

/** textContent, not innerText: CSS `text-transform: uppercase` (the card
 * eyebrow, the CURRENT label) must not change what an assertion sees. */
export function textOf(el: Element | null): string {
  if (!el) return ''
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

export function byText(selector: string, needle: string): HTMLElement | null {
  return qa<HTMLElement>(selector).find((el) => textOf(el).includes(needle)) ?? null
}

export function clickText(selector: string, needle: string): HTMLElement {
  const el = byText(selector, needle)
  if (!el) throw new Error(`no ${selector} containing "${needle}"`)
  el.click()
  return el
}

export function dialog(): HTMLElement | null {
  return q<HTMLElement>('[role="dialog"]')
}

/** Every buoy button (due + rest) — the only pointer-events-auto buttons on
 * the fixed water layer. */
export function buoyButtons(): HTMLButtonElement[] {
  return qa<HTMLButtonElement>('button.pointer-events-auto')
}

export function dueBuoys(): HTMLButtonElement[] {
  return buoyButtons().filter((b) => (b.getAttribute('aria-label') || '').startsWith('Practice '))
}

export function restBuoys(): HTMLButtonElement[] {
  return buoyButtons().filter((b) => (b.getAttribute('aria-label') || '').startsWith('Hear '))
}

export function opacityOf(el: Element): number {
  const value = parseFloat(getComputedStyle(el).opacity || '1')
  return Number.isFinite(value) ? value : 1
}

/** Buoy label anatomy: the inner flex column holds the word span and, when the
 * gloss fits its script budget, a second gloss span. */
export function buoyLines(button: HTMLButtonElement): string[] {
  const label = button.querySelector('span')
  if (!label) return []
  return Array.from(label.children).map((child) => textOf(child)).filter((line) => line.length > 0)
}

/** The gold due dot is rendered only for due buoys (rest buoys have none). */
export function hasGoldDot(button: HTMLButtonElement): boolean {
  return button.querySelector('span[aria-hidden="true"]') !== null
}

/** Reads TidelineBuoys' hidden measuring twin — the widths the collision pass
 * actually used, and whether each gloss fit its per-script budget. */
export function measureDump(): string {
  const host = document.querySelector('div[aria-hidden="true"].invisible')
  if (!host) return 'no measuring twin in the DOM'
  return Array.from(host.children)
    .map((child: any) => {
      const word = child.querySelector('[data-part="word"]') as HTMLElement | null
      const gloss = child.querySelector('[data-part="gloss"]') as HTMLElement | null
      return `${child.dataset.key}[word=${word?.offsetWidth ?? 0}px gloss=${gloss?.offsetWidth ?? 0}/${gloss?.scrollWidth ?? 0}px]`
    })
    .join(' ')
}

export function transformOf(el: Element): string {
  return (el as HTMLElement).style.transform || ''
}

export function translateY(el: Element): number | null {
  const match = /translate3d\(\s*-?50%\s*,\s*(-?[\d.]+)px/.exec(transformOf(el))
  return match ? parseFloat(match[1]) : null
}

export function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Hands control to the node runner for a CDP Page.captureScreenshot. */
export async function shot(label: string): Promise<void> {
  ;(window as any).__shotRequest = label
  await waitFor(`screenshot ${label}`, () => (window as any).__shotRequest === null, 60000)
}

/** Hands control to the node runner for a trusted browser keyboard event. */
export async function pressKey(key: string, selector?: string): Promise<void> {
  ;(window as any).__keyRequest = { key, selector }
  await waitFor(`keyboard ${key}`, () => (window as any).__keyRequest === null, 60000)
}

export type Check = { name: string; ok: boolean; detail: string }

export class Ctx {
  checks: Check[] = []
  notes: string[] = []

  check(name: string, ok: boolean, detail: unknown = '') {
    this.checks.push({ name, ok: Boolean(ok), detail: String(detail) })
    return Boolean(ok)
  }

  note(text: string) {
    this.notes.push(text)
  }

  get passed(): boolean {
    return this.checks.length > 0 && this.checks.every((c) => c.ok)
  }
}
