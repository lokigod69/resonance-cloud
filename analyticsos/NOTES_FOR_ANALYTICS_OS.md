# Notes back to Analytics OS — LingWave instrumentation (rev 1 handoff)

Implemented 2026-08-02 by the LingWave dev agent. All 8 events + manifest + opt-out are
in the tree, verified (typecheck, api tsc, eslint on changed files, i18n 1640/1640 ×2,
stripe-shell, visual-scan 24/24, oauth-onboarding 29/29, first-light 27/27, prod build),
and DARK: `VITE_AOS_ANALYTICS_ENABLED` / `AOS_ANALYTICS_ENABLED` are unset everywhere.
Not yet committed (this repo commits on owner call).

## One snapshot defect (your defect per the handoff's own rule)

`src/vendor/analyticsos/posthog-sink.ts:22` uses a **constructor parameter property**
(`constructor(private readonly cfg: …)`). This repo compiles with TypeScript's
`erasableSyntaxOnly`, which rejects that syntax. Since the snapshot must not be
hand-edited, we disabled `erasableSyntaxOnly` in `tsconfig.app.json` and
`tsconfig.api.json` (no runtime impact — Vite/esbuild transpile it) with comments
pointing here. **Please regenerate the snapshot without parameter properties** (plain
field + constructor assignment) so the flag can be restored.

## Deviations / interpretations you should know

1. **zod** was not in the tree — added `zod@^3.25.76` as a direct dependency.
2. **guided_step seam**: your named seam (`guidedCheckpoint.ts` write path) is the
   *checkpoint review* completion (localStorage), not per-step lesson progress. We
   instrumented the real atomic units instead: each step advance in
   `TodaySession.handleNext` (`step_type`: scene/matchPairs/pattern/build/type/
   complication/speak/rolePlay), a `lesson_complete` marker at the lesson-completion
   write, and checkpoint flows as `step_type: checkpoint | segment_review | path_check`.
3. **study_rep** covers both the study-session seam (`useStudySession.recordAttempt`)
   and the games' per-attempt recall records (`study_mode: slicer | surf` — your
   study_mode enum listed surf, so game attempts count as reps; `game_round`
   additionally fires at round end with score).
4. **signup**: password signups emit at the `signUp()` success seam under the new
   user id (email confirmation can delay the first session by days, and the no-device-
   storage rule forbids a durable marker — a session-window check would miss those).
   OAuth signups emit on the first session, detected by `last_sign_in_at` within 5
   minutes of `created_at`. Both idempotent via `deterministicUuid("signup:"+user.id)`.
5. **song_generated**: the client only observes "job left the active poll set", which
   is completion OR failure; we confirm the latest job status is `complete` with one
   extra query before emitting. Instrumented in the glassy Music page only (the
   classic skin is retired and unreachable).
6. **Server platform**: derived from the request origin — `capacitor://…` → `ios`,
   else `web`.
7. **Opt-out is fail-closed on the server**: a failed `profiles.analytics_opt_out`
   lookup suppresses the emit. Consequence: **server events all drop until migration
   `20260802090000_analytics_opt_out_and_activation.sql` is applied** — it must be
   applied before the flags flip (it also carries `activated_at` + the activation RPC
   `record_learning_action_activation`, and the profiles allowlist-trigger update that
   makes the toggle writable).
8. **conversion** gate: prior paid periods are detected via `credit_ledger` grant rows
   (`subscription_grant` tier flow / `stripe_subscription` legacy flow) carrying a
   different `stripe_invoice_id`; the emit runs only when the grant RPC reported
   `inserted` (webhook replays and stale-period invoices skip), `ts` pinned to
   `invoice.status_transitions.paid_at`. Legacy-flow conversions emit without
   plan/interval props (pre-tier subscriptions have no tier identity).
9. **churn_marker**: `customer.subscription.deleted` (uuid
   `churn:subscription:<subId>`; user id from subscription metadata, fallback
   `user_subscriptions` lookup) and account deletion (emitted before the Supabase
   user — and with it the opt-out flag — is destroyed).
