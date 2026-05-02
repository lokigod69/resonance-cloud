# Phase 1D Next RPC Plan

Date: 2026-05-02

## Goal

Add narrow user/admin RPCs that replace remaining direct browser mutations before tightening RLS on pipeline-owned fields.

Do not lock broad `words`, `decks`, or `generation_jobs` fields until the browser has been moved to these RPCs and SQL/RLS tests pass.

## User RPCs

| RPC | Purpose | Caller | Inputs | Output | Transaction behavior | Authorization check | Audit | Tables touched | Replaces | Required before pipeline RLS lockdown |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `move_words_to_deck(p_word_ids uuid[], p_target_deck_id uuid)` | Move one or more words to another owned deck and recalculate deck counters/status. | DeckView, DeckViewPG, `useMoveWords` | word IDs, target deck ID | JSON success, source/target counts/status | Single transaction; lock words and both decks; reject cross-user/cross-language moves. | `auth.uid()` owns every word and target/source decks. | No, optional lightweight event | `words`, `decks` | `words.deck_id`, `decks.word_count`, `decks.status` direct updates | Yes |
| `update_deck_metadata(p_deck_id uuid, p_name text)` | Rename/update user-editable deck metadata. | DeckView, DeckViewPG | deck ID, name | updated deck summary | Single row update; trim/validate length. | `auth.uid()` owns deck. | No | `decks` | direct `decks.name` update | Yes, before locking deck updates |
| `archive_word(p_word_id uuid)` | User delete/archive word with consistent deck counters and storage cleanup handoff. | DeckView, DeckViewPG | word ID | JSON success, deck status/count | Single transaction for DB; optionally enqueue storage cleanup or call service cleanup path. | `auth.uid()` owns word and deck. | Optional | `words`, `decks`, storage cleanup queue/table if added | direct `words.delete`, `decks.word_count/status`, browser storage remove | Yes |
| `archive_deck(p_deck_id uuid)` | User delete/archive empty or owned deck safely. | DeckView, DeckViewPG | deck ID | JSON success | Lock deck; verify ownership; either require empty or archive/delete child rows consistently. | `auth.uid()` owns deck. | Optional | `decks`, `words`, `generation_jobs`, storage cleanup queue/table if added | direct `decks.delete`, storage cleanup assumptions | Yes |
| `rate_word(p_word_id uuid, p_rating int)` | Let user rate only owned words. | DeckView, DeckViewPG, VideoPlayer | word ID, rating | updated rating payload | Single row update. | `auth.uid()` owns word; rating within allowed range. | No | `words` | direct `words.rating`, `rated_at` update | Yes, unless column-specific RLS remains |
| `create_or_get_share_link(p_word_id uuid)` | Create/reuse share link for an owned word. | `shareWord.ts` | word ID | share ID/URL | Single transaction; reuse unique `user_id, word_id`; generate server-side ID. | `auth.uid()` owns word. | No | `shared_words`, `words` read | direct `shared_words.insert` with browser-generated ID | Before share RLS cleanup |
| `increment_shared_word_view(p_share_id text)` | Increment share view count without allowing arbitrary public updates. | `frontend/api/share.ts` and/or SharePage | share ID | new view count or success | Atomic `view_count = view_count + 1`; optional throttling/fingerprint. | Public callable but bounded to increment only. | No | `shared_words` | direct public `shared_words.view_count` update | Before share RLS cleanup |

## Admin RPCs

