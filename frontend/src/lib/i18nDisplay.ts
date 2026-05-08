type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const DECK_STATUS_KEYS: Record<string, string> = {
  draft: 'deck.status.draft',
  generating: 'deck.status.generating',
  pending: 'deck.status.pending',
  complete: 'deck.status.complete',
  partial: 'deck.status.partial',
  failed: 'deck.status.failed',
  cancelled: 'deck.status.cancelled',
}

export function getDeckStatusLabel(status: string | null | undefined, t: TranslateFn): string {
  if (!status) return ''

  const key = DECK_STATUS_KEYS[status]
  if (!key) return status

  const label = t(key)
  return label === key ? status : label
}

export function getDeckLanguageLabel(language: string | null | undefined, t: TranslateFn): string {
  if (!language) return ''

  const key = `langName.${language}`
  const label = t(key)
  return label === key ? language : label
}
