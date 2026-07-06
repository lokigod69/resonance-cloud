/**
 * Static data-integrity validation for the Script Lab writing-system inventories
 * (src/data/scripts/*.ts) against the frozen contract in src/lib/scriptlab/.
 *
 * Run: npx tsx scripts/test-script-lab-data.ts
 */

import { SCRIPTS } from '../src/lib/scriptlab/registry.ts'
import type { LocalizedText, ScriptDefinition, ScriptSymbol } from '../src/lib/scriptlab/types.ts'
import { LANGUAGES, getLanguageCode } from '../src/lib/languages.ts'
import { composeHangul, decomposeHangul } from '../src/lib/scriptlab/hangul.ts'

let passes = 0
let failures = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    return
  }
  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

function nonEmpty(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function assertLocalized(context: string, label: string, text: LocalizedText | undefined) {
  assert(`${context}: ${label}.en non-empty`, nonEmpty(text?.en), text)
  assert(`${context}: ${label}.de non-empty`, nonEmpty(text?.de), text)
  assert(`${context}: ${label}.fr non-empty`, nonEmpty(text?.fr), text)
}

/** True when some character of `word` decomposes into a Hangul syllable with
 * `character` in the given jamo slot. Used to sanity-check exampleWord choices
 * against the symbol they are meant to illustrate. */
function wordHasJamoInSlot(word: string, character: string, slot: 'initial' | 'medial' | 'final'): boolean {
  for (const char of word) {
    const decomposed = decomposeHangul(char)
    if (!decomposed) continue
    if (slot === 'initial' && decomposed.initial === character) return true
    if (slot === 'medial' && decomposed.medial === character) return true
    if (slot === 'final' && decomposed.final === character) return true
  }
  return false
}

const BCP47_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/

function validateHangul(script: ScriptDefinition) {
  console.log(`  [${script.id}: hangul-specific]`)

  const han = composeHangul('ㅎ', 'ㅏ', 'ㄴ')
  assert("composeHangul('ㅎ','ㅏ','ㄴ') -> syllable '한'", han?.syllable === '한', han)
  assert("composeHangul('ㅎ','ㅏ','ㄴ') -> romanization 'han'", han?.romanization === 'han', han)

  const ga = composeHangul('ㄱ', 'ㅏ')
  assert("composeHangul('ㄱ','ㅏ') -> syllable '가'", ga?.syllable === '가', ga)
  assert("composeHangul('ㄱ','ㅏ') -> romanization 'ga'", ga?.romanization === 'ga', ga)

  const hanDecomposed = decomposeHangul('한')
  assert("decomposeHangul('한') -> initial 'ㅎ'", hanDecomposed?.initial === 'ㅎ', hanDecomposed)
  assert("decomposeHangul('한') -> medial 'ㅏ'", hanDecomposed?.medial === 'ㅏ', hanDecomposed)
  assert("decomposeHangul('한') -> final 'ㄴ'", hanDecomposed?.final === 'ㄴ', hanDecomposed)

  const gaDecomposed = decomposeHangul('가')
  assert("decomposeHangul('가').final === null", gaDecomposed?.final === null, gaDecomposed)

  assert("decomposeHangul('A') === null", decomposeHangul('A') === null, decomposeHangul('A'))

  const composition = script.composition
  if (!composition) {
    assert(`${script.id}: has a composition block (required for hangul-specific checks)`, false)
    return
  }

  for (const symbol of script.symbols) {
    const ctx = `${script.id}/${symbol.id}`
    if (symbol.type === 'consonant' || symbol.type === 'double-consonant') {
      if (!composition.initialIds.includes(symbol.id)) continue
      const result = composition.compose(symbol.id, 'a')
      assert(`${ctx}: compose(${symbol.id}, 'a').text === exampleSyllable ('${symbol.exampleSyllable}')`, result?.text === symbol.exampleSyllable, result)
    }
    if (symbol.type === 'vowel' || symbol.type === 'compound-vowel') {
      if (!composition.medialIds.includes(symbol.id)) continue
      const result = composition.compose('ng', symbol.id)
      assert(`${ctx}: compose('ng', ${symbol.id}).text === exampleSyllable ('${symbol.exampleSyllable}')`, result?.text === symbol.exampleSyllable, result)
    }
    if (symbol.type === 'final-consonant') {
      if (!composition.finalIds?.includes(symbol.id)) continue
      // Finals must use the neutral silent-ㅇ carrier (아 + batchim). A
      // consonant-initial syllable like 곧 leaks another symbol's sound into
      // quiz prompts and makes listen questions ambiguous.
      const result = composition.compose('ng', 'a', symbol.id)
      assert(`${ctx}: compose('ng','a',${symbol.id}).text === exampleSyllable ('${symbol.exampleSyllable}')`, result?.text === symbol.exampleSyllable, result)
      assert(
        `${ctx}: composed romanization matches exampleSyllableRomanization ('${symbol.exampleSyllableRomanization}')`,
        result?.romanization === symbol.exampleSyllableRomanization,
        { composed: result?.romanization, declared: symbol.exampleSyllableRomanization },
      )
    }
  }

  // The "never speak a bare jamo" rule, enforced: no spoken text may contain
  // compatibility jamo (U+3130–U+318F) — TTS engines misread them.
  const COMPAT_JAMO = /[㄰-㆏]/
  for (const symbol of script.symbols) {
    const ctx = `${script.id}/${symbol.id}`
    for (const spec of [symbol.audio, symbol.exampleSyllableAudio, symbol.exampleWord.audio]) {
      if (!spec) continue
      assert(`${ctx}: audio '${spec.itemId}' text ('${spec.text}') contains no bare jamo`, !COMPAT_JAMO.test(spec.text), spec)
    }
  }

  for (const symbol of script.symbols) {
    const ctx = `${script.id}/${symbol.id}`
    const word = symbol.exampleWord.word
    const decomposesCleanly = [...word].every((char) => decomposeHangul(char) !== null)
    assert(`${ctx}: exampleWord.word '${word}' decomposes cleanly into Hangul syllables`, decomposesCleanly, word)

    let matches: boolean
    if (symbol.id === 'ng') {
      matches = wordHasJamoInSlot(word, 'ㅇ', 'initial') || wordHasJamoInSlot(word, 'ㅇ', 'final')
    } else if (symbol.type === 'consonant' || symbol.type === 'double-consonant') {
      matches = wordHasJamoInSlot(word, symbol.character, 'initial')
    } else if (symbol.type === 'vowel' || symbol.type === 'compound-vowel') {
      matches = wordHasJamoInSlot(word, symbol.character, 'medial')
    } else if (symbol.type === 'final-consonant') {
      matches = wordHasJamoInSlot(word, symbol.character, 'final')
    } else {
      matches = true
    }
    assert(`${ctx}: exampleWord.word '${word}' contains '${symbol.character}' in the expected slot`, matches, { word, character: symbol.character, type: symbol.type })
  }
}

console.log('[registry]')
const registryIds = new Set<string>()
for (const entry of SCRIPTS) {
  assert(`registry: id '${entry.id}' is unique`, !registryIds.has(entry.id), entry.id)
  registryIds.add(entry.id)
  assert(`registry: '${entry.id}' language '${entry.language}' exists in LANGUAGES`, LANGUAGES.some((lang) => lang.value === entry.language), entry.language)
  assert(
    `registry: '${entry.id}' languageCode matches getLanguageCode(language)`,
    entry.languageCode === getLanguageCode(entry.language),
    { languageCode: entry.languageCode, expected: getLanguageCode(entry.language) },
  )
  assert(`registry: '${entry.id}' emblem non-empty`, nonEmpty(entry.emblem), entry.emblem)
}

let totalSymbols = 0

for (const entry of SCRIPTS) {
  console.log(`\n[${entry.id}]`)
  const mod = await entry.load()
  const script = mod.default

  assert(`${entry.id}: entry.id === script.id`, entry.id === script.id, { entryId: entry.id, scriptId: script.id })
  assert(`${entry.id}: entry.language === script.language`, entry.language === script.language, { entryLanguage: entry.language, scriptLanguage: script.language })
  assert(`${entry.id}: entry.nativeName === script.nativeName`, entry.nativeName === script.nativeName, { entryNativeName: entry.nativeName, scriptNativeName: script.nativeName })

  // Script metadata
  assert(`${script.id}: displayName non-empty`, nonEmpty(script.displayName), script.displayName)
  assert(`${script.id}: nativeName non-empty`, nonEmpty(script.nativeName), script.nativeName)
  assert(`${script.id}: speechLang '${script.speechLang}' is BCP-47 shaped`, BCP47_PATTERN.test(script.speechLang), script.speechLang)
  assert(`${script.id}: kind present`, nonEmpty(script.kind), script.kind)
  assertLocalized(script.id, 'tagline', script.tagline)
  assert(`${script.id}: intro has at least one paragraph`, script.intro.length > 0, script.intro)
  script.intro.forEach((paragraph, i) => assertLocalized(script.id, `intro[${i}]`, paragraph))

  // Symbols
  const symbolIds = new Set<string>()
  const audioItemIds = new Set<string>()
  for (const symbol of script.symbols) {
    const ctx = `${script.id}/${symbol.id}`
    assert(`${ctx}: id unique within script`, !symbolIds.has(symbol.id), symbol.id)
    symbolIds.add(symbol.id)
    assert(`${ctx}: character non-empty`, nonEmpty(symbol.character), symbol.character)
    assert(`${ctx}: romanization non-empty`, nonEmpty(symbol.romanization), symbol.romanization)
    assertLocalized(ctx, 'pronunciationNote', symbol.pronunciationNote)
    assert(`${ctx}: order is a positive integer`, Number.isInteger(symbol.order) && symbol.order > 0, symbol.order)

    assert(`${ctx}: exampleWord.word non-empty`, nonEmpty(symbol.exampleWord.word), symbol.exampleWord.word)
    assert(`${ctx}: exampleWord.romanization non-empty`, nonEmpty(symbol.exampleWord.romanization), symbol.exampleWord.romanization)
    assertLocalized(ctx, 'exampleWord.meaning', symbol.exampleWord.meaning)
    assert(`${ctx}: exampleWord.audio.itemId non-empty`, nonEmpty(symbol.exampleWord.audio.itemId), symbol.exampleWord.audio)
    assert(`${ctx}: exampleWord.audio.text non-empty`, nonEmpty(symbol.exampleWord.audio.text), symbol.exampleWord.audio)

    assert(`${ctx}: audio.itemId non-empty`, nonEmpty(symbol.audio.itemId), symbol.audio)
    assert(`${ctx}: audio.text non-empty`, nonEmpty(symbol.audio.text), symbol.audio)

    if (symbol.exampleSyllable !== undefined) {
      assert(`${ctx}: exampleSyllableAudio present when exampleSyllable is set`, symbol.exampleSyllableAudio !== undefined, symbol.exampleSyllable)
      if (symbol.exampleSyllableAudio) {
        assert(
          `${ctx}: exampleSyllableAudio.text === exampleSyllable`,
          symbol.exampleSyllableAudio.text === symbol.exampleSyllable,
          { audioText: symbol.exampleSyllableAudio.text, exampleSyllable: symbol.exampleSyllable },
        )
      }
    }

    const itemIdsForSymbol = [symbol.audio.itemId, symbol.exampleSyllableAudio?.itemId, symbol.exampleWord.audio.itemId]
      .filter((id): id is string => Boolean(id))
    for (const itemId of itemIdsForSymbol) {
      assert(`${ctx}: audio itemId '${itemId}' unique within script`, !audioItemIds.has(itemId), itemId)
      audioItemIds.add(itemId)
    }
  }
  totalSymbols += script.symbols.length

  // Sections
  const sectionIds = new Set<string>()
  const sectionCountBySymbolId = new Map<string, number>()
  for (const section of script.sections) {
    const sctx = `${script.id}/section:${section.id}`
    assert(`${sctx}: id unique within script`, !sectionIds.has(section.id), section.id)
    sectionIds.add(section.id)
    assertLocalized(sctx, 'title', section.title)
    assertLocalized(sctx, 'description', section.description)

    const ordersInSection = new Set<number>()
    for (const symbolId of section.symbolIds) {
      const symbol = script.symbols.find((s) => s.id === symbolId)
      assert(`${sctx}: symbolId '${symbolId}' resolves to a symbol`, symbol !== undefined, symbolId)
      sectionCountBySymbolId.set(symbolId, (sectionCountBySymbolId.get(symbolId) ?? 0) + 1)
      if (symbol) {
        assert(`${sctx}: symbol '${symbolId}' order (${symbol.order}) unique within section`, !ordersInSection.has(symbol.order), symbol.order)
        ordersInSection.add(symbol.order)
      }
    }
  }
  for (const symbol of script.symbols) {
    const count = sectionCountBySymbolId.get(symbol.id) ?? 0
    assert(`${script.id}/${symbol.id}: appears in exactly one section (found in ${count})`, count === 1, count)
  }

  // Quizability: QuizMode needs 1 correct + 3 distractors from the same
  // section, so a script where every section has <4 symbols yields an empty
  // quiz (the Start button would no-op).
  assert(
    `${script.id}: at least one section has >= 4 symbols (quiz needs 4 options)`,
    script.sections.some((section) => section.symbolIds.length >= 4),
    script.sections.map((section) => ({ id: section.id, size: section.symbolIds.length })),
  )

  // Composition
  if (script.composition) {
    const { initialIds, medialIds, finalIds, compose } = script.composition
    for (const id of initialIds) {
      assert(`${script.id}: composition.initialIds '${id}' resolves to a symbol`, script.symbols.some((s) => s.id === id), id)
    }
    for (const id of medialIds) {
      assert(`${script.id}: composition.medialIds '${id}' resolves to a symbol`, script.symbols.some((s) => s.id === id), id)
    }
    for (const id of finalIds ?? []) {
      assert(`${script.id}: composition.finalIds '${id}' resolves to a symbol`, script.symbols.some((s) => s.id === id), id)
    }

    if (initialIds.length > 0 && medialIds.length > 0) {
      const firstInitial = initialIds[0]
      const firstMedial = medialIds[0]
      const result = compose(firstInitial, firstMedial)
      assert(`${script.id}: compose(${firstInitial}, ${firstMedial}) returns non-null`, result !== null, result)
      if (result) {
        assert(`${script.id}: compose(${firstInitial}, ${firstMedial}) has non-empty text`, nonEmpty(result.text), result)
        assert(`${script.id}: compose(${firstInitial}, ${firstMedial}) has non-empty romanization`, nonEmpty(result.romanization), result)
        assert(`${script.id}: compose(${firstInitial}, ${firstMedial}) has non-empty audio.text`, nonEmpty(result.audio.text), result)
      }
    }

    assert(`${script.id}: compose with an unknown id returns null`, compose('__unknown-id__', '__unknown-id__') === null)
  }

  // Homophone tags: symbols sharing a 'homophone:*' tag must share identical IPA.
  const homophoneGroups = new Map<string, ScriptSymbol[]>()
  for (const symbol of script.symbols) {
    for (const tag of symbol.tags ?? []) {
      if (!tag.startsWith('homophone:')) continue
      const group = homophoneGroups.get(tag) ?? []
      group.push(symbol)
      homophoneGroups.set(tag, group)
    }
  }
  for (const [tag, group] of homophoneGroups) {
    const ipas = new Set(group.map((s) => s.ipa))
    assert(
      `${script.id}: homophone group '${tag}' shares identical IPA across [${group.map((s) => s.id).join(', ')}]`,
      ipas.size === 1,
      group.map((s) => ({ id: s.id, ipa: s.ipa })),
    )
  }

  if (script.id === 'korean-hangul') {
    validateHangul(script)
  }
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) {
  process.exit(1)
}
console.log(`\n✓ script-lab data: ${SCRIPTS.length} scripts, ${totalSymbols} symbols validated`)
