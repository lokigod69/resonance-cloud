# Twelve base languages and Lingwave practice art

Updated 2026-09-07. Released and production-verified as main `36355fe3` (266 files). Vercel `dpl_9WiWZyfMS2SaDexZzoDj84W2RE1R` Ready on lingwave.ai/www; Railway `458cd5fe-138f-4bfa-9306-70179a97705d` success. Production entry `index-R2Kj5XoE.js`, all144 edition assets, six exact-size WebPs and13 expected API responses pass. Signed-in Today opens and returns to Resume; live profile shows all12 base options. Account preferences and lesson completion counts were unchanged. Evidence: investigations/base-language-production-verification.json and base-language-release-36355fe3.json.

## Scope and behavior

The app supports English, German, French, Spanish, Italian, Portuguese, Indonesian, Polish, Russian, Korean, Japanese and Bisaya as UI and explanation languages. Target-language beta availability is unchanged. The anonymous marketing page retains its existing English/German/French editions; its document language follows the actual page, while login and the app use the 12-language preference resolver.

- UI: 1,727 nonempty keys per locale. Nine new packs load on demand with a shared cache, readiness boundary and retry. Profile wins over valid local preference, supported browser language, then English. Plural rules use Intl categories, including Polish/Russian few/many.
- Guided: 144 target/base editions, 664,032 fields across the matrix. Only the selected pair loads. Runtime validates the entire edition before applying missing locale fields; authored values and target phrases remain unchanged. Failed/stale packs show recovery instead of a partial mixed-language lesson.
- ScriptLab: nine explanation packs, 276 stable tuples each. Characters, example words, romanization and recordings remain unchanged.
- Generation captures the base language at submission. Saved words retain the language of their actual meaning. Unknown legacy provenance stays unknown; mixed-base decks do not advertise a false shared base or reverse direction.
- API base-language validation is an API-local mirror of the frontend registry. Do not import frontend ESM into Vercel API CommonJS.

## Brand decisions

The owner explicitly delegated mockup selection. Chosen: B Ribbon current, with quieter A spacing; C remains an alternative. All mockups, source images, export script and rationale are outside git in `D:/CODING/ResonanceTEST/design/today-guided/round-02/`.

Six true-alpha WebPs total 59,052 bytes: success ribbon, retry ribbon, word rim, current crest, current bead and listen ribbon. Decorative images have empty alt text and dimensions; button labels and feedback remain real text. Correct, wrong and revealed outcomes stay distinct, retry feedback persists, and progression remains explicit. Reduced motion disables decorative movement; no image is required to complete practice. All existing waves and the unrelated WordTide diff are preserved.

## Translation generation and limits

The initial DeepSeek batch was stopped and quarantined after semantic sampling found wrong-language copies. It was never deployed. The reviewed V3 corpus uses Gemini 2.5 Flash Lite for eleven locales and Gemini 3.1 Flash Lite Preview for Bisaya after a comparative sample exposed weaker Bisaya output from 2.5.

Generation runs offline. Prompts separate destination language, source text and read-only learned context. Versioned cache metadata prevents accidental reuse after prompt/field/span changes. Quoted learned examples and native-script terms are protected by deterministic placeholders; exact unordered placeholder counts permit natural translated word order without changing examples. Invalid cached results are preserved separately and rejected. Publication is explicit and all-or-nothing across 144 editions; no provider request occurs during publication or lesson use.

Final V3 provider ledgers total $7.8542. Earlier rejected generation, benchmarks and UI/ScriptLab translation bring offline text work to roughly $9; this is a tooling estimate, not an invoice reconciliation. The independent semantic sample reviewed 180 records across all twelve languages and applied 13 repairs. Later release review also caught an invented extra sentence in one Italian core meaning; it is corrected with database convergence before release. These checks do not certify native editorial quality. Owner postponed lesson/content review.

## Database safety

No production reset. The missing `20260517010000_guided_tts_v1.sql` baseline was restored only after an exact production schema comparison; production received a migration-history repair, not a baseline replay. Additive `20260907130000` installs a private catalog of 2,700 canonical phrase coordinates and validates phrase/base/audio identity before a Keep. Missing audio is allowed only for a valid canonical phrase; arbitrary unregistered coordinates are rejected.

`20260907131000` registers 32,400 base meanings. The initially applied version passed exact digest and rollback integration: registered recording, valid no-audio phrase, retry idempotence, base-switch preservation and no generation/credit effects. Public playback retains 12,551 usage rows; private catalog is unreadable by anon/authenticated roles. Test-deck residue is zero. A small follow-up correction converges the Italian meaning without rewriting existing user words; final identifiers/digests are recorded in the release entry.

Final database convergence:132000 corrects the Italian meaning. The corrected 32,400-value digest is `cd222fe3279333f9f520c5806cb111176ad76796a1e55594b52dee0d99535157`. The originally applied131000 SHA was `d940a7e1f95c8dee6489de283699c04f45cf548d1265676d38c562f3ffa1821c`; the committed fresh-replay version is `b4455bed1ad320e18a54eed1c63180db8b24a9c0b990d4f7f5283084072a9a5b`.132000 converges the older applied seed and is a no-op after the corrected fresh seed.

The Japanese Keep integration exposed a real code mismatch:2,300 TTS links store a primary language code while the catalog stores BCP-47.133000 now accepts the exact catalog code or its exact primary subtag, including a null-rejection guard; it still rejects different regional codes, wrong phrases and unknown coordinates. The full audit found one genuinely different English wistful source phrase. Its complete usage row is archived in private `guided_tts_asset_usage_quarantine` before unlinking, with exact old-source/catalog guards. The recording asset remains; this canonical phrase now saves without incorrect audio. All2,501 remaining registered links pass identity. All four130/131/132/133 rollback suites pass. Final playback count12,550, catalog/private-quarantine grants denied to browser roles, test-deck residue0. Final readback: investigations/hardening-2026-09-07/12-guided-final-post-apply.json.

A fresh database replay creates a disposable empty test database. It does not empty the live app. Focused PostgreSQL 18 baseline/catalog replay passed. Full historical Supabase replay has a runner but requires Docker, unavailable here; do not claim the entire historical migration chain passed.

## Verification

- Full guided chain; frontend/API TypeScript; production build; changed-file ESLint; 12×1,727 i18n coverage and placeholder checks.
- Guided runtime/field identity, 67 translation quality checks, all 664,032 edition fields, canonical catalog and locale SQL contracts.
- Base-language contract 21, generation lane 153, ScriptLab 3,997 plus nine 276-tuple packs, First Light 32, iOS shell contract.
- Real-component browser fixtures: 27/27, 153 checks across all twelve bases, 320/390/1440 layouts, retry/reveal/completion/Keep, failed media, missing images and reduced motion. After final border/copy polish: 4/4, 23 checks. Physical iPhone/TestFlight remains owner-deferred.
- Evidence: `D:/CODING/ResonanceTEST/investigations/base-language-brand-evidence/`, `base-language-*.log`, `base-language-generation-v3/publication-provenance.json`, and `BASE_LANGUAGES_BRAND_2026_09_07.md`.

## Later

Keep the existing café video. New Seedance/Kie.ai work is paused; an RTX 5090 overnight cultural-clip pilot is an idea, not a scheduled job. Native-script keyboard/IME onboarding, composition handling, normalization and accepted-answer design are separate work; arbitrary Latin transcription must not silently pass as native writing. Native editorial review and actual iPhone use remain explicit follow-ups. See `protocol/workstreams/base-languages-brand/LATER.md`.
