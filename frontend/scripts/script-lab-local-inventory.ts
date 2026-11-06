import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCRIPTS } from '../src/lib/scriptlab/registry.ts'
import type { ScriptAudioSpec, ScriptDefinition } from '../src/lib/scriptlab/types.ts'

/** Only the example words and composed blocks that need a local recording.
 * The same compose function selects existing recordings in the learner's UI. */
export function localAudioSpecs(script: ScriptDefinition): ScriptAudioSpec[] {
  if (script.id === 'japanese-hiragana' || script.id === 'russian-cyrillic') {
    return script.symbols.map((symbol) => symbol.exampleWord.audio)
  }
  const builder = script.composition
  if (script.id !== 'korean-hangul' || !builder) return []
  const specs: ScriptAudioSpec[] = []
  for (const initial of builder.initialIds) {
    for (const medial of builder.medialIds) {
      for (const final of [undefined, ...(builder.finalIds ?? [])]) {
        const result = builder.compose(initial, medial, final)
        if (!result) throw new Error(`Invalid Hangul builder selection: ${initial}/${medial}/${final}`)
        if (result.audio.itemId.startsWith('composed-')) specs.push(result.audio)
      }
    }
  }
  return specs
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = []
  for (const entry of SCRIPTS) {
    const { default: script } = await entry.load()
    rows.push(...localAudioSpecs(script).map((spec) => ({ scriptId: script.id, ...spec })))
  }
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(rows, null, 2))
  else process.stdout.write(JSON.stringify(rows))
}
