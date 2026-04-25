function normalizeDistance(distance: number) {
  return Number.isFinite(distance) ? Math.max(0, Math.abs(distance)) : 0
}

const WATER_DESKTOP_CARD_WIDTH = 360
const WATER_MOBILE_CARD_WIDTH = 310
const WATER_DESKTOP_CARD_GAP = 8
const WATER_MOBILE_CARD_GAP = 5

export function getWaterCardScale(distance: number, isMobile = false) {
  const safeDistance = normalizeDistance(distance)

  if (isMobile) {
    if (safeDistance <= 1) return 1 - safeDistance * 0.22
    return Math.max(0.58, 0.78 - (safeDistance - 1) * 0.2)
  }

  if (safeDistance <= 1) return 1 - safeDistance * 0.18
  if (safeDistance <= 2) return 0.82 - (safeDistance - 1) * 0.13
  return Math.max(0.56, 0.69 - (safeDistance - 2) * 0.13)
}

function getWaterCardSpacingScale(distance: number, isMobile = false) {
  const scale = getWaterCardScale(distance, isMobile)
  if (distance <= 0) return scale

  return Math.max(scale, isMobile ? 0.84 : 0.96)
}

function getWaterSlotX(
  distance: number,
  isMobile = false,
  cardWidth = isMobile ? WATER_MOBILE_CARD_WIDTH : WATER_DESKTOP_CARD_WIDTH,
) {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0
  const safeCardWidth = Number.isFinite(cardWidth) ? Math.max(0, cardWidth) : 0
  const whole = Math.floor(safeDistance)
  const fraction = safeDistance - whole
  const gap = isMobile ? WATER_MOBILE_CARD_GAP : WATER_DESKTOP_CARD_GAP

  const getSlotX = (slot: number) => {
    if (slot <= 0) return 0

    let x = 0
    for (let i = 0; i < slot; i += 1) {
      const leftScale = getWaterCardSpacingScale(i, isMobile)
      const rightScale = getWaterCardSpacingScale(i + 1, isMobile)
      x += (safeCardWidth * leftScale) / 2 + (safeCardWidth * rightScale) / 2 + gap
    }
    return x
  }

  const from = getSlotX(whole)
  const to = getSlotX(whole + 1)

  return from + (to - from) * fraction
}

export function getWaterCardX(
  offset: number,
  _deckSpacing: number,
  isMobile = false,
  cardWidth = isMobile ? WATER_MOBILE_CARD_WIDTH : WATER_DESKTOP_CARD_WIDTH,
) {
  const safeOffset = Number.isFinite(offset) ? offset : 0
  const distance = Math.abs(safeOffset)
  const direction = safeOffset === 0 ? 0 : Math.sign(safeOffset)
  if (direction === 0) return 0

  return direction * getWaterSlotX(distance, isMobile, cardWidth)
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
