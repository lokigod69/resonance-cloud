import assert from 'node:assert/strict'
import { SCRIPTS } from '../src/lib/scriptlab/registry.ts'
import {
  loadScriptContent,
  scriptContentKey,
} from '../src/lib/scriptlab/contentLocales.ts'
import { localizeScriptText, type LocalizedText } from '../src/lib/scriptlab/types.ts'
import type { LazyLocale } from '../src/lib/translations.ts'

const locales: LazyLocale[] = ['es', 'it', 'pt', 'id', 'pl', 'ru', 'ko', 'ja', 'ceb']
const texts = new Map<string, LocalizedText>()

function collect(value: unknown) {
  if (!value || typeof value !== 'object') return
  if (!Array.isArray(value)) {
    const candidate = value as Partial<LocalizedText>
    if (typeof candidate.en === 'string' && typeof candidate.de === 'string' && typeof candidate.fr === 'string') {
      const text = candidate as LocalizedText
      const key = scriptContentKey(text)
      const existing = texts.get(key)
      assert.ok(!existing || JSON.stringify(existing) === JSON.stringify(text), `stable content-key collision: ${key}`)
      texts.set(key, text)
      return
    }
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) collect(child)
}

for (const entry of SCRIPTS) collect((await entry.load()).default)
assert.equal(texts.size, 276, 'all unique authored Script Lab text tuples remain represented')

const sample = [...texts.values()][0]
assert.ok(sample)
assert.equal(localizeScriptText(sample, 'en'), sample.en, 'English authored content remains exact')
assert.equal(localizeScriptText(sample, 'de'), sample.de, 'German authored content remains exact')
assert.equal(localizeScriptText(sample, 'fr'), sample.fr, 'French authored content remains exact')

for (const locale of locales) {
  const messages = await loadScriptContent(locale)
  assert.ok(messages, `${locale} overlay loads`)
  assert.deepEqual(Object.keys(messages).sort(), [...texts.keys()].sort(), `${locale} covers the whole edition`)
  assert.ok(Object.values(messages).every((value) => value.trim()), `${locale} has no blank explanation`)
  const translated = localizeScriptText(sample, locale, messages)
  assert.equal(translated, messages[scriptContentKey(sample)], `${locale} resolves by stable content identity`)
  const identicalCount = [...texts].filter(([key, text]) => messages[key] === text.en).length
  assert.ok(identicalCount / texts.size < 0.2, `${locale} overlay is not an English fallback edition`)

  const targetScript = locale === 'ru'
    ? /\p{Script=Cyrillic}/u
    : locale === 'ko'
      ? /\p{Script=Hangul}/u
      : locale === 'ja'
        ? /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
        : null
  if (targetScript) {
    const targetScriptCount = Object.values(messages).filter((value) => targetScript.test(value)).length
    assert.ok(targetScriptCount / texts.size > 0.95, `${locale} explanations use the destination script`)
  }
}

console.log(`test-script-content-locales: OK (${locales.length} lazy locales, ${texts.size} stable text tuples)`)
