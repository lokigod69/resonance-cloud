/**
 * Static migration/client contract for stable Lens deck identity and exact
 * save receipts. Database behavior is additionally verified by the migration
 * review/apply checklist against linked Supabase; this test never connects.
 *
 * Run: tsx scripts/test-lens-save-contract.ts
 */

import { readFileSync } from 'node:fs'
import { withClientDeadline } from '../src/lib/clientDeadline'

const migration = readFileSync(
  new URL('../supabase/migrations/20260907100000_lens_deck_identity_and_save_outcomes.sql', import.meta.url),
  'utf8',
)
const hook = readFileSync(new URL('../src/hooks/useLensSave.ts', import.meta.url), 'utf8')
const page = readFileSync(new URL('../src/pages/Lens.tsx', import.meta.url), 'utf8')

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('\n[stable deck identity]')
assert('widens source_kind to Lens', /check \(source_kind in \('user', 'curriculum', 'stream', 'lens'\)\)/i.test(migration))
assert('enforces one canonical Lens deck per user/language', /create unique index if not exists idx_decks_lens_identity[\s\S]*on public\.decks \(user_id, target_language\)[\s\S]*where source_kind = 'lens'/i.test(migration))
assert('RPC uses the stable source identity', /where user_id = v_user_id[\s\S]*target_language = v_target_language[\s\S]*source_kind = 'lens'[\s\S]*for update/i.test(migration))
assert('RPC retains the existing signature', /function public\.submit_lens_save\(\s*p_target_language text,\s*p_base_language text,\s*p_items jsonb\s*\)/i.test(migration))
assert('same-language saves retain the advisory transaction lock', /pg_advisory_xact_lock\([\s\S]*':lens:'/i.test(migration))

console.log('\n[conservative legacy adoption]')
const adoption = migration.slice(migration.indexOf('with eligible as ('), migration.indexOf('create unique index'))
assert('candidate requires an existing Lens-origin word', /exists[\s\S]*metadata->>'origin' = 'lens'/i.test(adoption))
assert('candidate rejects every non-Lens word', /not exists[\s\S]*metadata->>'origin' is distinct from 'lens'/i.test(adoption))
assert('candidate requires user card_text provenance', /source_kind = 'user'[\s\S]*deck_type = 'card_text'/i.test(adoption))
assert('backfill enables the trusted mutation flag required by deck guards', /select set_config\('app\.allow_phase1e_pipeline_update', 'on', true\);/i.test(migration))
assert('adoption chooses one ranked deck without renaming or moving cards', /row_number\(\)[\s\S]*identity_rank = 1/i.test(adoption) && !/set\s+name\s*=|update public\.words/i.test(adoption))

console.log('\n[exact item outcomes]')
assert('old clients can omit client_id', /'legacy-' \|\| v_row\.ord::text/i.test(migration))
assert('duplicate client ids are rejected', /duplicate client_id/i.test(migration))
assert('existing rows return skipped with their word id', /'word_id', v_word_id,[\s\S]*'status', 'skipped'/i.test(migration))
assert('new rows return inserted with their word id', /returning id into v_word_id[\s\S]*'status', 'inserted'/i.test(migration))
assert('legacy counts remain beside ordered outcomes', /'inserted', v_inserted,[\s\S]*'skipped', v_skipped,[\s\S]*'outcomes', v_outcomes/i.test(migration))
assert('RPC execution stays authenticated-only', /revoke all on function public\.submit_lens_save\(text, text, jsonb\) from public, anon;[\s\S]*grant execute on function public\.submit_lens_save\(text, text, jsonb\) to authenticated;/i.test(migration))

console.log('\n[client reconciliation]')
assert('client sends recap ids and validates the response', /clientId: item\.id, item/.test(page) && /parseLensSaveResult/.test(hook))
assert('mixed count-only responses do not mark guessed rows', /never infers row identities from mixed counts/i.test(page))
assert('recap groups preserve target and base language metadata', /item\.language.*item\.baseLanguage/.test(page))
assert('successful language groups combine into one receipt', /combineLensSaveReceipts\(receipts\)/.test(page))
assert('group processing stops at the first failure for truthful retry', /if \(!result\) break/.test(page))
assert('save RPC has a whole-operation deadline', /withClientDeadline\([\s\S]*submit_lens_save[\s\S]*\.abortSignal\(signal\)[\s\S]*LENS_SAVE_DEADLINE_MS/.test(hook))
assert('timed-out writes are never automatically retried', /Do not automatically retry a timed-out write/.test(hook))
assert('existing-word hints are scoped by user and language', /type ExistingWordHints[\s\S]*userId: string[\s\S]*language: string[\s\S]*words: Set<string>/.test(page))
assert('hint lookups consult the current scoped ref', /hints\.userId === userIdRef\.current[\s\S]*hints\.language === language/.test(page))
assert('hint requests are generation guarded', /requestId !== wordHintsRequestRef\.current[\s\S]*requestLanguage !== targetLanguageRef\.current/.test(page))

console.log('\n[save deadline behavior]')
{
  const startedAt = Date.now()
  let timeoutName = ''
  try {
    await withClientDeadline(() => new Promise<never>(() => undefined), 15)
  } catch (error) {
    timeoutName = error instanceof DOMException ? error.name : ''
  }
  assert('deadline settles even when the underlying operation never responds', timeoutName === 'TimeoutError' && Date.now() - startedAt < 500)
}

if (failures > 0) {
  console.error(`\nLens save contract: ${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\nLens save contract: ${passes} passed`)
