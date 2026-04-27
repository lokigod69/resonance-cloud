import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { CHARACTER_REGISTRY } from '../src/characterRegistry'
import {
  getStyleTutorRingColor,
  getStyleTutorAvatarLoading,
  getStyleTutorAvatarUrl,
  getStyleTutorFallbackInitial,
} from '../src/components/speak/CharacterGrid.avatar'

const expectedStyleTutors = [
  'Cleo',
  'Jaxon',
  'Nova',
  'Orion',
  'Arthur',
  'Dante',
  'Elias',
  'Kael',
  'Briggs',
  'Zoe',
]

const expectedRingColors: Record<string, string> = {
  Cleo: 'hsl(27, 65%, 54%)',
  Jaxon: '#9a5a38',
  Nova: '#111827',
  Orion: '#e8e2d4',
  Arthur: '#8b5a36',
  Dante: '#7f1d1d',
  Elias: '#2563eb',
  Kael: 'hsl(21, 55%, 54%)',
  Briggs: '#556b2f',
  Zoe: 'hsl(302, 65%, 54%)',
}

const styleTutors = CHARACTER_REGISTRY.filter((char) => char.tier === 'style')

assert.deepEqual(
  styleTutors.map((char) => char.name),
  expectedStyleTutors,
  'style tutor ordering should stay stable for avatar loading priority',
)

for (const [index, tutorName] of expectedStyleTutors.entries()) {
  const expectedUrl = `/characters/${tutorName.toLowerCase()}.webp`
  assert.equal(getStyleTutorAvatarUrl(tutorName), expectedUrl)
  assert.equal(getStyleTutorRingColor(tutorName), expectedRingColors[tutorName])
  assert.equal(getStyleTutorFallbackInitial(tutorName), tutorName.charAt(0).toUpperCase())
  assert.equal(getStyleTutorAvatarLoading(index), index < 5 ? 'eager' : 'lazy')

  const assetPath = path.resolve('public', expectedUrl.slice(1))
  assert.equal(existsSync(assetPath), true, `${assetPath} should exist`)
}

const providerToggleSource = await readFile('src/components/speak/ProviderToggle.tsx', 'utf8')
assert.equal(
  providerToggleSource.includes('shadow-[0_12px_30px_rgba(79,70,229,0.22)'),
  false,
  'selected provider pill should not use the misplaced glow shadow',
)
