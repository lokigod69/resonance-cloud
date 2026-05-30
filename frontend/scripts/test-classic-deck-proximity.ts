import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  calculateClassicDeckProximity,
  formatClassicDeckProximityStyle,
} from '../src/lib/classicDeckProximity'

const root = process.cwd()

function nearlyEqual(actual: number, expected: number, tolerance = 0.001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

const cardRect = {
  left: 100,
  top: 80,
  width: 300,
  height: 360,
}

const center = {
  clientX: cardRect.left + cardRect.width / 2,
  clientY: cardRect.top + cardRect.height / 2,
}

{
  const result = calculateClassicDeckProximity(center, cardRect)
  assert.equal(result.intensity, 1, 'pointer at card center should be fully active')
  assert.equal(result.scale, 1.08, 'full proximity should scale the card to the maximum')
  assert.equal(result.liftPx, -14, 'full proximity should lift the card')
  assert.ok(result.glowAlpha > 0.3, 'full proximity should add a visible glow')
}

{
  const horizontal = calculateClassicDeckProximity(
    { clientX: center.clientX + 180, clientY: center.clientY },
    cardRect,
  )
  const vertical = calculateClassicDeckProximity(
    { clientX: center.clientX, clientY: center.clientY + 180 },
    cardRect,
  )
  nearlyEqual(horizontal.intensity, vertical.intensity)
  assert.ok(horizontal.intensity > 0 && horizontal.intensity < 1, 'nearby cards should react before direct hover')
}

{
  const diagonal = calculateClassicDeckProximity(
    { clientX: center.clientX + 260, clientY: center.clientY + 260 },
    cardRect,
  )
  assert.equal(diagonal.intensity, 0, 'cards outside the proximity radius should remain idle')
  assert.equal(diagonal.scale, 1, 'idle cards should keep stable size')
  assert.equal(diagonal.liftPx, 0, 'idle cards should not lift')
}

{
  const style = formatClassicDeckProximityStyle(calculateClassicDeckProximity(center, cardRect))
  assert.equal(style['--deck-proximity'], '1.000')
  assert.equal(style['--deck-proximity-scale'], '1.080')
  assert.equal(style['--deck-proximity-lift'], '-14.00px')
  assert.equal(style['--deck-proximity-brightness'], '1.080')
  assert.equal(style['--deck-proximity-z'], '21')
}

{
  const css = readFileSync(join(root, 'src', 'index.css'), 'utf8')
  assert.match(css, /\.classic-decks-grid\s*{[^}]*display:\s*grid;/s)
  assert.match(css, /\.classic-decks-grid\s*{[^}]*justify-items:\s*center;/s)
  assert.match(css, /\.classic-decks-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s)
  assert.match(css, /@media\s*\(min-width:\s*1200px\)\s*{[^}]*\.classic-decks-grid\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{[^}]*\.classic-deck-card\s*{/s)
}

{
  const source = readFileSync(join(root, 'src', 'pages', 'Decks.tsx'), 'utf8')
  assert.match(source, /calculateClassicDeckProximity/)
  assert.match(source, /formatClassicDeckProximityStyle/)
  assert.match(source, /requestAnimationFrame/)
  assert.match(source, /cancelAnimationFrame/)
  assert.match(source, /onPointerMove=\{handleDeckGridPointerMove\}/)
  assert.match(source, /onPointerLeave=\{resetDeckProximity\}/)
}

console.log('Classic deck proximity tests passed')
