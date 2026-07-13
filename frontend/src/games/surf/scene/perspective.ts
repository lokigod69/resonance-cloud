import type { LaneIndex } from '../engine/types'

export type SurfViewport = {
  width: number
  height: number
}

export type ProjectedPoint = {
  x: number
  y: number
  scale: number
}

export function horizonY(viewport: SurfViewport): number {
  return viewport.height * 0.34
}

export function decisionY(viewport: SurfViewport): number {
  return viewport.height * 0.78
}

function cubicOut(value: number): number {
  return 1 - Math.pow(1 - value, 3)
}

/** Projects a lane toward the viewer with a deliberately shallow globe-like horizon. */
export function project(lane: LaneIndex, progress: number, viewport: SurfViewport): ProjectedPoint {
  const visibleProgress = Math.max(0, Math.min(1, progress))
  const eased = cubicOut(visibleProgress)
  const horizon = horizonY(viewport)
  const decision = decisionY(viewport)
  const bottomLaneX = viewport.width * ([0.2, 0.5, 0.8] as const)[lane]
  // Keep a small lane spread even at the horizon (0.18) so the three signs
  // never fully occlude each other at spawn.
  const spread = 0.18 + 0.82 * eased
  const x = viewport.width / 2 + (bottomLaneX - viewport.width / 2) * spread
  const baseY = horizon + (decision - horizon) * eased
  const overshoot = progress > 1
    ? (viewport.height * 0.92 - decision) * Math.min(1, progress - 1)
    : 0

  return {
    x,
    y: baseY + overshoot,
    scale: 0.22 + 0.78 * eased,
  }
}

/** A circular-arc horizon curve: highest at center, gently receding at the edges. */
export function horizonCurve(x: number, viewport: SurfViewport): number {
  const radius = Math.max(viewport.width * 0.75, 1)
  const distance = Math.min(radius, Math.abs(x - viewport.width / 2))
  const arc = Math.sqrt(radius * radius - distance * distance) - Math.sqrt(radius * radius - Math.min(radius, viewport.width / 2) ** 2)
  const normalized = arc / Math.max(1, radius - Math.sqrt(radius * radius - Math.min(radius, viewport.width / 2) ** 2))
  return normalized * viewport.height * 0.025
}