| RPC | Purpose | Caller | Inputs | Output | Transaction behavior | Authorization check | Audit | Tables touched | Replaces | Required before pipeline RLS lockdown |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `admin_set_user_role(p_user_id uuid, p_role text, p_reason text default null)` | Change admin membership and profile mirror consistently. | Admin Users | user ID, role, reason | updated user summary | Single transaction; update `admin_roles` source of truth and `profiles.role` mirror. | `public.is_admin()` and cannot remove last admin. | Yes | `admin_roles`, `profiles`, audit table | direct `profiles.role` update | Yes for profile/admin lockdown |
| `admin_adjust_user_credits(p_user_id uuid, p_delta int, p_reason text)` | Add/subtract credits atomically. | Admin Users, Queue reject refund | user ID, delta, reason | new credit balance | Single `credits = credits + delta` update with non-negative guard. | `public.is_admin()`. | Yes | `profiles`, audit table | direct `profiles.credits` update | Yes |
| `admin_set_user_credits(p_user_id uuid, p_credits int, p_reason text)` | Set exact credit balance when needed. | Admin Users | user ID, absolute credits, reason | new credit balance | Single row lock/update; reject negative values. | `public.is_admin()`. | Yes | `profiles`, audit table | direct `profiles.credits` set | Yes |
| `admin_create_invite_code(p_code text, p_credits int, p_max_uses int, p_reason text default null)` | Create invite code with validation/audit. | Admin Users | code, credits, max uses, reason | created invite code | Single insert; normalize code; reject invalid values. | `public.is_admin()`. | Yes | `invite_codes`, audit table | direct `invite_codes.insert` | No, but required before invite RLS cleanup |
| `admin_toggle_invite_code(p_code_id uuid, p_active boolean, p_reason text default null)` | Enable/disable invite code with audit. | Admin Users | code ID, active, reason | updated invite code | Single update. | `public.is_admin()`. | Yes | `invite_codes`, audit table | direct `invite_codes.is_active` update | No |
| `admin_approve_generation_job(p_job_id uuid, p_reason text default null)` | Approve queued job. | Admin Queue | job ID, reason | updated job | Lock job; allow only valid source statuses; set approved timestamp if added. | `public.is_admin()`. | Yes | `generation_jobs`, audit table | direct `generation_jobs.status = approved` | Yes |
| `admin_reject_generation_job(p_job_id uuid, p_refund boolean, p_reason text)` | Reject queued job with optional atomic refund. | Admin Queue | job ID, refund flag, reason | updated job and refund amount | Lock job and profile; reject only valid statuses; refund exactly once. | `public.is_admin()`. | Yes | `generation_jobs`, `profiles`, audit table | browser read-then-write credit refund and job status update | Yes |
| `admin_update_system_setting(p_key text, p_value jsonb, p_reason text default null)` | Toggle `auto_approve`, `queue_paused`, or future settings through one audited path. | Admin Queue | setting key, value, reason | updated settings snapshot | Single update; validate key/type. | `public.is_admin()`. | Yes | `system_settings`, audit table | direct `system_settings` update | Before system settings RLS cleanup |
| `admin_archive_content(p_kind text, p_id uuid, p_reason text)` | Archive/delete words/decks/content with storage cleanup. | Admin Content | kind, ID, reason | success summary | Transaction for DB rows; storage cleanup via service path or cleanup queue. | `public.is_admin()`. | Yes | `words`, `decks`, `generation_jobs`, storage cleanup queue/table | direct row deletes and storage removes in Content page | Yes |
| `admin_update_word_review(p_word_id uuid, p_needs_review boolean, p_reason text default null)` | Mark/unmark content review. | Admin Content | word ID, boolean, reason | updated word review state | Single row update. | `public.is_admin()`. | Yes | `words`, audit table | direct `words.needs_review` update | Before word RLS lockdown if review remains |
| `admin_update_language_profile(p_profile_id uuid, p_payload jsonb, p_reason text default null)` | Validate and audit language profile changes. | Admin Profiles | profile ID or create payload, reason | profile snapshot | For activation, deactivate same-language profiles and activate target in one transaction. | `public.is_admin()`. | Yes | `language_profiles`, audit table | direct language profile inserts/updates/deletes | No, but recommended |
| `admin_update_voice(p_voice_id uuid, p_payload jsonb, p_reason text default null)` | Validate and audit voice registry changes. | Admin Voices | voice ID or create payload, reason | voice snapshot | Single insert/update/delete variant or separate RPCs if simpler. | `public.is_admin()`. | Yes | `voices`, audit table | direct voice inserts/updates/deletes | No, but recommended |

## RLS Lockdown After RPC Migration

After callers move to RPCs, add a new migration that:

1. Keeps safe direct profile preference updates from Phase 1A.
2. Keeps direct `recall_attempts` inserts for own user.
3. Keeps direct speak history inserts/updates for own conversations unless a later audit need appears.
4. Removes or narrows owner broad updates on `words`.
5. Allows either direct `rating/rated_at` only or requires `rate_word`.
6. Blocks direct browser writes to all pipeline-owned `words` fields.
7. Removes or narrows owner broad updates on `decks`.
8. Blocks direct browser writes to `decks.word_count` and `decks.status`.
9. Removes owner broad updates on `generation_jobs`.
10. Blocks direct browser writes to all pipeline-owned job fields.
11. Removes public direct update on `shared_words.view_count`.
12. Ensures admin-only direct writes are replaced by admin RPCs where audit/transaction behavior matters.

## Minimal Audit Event Shape

If no existing audit table is reused, add a compact table:

```sql
create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid not null references public.profiles(id),
  action text not null,
  target_table text,
  target_id text,
  reason text,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb
);
```

Use it for role, credit, invite, queue, system setting, and content archive/delete commands. User lifecycle RPCs such as `move_words_to_deck` do not need admin audit, but should return enough metadata for UI refresh.

## Required Verification For The Next Phase

- SQL tests for every RPC authorization branch.
- SQL tests proving normal users cannot directly write pipeline fields after lockdown.
- Browser regression for deck rename, move, delete, rating, share, study, speak history, admin queue, admin users, and admin content.
- Live non-provider smoke with disposable rows after migration.
- No paid provider calls during tests.
