import { scenario } from './scenario'

const baseItem = {
  target_text: 'der Schlüssel',
  base_text: 'key',
  ipa: '/ˈʃlʏsl̩/',
  pos: 'noun',
  article: 'der',
  confidence: 'high' as const,
  example: 'Der Schlüssel liegt auf dem Tisch.',
  example_gloss: 'The key is on the table.',
}

let rejectPending: ((reason: unknown) => void) | null = null
let pendingTimer: number | null = null
const abort = () => {
  if (scenario().lensResult === 'stale') return
  if (pendingTimer !== null) window.clearTimeout(pendingTimer)
  rejectPending?.(new DOMException('Fixture scan aborted', 'AbortError'))
  rejectPending = null
  pendingTimer = null
}
const scan = async () => {
  const variant = scenario().lensResult ?? 'high'
  if (variant === 'stale') {
    await new Promise<void>((resolve) => {
      ;(window as unknown as { __resolveLensScan: () => void }).__resolveLensScan = resolve
    })
  } else {
    await new Promise<void>((resolve, reject) => {
      rejectPending = reject
      pendingTimer = window.setTimeout(() => {
        rejectPending = null
        pendingTimer = null
        resolve()
      }, 400)
    })
  }
  if (variant === 'error') throw new Error('fixture scan failed')
  if (variant === 'safety') return { kind: 'object', safety: 'sensitive', items: [] }
  if (variant === 'low') {
    return {
      kind: 'object', safety: null,
      items: [{ ...baseItem, confidence: 'low', alternates: [
        { target_text: 'das Schloss', base_text: 'lock' },
        { target_text: 'der Schlüsselbund', base_text: 'keychain' },
      ] }],
    }
  }
  return {
    kind: 'menu', safety: null,
    items: [baseItem, { ...baseItem, target_text: 'die Tasse', base_text: 'cup', article: 'die', confidence: 'medium' }],
  }
}

export function useLensScan() {
  return {
    abort,
    scan,
  }
}
