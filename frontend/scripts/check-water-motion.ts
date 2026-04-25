import { strict as assert } from 'node:assert'

import {
  getWaterCardDim,
  getWaterCardRootOpacity,
  getWaterCardScale,
  getWaterCardX,
  getWaterRailClickTargetIndex,
  getWaterCardZIndex,
} from '../src/pages/decksWaterMotion.ts'

function assertClose(actual: number, expected: number, message: string) {
  assert.ok(Math.abs(actual - expected) < 0.0001, `${message}: expected ${expected}, received ${actual}`)
}

assert.equal(getWaterCardRootOpacity(0), 1, 'center cards stay physically opaque')
assert.equal(getWaterCardRootOpacity(1), 1, 'near cards stay physically opaque')
assert.equal(getWaterCardRootOpacity(2.5), 1, 'normal visible range stays physically opaque')
assertClose(getWaterCardRootOpacity(2.75), 0.5, 'cards fade only at the outer edge')
assert.equal(getWaterCardRootOpacity(3), 0, 'outer edge fades away')
assert.equal(getWaterCardRootOpacity(4), 0, 'outside useful range is hidden')

assert.equal(getWaterCardDim(0), 0, 'center card is not dimmed')
assert.ok(getWaterCardDim(0.5) > getWaterCardDim(0), 'dimming increases away from center')
assert.ok(getWaterCardDim(1.5) > getWaterCardDim(1), 'farther side cards are dimmer')
assert.equal(getWaterCardDim(3), 0.68, 'far cards use the strongest internal dim')

assert.ok(getWaterCardZIndex(0) > getWaterCardZIndex(1), 'center card layers above side cards')
assert.ok(getWaterCardZIndex(0.5) > getWaterCardZIndex(-0.5), 'positive side wins equal-distance z-index ties')
assert.ok(getWaterCardZIndex(1) > getWaterCardZIndex(2), 'near side card layers above far side cards')

assert.equal(getWaterRailClickTargetIndex(2, 195, 0, 390, 172, 4), null, 'center rail clicks do not steal active card clicks')
assert.equal(getWaterRailClickTargetIndex(2, 370, 0, 390, 172, 4), 3, 'right-side rail clicks focus the right side card')
assert.equal(getWaterRailClickTargetIndex(2, 20, 0, 390, 172, 4), 1, 'left-side rail clicks focus the left side card')
assert.equal(getWaterRailClickTargetIndex(0, 20, 0, 390, 172, 4), null, 'rail click fallback does not wrap before first deck')
assert.equal(getWaterRailClickTargetIndex(4, 370, 0, 390, 172, 4), null, 'rail click fallback does not wrap after last deck')

assert.equal(getWaterCardX(0, 258, false), 0, 'center X slot is unchanged')
assert.ok(getWaterCardX(1, 258, false) > 258, 'right settled X slot expands enough for full-width cards')
assert.ok(getWaterCardX(-1, 258, false) < -258, 'left settled X slot expands enough for full-width cards')
assert.ok(getWaterCardX(0.5, 258, false) > 129, 'desktop crossover spreads right card outward')
assert.ok(getWaterCardX(-0.5, 258, false) < -129, 'desktop crossover spreads left card outward')
assert.ok(
  Math.abs(getWaterCardX(0.5, 172, true)) < Math.abs(getWaterCardX(0.5, 258, false)),
  'mobile crossover spacing remains smaller than desktop crossover spacing',
)

assert.equal(getWaterCardScale(0, false), 1, 'desktop center scale is unchanged')
assertClose(getWaterCardScale(1, false), 0.82, 'desktop side scale is unchanged')
assert.equal(getWaterCardScale(0, true), 1, 'mobile center scale is unchanged')
assertClose(getWaterCardScale(1, true), 0.78, 'mobile side scale is unchanged')

const desktopWidth = 360
const mobileWidth = 310
const desktopMinGap = 6
const mobileMinGap = 4

function assertAdjacentGap(slotA: number, slotB: number, isMobile: boolean, width: number, minGap: number) {
  const spacing = isMobile ? 172 : 258
  const xA = Math.abs(getWaterCardX(slotA, spacing, isMobile, width))
  const xB = Math.abs(getWaterCardX(slotB, spacing, isMobile, width))
  const scaleA = getWaterCardScale(slotA, isMobile)
  const scaleB = getWaterCardScale(slotB, isMobile)
  const gap = Math.abs(xB - xA) - ((width * scaleA) / 2 + (width * scaleB) / 2)

  assert.ok(gap >= minGap, `slot ${slotA}-${slotB} gap should be >= ${minGap}, got ${gap}`)
}

function assertRotatedLaneGap(
  slotA: number,
  slotB: number,
  isMobile: boolean,
  width: number,
  minGap: number,
  minScaleA: number,
  minScaleB: number,
) {
  const spacing = isMobile ? 172 : 258
  const xA = Math.abs(getWaterCardX(slotA, spacing, isMobile, width))
  const xB = Math.abs(getWaterCardX(slotB, spacing, isMobile, width))
  const minWidthA = width * Math.max(getWaterCardScale(slotA, isMobile), minScaleA)
  const minWidthB = width * Math.max(getWaterCardScale(slotB, isMobile), minScaleB)
  const gap = Math.abs(xB - xA) - (minWidthA / 2 + minWidthB / 2)

  assert.ok(gap >= minGap, `rotated slot ${slotA}-${slotB} gap should be >= ${minGap}, got ${gap}`)
}

const desktopGapAtOne =
  getWaterCardX(1, 258, false, desktopWidth) -
  ((desktopWidth * getWaterCardScale(1, false)) / 2 + desktopWidth / 2)
assert.ok(desktopGapAtOne >= desktopMinGap, 'desktop side slot keeps visible gap')

const desktopMidX = getWaterCardX(0.5, 258, false, desktopWidth)
const desktopMidScale = getWaterCardScale(0.5, false)
assert.ok(
  desktopMidX * 2 >= desktopWidth * desktopMidScale + desktopMinGap,
  'desktop half-crossover keeps cards separated',
)

const mobileGapAtOne =
  getWaterCardX(1, 172, true, mobileWidth) -
  ((mobileWidth * getWaterCardScale(1, true)) / 2 + mobileWidth / 2)
assert.ok(mobileGapAtOne >= mobileMinGap, 'mobile side slot keeps visible gap')

const mobileMidX = getWaterCardX(0.5, 172, true, mobileWidth)
const mobileMidScale = getWaterCardScale(0.5, true)
assert.ok(
  mobileMidX * 2 >= mobileWidth * mobileMidScale + mobileMinGap,
  'mobile half-crossover keeps cards separated',
)

assertAdjacentGap(0, 1, false, desktopWidth, desktopMinGap)
assertAdjacentGap(1, 2, false, desktopWidth, desktopMinGap)
assertAdjacentGap(2, 3, false, desktopWidth, desktopMinGap)
assertAdjacentGap(0, 1, true, mobileWidth, mobileMinGap)
assertAdjacentGap(1, 2, true, mobileWidth, mobileMinGap)
assertRotatedLaneGap(1, 2, false, desktopWidth, desktopMinGap, 0.96, 0.96)
assertRotatedLaneGap(0, 1, true, mobileWidth, mobileMinGap, 1, 0.84)
assertRotatedLaneGap(1, 2, true, mobileWidth, mobileMinGap, 0.84, 0.84)
