import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { translations, type LazyLocale, type TranslationMessages } from '../src/lib/translations.ts'

const MODEL = 'deepseek/deepseek-v4-flash'
const CEBUANO_REVIEW_MODEL = 'openai/gpt-4.1-mini'
const INPUT_USD_PER_MILLION = 0.09
const OUTPUT_USD_PER_MILLION = 0.18
const DEFAULT_BUDGET_USD = 5
const BATCH_SIZE = 300
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const localeNames: Record<LazyLocale, string> = {
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  id: 'Indonesian',
  pl: 'Polish',
  ru: 'Russian',
  ko: 'Korean',
  ja: 'Japanese',
  ceb: 'Cebuano (Bisaya)',
}

const localeInstructions: Partial<Record<LazyLocale, string>> = {
  ceb: 'Use Cebuano/Bisaya, never Tagalog. Translate ordinary navigation, account, billing, study, and error copy instead of copying English. Keep an English loanword only when it is the normal Cebuano product term; never leave a complete ordinary English sentence untranslated.',
}

const pluralExtras: Partial<Record<LazyLocale, TranslationMessages>> = {
  pl: {
    'dashboard.deckCount.few': '{count} talie',
    'dashboard.deckCount.many': '{count} talii',
    'dashboard.wordCount.few': '{count} słowa',
    'dashboard.wordCount.many': '{count} słów',
    'categories.levelCount.few': '{count} poziomy',
    'categories.levelCount.many': '{count} poziomów',
    'categories.entryCount.few': '{count} słowa',
    'categories.entryCount.many': '{count} słów',
    'generate.wordCountSlider.few': '{count} słowa',
    'generate.wordCountSlider.many': '{count} słów',
    'generate.creditsUsed.few': 'Zostaną użyte {count} kredyty',
    'generate.creditsUsed.many': 'Zostanie użytych {count} kredytów',
    'study.wordsReviewed.few': 'Powtórzono {count} słowa',
    'study.wordsReviewed.many': 'Powtórzono {count} słów',
    'study.session.words.few': '{count} słowa',
    'study.session.words.many': '{count} słów',
    'generateGo.wordCount.few': '{count} słowa',
    'generateGo.wordCount.many': '{count} słów',
    'generateGo.creditCount.few': '{count} kredyty',
    'generateGo.creditCount.many': '{count} kredytów',
    'deckview.cards.few': 'karty',
    'deckview.cards.many': 'kart',
  },
  ru: {
    'dashboard.deckCount.few': '{count} колоды',
    'dashboard.deckCount.many': '{count} колод',
    'dashboard.wordCount.few': '{count} слова',
    'dashboard.wordCount.many': '{count} слов',
    'categories.levelCount.few': '{count} уровня',
    'categories.levelCount.many': '{count} уровней',
    'categories.entryCount.few': '{count} слова',
    'categories.entryCount.many': '{count} слов',
    'generate.wordCountSlider.few': '{count} слова',
    'generate.wordCountSlider.many': '{count} слов',
    'generate.creditsUsed.few': 'Будет использовано {count} кредита',
    'generate.creditsUsed.many': 'Будет использовано {count} кредитов',
    'study.wordsReviewed.few': 'Вы повторили {count} слова',
    'study.wordsReviewed.many': 'Вы повторили {count} слов',
    'study.session.words.few': '{count} слова',
    'study.session.words.many': '{count} слов',
    'generateGo.wordCount.few': '{count} слова',
    'generateGo.wordCount.many': '{count} слов',
    'generateGo.creditCount.few': '{count} кредита',
    'generateGo.creditCount.many': '{count} кредитов',
    'deckview.cards.few': 'карты',
    'deckview.cards.many': 'карт',
  },
}

