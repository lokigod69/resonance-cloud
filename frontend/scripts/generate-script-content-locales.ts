import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCRIPTS } from '../src/lib/scriptlab/registry.ts'
import { scriptContentKey } from '../src/lib/scriptlab/contentLocales.ts'
import type { LocalizedText } from '../src/lib/scriptlab/types.ts'
import type { LazyLocale } from '../src/lib/translations.ts'

const MODEL = 'openai/gpt-4.1-mini'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const localeNames: Record<LazyLocale, string> = {
  es: 'Spanish', it: 'Italian', pt: 'Portuguese', id: 'Indonesian', pl: 'Polish',
  ru: 'Russian', ko: 'Korean', ja: 'Japanese', ceb: 'Cebuano (Bisaya)',
}
const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '..')
const outputDir = resolve(frontendRoot, 'src/lib/scriptlab/locales')
const stateDir = resolve(frontendRoot, '../../investigations/script-content-locales-2026-09-07')

async function envValue(name: string) {
  if (process.env[name]?.trim()) return process.env[name]?.trim()
  for (const path of [resolve(frontendRoot, '../.env'), resolve(frontendRoot, '.vercel/.env.development.local')]) {
    let source = ''
    try { source = await readFile(path, 'utf8') } catch { continue }
    const line = source.split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`))
    const value = line?.split('=', 2)[1]?.trim().replace(/^(['"])(.*)\1$/, '$2')
    if (value) return value
  }
  return undefined
}

function collectLocalizedText(value: unknown, found: Map<string, LocalizedText>) {
  if (!value || typeof value !== 'object') return
  if (!Array.isArray(value)) {
    const candidate = value as Partial<LocalizedText>
    if (typeof candidate.en === 'string' && typeof candidate.de === 'string' && typeof candidate.fr === 'string') {
      const text = candidate as LocalizedText
      const key = scriptContentKey(text)
      const existing = found.get(key)
      if (existing && JSON.stringify(existing) !== JSON.stringify(text)) throw new Error(`Content-key collision: ${key}`)
      found.set(key, text)
      return
    }
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) collectLocalizedText(child, found)
}

async function translate(apiKey: string, locale: LazyLocale, items: Array<{ id: string; source: string }>) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lingwave.ai',
      'X-Title': 'Lingwave offline Script Lab locale generation',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 20_000,
      reasoning: { effort: 'none' },
      provider: { max_price: { prompt: 0.6, completion: 2 } },
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Translate Script Lab explanations from English into natural ${localeNames[locale]}. Preserve linguistic notation, IPA, quoted example letters, romanization, and every {placeholder} exactly. Return JSON only as {"translations":{"id":"translation"}} with every id exactly once. Do not add notes or new pedagogy.`,
        },
        { role: 'user', content: JSON.stringify({ locale, items }) },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 300)}`)
  const payload = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content?.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  if (!content) throw new Error('Provider returned no content')
  const values = (JSON.parse(content) as { translations?: Record<string, unknown> }).translations
  if (!values) throw new Error('Provider returned no translations object')
  return values
}

function moduleSource(locale: LazyLocale, messages: Record<string, string>) {
  return [
    '// Machine-authored Script Lab explanation overlay.',
    `// Locale: ${localeNames[locale]}. Provider: OpenRouter. Generated: 2026-09-07.`,
    '// Status: complete machine translation; requires native-language editorial review.',
    "import type { ScriptContentMessages } from '../contentLocales'",
    '',
    `const messages = ${JSON.stringify(messages, null, 2)} satisfies ScriptContentMessages`,
    '',
    'export default messages',
    '',
  ].join('\n')
}

async function main() {
  const requested = process.argv.find((arg) => arg.startsWith('--locales='))?.slice(10)
  const locales = (requested ? requested.split(',') : Object.keys(localeNames)) as LazyLocale[]
  const apiKey = await envValue('OPENROUTER_API_KEY')
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is unavailable')

  const texts = new Map<string, LocalizedText>()
  for (const entry of SCRIPTS) collectLocalizedText((await entry.load()).default, texts)
  const items = [...texts].map(([id, text]) => ({ id, source: text.en }))
  if (items.length !== 276) throw new Error(`Expected 276 stable Script Lab text tuples, received ${items.length}`)
  await mkdir(outputDir, { recursive: true })
  await mkdir(stateDir, { recursive: true })

  for (const locale of locales) {
    if (!(locale in localeNames)) throw new Error(`Unsupported locale: ${locale}`)
    const statePath = resolve(stateDir, `${locale}.json`)
    let messages: Record<string, string> = {}
    try { messages = JSON.parse(await readFile(statePath, 'utf8')) as Record<string, string> } catch { /* start clean */ }
    const pending = items.filter(({ id }) => !messages[id] || messages[id] === 'undefined')
    process.stdout.write(`[script-content] ${locale}: ${items.length - pending.length}/${items.length} restored\n`)
    for (let offset = 0; offset < pending.length; offset += 30) {
      const batch = pending.slice(offset, offset + 30)
      let missing = batch
      let lastError: unknown
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const values = await translate(apiKey, locale, missing)
          for (const { id } of missing) {
            const value = values[id]
            if (typeof value === 'string' && value.trim()) messages[id] = value.trim()
          }
          missing = missing.filter(({ id }) => !messages[id])
          if (missing.length === 0) break
          lastError = new Error(`Provider omitted ${missing.map(({ id }) => id).join(', ')}`)
          process.stderr.write(`[script-content] ${locale} batch ${offset / 30 + 1} attempt ${attempt} incomplete: ${missing.length} remaining\n`)
        } catch (error) {
          lastError = error
          process.stderr.write(`[script-content] ${locale} batch ${offset / 30 + 1} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}\n`)
        }
      }
      if (missing.length > 0) throw lastError
      await writeFile(statePath, `${JSON.stringify(messages, null, 2)}\n`, 'utf8')
    }
    if (!items.every(({ id }) => messages[id]?.trim() && messages[id] !== 'undefined')) {
      throw new Error(`${locale} overlay is incomplete`)
    }
    await writeFile(resolve(outputDir, `${locale}.ts`), moduleSource(locale, messages), 'utf8')
    process.stdout.write(`[script-content] ${locale}: ${items.length}/${items.length}\n`)
  }
}

await main()
