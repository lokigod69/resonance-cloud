import type { LensScanProvider, LensScanRequest, LensScanResponse } from '@/lib/lensTypes'

type MockProviderOptions = {
  latencyMs?: number
}

function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))

  return new Promise<void>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timeoutId)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

function markerFromRequest(request: LensScanRequest) {
  const marker = `${request.image} ${request.hint ?? ''}`.toLowerCase()
  if (marker.includes('error')) return 'error'
  if (marker.includes('person')) return 'person'
  if (marker.includes('menu')) return 'menu'
  if (marker.includes('low')) return 'low'
  if (marker.includes('text')) return 'text'
  return 'object'
}

function mockResponse(request: LensScanRequest): LensScanResponse {
  const targetLanguage = request.targetLanguage || 'German'
  const baseLanguage = request.baseLanguage || 'English'
  const marker = markerFromRequest(request)

  if (marker === 'person') {
    return { kind: 'unsupported', items: [], safety: 'person' }
  }

  if (marker === 'menu') {
    return {
      kind: 'menu',
      safety: null,
      items: [
        {
          target_text: targetLanguage === 'French' ? 'la soupe' : 'die Suppe',
          base_text: baseLanguage === 'German' ? 'Suppe' : 'soup',
          ipa: targetLanguage === 'French' ? 'sup' : 'ˈzʊpə',
          pos: 'noun',
          article: targetLanguage === 'French' ? 'la' : 'die',
          confidence: 'high',
          example: targetLanguage === 'French' ? 'La soupe est chaude.' : 'Die Suppe ist warm.',
          example_gloss: 'The soup is warm.',
        },
        {
          target_text: targetLanguage === 'French' ? 'le pain' : 'das Brot',
          base_text: baseLanguage === 'German' ? 'Brot' : 'bread',
          ipa: targetLanguage === 'French' ? 'pɛ̃' : 'broːt',
          pos: 'noun',
          article: targetLanguage === 'French' ? 'le' : 'das',
          confidence: 'medium',
          example: targetLanguage === 'French' ? 'Je prends du pain.' : 'Ich nehme Brot.',
          example_gloss: 'I will have bread.',
        },
        {
          target_text: targetLanguage === 'French' ? 'l’eau' : 'das Wasser',
          base_text: baseLanguage === 'German' ? 'Wasser' : 'water',
          ipa: targetLanguage === 'French' ? 'o' : 'ˈvasɐ',
          pos: 'noun',
          article: targetLanguage === 'French' ? 'l’' : 'das',
          confidence: 'high',
          example: targetLanguage === 'French' ? 'L’eau est froide.' : 'Das Wasser ist kalt.',
          example_gloss: 'The water is cold.',
        },
      ],
    }
  }

  if (marker === 'low') {
    return {
      kind: 'object',
      safety: null,
      items: [
        {
          target_text: targetLanguage === 'French' ? 'la tasse' : 'die Tasse',
          base_text: baseLanguage === 'German' ? 'Tasse' : 'cup',
          ipa: targetLanguage === 'French' ? 'tas' : 'ˈtasə',
          pos: 'noun',
          article: targetLanguage === 'French' ? 'la' : 'die',
          confidence: 'low',
          example: targetLanguage === 'French' ? 'La tasse est sur la table.' : 'Die Tasse steht auf dem Tisch.',
          example_gloss: 'The cup is on the table.',
          alternates: [
            { target_text: targetLanguage === 'French' ? 'le bol' : 'die Schale', base_text: 'bowl' },
            { target_text: targetLanguage === 'French' ? 'le verre' : 'das Glas', base_text: 'glass' },
          ],
        },
      ],
    }
  }

  if (marker === 'text') {
    return {
      kind: 'text',
      safety: null,
      items: [
        {
          target_text: targetLanguage === 'Korean' ? '출구' : 'der Ausgang',
          base_text: baseLanguage === 'German' ? 'Ausgang' : 'exit',
          transliteration: targetLanguage === 'Korean' ? 'chulgu' : undefined,
          ipa: targetLanguage === 'Korean' ? 't͡ɕʰuɭɡu' : 'ˈaʊ̯sˌɡaŋ',
          pos: 'noun',
          article: targetLanguage === 'Korean' ? undefined : 'der',
          confidence: 'high',
          example: targetLanguage === 'Korean' ? '출구가 왼쪽에 있어요.' : 'Der Ausgang ist links.',
          example_gloss: 'The exit is on the left.',
        },
      ],
    }
  }

  return {
    kind: 'object',
    safety: null,
    items: [
      {
        target_text: targetLanguage === 'French' ? 'la clé' : 'der Schlüssel',
        base_text: baseLanguage === 'German' ? 'Schlüssel' : 'key',
        ipa: targetLanguage === 'French' ? 'kle' : 'ˈʃlʏsl̩',
        pos: 'noun',
        article: targetLanguage === 'French' ? 'la' : 'der',
        confidence: 'high',
        example: targetLanguage === 'French' ? 'La clé est dans ma poche.' : 'Der Schlüssel ist in meiner Tasche.',
        example_gloss: 'The key is in my pocket.',
      },
    ],
  }
}

export function createMockLensScanProvider(options: MockProviderOptions = {}): LensScanProvider {
  const latencyMs = options.latencyMs ?? 900

  return {
    async scan(request, scanOptions) {
      await sleep(latencyMs, scanOptions?.signal)

      if (markerFromRequest(request) === 'error') {
        throw new Error('Lens mock scan failed')
      }

      return mockResponse(request)
    },
  }
}

export const mockLensScanProvider = createMockLensScanProvider()
