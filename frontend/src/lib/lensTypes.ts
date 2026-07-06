export type LensScanKind = 'object' | 'text' | 'menu' | 'scene' | 'unsupported'
export type LensConfidence = 'high' | 'medium' | 'low'
export type LensSafetyFlag = 'person' | 'sensitive_document'

export type LensAlternate = {
  target_text: string
  base_text: string
}

export type LensScanItem = {
  target_text: string
  base_text: string
  transliteration?: string
  ipa?: string
  pos?: string
  article?: string
  example?: string
  example_gloss?: string
  confidence: LensConfidence
  alternates?: LensAlternate[]
}

export type LensScanResponse = {
  kind: LensScanKind
  items: LensScanItem[]
  safety?: LensSafetyFlag | null
}

export type LensScanRequest = {
  image: string
  targetLanguage: string
  baseLanguage: string
  level?: string
  hint?: 'object' | 'text'
}

export type LensScanProvider = {
  scan: (request: LensScanRequest, options?: { signal?: AbortSignal }) => Promise<LensScanResponse>
}
