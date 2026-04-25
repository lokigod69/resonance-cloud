import { strict as assert } from 'node:assert'

import {
  getWaterCardDim,
  getWaterCardRootOpacity,
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
