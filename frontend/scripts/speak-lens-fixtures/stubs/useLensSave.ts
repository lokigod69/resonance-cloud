import { scenario } from './scenario'

type FixtureSaveItem = {
  clientId: string
  item: { target_text: string }
}

export function useLensSave() {
  return {
    status: 'idle', error: null,
    saveLensItems: async ({ targetLanguage, items }: { targetLanguage: string; items: FixtureSaveItem[] }) => {
      const mixed = scenario().lensSaveResult === 'mixed'
      const outcomes = items.map((item, index) => ({
        clientId: item.clientId,
        wordId: `fixture-${targetLanguage.toLowerCase()}-${index + 1}`,
        status: mixed && index === 0 ? 'skipped' as const : 'inserted' as const,
      }))
      const result = {
        deckId: `fixture-lens-deck-${targetLanguage.toLowerCase()}`,
        inserted: outcomes.filter((outcome) => outcome.status === 'inserted').length,
        skipped: outcomes.filter((outcome) => outcome.status === 'skipped').length,
        outcomes,
      }
      const fixtureWindow = window as unknown as {
        __lensSaveCalls: Array<{ targetLanguage: string; clientIds: string[]; result: typeof result }>
      }
      fixtureWindow.__lensSaveCalls.push({
        targetLanguage,
        clientIds: items.map((item) => item.clientId),
        result,
      })
      return result
    },
  }
}
