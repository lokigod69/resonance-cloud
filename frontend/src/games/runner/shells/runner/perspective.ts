import type { LaneIndex, LevelConfig } from '../../engine';

export type PerspectivePoint = {
  x: number;
  y: number;
  scale: number;
  laneWidth: number;
};

const HORIZON_Y = 0.35;
const DECISION_Y = 0.69;
const HORIZON_SPREAD = 0.075;
const FOREGROUND_SPREAD_DESKTOP = 0.17;
const FOREGROUND_SPREAD_MOBILE = 0.265;
const RUNNER_PROGRESS = 0.78;
const RUNNER_FOOT_PROGRESS = 0.9;

function foregroundSpreadRatio(width: number): number {
  if (width <= 480) return FOREGROUND_SPREAD_MOBILE;
  if (width >= 900) return FOREGROUND_SPREAD_DESKTOP;
  const blend = (width - 480) / 420;
  return Phaser.Math.Linear(FOREGROUND_SPREAD_MOBILE, FOREGROUND_SPREAD_DESKTOP, blend);
}

export function laneX(
  lane: number,
  progress: number,
  width: number,
  level: LevelConfig,
  timeMs: number,
): number {
  const center = width / 2;
  const bottomSpread = width * foregroundSpreadRatio(width);
  const horizonSpread = width * HORIZON_SPREAD;
  const variable = level.mechanics.variableLaneWidth ? 1 + Math.sin(timeMs / 900) * 0.12 : 1;
  const spread = (horizonSpread + (bottomSpread - horizonSpread) * progress) * variable;
  return center + (lane - 1) * spread;
}

export function laneEdgeX(
  edge: number,
  progress: number,
  width: number,
  level: LevelConfig,
  timeMs: number,
): number {
  return laneX(edge - 0.5, progress, width, level, timeMs);
}

export function laneCenterFromEdgesX(
  lane: number,
  progress: number,
  width: number,
  level: LevelConfig,
  timeMs: number,
): number {
  return (laneEdgeX(lane, progress, width, level, timeMs) + laneEdgeX(lane + 1, progress, width, level, timeMs)) / 2;
}

export function laneCenterX(
  lane: LaneIndex,
  width: number,
  level: LevelConfig,
  timeMs: number,
): number {
  return laneCenterFromEdgesX(lane, RUNNER_PROGRESS, width, level, timeMs);
}

export function runnerLaneX(
  lane: number,
  width: number,
  level: LevelConfig,
  timeMs: number,
): number {
  return laneCenterFromEdgesX(lane, RUNNER_FOOT_PROGRESS, width, level, timeMs);
}

export function decisionThresholdY(height: number): number {
  return height * DECISION_Y;
}

export function perspectivePoint(
  lane: LaneIndex,
  depth: number,
  width: number,
  height: number,
  level: LevelConfig,
  timeMs: number,
): PerspectivePoint {
  const progress = Phaser.Math.Clamp(1 - depth, 0, 1);
  const horizonY = height * HORIZON_Y;
  const floorY = decisionThresholdY(height);
  const eased = Math.pow(progress, 1.35);
  return {
    x: laneX(lane, eased, width, level, timeMs),
    y: horizonY + (floorY - horizonY) * eased,
    scale: 0.13 + Math.pow(progress, 1.05) * 0.74,
    laneWidth: width * (0.06 + eased * 0.16),
  };
}
