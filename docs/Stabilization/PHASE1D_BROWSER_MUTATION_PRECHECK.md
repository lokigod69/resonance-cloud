# Phase 1D Browser Mutation Precheck

Date: 2026-05-02

## Scope

This precheck maps direct browser Supabase writes and browser/serverless RPC calls before any broad RLS tightening on `decks`, `words`, or `generation_jobs`.

No Phase 1A/1B/1C SQL was rerun. Quota enforcement was not enabled. No paid providers were called.

## Current RLS Baseline

- `profiles`: ordinary users can update safe preference fields only; `role` and `credits` are blocked by trigger.
- `admin_roles`: normal users cannot write; admin authority is checked through `public.is_admin()`.
- `decks`: current policy allows owner inserts and broad owner updates. Live probe also showed owner deletes currently succeed.
- `words`: current policy allows owner inserts and broad owner updates. Live probe also showed owner deletes currently succeed.
- `generation_jobs`: current policy allows owner inserts and broad owner updates; admin deletes are present.
- `shared_words`: authenticated users can insert own share links; public update is allowed for `view_count`.
- `recall_attempts`: users can insert/read own attempts.
- `speak_conversations` and `speak_messages`: users can insert/update/read own conversation data; messages insert through conversation ownership.
- `language_profiles`, `voices`, `system_settings`, invite-code admin actions: admin-only policies or RPCs.
- `storage.objects` in bucket `videos`: public read, authenticated upload, admin delete. User word deletion currently attempts storage cleanup but normal users are not explicitly allowed to delete storage objects.

## Live Probe Summary

Disposable user and rows were created and cleaned up with service-role credentials.

Blocked for normal user:

- `profiles.role`: `403`
- `profiles.credits`: `403`
- `admin_roles` insert: `403`
- `set_api_quota_enforcement(false)`: `403`
- `refund_credit`: `403`

Allowed for normal user:

- Read own `decks`, `words`, `generation_jobs`: `200`
- Update `words.status`, `words.current_stage`, `words.video_url`: `200`
- Update `generation_jobs.status`, `generation_jobs.priority`, `generation_jobs.words_completed`: `200`
- Update `words.rating`, `words.rated_at`: `200`
- Update `words.deck_id`: `200`
- Update `decks.word_count`, `decks.status`: `200`
- Insert own `shared_words`: `201`
- Delete own `words`: `200`
- Delete own `decks`: `200`

Allowed for anonymous/public:

- Update `shared_words.view_count`: `200`

Admin pages checked as app routes:

- `/admin/quotas`: `200`
- `/admin/queue`: `200`
- `/admin/users`: `200`
- `/admin/content`: `200`

## Mutation Map

Bucket legend:

- A: Safe direct browser write may remain
- B: Needs narrow user RPC before RLS lock
- C: Needs audited admin RPC
- D: Must be blocked from browser

