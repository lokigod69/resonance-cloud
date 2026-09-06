import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GUIDED_LESSONS,
  getGuidedTodayPathOptions,
  type GuidedTargetLanguage,
} from '../src/data/guidedLessonsAuthoring'

const here = dirname(fileURLToPath(import.meta.url))
const outputDir = resolve(here, '../src/data/guided-runtime')

const fileNames: Record<GuidedTargetLanguage, string> = {
  English: 'english',
  Spanish: 'spanish',
  Italian: 'italian',
  French: 'french',
  Portuguese: 'portuguese',
  German: 'german',
  Cebuano: 'cebuano',
  Indonesian: 'indonesian',
  Polish: 'polish',
  Korean: 'korean',
  Russian: 'russian',
  Japanese: 'japanese',
}

function moduleSource(value: unknown, typeName: string, exportName: string, satisfiesType = typeName) {
  return [
    '// Generated from the authored guided corpus. Do not edit by hand.',
    `import type { ${typeName} } from '../guidedLessons'`,
    '',
    `export const ${exportName} = ${JSON.stringify(value)} satisfies ${satisfiesType}`,
    '',
  ].join('\n')
}

await mkdir(outputDir, { recursive: true })

const paths = getGuidedTodayPathOptions()
const lessonIdsByPath = Object.fromEntries(paths.map((path) => [
  path.id,
  GUIDED_LESSONS
    .filter((lesson) => lesson.pathId === path.id)
    .sort((left, right) => left.lessonNumber - right.lessonNumber)
    .map((lesson) => lesson.id),
]))
await writeFile(
  resolve(outputDir, 'pathIndex.ts'),
  [
    moduleSource(paths, 'GuidedPathMetadata', 'GUIDED_PATH_OPTIONS', 'GuidedPathMetadata[]').trimEnd(),
    '',
    `export const GUIDED_PATH_LESSON_IDS: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(lessonIdsByPath)}`,
    '',
  ].join('\n'),
  'utf8',
)

for (const [language, fileName] of Object.entries(fileNames) as Array<[GuidedTargetLanguage, string]>) {
  const lessons = GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === language)
  await writeFile(
    resolve(outputDir, `${fileName}.ts`),
    moduleSource(lessons, 'GuidedLessonDefinition', 'GUIDED_LANGUAGE_LESSONS', 'GuidedLessonDefinition[]'),
    'utf8',
  )
  console.log(`${language}: ${lessons.length} lessons`)
}
