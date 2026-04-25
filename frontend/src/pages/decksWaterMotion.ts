function normalizeDistance(distance: number) {
  return Number.isFinite(distance) ? Math.max(0, Math.abs(distance)) : 0
}

export function getWaterCardX(offset: number, deckSpacing: number, isMobile = false) {
  const safeOffset = Number.isFinite(offset) ? offset : 0
  const safeSpacing = Number.isFinite(deckSpacing) ? deckSpacing : 0
  const distance = Math.min(Math.abs(safeOffset), 1)
  const direction = safeOffset === 0 ? 0 : Math.sign(safeOffset)
  const crossoverBoost = Math.sin(distance * Math.PI) * (isMobile ? 14 : 24)

  return safeOffset * safeSpacing + direction * crossoverBoost
}

export function getWaterCardRootOpacity(distance: number) {
  const safeDistance = normalizeDistance(distance)

  if (safeDistance <= 2.5) return 1
  if (safeDistance <= 3) return 1 - (safeDistance - 2.5) * 2
  return 0
}

export function getWaterCardDim(distance: number) {
  const safeDistance = normalizeDistance(distance)

  if (safeDistance <= 0.15) return 0
  if (safeDistance <= 1) return 0.18 + safeDistance * 0.18
  if (safeDistance <= 2) return 0.38 + (safeDistance - 1) * 0.22
  return 0.68
}

export function getWaterCardZIndex(offset: number) {
  const safeOffset = Number.isFinite(offset) ? offset : 0
  const distance = Math.abs(safeOffset)
  const base = Math.round(1000 - distance * 100)
  const sideTie = safeOffset >= 0 ? 1 : 0

  return base + sideTie
}

export function getWaterRailClickTargetIndex(
  position: number,
  clientX: number,
  railLeft: number,
  railWidth: number,
  deckSpacing: number,
  maxIndex: number,
) {
  if (!Number.isFinite(deckSpacing) || deckSpacing <= 0) return null
  if (!Number.isFinite(railWidth) || railWidth <= 0) return null

  const safePosition = Number.isFinite(position) ? position : 0
  const safeMaxIndex = Math.max(0, Math.round(Number.isFinite(maxIndex) ? maxIndex : 0))
  const railCenter = railLeft + railWidth / 2
  const railOffset = (clientX - railCenter) / deckSpacing

  if (Math.abs(railOffset) < 0.45) return null

  const currentIndex = Math.max(0, Math.min(Math.round(safePosition), safeMaxIndex))
  const targetIndex = Math.max(0, Math.min(Math.round(safePosition + railOffset), safeMaxIndex))

  return targetIndex === currentIndex ? null : targetIndex
}
