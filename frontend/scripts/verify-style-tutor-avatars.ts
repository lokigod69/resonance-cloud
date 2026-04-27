import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { CHARACTER_REGISTRY } from '../src/characterRegistry'
import {
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

const styleTutors = CHARACTER_REGISTRY.filter((char) => char.tier === 'style')

assert.deepEqual(
  styleTutors.map((char) => char.name),
  expectedStyleTutors,
  'style tutor ordering should stay stable for avatar loading priority',
)

for (const [index, tutorName] of expectedStyleTutors.entries()) {
  const expectedUrl = `/characters/${tutorName.toLowerCase()}.webp`
  assert.equal(getStyleTutorAvatarUrl(tutorName), expectedUrl)
  assert.equal(getStyleTutorFallbackInitial(tutorName), tutorName.charAt(0).toUpperCase())
  assert.equal(getStyleTutorAvatarLoading(index), index < 5 ? 'eager' : 'lazy')

  const assetPath = path.resolve('public', expectedUrl.slice(1))
  assert.equal(existsSync(assetPath), true, `${assetPath} should exist`)
}
