export type ClassicDeckPointer = {
  clientX: number
  clientY: number
}

export type ClassicDeckRect = {
  left: number
  top: number
  width: number
  height: number
}

export type ClassicDeckProximity = {
  intensity: number
  scale: number
  liftPx: number
  zIndex: number
  brightness: number
  borderAlpha: number
  glowAlpha: number
  shadowY: number
  shadowBlur: number
  shadowAlpha: number
}

export const CLASSIC_DECK_PROXIMITY_RADIUS = 360

export const CLASSIC_DECK_PROXIMITY_CSS_PROPERTIES = [
  '--deck-proximity',
  '--deck-proximity-scale',
  '--deck-proximity-lift',
  '--deck-proximity-z',
  '--deck-proximity-brightness',
  '--deck-proximity-border-color',
  '--deck-proximity-shadow',
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

export function calculateClassicDeckProximity(
  pointer: ClassicDeckPointer,
  rect: ClassicDeckRect,
  radius = CLASSIC_DECK_PROXIMITY_RADIUS,
): ClassicDeckProximity {
  const hasUsableGeometry = rect.width > 0 && rect.height > 0 && radius > 0

  if (!hasUsableGeometry) {
    return {
      intensity: 0,
      scale: 1,
      liftPx: 0,
      zIndex: 1,
      brightness: 1,
      borderAlpha: 0.15,
      glowAlpha: 0,
      shadowY: 16,
      shadowBlur: 40,
      shadowAlpha: 0.6,
    }
  }

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const distance = Math.hypot(pointer.clientX - centerX, pointer.clientY - centerY)
  const linearIntensity = clamp(1 - distance / radius, 0, 1)
  const intensity = round(smoothstep(linearIntensity), 3)

  return {
    intensity,
    scale: round(1 + intensity * 0.08, 3),
    liftPx: intensity === 0 ? 0 : round(-14 * intensity, 2),
    zIndex: intensity === 0 ? 1 : Math.round(1 + intensity * 20),
    brightness: round(1 + intensity * 0.08, 3),
    borderAlpha: round(0.15 + intensity * 0.24, 3),
    glowAlpha: round(intensity * 0.36, 3),
    shadowY: round(16 + intensity * 12, 2),
    shadowBlur: round(40 + intensity * 18, 2),
    shadowAlpha: round(0.6 + intensity * 0.18, 3),
  }
}

export function formatClassicDeckProximityStyle(proximity: ClassicDeckProximity) {
  return {
    '--deck-proximity': proximity.intensity.toFixed(3),
    '--deck-proximity-scale': proximity.scale.toFixed(3),
    '--deck-proximity-lift': `${proximity.liftPx.toFixed(2)}px`,
    '--deck-proximity-z': String(proximity.zIndex),
    '--deck-proximity-brightness': proximity.brightness.toFixed(3),
    '--deck-proximity-border-color': `rgba(255, 255, 255, ${proximity.borderAlpha.toFixed(3)})`,
    '--deck-proximity-shadow': [
      `0 ${proximity.shadowY.toFixed(2)}px ${proximity.shadowBlur.toFixed(2)}px rgba(0, 0, 0, ${proximity.shadowAlpha.toFixed(3)})`,
      `0 0 ${(proximity.glowAlpha * 96).toFixed(2)}px rgba(125, 184, 255, ${proximity.glowAlpha.toFixed(3)})`,
    ].join(', '),
  }
}
