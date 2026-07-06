# Lens — Visual Language Learning: Master Plan

Date: 2026-07-06 · Author: Fable 5 · Status: live + hardened — Phases 2A–2D deployed (commit `0d42e989`, lingwave.ai, migrations applied); iPhone Safari QA passed end to end 2026-07-07; **2G trust/recognition hardening pass built 2026-07-07 (uncommitted)** — reticle-crop capture, confidence de-surfacing, transient-502 retry, in-Lens language switcher, recap discard, TTS voice fix; remaining: owner re-test + commit, 2E device matrix, then 2F decision gate
Companion: `D:\CODING\ResonanceTEST\investigations\VISUAL_LENS_CODEBASE_DISCOVERY_2026_07_06.md`
Supersedes: the founder/GPT "Visual tab" master prompt (kept in spirit, re-architected in substance).

## The vision, kept

I see something → I point my camera → Lingwave tells me what it is in my target language → I hear
it → I save it → it becomes part of my learning loop. The import path is the product. Other apps
can identify objects; Lingwave wins when the object becomes a remembered word, a card, a review
item, part of active vocabulary.

## What changed from the founder prompt, and why

The original prompt assumed a native iOS app with Apple Vision / Core ML, fal.ai in the stack, and
an 11-table schema. Phase Zero (see discovery report) showed a different and *better* reality:

1. **Capture-first, not continuous-scan.** Lingwave is a web app in a Capacitor shell. Realistic
   in-browser "on-device" detection means multi-MB TensorFlow.js models with ~80 generic classes —
   weak vocabulary value, heavy bundle, hot battery. Meanwhile one frame sent to a modern
   multimodal model (Gemini Flash class) does object naming, OCR, translation, transliteration,
   article/gender, and an example sentence *in a single call* for a fraction of a cent. So the MVP
   is a deliberate shutter tap on a live preview, not an always-on recognizer. This one decision
   dissolves most of the original prompt's hardest problems: no flicker, no debouncing windows, no
   cooldown logic, no auto-speak chaos, no per-frame cost, and privacy becomes "one user-intended
   frame per tap" instead of a streaming firehose. It also matches the prompt's own preferred UX
   ("calm and intentional, not noisy") better than the hold-to-detect magic it proposed.
2. **One vision call replaces the detection→translation→lexical pipeline.** The prompt designed
   three layers (object detection, translation/dictionary, LLM fallback). A single structured
   prompt to a vision LLM *is* all three, with language-learning correctness (natural word choice,
   article, register) handled where it belongs — in the lexical prompt, not in a label-mapping
   table. fal.ai is not used anywhere in Lingwave and adds nothing here.
3. **Near-zero new schema — no new tables, one new RPC.** Saved items are `words` rows in an
   auto-created `card_text` deck, instantly studyable and SRS-tracked. Adversarial review showed
   the existing imageless RPCs are too narrow to reuse directly (origin whitelist, minimal item
   shape, no find-or-create, no dedupe), so MVP adds one `security definer` RPC
   (`submit_lens_save`, modeled on `submit_imageless_import`) plus the `visual_scan` quota
   action — still a single migration, and the proposed `visual_*` table family stays dead. A
   scan-history table remains a later option. Metering reuses `api/_shared/usageEvents.ts`
   (arbitrary `feature` strings → `pipeline_events`); `usageCost.ts` gains one Gemini-vision
   cost helper.
4. **Visual is the third sibling of an existing family.** Speak already has extract-words →
   deck ("conversation → deck"); Generate has typed word lists. Lens is "world → deck" on the
   same rails. Nothing about the study loop, SRS, or deck library changes.
5. **No tab fight at MVP.** Bottom nav is hard-coded to six tabs and the TestFlight strategy doc
   deliberately minimizes visible systems for beta. Lens ships as a flag-gated route (`/lens`)
   reached from a dashboard tile; promotion to a bottom-nav slot (and which tab yields) is an
   owner decision after dogfooding — and per working agreement, demoting an existing tab needs
   explicit owner approval anyway.

## Naming

Working name **Lens** (code: `lens`, flag `VISUAL_LENS_ENABLED`, route `/lens`, i18n keys
`lens.*`). Short, calm, describes the act not the tech. UI labels per locale decided at tab time
(en "Lens", de likely "Scannen"/"Kamera" — "Linse" reads as the lentil/optics word, fr
"Objectif"/"Scanner"). Alternatives considered: Visual (adjective, awkward as a noun tab), World
(poetic but vague), Scan (utilitarian, strongest de/fr fallback). Rename is cheap before launch;
revisit at tab-promotion time.

