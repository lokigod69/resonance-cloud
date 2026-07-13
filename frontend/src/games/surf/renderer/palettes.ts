import * as THREE from 'three'

export type SurfPalette = {
  skyTop: number
  skyBottom: number
  horizonGlow: number
  waterDeep: number
  waterCrest: number
  accent: number
}

export const LEVEL_PALETTES: readonly SurfPalette[] = [
  { skyTop: 0x1a0f2e, skyBottom: 0x3d1d4f, horizonGlow: 0xf7c843, waterDeep: 0x0f2038, waterCrest: 0x3b6ea5, accent: 0xf7c843 },
  { skyTop: 0x16324f, skyBottom: 0x2a5f8f, horizonGlow: 0xf7c843, waterDeep: 0x143a5e, waterCrest: 0x4d9fca, accent: 0xf24f13 },
  { skyTop: 0x2e1436, skyBottom: 0xd94a12, horizonGlow: 0xf7c843, waterDeep: 0x1d2440, waterCrest: 0xe97a3d, accent: 0xf7c843 },
  { skyTop: 0x140b22, skyBottom: 0x35204a, horizonGlow: 0xf24f13, waterDeep: 0x0d1830, waterCrest: 0x8a6ff0, accent: 0xf7c843 },
  { skyTop: 0x0e0810, skyBottom: 0x1c1030, horizonGlow: 0xf7c843, waterDeep: 0x090d1f, waterCrest: 0xf24f13, accent: 0xf24f13 },
]

export function paletteForLevel(level: number): SurfPalette {
  return LEVEL_PALETTES[((level % LEVEL_PALETTES.length) + LEVEL_PALETTES.length) % LEVEL_PALETTES.length]
}

export function lerpPalette(a: SurfPalette, b: SurfPalette, t: number): SurfPalette {
  const progress = Math.max(0, Math.min(1, t))
  const lerp = (from: number, to: number) => {
    const fromRed = (from >> 16) & 0xff
    const fromGreen = (from >> 8) & 0xff
    const fromBlue = from & 0xff
    const toRed = (to >> 16) & 0xff
    const toGreen = (to >> 8) & 0xff
    const toBlue = to & 0xff
    return (Math.round(fromRed + (toRed - fromRed) * progress) << 16)
      | (Math.round(fromGreen + (toGreen - fromGreen) * progress) << 8)
      | Math.round(fromBlue + (toBlue - fromBlue) * progress)
  }
  return { skyTop: lerp(a.skyTop, b.skyTop), skyBottom: lerp(a.skyBottom, b.skyBottom), horizonGlow: lerp(a.horizonGlow, b.horizonGlow), waterDeep: lerp(a.waterDeep, b.waterDeep), waterCrest: lerp(a.waterCrest, b.waterCrest), accent: lerp(a.accent, b.accent) }
}

export function colorFromNumber(value: number, target = new THREE.Color()): THREE.Color {
  return target.setHex(value)
}
