import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  STATIC_CATEGORY_TRANSLATION_LANGUAGES,
  type StaticCategoryTargetLanguageCode,
} from '../src/data/categories.ts'
import {
  buildTranslationReviewRows,
  getStaticTranslationQualitySummary,
  type TranslationReviewRow,
} from './static-translation-quality.ts'

type ExportArgs = {
  lang: StaticCategoryTargetLanguageCode
  category?: string
  levels?: Set<number>
  needsReviewOnly: boolean
}

const args = parseArgs(process.argv.slice(2))
const rows = buildTranslationReviewRows({
  language: args.lang,
  categoryId: args.category,
  levels: args.levels,
  needsReviewOnly: args.needsReviewOnly,
})
const outputDir = resolve(process.cwd(), '..', 'docs', 'Product', 'translation-review')
mkdirSync(outputDir, { recursive: true })

const suffixParts = [
  args.lang,
  args.category,
  args.levels ? `levels_${[...args.levels].sort((a, b) => a - b).join('-')}` : undefined,
  args.needsReviewOnly ? 'needs_review' : undefined,
].filter(Boolean)
const baseName = `${suffixParts.join('_') || args.lang}_review_queue`
const markdownPath = resolve(outputDir, `${baseName}.md`)
const csvPath = resolve(outputDir, `${baseName}.csv`)
const summaryPath = resolve(outputDir, 'translation_quality_summary.md')

writeFileSync(markdownPath, renderMarkdown(rows, args), 'utf8')
writeFileSync(csvPath, renderCsv(rows), 'utf8')
writeFileSync(summaryPath, renderSummary(), 'utf8')

console.log(`Wrote ${rows.length} review rows`)
console.log(markdownPath)
console.log(csvPath)
console.log(summaryPath)

function parseArgs(argv: string[]): ExportArgs {
  let lang: StaticCategoryTargetLanguageCode | undefined
  let category: string | undefined
  let levels: Set<number> | undefined
  let needsReviewOnly = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--lang') {
      lang = parseLanguage(argv[++i])
    } else if (arg === '--category') {
      category = argv[++i]
    } else if (arg === '--levels') {
      levels = parseLevels(argv[++i])
    } else if (arg === '--needs-review-only') {
      needsReviewOnly = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!lang) throw new Error('Missing required --lang <code>')
  return { lang, category, levels, needsReviewOnly }
}

function parseLanguage(value: string | undefined): StaticCategoryTargetLanguageCode {
  const match = STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((language) => language.code === value)
  if (!match) throw new Error(`Unsupported language code: ${value ?? '(missing)'}`)
  return match.code
}

function parseLevels(value: string | undefined): Set<number> {
  if (!value) throw new Error('Missing --levels value')
  const levels = new Set<number>()
  for (const part of value.split(',')) {
    const trimmed = part.trim()
    const range = trimmed.match(/^(\d+)-(\d+)$/)
    if (range) {
      const start = Number(range[1])
      const end = Number(range[2])
      for (let level = start; level <= end; level += 1) levels.add(level)
    } else {
      levels.add(Number(trimmed))
    }
  }
  for (const level of levels) {
    if (!Number.isInteger(level) || level < 1) throw new Error(`Invalid level: ${level}`)
  }
  return levels
}

function renderMarkdown(rows: TranslationReviewRow[], exportArgs: ExportArgs): string {
  const title = `# ${exportArgs.lang} Static Translation Review Queue`
  const filters = [
    `language: ${exportArgs.lang}`,
    exportArgs.category ? `category: ${exportArgs.category}` : undefined,
    exportArgs.levels ? `levels: ${[...exportArgs.levels].sort((a, b) => a - b).join(', ')}` : undefined,
    exportArgs.needsReviewOnly ? 'needsReview only' : undefined,
  ].filter(Boolean)

  const body = rows.map((row) => [
    `## ${row.conceptId}`,
    '',
    `- category: ${row.categoryLabel} (${row.categoryId})`,
    `- level/order: ${row.level}/${row.order}`,
    `- part_of_speech: ${row.part_of_speech}`,
    `- sense: ${row.sense}`,
    `- English: ${row.englishTerm}`,
    `- ${row.language}: ${row.targetTerm}`,
    `- needsReview: ${row.needsReview ? 'true' : 'false'}`,
    row.reviewNote ? `- reviewNote: ${row.reviewNote}` : undefined,
    row.duplicateWarning ? `- duplicateWarning: ${row.duplicateWarning}` : undefined,
  ].filter(Boolean).join('\n')).join('\n\n')

  return `${title}\n\n${filters.join(' | ')}\n\nitems: ${rows.length}\n\n${body}\n`
}

function renderCsv(rows: TranslationReviewRow[]): string {
  const headers = [
    'conceptId',
    'categoryId',
    'categoryLabel',
    'level',
    'order',
    'part_of_speech',
    'sense',
    'englishTerm',
    'language',
    'targetTerm',
    'romanization',
    'needsReview',
    'reviewNote',
    'duplicateWarning',
  ]
  return [
    headers.join(','),
    ...rows.map((row) => [
      row.conceptId,
      row.categoryId,
      row.categoryLabel,
      row.level,
      row.order,
      row.part_of_speech,
      row.sense,
      row.englishTerm,
      row.language,
      row.targetTerm,
      '',
      String(row.needsReview),
      row.reviewNote,
      row.duplicateWarning,
    ].map(csvEscape).join(',')),
  ].join('\n')
}

function renderSummary(): string {
  const summary = getStaticTranslationQualitySummary()
  const lines = [
    '# Static Translation Quality Summary',
    '',
    `Concept items: ${summary.conceptCount}`,
    '',
    '| Language | Missing | Empty | Needs review |',
    '| --- | ---: | ---: | ---: |',
    ...summary.languages.map((language) => (
      `| ${language} | ${summary.missingByLanguage[language]} | ${summary.emptyByLanguage[language]} | ${summary.needsReviewByLanguage[language]} |`
    )),
    '',
    `Duplicate clusters: ${summary.duplicateClusters.length}`,
  ]
  return `${lines.join('\n')}\n`
}

function csvEscape(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