const manualKeyOverrides: Record<LazyLocale, TranslationMessages> = {
  es: {
    'decks.view.water': 'Agua',
    'today.type.targetKeyboardHint': 'Usa tu teclado en {language}.',
    'today.type.openScriptLab': 'Practica {script} en Script Lab',
  },
  it: {
    'decks.view.water': 'Acqua',
    'today.type.targetKeyboardHint': 'Usa la tastiera {language}.',
    'today.type.openScriptLab': 'Esercitati con {script} in Script Lab',
  },
  pt: {
    'decks.view.water': 'Água',
    'today.type.targetKeyboardHint': 'Use o teclado de {language}.',
    'today.type.openScriptLab': 'Pratique {script} no Script Lab',
  },
  id: {
    'decks.view.water': 'Air',
    'today.type.targetKeyboardHint': 'Gunakan papan ketik {language}.',
    'today.type.openScriptLab': 'Latih {script} di Script Lab',
  },
  pl: {
    'decks.view.water': 'Woda',
    'today.type.targetKeyboardHint': 'Użyj klawiatury w języku {language}.',
    'today.type.openScriptLab': 'Poćwicz pismo {script} w Script Lab',
  },
  ru: {
    'decks.view.water': 'Вода',
    'today.type.targetKeyboardHint': 'Используйте клавиатуру для языка {language}.',
    'today.type.openScriptLab': 'Практикуйте письмо {script} в Script Lab',
  },
  ko: {
    'decks.view.water': '물',
    'today.type.targetKeyboardHint': '{language} 키보드를 사용하세요.',
    'today.type.openScriptLab': 'Script Lab에서 {script} 쓰기를 연습하세요',
  },
  ja: {
    'decks.view.water': '水',
    'today.type.targetKeyboardHint': '{language}キーボードを使ってください。',
    'today.type.openScriptLab': 'Script Labで{script}を練習する',
  },
  ceb: {
    'decks.view.water': 'Tubig',
    'today.step.build': 'Han-aya ang mga pulong',
    'today.build.title': 'Han-aya ang mga pulong',
    'today.build.prompt': 'Han-aya ang mga pulong aron mahimong kompleto nga pahayag.',
    'today.build.answerLabel': 'Imong pahayag',
    'today.path.backToPath': 'Balik sa kurso',
    'today.path.yourPath': 'Imong kurso',
    'today.type.targetKeyboardHint': 'Gamita ang {language} nga keyboard.',
    'today.type.openScriptLab': 'Pagpraktis sa {script} sa Script Lab',
    'today.checkpoint.cardBody': '8 ka buluhaton gikan sa {count} ka nahuman nga kurso',
    'today.checkpoint.backToToday': 'Balik sa kurso',
  },
}

type Usage = { prompt_tokens?: number; completion_tokens?: number }
type Checkpoint = Record<string, string>

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '..')
const defaultStateDir = resolve(frontendRoot, '../../investigations/ui-locale-generation-2026-09-07')
const outputDir = resolve(frontendRoot, 'src/lib/locales')

function readArgs() {
  const requested = process.argv.find((arg) => arg.startsWith('--locales='))?.slice('--locales='.length)
  const locales = (requested ? requested.split(',') : Object.keys(localeNames)) as LazyLocale[]
  for (const locale of locales) {
    if (!(locale in localeNames)) throw new Error(`Unsupported locale: ${locale}`)
  }
  const budgetArg = process.argv.find((arg) => arg.startsWith('--budget='))?.slice('--budget='.length)
  const budgetUsd = budgetArg ? Number(budgetArg) : DEFAULT_BUDGET_USD
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) throw new Error('Budget must be a positive number')
  const stateArg = process.argv.find((arg) => arg.startsWith('--state-dir='))?.slice('--state-dir='.length)
  return { locales, budgetUsd, stateDir: stateArg ? resolve(stateArg) : defaultStateDir }
}

async function readEnvValue(name: string): Promise<string | undefined> {
  if (process.env[name]?.trim()) return process.env[name]?.trim()
  const envFiles = [resolve(frontendRoot, '../.env'), resolve(frontendRoot, '.vercel/.env.development.local')]
  for (const path of envFiles) {
    let source = ''
    try {
      source = await readFile(path, 'utf8')
    } catch {
      continue
    }
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (match?.[1] !== name) continue
      const value = (match[2] ?? '').replace(/^(['"])(.*)\1$/, '$2').trim()
      if (value) return value
    }
  }
  return undefined
}

function interpolationSlots(value: string) {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

function validateTranslation(source: string, translated: unknown, locale: LazyLocale): asserts translated is string {
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error(`${locale}: provider returned an empty translation for ${JSON.stringify(source)}`)
  }
  const expectedSlots = interpolationSlots(source)
  const observedSlots = interpolationSlots(translated)
  if (JSON.stringify(expectedSlots) !== JSON.stringify(observedSlots)) {
    throw new Error(`${locale}: interpolation mismatch for ${JSON.stringify(source)}: expected ${expectedSlots}, received ${observedSlots}`)
  }
}

async function readCheckpoint(path: string): Promise<Checkpoint> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Checkpoint
  } catch {
    return {}
  }
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(trimmed)
}

