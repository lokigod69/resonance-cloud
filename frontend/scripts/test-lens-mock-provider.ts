/**
 * Contract test for the Phase 2A Lens mock scan provider.
 *
 * Run: tsx scripts/test-lens-mock-provider.ts
 */

import { createMockLensScanProvider } from '../src/lib/lensMockProvider.ts'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error('       ', detail)
  }
}

const provider = createMockLensScanProvider({ latencyMs: 1 })

console.log('\n[high-confidence object]')
{
  const result = await provider.scan({
    image: 'data:image/jpeg;base64,object-high',
    targetLanguage: 'German',
    baseLanguage: 'English',
  })

  assert('kind object', result.kind === 'object', result)
  assert('one item', result.items.length === 1, result.items)
  assert('high confidence', result.items[0]?.confidence === 'high', result.items[0])
  assert('has target text', Boolean(result.items[0]?.target_text), result.items[0])
}

console.log('\n[low-confidence alternates]')
{
  const result = await provider.scan({
    image: 'data:image/jpeg;base64,low',
    targetLanguage: 'French',
    baseLanguage: 'English',
  })

  assert('low confidence', result.items[0]?.confidence === 'low', result.items[0])
  assert('two alternates', result.items[0]?.alternates?.length === 2, result.items[0])
}

console.log('\n[multi-item menu]')
{
  const result = await provider.scan({
    image: 'data:image/jpeg;base64,menu',
    targetLanguage: 'Spanish',
    baseLanguage: 'English',
  })

  assert('kind menu', result.kind === 'menu', result)
  assert('multiple items', result.items.length >= 3, result.items)
}

console.log('\n[safety decline]')
{
  const result = await provider.scan({
    image: 'data:image/jpeg;base64,person',
    targetLanguage: 'Korean',
    baseLanguage: 'English',
  })

  assert('person safety flag', result.safety === 'person', result)
  assert('no items persisted from safety result', result.items.length === 0, result.items)
}

console.log('\n[error scenario]')
{
  let threw = false
  try {
    await provider.scan({
      image: 'data:image/jpeg;base64,error',
      targetLanguage: 'German',
      baseLanguage: 'English',
    })
  } catch (error) {
    threw = error instanceof Error && error.message.includes('mock')
  }

  assert('throws typed mock error', threw)
}

if (failures > 0) {
  console.error(`\nLens mock provider: ${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\nLens mock provider: ${passes} passed`)
