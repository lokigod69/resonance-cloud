# ⚠️ CHANGE ORDERS — 2026-08-02 (read first; supersedes conflicting lines in rev 1 below)

Issued after your `NOTES_FOR_ANALYTICS_OS.md` (all 14 notes received) and Legal OS's round-1
verdict on Lingwave. Net: your implementation is **accepted as built** except the orders below.
Your open-question count back to us was zero — noted, that is the bar this handoff aims for.

## Deviation review (your notes 1–14): ACCEPTED
All fourteen accepted as implemented, notably: the `guided_step` re-seam to real atomic units
(note 2 — better than our spec), game attempts as `study_rep` + `game_round` at round end (3),
password-signup at account creation (4 — accepted with the recorded semantic: `signup` counts
account creation, possibly email-unconfirmed; funnel honesty is preserved because `activation`
gates on a real learning action), completion-confirmed `song_generated` (5), origin-derived
platform (6), fail-closed server opt-out + migration-before-flags (7), `credit_ledger`-gated
first-payment (8), TTS-failed partial speak turns counting (10), `/v/:id` as share (11),
same-commit manifest (12), Vercel-only env values (13). Note 1 (zod direct dep): fine.

## CO-1 — `churn_marker` split (Legal OS, binding)
- `reason: "subscription_cancelled"` → **keep the user UUID** as distinctId. Your webhook
  implementation already does this; no change.
- `reason: "account_deleted"` → **id-less**: constant distinctId `anon_churn_counter` (portfolio
  pattern; the `anon_` prefix also keeps it profile-less automatically). Keep the deterministic
  uuid for dedup. Rationale: a UUID-keyed event racing the deletion job can survive as an
  unfindable orphan after the person's data is erased.

## CO-2 — account-deletion erasure contract (Art. 17; binding once analytics is enabled)
Required order in `api/delete-account.ts` when the flags are on:
1. Emit the id-less `churn_marker` (CO-1).
2. Issue a PostHog **person deletion with events** for the user's UUID — private API, new
   server-only env `AOS_POSTHOG_DELETION_KEY` (a *scoped* personal key the owner supplies at
   enablement; never the ingest key, never client-side). Shape: look up the person by
   distinct_id, then delete with `delete_events=true` — verify the exact endpoints against
   current PostHog docs at implementation time; the drill proves it either way.
3. Insert a row into a small `analytics_deletion_queue` table (`user_uuid, requested_at`) —
   retained solely to complete erasure (in-flight events can land after the first pass).
4. Destroy the Supabase user. **Steps 2–3 failing must never block step 4** — the account always
   dies; failed erasure calls just stay queued.
5. A daily job (Vercel cron or your Railway worker) re-issues deletion for queue rows older than
   24 h, then deletes the row.
Drills (work item 10) gain one step: delete a throwaway account and verify its events are gone
from PostHog after deletion processing.

## CO-3 — `entry_path` hygiene (Legal OS, binding)
Strip query string and fragment from `entry_path` at capture time — path only. Attribution rides
ONLY the vendored ref/utm allowlist (that is why it exists). `/share/:id`-shaped paths keep the id.

## CO-4 — snapshot rev 2 (our defect, confirmed)
Your parameter-property report is correct and it is our defect per this handoff's own rule. The
source fix is queued in our core lane; we will regenerate and redeliver the snapshot into
`frontend/src/vendor/analyticsos/`, after which restore `erasableSyntaxOnly` in both tsconfigs
and drop the dated comments. Until then your workaround stands.

## CO-5 — manifest edits (Legal OS §6.4)
- `entity.operator: "Deep Blue Dodo LLC"` (it is in your own live `/privacy`; the owner's
  one-word confirm rides our ledger — if he contradicts, we change-order it back).
- `data.collects`: add `payment` (Stripe checkout exists).
- Keep `analytics_enabled` + `analytics.tier` even though the vendored validator flags them
  (spec bump is queued portfolio-side); the `commercial.pricing` string shape may also stay.
- `data.age_gate` stays `TBD` until the owner answers the age-posture question (his card).

## Relays from Legal OS (their findings in your repo, routed via the owner)
- **LW-004, blocking before the first real charge:** `api/delete-account.ts` never touches
  Stripe — a deleted account with an active subscription keeps getting charged with no account
  left to cancel from. Cancel the subscription (and ideally delete the Stripe customer) in the
  deletion flow.
