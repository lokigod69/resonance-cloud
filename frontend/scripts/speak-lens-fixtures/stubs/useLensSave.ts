export function useLensSave() {
  return {
    status: 'idle', error: null,
    saveLensItems: async ({ items }: { items: unknown[] }) => ({ deckId: 'fixture-lens-deck', inserted: items.length, skipped: 0 }),
  }
}
