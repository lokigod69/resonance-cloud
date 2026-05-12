import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(haystack.includes(needle), `${label}: expected to find ${needle}`)
}

await (async function batchArchiveRpcContract() {
  const migrationsDir = join(root, 'supabase', 'migrations')
  const migrationName = readdirSync(migrationsDir).find((name) => name.endsWith('_archive_words_batch.sql'))

  assert.ok(migrationName, 'archive_words batch migration should exist')

  const sql = read(join('supabase', 'migrations', migrationName))
  assertIncludes(sql, 'create or replace function public.archive_words(', 'migration')
  assertIncludes(sql, 'p_word_ids uuid[]', 'migration')
  assertIncludes(sql, 'returns jsonb', 'migration')
  assertIncludes(sql, 'security definer', 'migration')
  assertIncludes(sql, "raise exception 'At most 50 words can be archived at once'", 'migration')
  assertIncludes(sql, "set_config('app.allow_phase1e_pipeline_update', 'on', true)", 'migration')
  assertIncludes(sql, 'phase1e_queue_word_storage_cleanup', 'migration')
  assertIncludes(sql, 'delete from public.words', 'migration')
  assertIncludes(sql, 'phase1e_recalculate_deck', 'migration')
  assertIncludes(sql, "jsonb_build_object('success', true", 'migration')
  assertIncludes(sql, 'revoke all on function public.archive_words(uuid[]) from public, anon', 'migration grants')
  assertIncludes(sql, 'grant execute on function public.archive_words(uuid[]) to authenticated', 'migration grants')
})()

await (async function deleteHookContract() {
  const hookPath = join(root, 'src', 'hooks', 'useDeleteWords.ts')
  assert.ok(existsSync(hookPath), 'useDeleteWords hook should exist')

  const hook = read('src/hooks/useDeleteWords.ts')
  assertIncludes(hook, 'export function useDeleteWords(deckId: string)', 'hook')
  assertIncludes(hook, 'deleteWords: (wordIds: string[]) => Promise', 'hook return type')
  assertIncludes(hook, "supabase.rpc('archive_words'", 'hook RPC')
  assertIncludes(hook, 'deleting', 'hook deleting state')
})()

for (const page of ['DeckView.tsx', 'DeckViewPG.tsx']) {
  await (async function deckViewDeleteUiContract() {
    const source = read(join('src', 'pages', page))
    assertIncludes(source, "import { useDeleteWords } from '@/hooks/useDeleteWords'", page)
    assertIncludes(source, 'const { deleteWords, deleting } = useDeleteWords(id!)', page)
    assertIncludes(source, 'deleteWords([word.id])', page)
    assertIncludes(source, 'deckview.deleteSelected', page)
    assertIncludes(source, 'deckview.confirmDeleteSelected', page)
    assertIncludes(source, 'deckview.wordsDeleted', page)
    assertIncludes(source, 'deckview.deleteSelectedFailed', page)
  })()
}

await (async function deckViewTranslationsExistForSupportedLocales() {
  const translations = read('src/lib/translations.ts')
  for (const key of [
    'deckview.deleteSelected',
    'deckview.confirmDeleteSelected',
    'deckview.wordsDeleted',
    'deckview.deleteSelectedFailed',
  ]) {
    const count = [...translations.matchAll(new RegExp(`'${key}'`, 'g'))].length
    assert.equal(count, 3, `${key} should be present in en, de, and fr`)
  }
})()

console.log('Deck delete UI contract tests passed')
