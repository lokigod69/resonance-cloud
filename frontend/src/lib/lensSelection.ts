import type { LensAlternate, LensScanItem } from '@/lib/lensTypes'

/**
 * Alternates identify a different concept. The provider does not enrich them,
 * so carrying the primary item's grammar or example across would corrupt the
 * saved vocabulary row.
 */
export function lensItemFromAlternate(alternate: LensAlternate): LensScanItem {
  return {
    target_text: alternate.target_text.trim(),
    base_text: alternate.base_text.trim(),
    confidence: 'medium',
  }
}
