# Hangul V1 — Korean Alphabet Module (Script Lab)

**Status:** implemented 2026-07-06, shipped behind route `/alphabet` + Study-hub tile
**Companions:** `FABLE_SCRIPT_LAB_ARCHITECTURE.md`, `FABLE_SCRIPT_AUDIO_PROVIDER_PLAN.md`

## Goal

A Korean learner opens Lingwave and can actually learn to *read*. The module teaches how
Hangul works (letters → syllable blocks), lets the learner explore every basic letter with
sound and real example words, build syllables interactively, and check themselves with a
short recognition quiz. Premium glass UI, romanization as helper text only, zero jargon.

## Route decision

**Chosen: standalone page `/alphabet` (+ `/alphabet/:scriptId`), with a registry-gated
tile in the Study hub (`/study`).** The options considered:

- **A. Static frontend module at its own route — chosen.** Matches the app's strongest
  precedent (Today, Speak, Categories are standalone data-driven surfaces registered under
  both skins). Static data + local progress, no backend.
- **B. Guided Today submodule — rejected for V1.** Korean is not a `GuidedTargetLanguage`;
  guided lessons are phrase-mission-shaped and their data module is a 2.8 MB
  chunk-boundary hazard. A Today teaser becomes attractive only after Korean guided
  content exists.
- **C. `/study/script` submode — partially adopted.** The Study hub is the discovery
  surface (new "Alphabet" tile), but the page itself is not an SRS session and shouldn't
  inherit study-session semantics (deck/queue params, word counts), so it lives at its own
  route.
- **D. Onboarding prerequisite — rejected for V1.** Highest-friction placement; revisit
  once the module has proven engagement. Documented as a follow-up entry point.

## Content model (shipped)

`src/data/scripts/koreanHangul.ts`, validated by `npm run test:script-lab`:

- **Basic consonants** — 14 (ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ), with native letter names
  (기역…), Revised Romanization, IPA, one-line pronunciation hints, example syllable
  (consonant + ㅏ), example word (가방, 나무, …).
- **Basic vowels** — 10 (ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ), example syllables written with silent ㅇ.
- **Batchim (final consonants)** — the 7 representative final sounds (k n t l m p ng),
  taught as a concept section: finals are held, not released; ㅅ/ㅈ/ㅊ/ㅌ/ㅎ all neutralize
  to t̚.
- **Double consonants** — 5 (ㄲㄸㅃㅆㅉ), marked `advanced`.
- **Compound vowels** — 11 (ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ), marked `advanced`, with
  `homophone:*` tags on the merged pairs (ㅐ=ㅔ, ㅒ=ㅖ, ㅙ=ㅚ=ㅞ) so the quiz never asks
  the impossible.
- **Composition capability:** initials = 14+5 consonants, medials = 10+11 vowels, finals =
  the 7 batchim; `compose()` uses exact Unicode arithmetic
  (`lib/scriptlab/hangul.ts`: U+AC00 + (initial·21 + medial)·28 + final) with Revised
  Romanization per slot.

Every example syllable in the data is cross-checked against `composeHangul` by the test
suite, so the inventory cannot drift from the math. All content strings (notes, meanings,
section copy, intro) carry en/de/fr.

Accuracy sources: Revised Romanization of Korean (official MCST system); IPA follows
standard descriptions of Seoul Korean; homophone merges (ㅐ/ㅔ etc.) reflect modern
speech and are stated in the notes.

## Pedagogy sequence (Learn tab, top to bottom)

1. **How it works** intro card: three short paragraphs — Hangul is an alphabet by design
   (1443, King Sejong); letters stack into square syllable blocks (ㅎ+ㅏ+ㄴ = 한); learn
   24 letters and you can sound out most words.
2. Basic consonants grid → 3. Basic vowels grid → 4. Batchim grid →
5. "Going further" divider → double consonants, compound vowels.

Grids are tap-to-open: a detail panel (bottom sheet on mobile, dialog on desktop) with the
symbol huge, its name, romanization chip, subtle IPA, the pronunciation hint, and playable
example syllable + example word rows. Symbols are marked "seen" in local progress; the
header shows "Explored N of 47".

## Modes

- **Learn** — the exploration surface above.
- **Build** — pick consonant + vowel (+ optional batchim); the composed block renders
  huge with romanization and a play button. This is the "aha" moment for the block system.
- **Quiz** — 10 recognition questions over the non-advanced sections: see a letter → pick
  its sound (romanization), or hear a syllable → pick the letter. Distractors come from
  the same section, never homophone-tagged against the answer. Immediate feedback,
  best-score kept locally. Listening questions appear only when audio is playable on the
  device.

## Audio (V1)

Resolution order per `lib/scriptlab/audio.ts`: static asset manifest (empty in V1) →
browser `speechSynthesis` speaking the declared text (letter names 기역/니은 for
consonants, syllables for vowels/finals, real words) with `ko-KR`. No paid provider is
called anywhere in the client. Upgrade path in `FABLE_SCRIPT_AUDIO_PROVIDER_PLAN.md`.

## i18n

UI chrome: `scriptlab.*` + `study.mode.script` keys added to en/de/fr in
`lib/translations.ts` (satisfies `check:i18n`, house rule: all three locales, real
umlauts). Content: `LocalizedText` in the data file, enforced by the test suite. Korean
users currently see the English UI (`LANGUAGE_TO_LOCALE.Korean = 'en'`) — unchanged.

## Test plan

Automated (all must pass before calling the feature done):
- `npm run typecheck` — strict TS across app incl. new module
- `npm run lint` — zero new errors on changed/added lines
- `npm run check:i18n` — locale parity for the new keys
- `npm run test:script-lab` — registry + inventory integrity, Unicode composition
  cross-checks, locale completeness, homophone-tag sanity

Manual mobile smoke (viewport ≤ 390px):
- /study shows the Alphabet tile when active language is Korean; tap → /alphabet/korean-hangul
- grids readable, tiles ≥ 56px, detail sheet opens/closes (backdrop, Escape), prev/next works
- audio button speaks on iOS Safari + desktop Chrome (ko voice present)
- Build tab: default 가 renders; batchim picker composes 간; play speaks the block
- Quiz completes; score records; no homophone listening questions
- classic skin (`AppLayout`) renders the same page acceptably

## Out of scope (V1) — candidates for V2+

Stroke order/writing practice, dashboard tile, onboarding hook, Guided Today teaser,
pre-generated audio assets, backend progress sync, complex batchim clusters (ㄳ ㄺ …),
sound-change rules (liaison, nasalization), Arabic/Cyrillic/Kana data packs.

## Risks

- **Browser TTS quality varies** (esp. Android WebView): mitigated by explicit spoken
  text and the asset-manifest upgrade path; worst case is a robotic but *correct* voice.
- **Skin drift:** page is theme-variable-only; if a future theme changes token semantics,
  the module follows automatically, but the classic skin gets less visual QA — kept on the
  smoke checklist.
- **Content correctness is on us:** the test suite catches structure, not linguistics; any
  future edits to romanization/notes should cite the Revised Romanization tables (the
  add-script skill includes the checklist).