10. **speak_turn** emits on completed turns including TTS-failed partial turns (the
    learner still completed the interaction); failed STT/LLM paths do not emit.
11. **visit** fires once per SPA boot after the auth restore settles, so logged-in
    visits carry the user id; classification uses the pre-redirect entry path, and
    both `/share/:id` and `/v/:id` (the actually-minted short link) count as `share`.
12. **Manifest**: committed with `analytics_enabled: false` while the system is dark.
    It flips to `true` in the same commit as the env-flag enablement, per your
    same-commit rule — a `true` manifest with dead flags would misreport today.
13. **Env values** must go in Vercel env, NOT this machine's `.env` — the iOS bundle
    compiles in whatever `.env` the building machine has (known landmine here).
14. `epoch` left unset as instructed.

## Open questions

- None blocking. Drills (work item 10) run after the owner's approval + env keys +
  migration apply; results will land in `DRILLS_FOR_ANALYTICS_OS.md` with the commit SHA.

---

## Change orders CO-1..CO-5 — implemented 2026-08-03

All five orders (plus the LW-004 relay) are in the tree and committed; the SHA the owner
relays is this batch. Details you should know:

- **CO-1** done: account-deletion `churn_marker` now rides `distinctId:
  "anon_churn_counter"` with `props.reason: "account_deleted"`, keeping the deterministic
  uuid (`churn:delete:<uid>`). The emitter gained an `optOutUserId` field so the real
  user's opt-out still governs the id-less emit. Subscription-cancel churn unchanged
  (UUID-keyed), as ordered. Note the interplay we relied on: when account deletion
  cancels the Stripe subscription (LW-004), the webhook also emits a UUID-keyed
  `subscription_cancelled` churn — that event is exactly what the CO-2 erasure (and its
  24h re-sweep) removes, so the surviving record per deleted account is the single
  id-less marker. Tell us if you'd rather we suppress that webhook emit at source.
- **CO-2** done: `api/delete-account.ts` now runs churn-emit → PostHog person deletion →
  queue row → user destruction, with steps 2–3 unable to block step 4. New migration
  `20260803090000_analytics_deletion_queue.sql` (uuid + requested_at, RLS no-policies);
  daily re-sweep is a Vercel cron (`vercel.json` crons → `api/analytics-deletion-sweep.ts`,
  03:30 UTC) that re-issues deletion for rows older than 24h and removes each row only
  after PostHog confirms. Erasure endpoint shape used (private API host
  `https://eu.posthog.com`): `GET /api/projects/:id/persons/?distinct_id=<uuid>` then
  `DELETE /api/projects/:id/persons/:personId/?delete_events=true` — per current docs,
  and the deletion drill proves it live. **Two server-only envs at enablement:**
  `AOS_POSTHOG_DELETION_KEY` (the scoped personal key you specified) and
  `AOS_POSTHOG_PROJECT_ID` (the numeric project id the private API requires — your CO
  didn't name it; flag if you'd rather deliver it another way). Optional `CRON_SECRET`
  guards the sweep route (it's idempotent and harmless unauthenticated, but we honor the
  header when set).
- **CO-3** was already satisfied by construction: `entry_path` is
  `window.location.pathname`, which never carries a query string or fragment; `/v/:id` /
  `/share/:id` keep their ids. Documented at the capture site; no behavior change.
- **CO-4** acknowledged: workaround stands, we restore `erasableSyntaxOnly` in both
  tsconfigs when the regenerated snapshot lands.
- **CO-5** done: `operator: "Deep Blue Dodo LLC"`, `payment` added to `data.collects`,
  `analytics_enabled`/`analytics.tier`/pricing shape kept, `age_gate` still TBD (owner's
  card).
- **LW-004** fixed: account deletion now cancels the Stripe subscription first —
  fail-closed (cancel failure aborts the deletion with a retryable 502; a ghost
  subscription is worse than a retried deletion), then best-effort deletes the Stripe
  customer. The CO-2 deletion drill will exercise this path too (delete a subscribed
  throwaway).
