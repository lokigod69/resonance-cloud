# Phase 1D Browser Mutation Risk Report

Date: 2026-05-02

## Executive Summary

Phase 1A and Phase 1B successfully removed the most dangerous direct browser credit mutations from generation and retry. Phase 1C protected paid API endpoints. The remaining risk is concentrated in broad direct browser writes to owner `words`, `decks`, and `generation_jobs`, plus unaudited admin commands that directly mutate credits, roles, queue state, and content.

The key finding is that broad RLS tightening cannot be applied safely yet. Several real browser flows still depend on direct writes that would break immediately if owner updates on `words` and `decks` were replaced with pipeline-field locks without first adding narrow RPCs.

Live probes also confirmed that normal users can currently update pipeline-owned fields on their own `words` and `generation_jobs`. This should be fixed, but not by a broad lock-first migration.

## Highest-Risk Remaining Direct Mutations

1. Normal user can directly update pipeline-owned word fields.
   - Live probe allowed `words.status`, `words.current_stage`, and `words.video_url`.
   - Risk: a browser client can fake completion, change state-machine position, or attach arbitrary media URLs.

2. Normal user can directly update pipeline-owned generation job fields.
   - Live probe allowed `generation_jobs.status`, `generation_jobs.priority`, and `generation_jobs.words_completed`.
   - Risk: a browser client can approve, reprioritize, or fake job progress for owned jobs.

3. User move/delete flows mutate deck counters and status in the browser.
   - `useMoveWords.ts`, `DeckView.tsx`, and `DeckViewPG.tsx` directly update `decks.word_count` and `decks.status`.
   - Risk: counters drift, deck status is forged, and future RLS field locks would break these flows.

4. User word/deck deletion is browser-orchestrated.
   - `DeckView.tsx` and `DeckViewPG.tsx` delete words/decks directly.
   - Storage cleanup is best-effort and likely not permitted for normal users under current storage policies.
   - Risk: orphaned storage and partial deletion states.

5. Public share view count is directly writable.
   - `frontend/api/share.ts` updates `shared_words.view_count` using anon credentials.
   - Live probe allowed anonymous update to an arbitrary count.
   - Risk: public clients can inflate or reset counts.

6. Admin queue and user-management commands directly mutate privileged state.
   - Admin queue approve/reject updates `generation_jobs.status`.
   - Reject flow reads then writes `profiles.credits`.
   - Users page directly updates `profiles.credits` and `profiles.role`.
   - Risk: no audit trail, race-prone refunds/credit grants, and privilege changes through a mirror field.

7. Admin content deletion directly deletes rows and storage.
   - `Content.tsx` deletes words, generation jobs, decks, and storage objects in multiple browser calls.
   - Risk: partial delete, missing audit, and inconsistent cleanup.

## Flows That Would Break If RLS Were Tightened Today

If `words` owner updates were restricted immediately:

- Word move would break because `useMoveWords.ts` updates `words.deck_id`.
- Word rating would break unless `rating` and `rated_at` remain specifically allowed or are moved to `rate_word`.
- DeckView/DeckViewPG word deletion would break.
- Admin content moderation flagging would break unless replaced by admin RPC.
- Admin content word/deck delete would break.
- Any remaining browser direct retry mutations would be blocked, though current searched retry paths use `request_word_retry`.

If `decks` owner updates were restricted immediately:

- Deck rename would break.
- Move-word counter/status recalculation would break.
- Word delete counter/status recalculation would break.
- User deck delete would break.
- Create target deck while moving may continue if inserts stay allowed, but the full move flow would still break.

If `generation_jobs` owner updates were restricted immediately:

- Admin queue approve/reject would still need an admin RPC.
- Any accidental user-owned job progress mutation would be blocked, which is desired, but admin queue UI would need replacement first.

If storage delete were tightened or left unchanged without RPC cleanup:

- User word/deck deletion would not reliably remove video/thumb objects.
- Admin content deletion could still remove storage, but only as a sequence of browser calls without transaction/audit.

## Live Probe Findings

Blocked for a normal user:

- `profiles.role`
- `profiles.credits`
- `admin_roles` insert
- `set_api_quota_enforcement(false)`
- `refund_credit`

Allowed for a normal user:

- read own `decks`, `words`, `generation_jobs`
- update `words.rating`, `words.rated_at`
- update `words.deck_id`
- update `words.status`, `words.current_stage`, `words.video_url`
- update `decks.word_count`, `decks.status`
- update `generation_jobs.status`, `generation_jobs.priority`, `generation_jobs.words_completed`
- insert own `shared_words`
- delete own `words`
- delete own `decks`

Allowed anonymously:

- update `shared_words.view_count`

Admin route shell checks returned `200` for `/admin/quotas`, `/admin/queue`, `/admin/users`, and `/admin/content`.

## Recommended RPCs To Add Next