- **Privacy page:** Legal OS supplies drop-in analytics text for `/privacy` (PostHog named,
  Art. 6(1)(f) + objection route, 12-month retention). The Termly boilerplate claiming
  *advertising* trackers must come out before enablement — it claims tracking that does not
  exist. Their list of processors missing from the page: Supabase, Google Gemini, OpenRouter,
  kie.ai.
- **Enablement order (hard):** migration `20260802090000` applied → corrected privacy text live
  → PostHog DPA countersigned (owner) → keys set → flags + manifest flip in the same commit →
  drills → our arrival-proof (now including the CO-2 deletion drill).

---

# LINGWAVE — Analytics instrumentation handoff (rev 1)

From: Analytics OS. To: the LingWave dev agent (repo `D:\CODING\ResonanceTEST`, git root `orchestrator/`). Pinned to your commit `38978b57` (2026-07-30) — re-anchor file:line refs if you've moved.

**What this is.** Your product gets portfolio-standard analytics: eight fixed events, one shared PostHog Cloud EU project, your data separated by `project_id: "lingwave"`. You implement the seams below in one session; we verify arrival and register you in the portfolio cockpit. The event vocabulary is closed — you never invent an event name; anything extra rides in namespaced `props`.

**Hard gates (read first):**
1. **No events flow before the owner approves the `analytics:` block** in the manifest below (one-time verdict, filed on our side). Implement everything, keep the master switch off until approval.
2. Analytics must **never break a user request**: every emit is fire-and-forget, failures swallowed (same philosophy as your `writeUsageEvent` — `api/_shared/usageEvents.ts:15-17`).
3. Analytics stores **nothing on the device**: no cookies, no localStorage keys, no device ids. Pre-login identity is an in-memory per-load id. This is what keeps the portfolio's no-consent-banner posture defensible (Legal OS reviews your specifics separately — camera/mic permission strings are *product* permissions and unaffected).
4. **No PII in props** — never email, name, transcript text, image content, or free-text user input.
5. Real-money launch later requires `analytics.epoch` machinery on our side — leave `epoch` unset for now; beta data counts from your first event.

---

## Work item 0 — Vendored capture layer · REQUIRED

We deliver a generated snapshot (7 files: `attribution.ts, capture.ts, events.ts, id.ts, index.ts, posthog-sink.ts, sink.ts`; only external dep `zod@^3`, already in your tree via supabase? if not: add `zod@^3` to `orchestrator/frontend/package.json`). It arrives in your repo at:

```
orchestrator/frontend/src/vendor/analyticsos/   ← the snapshot (DO NOT HAND-EDIT; we regenerate)
orchestrator/analyticsos/                       ← this handoff + your notes back to us
```

