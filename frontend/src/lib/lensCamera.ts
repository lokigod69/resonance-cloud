export type LensCameraFailure = 'permission' | 'unsupported' | 'not_found' | 'not_readable' | 'unavailable'

export function classifyLensCameraFailure(error: unknown): LensCameraFailure {
  const name = error instanceof DOMException
    ? error.name
    : error && typeof error === 'object' && 'name' in error && typeof error.name === 'string'
      ? error.name
      : ''

  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'not_found'
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'not_readable'
  return 'unavailable'
}

export function lensCameraErrorTranslationKey(failure: LensCameraFailure): string {
  switch (failure) {
    case 'unsupported': return 'lens.camera.unsupported'
    case 'not_found': return 'lens.camera.notFound'
    case 'not_readable': return 'lens.camera.notReadable'
    default: return 'lens.camera.unavailable'
  }
}
