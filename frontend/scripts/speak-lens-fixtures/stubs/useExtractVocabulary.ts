export type ExtractVocabularyItem = { word: string; translation: string; ipa?: string }

export function useExtractVocabulary() {
  return {
    loading: false,
    error: null,
    extractVocabulary: async () => [
      { word: 'die Aussicht', translation: 'the view', ipa: '/ˈaʊ̯sˌzɪçt/' },
      { word: 'sich erinnern', translation: 'to remember', ipa: '/ɛɐ̯ˈʔɪnɐn/' },
    ],
  }
}