One physical copy. The SPA imports it relatively; your Vercel functions import it via relative path too (`../src/vendor/analyticsos` from `api/`, `../../src/vendor/analyticsos` from `api/_shared/` — Vercel's bundler follows relative imports). If your bundler genuinely rejects cross-folder imports, tell us in your notes-back file and we'll restructure — do NOT fork or duplicate the snapshot (divergence breaks portfolio comparability; a past hand-copy dropped an export and broke a build).

Create two thin singletons:

**`orchestrator/frontend/src/lib/analytics.ts`** (client):
```ts
import { createCapture, PostHogSink } from "../vendor/analyticsos";
// enabled iff import.meta.env.VITE_AOS_ANALYTICS_ENABLED === "true" AND key present; else export a no-op with the same surface
export const analytics = createCapture({
  projectId: "lingwave",
  platform: isNativeCapacitor() ? "ios" : "web",   // Capacitor.isNativePlatform()
  sink: new PostHogSink({ ingestHost: "https://eu.i.posthog.com", projectApiKey: import.meta.env.VITE_AOS_POSTHOG_KEY }),
});
```
**`orchestrator/frontend/api/_shared/analytics.ts`** (server): same shape, keys from `process.env.AOS_POSTHOG_KEY`, gate `process.env.AOS_ANALYTICS_ENABLED === "true"`, and it must accept an explicit `distinctId` + `uuid` + `ts` per call (the snapshot's capture supports per-event `uuid`, `deterministicUuid(seed)` lives in `id.ts`).

Env names to add (values come from the owner, not from us): `VITE_AOS_POSTHOG_KEY`, `AOS_POSTHOG_KEY` (same value), `VITE_AOS_ANALYTICS_ENABLED`, `AOS_ANALYTICS_ENABLED`.

**Identity rule:** logged-out → capture's anonymous id (`anon_…`, in-memory only, new per page load — that's intended). Logged-in → `distinctId = supabase user.id` (your canonical UUID, same one you already stamp on `pipeline_events.user_id`). No aliasing between the two — the pre-login visit and the account are deliberately unlinked.

**Per-user opt-out (build it now):** a `profiles.analytics_opt_out` boolean (default false) + settings toggle; when true, suppress ALL emits for that user at source, client and server. Legal OS required this for the previous project's go-live; building it now avoids a change order later.

## Work item 1 — `visit` · REQUIRED (client)

Once per SPA boot (not per route change), after router resolves the entry route. Props: `props: { page_type: "landing" | "share" | "app", entry_path, skin: "glassy" }`. `/share/:shareId` entries are `page_type: "share"` — that's the viral loop's view side (your server-side `increment_shared_word_view` counts crawlers; this event counts real browsers — both stay, they measure different things).

## Work item 2 — `signup` · REQUIRED (client)

On the first authenticated session immediately after a successful `signUp` or first OAuth round-trip (seam: `src/hooks/useAuth.ts` sign-up success path, ~`:294-323`). `uuid: deterministicUuid("signup:" + user.id)` so retries never double-count. Props: `props: { method: "password" | "google" }`.

## Work item 3 — `core_action` = a **learning_action** · REQUIRED (the heart)

One event name, `core_action`, fired on *completion* of any atomic learning interaction, with `props.kind` distinguishing the surface:

| kind | Seam (yours) | Side | Extra props |
|---|---|---|---|
| `guided_step` | guided step marked complete (`src/lib/guidedCheckpoint.ts` write path) | client | `lesson_id`, `step_type` |
| `study_rep` | recall attempt recorded (`src/hooks/useStudySession.ts`) | client | `study_mode` (typed/tide/surf/canvas/runner), `correct: boolean` |
| `speak_turn` | next to your existing `writeUsageEvent("speak_turn"…)` in `api/voice-chat.ts` | server | `duration_s` (audio_seconds), `compute` (see below) |
| `speak_live_block` | Grok client-secret issuance = one 10-min debit (`api/grok-token.ts:104,137`) | server | `duration_s: 600`, `compute` |
| `lens_scan` | `api/visual-scan.ts` success | server | `compute` |
| `song_generated` | client observes music job completion in the UI | client | `units: 1` |
| `game_round` | slicer/surf round end | client | `game`, `score` |

`props.compute` — for the three server kinds, reuse the numbers you already compute for `pipeline_events`: `{ tokens_in, tokens_out, est_cost_usd, providers: ["groq","gemini",…] }`. This is how the portfolio sees cost-per-learning-action; your `pipeline_events` stays the detailed ledger (invoice truth stays with Finance OS). All kinds also carry `platform` (automatic) and `skin: "glassy"`.

Study reps fire per answer; that's intended granularity at beta scale. Do NOT emit for admin routes or your two dogfood accounts if trivially detectable — otherwise leave it; we window data at go-live.

## Work item 4 — `activation` · REQUIRED

Fires **once per user, ever**: the first `learning_action`. Robust gate: add `profiles.activated_at timestamptz` set by an RPC the first time a learning_action lands (return whether it was first; if first, also emit `activation`, `uuid: deterministicUuid("activation:" + user.id)`, server-side where the action is server-side, client-side otherwise using the RPC's answer). If you'd rather not add the column, the deterministic uuid still dedupes same-day repeats — but the column is the honest gate and gives your own product "member since doing" truth for free.

## Work item 5 — `share` · REQUIRED (client)

When a share is successfully *created* (seam: `src/lib/shareWord.ts` success). Props: `props: { kind: "word" }`. (Views of shares are work item 1.)

## Work item 6 — `trial_start` · REQUIRED (server)

Portfolio meaning: **entered evaluation with paid intent** — for you, a Stripe Checkout session successfully created (`api/create-checkout-session.ts`, after the session exists ~`:103`). `uuid: deterministicUuid("trial_start:" + checkoutSession.id)`. Props: `props: { plan: "standard"|"premium", interval: "month"|"week" }`. Web-only by your design — platform will honestly read `web`.

## Work item 7 — `conversion` · REQUIRED (server, webhook)

**FIRST successful payment only, ever, per user.** Seam: `api/webhooks.ts` on the event where the first subscription payment settles. Gate: check your own subscription records for any prior paid period — if prior, emit NOTHING (renewals and upgrades are invisible to this vocabulary by design). `uuid: deterministicUuid("conversion:" + user.id)`; `ts` pinned to the Stripe payment timestamp, not webhook receipt. Props: `plan`, `interval`. Refunds are NOT churn and emit nothing.

## Work item 8 — `churn_marker` · REQUIRED (server)

Explicit goodbyes only, never inactivity (we derive inactivity churn ourselves): (a) subscription cancellation taking effect (webhook), (b) account deletion (`api/delete-account.ts` — emit BEFORE the Supabase user is destroyed). Props: `props: { reason: "subscription_cancelled" | "account_deleted" }`. Legal OS may adjust this event's identity shape in their verdict; implement as specified and expect at most a change order.

## Work item 9 — Manifest · REQUIRED (same-commit rule)

Commit this as `orchestrator/project.yaml`. **The `analytics_enabled: true` flip and this file land in the same commit as your enablement-flag flip** — code-first, manifest-later produces a reconciliation failure on our side. Replace TBDs you can answer from your repo; leave true unknowns as `TBD`.

```yaml
manifest_version: 1
project:
  id: lingwave            # immutable forever
  name: Lingwave
  one_liner: "Language learning with AI music, a voice tutor, camera vocabulary, and daily guided lessons."
  status: beta
  repos: ["github.com/lokigod69/resonance-cloud"]
  platforms: [web, ios]
  stack: ["react19+vite", "vercel-functions", "supabase", "railway-python", "capacitor8", "stripe"]
entity:
  operator: TBD
  jurisdiction: TBD
  markets: [EU, TBD]
commercial:
  model: subscription      # 2 tiers x 2 intervals + consumable credits; web-only checkout
  pricing: "standard 7.99/mo|2.99/wk; premium 14.99/mo|4.99/wk; credits consumable; free = lifetime trial grants"
  payment_rails: [stripe]
data:
  collects: [account_email, learning_activity, audio_transient, camera_transient, analytics]
  processors: ["supabase", "stripe", "groq", "google-gemini", "mistral", "xai", "openrouter", "kie.ai", "elevenlabs", "posthog-eu"]
  permissions: [microphone, camera]
  age_gate: TBD
brand:
  kit_path: brand/
  voice: TBD
  channel_policy: TBD
  handles: {}
analytics_enabled: true     # flip in the SAME commit as the env enablement
analytics:
  tier: 3
  activation_event: "first_learning_action"
  core_action: "learning_action"
  funnel: [visit, signup, activation, core_action]
apis_consumed: []
support: {}
```

## Work item 10 — Acceptance drills · REQUIRED (before enablement)

With env keys set but pointing at the real PostHog project (there is no sandbox project — that's fine, pre-approval drill events get windowed out at go-live):
1. After owner approval ONLY: flip flags in a dev deploy, exercise each surface once (visit, signup with a throwaway, one learning_action of each implementable kind, share, checkout-open in Stripe sandbox → trial_start, `4242…` test purchase → conversion, cancel → churn_marker).
2. Write what you did + any deviations to `orchestrator/analyticsos/DRILLS_FOR_ANALYTICS_OS.md` (include your commit SHA).
3. Ping us (the owner relays); we run arrival-proof on our side within 60 minutes of your drill and confirm each event arrived with `project_id: "lingwave"`, correct props, correct platform split.

**Notes back:** anything surprising, any seam that didn't fit, any question this document failed to answer → `orchestrator/analyticsos/NOTES_FOR_ANALYTICS_OS.md`. If this handoff made you invent something, that's our defect — report it.
