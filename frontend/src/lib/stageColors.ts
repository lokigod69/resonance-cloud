import type { CSSProperties } from 'react'

const STAGE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  concept:  { r: 0,   g: 188, b: 180 },  // Teal
  song:     { r: 230, g: 160, b: 50  },  // Amber
  images:   { r: 140, g: 80,  b: 200 },  // Purple
  video:    { r: 60,  g: 120, b: 220 },  // Blue
  assembly: { r: 60,  g: 180, b: 100 },  // Green
  bookend:  { r: 192, g: 132, b: 252 },  // Purple
}

/**
 * Compute inline styles for a version box based on its stage, position, and state.
 *
 * @param stage    - pipeline stage key (concept, song, images, video, assembly)
 * @param index    - 0-based position of this version within the stage
 * @param total    - total number of versions in the stage
 * @param isSelected - whether this version is currently selected
 */
export function getVersionStyle(
  stage: string,
  index: number,
  total: number,
  isSelected: boolean,
): CSSProperties {
  const color = STAGE_COLORS[stage]
  if (!color) return {}

  const { r, g, b } = color

  // Intensity increases with index — newer versions are more vivid
  const intensity = total <= 1 ? 0.7 : 0.2 + (index / (total - 1)) * 0.6

  if (isSelected) {
    return {
      borderColor: `rgba(${r}, ${g}, ${b}, ${Math.min(intensity + 0.3, 0.9)})`,
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
      boxShadow: `0 0 14px rgba(${r}, ${g}, ${b}, 0.25)`,
    }
  }

  return {
    borderColor: `rgba(${r}, ${g}, ${b}, ${(intensity * 0.5).toFixed(2)})`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${(intensity * 0.08).toFixed(3)})`,
  }
}
