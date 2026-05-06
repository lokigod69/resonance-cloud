import fs from 'node:fs'
import path from 'node:path'

const sourcePath = path.resolve('src/hooks/useStudySession.ts')
const source = fs.readFileSync(sourcePath, 'utf8')

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const selectMatch = source.match(/\.from\('words'\)[\s\S]*?\.select\('([^']+)'\)/)
assert(selectMatch, 'useStudySession should contain a Supabase select clause')

const selectClause = selectMatch[1]

assert(!/\bipa\b/.test(selectClause), 'Canvas words select must not include missing words.ipa column')
assert(
  !/decks\([^)]*\bbase_language\b/.test(selectClause),
  'Canvas words select must not request missing decks.base_language column',
)
assert(
  /decks\([^)]*\btarget_language\b/.test(selectClause),
  'Canvas words select should still fetch decks.target_language',
)
assert(
  /profile\?\.base_language/.test(source),
  'Canvas base language should be sourced from authenticated profile.base_language',
)