User RPCs:

- `move_words_to_deck`
- `update_deck_metadata`
- `archive_word`
- `archive_deck`
- `rate_word`
- `create_or_get_share_link`
- `increment_shared_word_view`

Admin RPCs:

- `admin_set_user_role`
- `admin_adjust_user_credits`
- `admin_create_invite_code`
- `admin_toggle_invite_code`
- `admin_approve_generation_job`
- `admin_reject_generation_job`
- `admin_update_system_setting`
- `admin_archive_content`
- `admin_update_language_profile`
- `admin_update_voice`

## Recommended Implementation Order

1. Add audit table for privileged/admin commands if one does not already cover these actions.
2. Add user RPCs for deck/word lifecycle:
   - `rate_word`
   - `update_deck_metadata`
   - `move_words_to_deck`
   - `archive_word`
   - `archive_deck`
3. Update browser deck/word flows to call those RPCs and remove direct writes to `words.deck_id`, `decks.word_count`, `decks.status`, and row deletes.
4. Add share RPCs:
   - `create_or_get_share_link`
   - `increment_shared_word_view`
5. Replace share-link creation and view-count update.
6. Add admin RPCs for queue approval/rejection and credit/role/invite commands.
7. Replace Admin Queue and Users direct privileged writes.
8. Add admin content archive/delete RPCs and replace Content page row/storage deletion.
9. Only then add RLS/trigger restrictions that block browser writes to pipeline-owned fields.
10. Run SQL/RLS tests and live smoke checks for real user flows.

## SQL/RLS Tests Needed Before Lockdown

User tests:

- normal user can update only safe profile fields
- normal user cannot update `profiles.role` or `profiles.credits`
- normal user cannot insert/update/delete `admin_roles`
- normal user can call `submit_generation`
- normal user can call `request_word_retry`
- normal user can call `rate_word`
- normal user can call `move_words_to_deck` only for own words and own target deck
- normal user cannot move another user's word
- normal user cannot move a word into another user's deck
- normal user can archive own word/deck through RPC
- normal user cannot directly update `words.status`, `words.current_stage`, media URLs, retry fields, stage counters, or pipeline metadata
- normal user cannot directly update `generation_jobs.status`, `priority`, progress, or timestamps
- normal user can still read own decks, words, jobs, recall attempts, and speak history

Admin tests:

- non-admin cannot call admin RPCs
- admin can call admin RPCs
- admin role changes update `admin_roles` and the profile mirror consistently
- admin credit adjustments are atomic and audited
- admin reject with refund is atomic and audited
- admin queue setting changes are audited
- admin content archive/delete cleans storage and rows consistently
- admin quota RPCs still work and quota enforcement remains off unless explicitly enabled

Public/share tests:

- public can read valid share data through `get_shared_word`
- public cannot update arbitrary `shared_words.view_count`
- public can call only an increment RPC with bounded behavior
- invalid share IDs do not expose private word/deck rows

Storage tests:

- normal user cannot delete arbitrary storage objects
- `archive_word` and `archive_deck` remove only storage paths for owned content
- admin archive/delete removes expected storage paths
- storage cleanup failure does not leave database rows in a contradictory state

## Storage Policy Risks

The current bucket policy allows public reads and authenticated uploads, with admin delete. User deletion in `DeckView.tsx` and `DeckViewPG.tsx` attempts to remove video/thumb objects and ignores failures. This likely leaves orphaned objects for normal user deletes.

Do not solve this with broad browser storage delete rights. Storage cleanup should happen in service-role RPC/server paths that derive allowed paths from database ownership, not from browser-supplied paths.

## Admin Command Risks

Admin pages currently rely heavily on direct browser writes. Even though admin-only RLS limits who can perform them, direct writes lack:

- audit records
- reason fields
- transaction boundaries
- race protection for credits/refunds
- validation around hard limits and status transitions
- consistent cleanup for row plus storage operations

Queue reject with refund is the most urgent admin command to replace because it reads credits in the browser and writes back a computed value.

## Surprises

- Live probe showed normal users can directly update `generation_jobs` status/progress fields on owned jobs.
- Live probe showed normal users can delete own `words` and `decks`, despite the static migration history showing admin-named delete policies. Treat the live behavior as authoritative for rollout risk.
- `frontend/src/components/speak/SpeakHistoryPanel.tsx` calls `/api/voice-chat` for corrections without an Authorization header. Phase 1C endpoint protection means this corrections action should now return `401` before provider calls. This is not a direct Supabase mutation, but it should be fixed in a narrow follow-up.

## Rollout Risk

Phase 1D should stay docs-only. The next implementation phase should replace direct browser writes with RPCs before adding field-level RLS/trigger restrictions. Locking pipeline fields first would create user-visible breakage in deck rename, move, delete, rating, share, and admin queue/content workflows.