| File | User/admin flow | Table or RPC | Operation | Columns touched if update | Auth role expected | Current RLS allows it | Safe to remain direct | Must become RPC/API | Risk | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frontend/src/components/ProfileModal.tsx` | User profile modal | `profiles` | update | `display_name` | user | Yes, Phase 1A safe field | Yes, A | No | Low | Preference write. |
| `frontend/src/components/ProfileModal.tsx` | User profile modal | `profiles` | update | `base_language` | user | Yes, Phase 1A safe field | Yes, A | No | Low | Preference write. |
| `frontend/src/components/ProfileModal.tsx` | User profile modal | `profiles` | update | `skin` | user | Yes, Phase 1A safe field | Yes, A | No | Low | UI preference. |
| `frontend/src/pages/Settings.tsx` | Settings page | `profiles` | update | `display_name`, `base_language`, `skin` | user | Yes, Phase 1A safe fields | Yes, A | No | Low | Duplicates profile-modal preference writes. |
| `frontend/src/contexts/ThemeContext.tsx` | Theme selector | `profiles` | update | `theme` | user | Yes, Phase 1A safe field | Yes, A | No | Low | Local storage is primary fallback. |
| `frontend/src/pages/Onboarding.tsx` | Onboarding base language | `profiles` | update | `base_language` | user | Yes, Phase 1A safe field | Yes, A | No | Low | Preference write. |
| `frontend/src/pages/Onboarding.tsx` | Onboarding invite redemption | `redeem_invite_code` | rpc | n/a | user | Yes, RPC handles auth and credit grant | Yes, A | Already RPC | Low | Existing hardened RPC. |
| `frontend/src/components/RedeemCodeDialog.tsx` | Credit redemption dialog | `redeem_invite_code` | rpc | n/a | user | Yes, RPC handles auth and credit grant | Yes, A | Already RPC | Low | Existing hardened RPC. |
| `frontend/src/components/deck/DeckPickerSheet.tsx` | Create target deck while moving words | `decks` | insert | n/a | user | Yes, owner insert | Maybe | Maybe, B | Medium | Direct draft deck creation may remain only if future insert policy is narrow enough; move flow should ideally create target deck inside `move_words_to_deck` or a deck RPC. |
| `frontend/src/hooks/useMoveWords.ts` | Move words between decks | `words` | update | `deck_id` | user | Yes, live probe allowed | No | Yes, B | High | Multi-row ownership and same-language/target-deck checks need a transaction. |
| `frontend/src/hooks/useMoveWords.ts` | Move words between decks | `decks` | update | `word_count`, `status` | user | Yes, live probe allowed | No | Yes, B/D | Critical | Browser can change deck counters/status arbitrarily today. |
| `frontend/src/pages/DeckView.tsx` | Retry failed word | `request_word_retry` | rpc | n/a | user | Yes, RPC handles debit/retry flag | Yes | Already RPC | Low | Do not change unless bug found. |
| `frontend/src/pages/DeckViewPG.tsx` | Retry failed word | `request_word_retry` | rpc | n/a | user | Yes, RPC handles debit/retry flag | Yes | Already RPC | Low | Same as DeckView. |
| `frontend/src/pages/Music.tsx` | Retry music path | `request_word_retry` | rpc | n/a | user | Yes, RPC handles debit/retry flag | Yes | Already RPC | Low | Source 2 retry path is already RPC-backed. |
| `frontend/src/pages/DeckView.tsx` | Delete word | `storage.objects` | storage remove | n/a | user | Static policy appears admin-only; app ignores storage errors | No | Yes, B | Medium | Likely leaves orphan video/thumb files for user deletion. |
| `frontend/src/pages/DeckViewPG.tsx` | Delete word | `storage.objects` | storage remove | n/a | user | Static policy appears admin-only; app ignores storage errors | No | Yes, B | Medium | Same as DeckView. |
| `frontend/src/pages/DeckView.tsx` | Delete word | `words` | delete | n/a | user | Yes, live probe allowed | No | Yes, B | High | Should archive/delete through ownership-checked RPC with storage cleanup. |
| `frontend/src/pages/DeckViewPG.tsx` | Delete word | `words` | delete | n/a | user | Yes, live probe allowed | No | Yes, B | High | Same as DeckView. |
| `frontend/src/pages/DeckView.tsx` | Delete word | `decks` | update | `word_count`, `status` | user | Yes, live probe allowed | No | Yes, B/D | Critical | Browser recalculates pipeline-visible deck state. |
| `frontend/src/pages/DeckViewPG.tsx` | Delete word | `decks` | update | `word_count`, `status` | user | Yes, live probe allowed | No | Yes, B/D | Critical | Same as DeckView. |
| `frontend/src/pages/DeckView.tsx` | Delete empty deck | `decks` | delete | n/a | user | Yes, live probe allowed | No | Yes, B | High | Needs archive/delete RPC with server-side empty check and storage cleanup. |
| `frontend/src/pages/DeckViewPG.tsx` | Delete empty deck | `decks` | delete | n/a | user | Yes, live probe allowed | No | Yes, B | High | Same as DeckView. |
| `frontend/src/pages/DeckView.tsx` | Rate word | `words` | update | `rating`, `rated_at` | user | Yes, live probe allowed | Yes, A | Optional RPC | Low | Safe only if future RLS allows rating fields and blocks pipeline fields. |
| `frontend/src/pages/DeckViewPG.tsx` | Rate word | `words` | update | `rating`, `rated_at` | user | Yes, live probe allowed | Yes, A | Optional RPC | Low | Same as DeckView. |
| `frontend/src/pages/VideoPlayer.tsx` | Rate word from player | `words` | update | `rating`, `rated_at` | user | Yes, live probe allowed | Yes, A | Optional RPC | Low | Same rating surface. |
| `frontend/src/pages/DeckView.tsx` | Rename deck | `decks` | update | `name` | user | Yes, broad owner update | Maybe | Yes before deck RLS lock, B | Medium | Can remain direct only with column-specific policy; RPC is safer. |
| `frontend/src/pages/DeckViewPG.tsx` | Rename deck | `decks` | update | `name` | user | Yes, broad owner update | Maybe | Yes before deck RLS lock, B | Medium | Same as DeckView. |
| `frontend/src/lib/shareWord.ts` | Create/reuse share link | `shared_words` | insert | n/a | user | Yes, live probe allowed | Maybe | Yes, B | Medium | Should validate word ownership inside RPC and avoid user-supplied share IDs. |
| `frontend/api/share.ts` | Link preview route | `get_shared_word` | rpc | n/a | public/serverless | Yes, public RPC | Yes | Already RPC | Low | Read-only share lookup. |
| `frontend/api/share.ts` | Link preview view count | `shared_words` | update | `view_count` | public/serverless with anon key | Yes, live probe allowed anonymously | No | Yes, B | High | Public can set arbitrary counts; use increment RPC. |
| `frontend/src/pages/SharePage.tsx` | Public share page | `get_shared_word` | rpc | n/a | public | Yes | Yes | Already RPC | Low | Read-only public flow. |
| `frontend/src/hooks/useStudySession.ts` | Study answer | `recall_attempts` | insert | n/a | user | Yes, owner insert | Yes, A | No | Low | Ownership is clean through `user_id`. |
| `frontend/src/hooks/useVoiceTutor.ts` | Speak history start | `speak_conversations` | insert | n/a | user | Yes, owner insert | Yes, A | No | Low | Safe if ownership remains enforced. |
| `frontend/src/hooks/useVoiceTutor.ts` | Speak messages | `speak_messages` | insert | n/a | user | Yes via conversation ownership | Yes, A | No | Low | Safe if conversation ownership remains enforced. |
| `frontend/src/hooks/useVoiceTutor.ts` | Speak message count | `increment_speak_message_count` | rpc | n/a | user | Yes | Yes | Already RPC | Low | Atomic counter RPC. |
| `frontend/src/hooks/useVoiceTutor.ts` | End/save conversation | `speak_conversations` | update | `ended_at`, `corrections`, provider/voice fields | user | Yes, owner update | Mostly A | Maybe for provider fields | Medium | Corrections/end are safe; provider/voice swaps should stay user-owned only. |
| `frontend/src/hooks/useGrokRealtime.ts` | Grok speak history start | `speak_conversations` | insert | n/a | user | Yes, owner insert | Yes, A | No | Low | Safe if ownership remains enforced. |
| `frontend/src/hooks/useGrokRealtime.ts` | Grok speak messages | `speak_messages` | insert | n/a | user | Yes via conversation ownership | Yes, A | No | Low | Safe if conversation ownership remains enforced. |
| `frontend/src/hooks/useGrokRealtime.ts` | Grok message count | `increment_speak_message_count` | rpc | n/a | user | Yes | Yes | Already RPC | Low | Atomic counter RPC. |
| `frontend/src/hooks/useGrokRealtime.ts` | End conversation | `speak_conversations` | update | `ended_at` | user | Yes, owner update | Yes, A | No | Low | Safe user-owned write. |
| `frontend/src/components/speak/SpeakHistoryPanel.tsx` | Fetch corrections and save history | `speak_conversations` | update | `corrections` | user | Yes, owner update | Yes, A | No | Low | Note: corrections fetch currently calls `/api/voice-chat` without Authorization and will now 401. |
| `frontend/src/components/speak/SpeakHistoryPanel.tsx` | Delete speak conversation | `speak_conversations` | delete | n/a | user | Static policy only admin delete | No | Maybe user RPC, B | Medium | UI expects user delete; current policy likely blocks or is inconsistent with intent. |
| `frontend/src/components/generate/submitGeneration.ts` | Generate deck/words/job | `submit_generation` | rpc | n/a | user | Yes, RPC handles debit and inserts | Yes | Already RPC | Low | Phase 1B-protected path. |
| `frontend/src/hooks/useQueuePosition.ts` | Queue position display | `get_my_queue_position` | rpc | n/a | user | Yes | Yes | Already RPC | Low | Read-only helper. |
| `frontend/src/components/AdminRoute.tsx` | Admin guard | `is_admin` | rpc | n/a | user/admin | Yes for authenticated | Yes | Already RPC | Low | Auth check only. |
| `frontend/src/pages/admin/Queue.tsx` | Admin queue settings | `system_settings` | update | `auto_approve`, `queue_paused` | admin | Yes, admin policy | No | Yes, C | High | Needs audited admin RPC. |
| `frontend/src/pages/admin/Queue.tsx` | Admin approve job | `generation_jobs` | update | `status` | admin | Yes, admin via broad update | No | Yes, C/D | Critical | Direct pipeline status mutation with no audit/transaction. |
| `frontend/src/pages/admin/Queue.tsx` | Admin reject/refund job | `profiles` | update | `credits` | admin | Yes, admin trusted | No | Yes, C/D | Critical | Read-then-write refund race and no audit. |
| `frontend/src/pages/admin/Queue.tsx` | Admin reject job | `generation_jobs` | update | `status` | admin | Yes, admin via broad update | No | Yes, C/D | Critical | Must be transactional with optional refund. |
| `frontend/src/pages/admin/Users.tsx` | Admin grant/set credits | `profiles` | update | `credits` | admin | Yes, admin trusted | No | Yes, C/D | Critical | Direct credit mutation needs reason/audit. |
| `frontend/src/pages/admin/Users.tsx` | Admin role change | `profiles` | update | `role` | admin | Yes, admin trusted | No | Yes, C/D | Critical | `profiles.role` mirrors admin authority; use audited RPC against `admin_roles`. |
| `frontend/src/pages/admin/Users.tsx` | Admin invite creation | `invite_codes` | insert | n/a | admin | Yes, admin policy | No | Yes, C | High | Needs audit and validation. |
| `frontend/src/pages/admin/Users.tsx` | Admin invite toggle | `invite_codes` | update | `is_active` | admin | Yes, admin policy | No | Yes, C | High | Needs audit. |
| `frontend/src/pages/admin/Content.tsx` | Content moderation flag | `words` | update | `needs_review` | admin | Yes, admin via broad update | No | Yes, C | Medium | Audited admin moderation RPC preferred. |
| `frontend/src/pages/admin/Content.tsx` | Admin delete word media | `storage.objects` | storage remove | n/a | admin | Yes, admin delete policy | No | Yes, C | Medium | Should be tied to archive/delete RPC. |
| `frontend/src/pages/admin/Content.tsx` | Admin delete word | `words` | delete | n/a | admin | Yes | No | Yes, C | High | Needs audit and storage cleanup transaction. |
| `frontend/src/pages/admin/Content.tsx` | Admin delete word | `decks` | update | `word_count`, `status` | admin | Yes | No | Yes, C/D | Critical | Direct pipeline-visible deck state mutation. |
| `frontend/src/pages/admin/Content.tsx` | Admin delete deck | `words` | delete | n/a | admin | Yes | No | Yes, C | High | Should be archive/delete RPC. |
| `frontend/src/pages/admin/Content.tsx` | Admin delete deck | `generation_jobs` | delete | n/a | admin | Yes | No | Yes, C/D | Critical | Direct job deletion loses audit/history. |
| `frontend/src/pages/admin/Content.tsx` | Admin delete deck | `decks` | delete | n/a | admin | Yes | No | Yes, C | High | Needs audit and storage cleanup. |
| `frontend/src/pages/admin/Profiles.tsx` | Admin language profile edits | `language_profiles` | insert/update/delete | `name`, `notes`, `settings`, `is_active` | admin | Yes, admin policy | Maybe | Prefer C | Medium | Admin config surface; RPC should validate one active profile per language. |
| `frontend/src/pages/admin/Voices.tsx` | Admin voice registry | `voices` | insert/update/delete | `name`, `voice_id`, `language`, `language_code`, `notes` | admin | Yes, admin policy | Maybe | Prefer C | Medium | Admin config writes; audit useful but not pipeline-critical. |
| `frontend/src/pages/admin/Quotas.tsx` | Admin quota dashboard | quota RPCs | rpc | n/a | admin | Yes, admin-only RPCs | Yes | Already RPC | Low | Correct pattern: browser does not write quota tables directly. |
| `frontend/src/pages/admin/Metrics.tsx` | Admin metrics | reads only | select | n/a | admin | Admin reads via policies | Yes | No | Low | No mutation found. |

## Direct Browser Writes That Touch Pipeline-Owned Fields

These are the fields that should not remain browser-writable after the next implementation phases:

- `words.status`
- `words.current_stage`
- `words.video_url`
- `words.thumbnail_url`
- `words.video_url_b`
- `words.thumbnail_url_b`
- `words.music_state`
- `words.retry_requested`
- `words.failed_stage`
- `words.stage_attempts`
- `words.total_stage_attempts`
- `words.stage_started_at`
- `generation_jobs.status`
- `generation_jobs.priority`
- `generation_jobs.words_completed`
- `generation_jobs.started_at`
- `generation_jobs.completed_at`
- `profiles.role`
- `profiles.credits`
- `admin_roles`
- provider/pipeline-owned metadata fields

Live probes confirmed that `words.status`, `words.current_stage`, `words.video_url`, `generation_jobs.status`, `generation_jobs.priority`, and `generation_jobs.words_completed` are still directly writable by an owning normal user today.