async function translateBatch(
  apiKey: string,
  locale: LazyLocale,
  values: Array<{ id: string; source: string; keys: string[] }>,
): Promise<{ values: Record<string, string>; usage: Usage }> {
  const model = locale === 'ceb' ? CEBUANO_REVIEW_MODEL : MODEL
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lingwave.ai',
      'X-Title': 'Lingwave offline UI locale generation',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 24_000,
      reasoning: { effort: 'none' },
      provider: { max_price: { prompt: 0.6, completion: locale === 'ceb' ? 2 : 0.6 } },
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            `Translate product interface copy from English into natural ${localeNames[locale]}.`,
            'The audience is one adult language learner. Use concise, friendly UI language and a consistent informal voice where the language distinguishes formality.',
            'Preserve every {placeholder} exactly, including braces and spelling. Preserve line breaks where practical.',
            'Do not translate product/provider names such as Lingwave, SRS, IPA, AI, Live, GPT Image, Gemini, ElevenLabs, Suno, Premium, A1, A2, or B1.',
            localeInstructions[locale] ?? '',
            'Use the supplied keys only as context. Return JSON only in the form {"translations":{"id":"translation"}} with every id exactly once.',
            'Do not add explanations, alternatives, review claims, or translator notes.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({ locale, strings: values }),
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const raw = await response.text()
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${raw.slice(0, 500)}`)
  const payload = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: Usage
  }
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter returned no message content')
  const parsed = extractJsonObject(content) as { translations?: unknown }
  if (!parsed || typeof parsed !== 'object' || !parsed.translations || typeof parsed.translations !== 'object') {
    throw new Error('OpenRouter response did not contain a translations object')
  }
  return { values: parsed.translations as Record<string, string>, usage: payload.usage ?? {} }
}

function moduleSource(locale: LazyLocale, messages: TranslationMessages) {
  return [
    '// Machine-authored UI locale generated from the English source pack.',
    `// Locale: ${localeNames[locale]}. Model: ${locale === 'ceb' ? `${MODEL} + ${CEBUANO_REVIEW_MODEL}` : MODEL}. Generated: 2026-09-07.`,
    '// Status: complete machine translation; requires native-language editorial review.',
    "import type { TranslationMessages } from '../translations'",
    '',
    `const messages = ${JSON.stringify(messages, null, 2)} satisfies TranslationMessages`,
    '',
    'export default messages',
    '',
  ].join('\n')
}

async function main() {
  const { locales, budgetUsd, stateDir } = readArgs()
  const apiKey = await readEnvValue('OPENROUTER_API_KEY')
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not available')
  await mkdir(stateDir, { recursive: true })
  await mkdir(outputDir, { recursive: true })

  const sourceEntries = Object.entries(translations.en)
  const keysBySource = new Map<string, string[]>()
  for (const [key, source] of sourceEntries) {
    const keys = keysBySource.get(source) ?? []
    keys.push(key)
    keysBySource.set(source, keys)
  }
  const uniqueSources = [...keysBySource.entries()].map(([source, keys], index) => ({
    id: String(index),
    source,
    keys,
  }))

  let estimatedCost = 0
  for (const locale of locales) {
    const checkpointPath = resolve(stateDir, `${locale}.json`)
    const checkpoint = await readCheckpoint(checkpointPath)
    const pending = uniqueSources.filter(({ source, keys }) => (
      !checkpoint[source] && !keys.every((key) => manualKeyOverrides[locale][key])
    ))
    process.stdout.write(`[ui-locales] ${locale}: ${uniqueSources.length - pending.length}/${uniqueSources.length} restored; ${pending.length} pending\n`)

    for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
      const batch = pending.slice(offset, offset + BATCH_SIZE)
      let result: Awaited<ReturnType<typeof translateBatch>> | undefined
      let lastError: unknown
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          result = await translateBatch(apiKey, locale, batch)
          break
        } catch (error) {
          lastError = error
          process.stderr.write(`[ui-locales] ${locale} batch ${offset / BATCH_SIZE + 1} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}\n`)
        }
      }
      if (!result) throw lastError

      for (const item of batch) {
        const translated = result.values[item.id]
        validateTranslation(item.source, translated, locale)
        checkpoint[item.source] = translated.trim()
      }
      const inputTokens = result.usage.prompt_tokens ?? 0
      const outputTokens = result.usage.completion_tokens ?? 0
      const inputRate = locale === 'ceb' ? 0.6 : INPUT_USD_PER_MILLION
      const outputRate = locale === 'ceb' ? 2 : OUTPUT_USD_PER_MILLION
      estimatedCost += inputTokens / 1_000_000 * inputRate
        + outputTokens / 1_000_000 * outputRate
      if (estimatedCost > budgetUsd) {
        await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8')
        throw new Error(`Stopped after estimated provider cost $${estimatedCost.toFixed(4)} exceeded budget $${budgetUsd.toFixed(2)}`)
      }
      await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8')
      process.stdout.write(`[ui-locales] ${locale}: ${Math.min(offset + batch.length, pending.length)}/${pending.length} new; estimated total $${estimatedCost.toFixed(4)}\n`)
    }

    const messages = {
      ...Object.fromEntries(sourceEntries.map(([key, source]) => {
      const translated = manualKeyOverrides[locale][key] ?? checkpoint[source]
      validateTranslation(source, translated, locale)
      return [key, translated]
      })),
      ...pluralExtras[locale],
      ...manualKeyOverrides[locale],
    }
    await writeFile(resolve(outputDir, `${locale}.ts`), moduleSource(locale, messages), 'utf8')
  }
  process.stdout.write(`[ui-locales] complete; estimated provider cost $${estimatedCost.toFixed(4)}\n`)
}

await main()