## Product design

### Interaction model (MVP)

Camera-forward, capture-to-ask:

1. User opens Lens (dashboard tile → `/lens`, fullscreen dark UI, both skins share one page —
   camera UI has no skin-specific chrome, matching the fullscreen-route precedent).
2. Live preview with a soft reticle and one quiet instruction line ("Point at something to learn
   its word" — i18n'd). No detection runs. No sound. Nothing moves.
3. User taps the shutter (or taps the preview itself). Frame freezes immediately — the freeze
   *is* the feedback. **Since 2G (2026-07-07) the reticle is functional, not cosmetic:** the
   scan payload sent to the API is a crop of the reticle circle plus a 35% context margin
   (`reticleRegion` in `Lens.tsx` maps the CSS circle back to intrinsic video pixels through
   the object-fit-cover transform; falls back to full frame if the rect is unavailable). The
   frozen preview stays full-frame so capture never visually "jumps". The reticle is sized
   `min(74vw, 23rem)` so close objects fit without backing away.
4. One request to `/api/visual-scan` with the downscaled frame + target language, base language,
   user level. Loading shimmer on a bottom sheet, cancellable, target < 2.5 s perceived.
5. Result sheet slides up over the frozen frame:
   - target-language word/phrase (large, in native script)
   - transliteration/romanization when script ≠ Latin
   - base-language meaning
   - article/gender/classifier chip when the language has one
   - one example sentence + gloss (collapsed behind a tap at MVP if space is tight)
   - 🔊 tap-to-speak (never auto-speak), ⭐ Save, ✕ dismiss-and-rescan
   - low-confidence / ambiguity: up to 2 alternates shown as small chips ("Did you mean…"),
     tapping swaps the sheet content — this is the correction flow, no separate mode
   - **confidence display policy (2G, 2026-07-07):** the model's self-reported confidence is
     UI-internal. It is NEVER rendered as a positive trust marker (the high/medium/low chip
     is gone); only `low` surfaces, as a caution that points at the alternates. Rationale:
     the self-report proved uncalibrated in live QA (wrong answers labeled high), and in a
     vocabulary app confident-and-wrong is the one failure mode that must not be amplified.
     The field stays in the API contract so a future calibration effort can plug in.
6. Save writes to the auto deck "Lens — {Language}" and shows a small confirmation with an
   "Open deck" affordance. Duplicate of an existing user word → "Already in your vocabulary"
   with a link instead of a second copy.
7. ✕ returns to live preview. Repeat.
8. Leaving Lens after ≥1 scan shows a lightweight session recap (in-memory list: saved / seen,
   bulk-save the unsaved) — client state only at MVP, no server history table.

Text/menu handling at MVP is *not* a separate mode: the vision call classifies the frame
(`object | text | menu | scene`) and for text/menu returns up to N line-items; the sheet renders
them as a selectable list (each row: target text, meaning, save toggle). One endpoint, one UI,
two renderings. Dedicated freeze-frame multi-region selection is a later phase.

### Explicitly deferred (later phases, in rough order)

Region tap-to-disambiguate on the frozen frame → richer "explain this menu/sign" (paid tier) →
server-side scan history ("visual history") → generated TTS assets for saved words → live
candidate hints (only if capture-first proves insufficient — the founder's hold-to-detect magic,
reconsidered with evidence) → handwriting → offline glossary for top-N nouns.

### Non-goals

Continuous auto-speak scanning; storing camera frames; AR overlays/tracked bounding boxes;
detecting people/faces (prompt instructs the model to refuse/blur-level-ignore humans and
sensitive documents); a parallel vocabulary store outside decks/words.

## Architecture

### Client

- `frontend/src/pages/Lens.tsx` (one shared page, lazy via `routeImports.ts`, never prefetched)
  with a small state machine — the capture-first model needs only:
  `permission_pending | permission_denied | camera_ready | frozen_analyzing | result | error |
  offline` (+ `recap` overlay). No stabilization/cooldown states needed.
- Camera: `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` →
  `<video>` preview → capture via canvas, downscale longest edge to ~1024 px, JPEG ~0.8 → base64.
  Mic precedent (`useVoiceTutor`) proves the WKWebView permission flow; requires adding
  `NSCameraUsageDescription` to `Info.plist`. Torch toggle where supported (low light).
- Hook `useLensScan.ts` mirrors `useTranslateAndIpa`: `publicApiUrl('/api/visual-scan')`, auth
  header, abortable, typed result.
- Pronunciation: `usePronunciation` with browser speech (`speechSynthesis`, target-language
  voice) — the house fallback tier. No paid TTS calls from the client, per standing rule.
- Save: client avoid-list from `get_user_words_for_language` (300-word cap — helper, not
  guarantee) → new hook `useLensSave` → RPC `submit_lens_save`, which atomically
  finds-or-creates the user's "Lens — {Language}" `card_text` deck and dedupes in-RPC. The
  existing `useAppendImagelessCards` path is *not* reusable as-is (origin whitelist, no
  find-or-create — see decision log).

### API contract — `frontend/api/visual-scan.ts`

Fourth sibling of `translate-and-ipa` / `extract-vocabulary` / `voice-chat`: named `POST` export,
`_shared/auth` bearer check, `consumeApiQuota(user, 'visual_scan')`, `_shared/http` errors,
usage-event + cost logging, server-side keys.

Request: `{ image: base64Jpeg, targetLanguage, baseLanguage, level?, hint?: 'object'|'text' }`
Response:
```ts
{
  kind: 'object' | 'text' | 'menu' | 'scene' | 'unsupported',
  items: Array<{            // 1 for object; 1..N for text/menu
    target_text: string,     // natural word/phrase in target language, correct script
    base_text: string,       // meaning in the user's base language
    transliteration?: string,
    ipa?: string,
    pos?: string, article?: string,   // article/gender/classifier when applicable
    example?: string, example_gloss?: string,
    confidence: 'high' | 'medium' | 'low',
    alternates?: Array<{ target_text, base_text }>,  // ≤2
  }>,
  safety?: 'person' | 'sensitive_document' | null,   // → UI declines gracefully, nothing logged
}
```
Storage mapping (verified against migrations): `target_text→words.word`,
`base_text→translation`, `ipa→ipa`, `pos→pos`, `article→article`, `example→example`,
`example_gloss→example_gloss` — all real columns. `transliteration` goes into the `metadata`
jsonb (no column exists; do not abuse `ipa`). `kind`, `confidence`, `alternates`, `safety` are
UI-transient and never stored. The lexical prompt carries the language-correctness rules from
the founder prompt (natural word not literal label, article for de/fr/es/it, transliteration for
ko/ja/zh/ar/ru/th, register notes, learner level).

Provider: start with **Gemini Flash-Lite / Flash** via the existing `GOOGLE_AI_API_KEY`
(image+OCR+translation quality, ~$0.0001–0.001 per scan), with the model name in one constant and
an OpenRouter vision fallback behind the same interface so we can A/B or fail over. Image is
processed in-memory only — never written to Supabase storage, never logged.

### Backend delta

One migration, two parts, no new tables:

1. **Quota action** — extend the CHECK constraints on `api_quota_config` *and* `api_quota_usage`
   with `visual_scan` (default e.g. 30/day free), plus the hard-coded `ApiQuotaAction` union in
   `api/_shared/quota.ts` and the `QuotaAction`/`ACTION_ORDER` lists in
   `pages/admin/Quotas.tsx` — the exact pattern of `guided_transcribe_quota_action.sql`.
2. **`submit_lens_save` RPC** (`security definer`, modeled on `submit_imageless_import`):
   atomically find-or-create the user's Lens deck for the target language (advisory lock or
   unique index so concurrent saves can't create duplicate decks), accept items
   `{word, translation, ipa, is_phrase, pos, article, example, example_gloss,
   transliteration}`, write the column fields directly and transliteration into `metadata`,
   set `metadata.origin='lens'`, skip words already in the deck by `word_slug` (idempotent),
   return `{deck_id, inserted, skipped}`. The existing imageless RPCs stay untouched (their
   origin whitelist and minimal item shape are contracts other features rely on).

Endpoint hygiene per house pattern: explicit body cap via `readJsonWithLimit` (~2 MB, precedent
`guided-transcribe.ts`'s 4 MB audio cap) with a max base64 length check; a Gemini-vision entry in
`api/_shared/usageCost.ts` (none exists — current helpers cover only text/STT/TTS providers).
RLS untouched. Optional Phase C: a slim `lens_scans` history table (owner-RLS, text results
only, no images) if "visual history" proves wanted.

### TTS tiers (unchanged house pattern)

1. MVP: browser `speechSynthesis`, tap-to-speak only.
2. Phase C: saved Lens words enter the same batch pipeline that fills `words.tts_audio_url`
   (blocked on resolving the `generate-imageless-tts` endpoint gap noted in discovery §4).
3. Never: runtime paid TTS per tap.

## Cost model

Per scan (Gemini Flash-Lite, ~1024 px frame ≈ 258 input tokens + ~300 output tokens): well under
$0.001. At 30 scans/day quota, worst-case power user ≈ $0.50–0.90/month; realistic average user
(a few scans/day) ≈ **1–3 cents/month**. Save/import is free (existing credit-free path). Browser
TTS is free. The expensive futures (rich menu explanation, generated audio, scene understanding)
are exactly the phases behind credits later — MVP charges nothing and needs no monetization
decisions. Abuse control = the quota action + existing enforcement toggle; cost visibility =
existing `usageCost` events, admin Quotas page.

## Privacy

- Frames leave the device only on explicit shutter tap; sent to the vision provider for
  inference, never stored by us (no bucket writes, no logging of image bytes).
- Response text is stored only when the user taps Save (as a normal word row they own, deletable
  like any card; RLS owner-scoped).
- Model instructed to return `safety` flag for people/ID/documents/cards → UI shows "Lens doesn't
  read personal items" and discards; nothing persisted.
- `NSCameraUsageDescription` copy: honest single sentence about identifying objects/text to teach
  vocabulary. App Store privacy label: camera data — processed, not linked, not stored.
- Delete path: existing account deletion covers word rows; if `lens_scans` lands later it joins
  `delete-account.ts` cleanup.

## Rollout phases (Codex-driven; each lands flag-gated, verified, and /brain-documented)

- **2A Foundations** — flag, route in both skin branches, lazy import, permission flow +
  denied/offline states, live preview + freeze, mock provider behind the `useLensScan` interface,
  result sheet UI, i18n keys (en/de/fr). **Includes the de-risking device spike**: prove video
  `getUserMedia` (permission, facingMode, orientation, memory) in the actual Capacitor shell with
  `NSCameraUsageDescription` added — the mic precedent covers audio only, and if video capture
  misbehaves in WKWebView the fallback design (@capacitor/camera still-photo intent) must be
  chosen *before* 2B. Verify: typecheck/lint/check:i18n, manual browser QA.
  Phase 2A code note: the plist camera usage string is present, but the remaining spike is
  device-only QA in the iOS shell: WKWebView video `getUserMedia` permission behavior,
  `facingMode: 'environment'` reliability, portrait/landscape orientation, memory during
  repeated freeze/canvas captures, and the decision on whether to add `@capacitor/camera` as a
  still-photo fallback if live video misbehaves.
- **2B Real scan path** — `api/visual-scan.ts` (body cap via `readJsonWithLimit`, base64 length
  guard) + quota migration part 1 + admin row + `usageCost` vision helper, Gemini integration,
  structured lexical prompt with per-language rules, error taxonomy, `typecheck:api`,
  `tsx scripts/test-visual-scan.ts` (mocked provider) following the house test-script pattern.
- **2C Save/import** — migration part 2 (`submit_lens_save` RPC: atomic find-or-create, in-RPC
  dedupe, rich fields), `useLensSave` hook, duplicate UX, session recap + bulk save, confirm SRS
  pickup end-to-end.
- **2D Text/menu list rendering** — multi-item sheet, per-row save, source-language edge cases
  (target-language text → reading/meaning mode, not translation).
- **2E Capacitor hardening** — full shell QA on device (spike from 2A becomes a matrix: torch,
  orientation, thermal sanity, backgrounding), `publicApiUrl` verification under `capacitor://`.
- **2F Polish & decision gate** — perf targets (camera < 1 s, result < 2.5 s), observability via
  server-side `writeUsageEvent` rows (feature `lens`: scan count, provider cost, duplicates,
  errors — there is no general client analytics system, so client-side UX events are out of MVP
  scope), dogfood, then owner decides: tab promotion (and which tab yields) + beta exposure +
  naming.

Each phase = one Codex work packet (investigate → implement → self-review → adversarial review),
with Fable doing final review and the /brain save ritual (LOG/STATE/DECISIONS) per packet.

## Test plan (house style — targeted tsx scripts + manual QA, no vitest)

State-machine transitions (mock provider: success/low-confidence/multi-item/safety/error/offline);
response→word-row mapping incl. script/transliteration cases (ko/ja/de/es minimum); dedupe against
existing vocabulary; quota consumption + enforcement-disabled path; api function typecheck; i18n
coverage; manual matrix: browser (desktop+mobile), Capacitor shell, both skins, permission
denied/revoked, low light, offline mid-scan, rapid repeat taps (no double-save — save button
disables on first tap).

## Owner answers (2026-07-06, Phase 2A kickoff)

1. Beta exposure: **flag ON for first TestFlight testers** — Lens ships visible so testers can
   test it (`VISUAL_LENS_ENABLED = true` once 2A is stable enough to show).
2. Tab placement: **dashboard/home tile, not the bottom nav** — owner leans toward keeping Lens
   as a home-page entry rather than fighting for a nav slot. Revisit only if dogfooding says
   otherwise; any nav change still needs explicit owner approval.
3. Free-tier quota: **30 scans/day approved as the starting floor** ("at least 30 a day is okay
   at the beginning"); can raise later, cost permits.
4. Name: proceeding with working name **Lens**; final copy sign-off still open before 2F copy
   hardens.

## Decision log

- 2026-07-06 — Capture-first over continuous detection (platform reality: web/Capacitor, no
  viable on-device models; calmer UX; ~zero idle cost; simpler state machine).
- 2026-07-06 — Single multimodal vision call over detect→translate→enrich pipeline (one round
  trip, lexical correctness handled in-prompt, fewer providers).
- 2026-07-06 — Reuse `card_text` deck rails; no `visual_*` table family at MVP.
- 2026-07-06 — (post-adversarial-review) New `submit_lens_save` RPC instead of reusing
  `append_imageless_cards`: the existing RPCs whitelist origins, accept only
  `{word,translation,ipa,is_phrase}`, can't find-or-create atomically, and don't dedupe.
  Extending them would mutate contracts other features rely on; a sibling RPC is cleaner.
- 2026-07-06 — Transliteration stored in `words.metadata`, not a new column and not `ipa`.
- 2026-07-06 — Video-getUserMedia device spike pulled forward into Phase 2A (audio-only mic
  precedent doesn't prove video in WKWebView).
- 2026-07-06 — Gemini Flash-class primary provider (key already provisioned; fal.ai rejected —
  not in stack, no fit for lexical vision).
- 2026-07-06 — Route+tile first, tab decision deferred post-dogfood (grid-cols-6 + beta strategy).
- 2026-07-06 — Tap-to-speak only, browser TTS at MVP (house audio rules).
- 2026-07-06 — No frame storage, ever, at MVP; safety flag for people/documents.
- 2026-07-07 — (2G) Scan payload crops to the reticle + 35% context; frozen preview stays
  full-frame; reticle enlarged. Input intent beats prompt-only fixes for wrong-object errors.
- 2026-07-07 — (2G) Confidence never displayed as a positive signal; only `low` renders, as a
  caution steering to alternates. Prompt gained framing + calibration rules; calibrating the
  self-report itself rejected (soft signal shown as fact, high effort).
- 2026-07-07 — (2G) One silent server-side retry for transient Gemini 502s (not timeouts, not
  4xx) inside the provider — quota is consumed once per user scan, so retries never
  double-charge. Client keeps surfacing errors after that.
- 2026-07-07 — (2G) In-Lens language switcher (deck-derived + added languages, shared
  `setActiveLanguage`); recap items are language-tagged and bulk save groups per language so a
  mid-session switch cannot save words into the wrong deck. Recap gained per-item discard.
- 2026-07-07 — (2G) Photo-on-card DECLINED at MVP: persisting the captured frame as the card
  image would reverse the "frames never stored" pillar (App Store label, plan §Privacy), add a
  bucket + RLS + delete-account surface, and force reworking `deck_type`-based imageless
  gating across both skins — for a low-quality mnemonic. Feasibility plan is on record in the
  memory DECISIONS log if user demand materializes.
