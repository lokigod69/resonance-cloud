# Japanese and Russian B2 independent text review — 6 November 2026

Reviewer: fresh Codex reviewer for these October drafts, independent of their authors, their Fable arbiter and their original gate implementation. Scope is source text and learner exercises in the two unpublished paths per language. No human-native, runtime, delivery or listening certification. Current verdicts and final source bindings are in `readiness.json`.

## Japanese, October final sources

Replayed 85 original and 25 later Fable content edits from the raw completed response streams with exact old-value checks. Both byte-for-byte final paths equal the unpublished app copies. Individual lessons have no separate source files; `offline-evidence.json` records all 20 stable digests using sorted-key compact UTF-8 JSON, alongside the raw-file SHA-256s. Both ten-lesson positive tests pass, with zero warnings and all source approval flags pending.

| Verified lesson | Reading notes against the actual turns and exercise choices |
|---|---|
| P1L1 apartments | Rent and travel-time comparisons express different criteria; the old order that moved 比べれば to the commuting clause is no longer generable. The condition for taking the suburban flat is a transfer within one year. |
| P1L2 commuting | Three in-office days after two days at home, two 300-yen journeys per working day, approximately ¥7,800/month. About ¥8,000 is consistent. |
| P1L3 hybrid work | Individual preference for one day in office, temporary onboarding exception, and a proposed team-wide two-day default answer distinct questions. 一方 is contrastive rather than directional. |
| P1L4 projector | 17 × ¥3,000 = ¥51,000 versus ¥50,000 purchase; twelve rentals/yr = ¥36,000. つまり and そのため were removed from the original inference slot. German Leihe as a standalone gloss underrepresents paid equipment rental. |
| P1L5 holiday | One driver motivates covering less of Hokkaido. The held choice そのため yields a natural causal link alongside それなら. The free-days tour option presupposes choosing a package before booking. |
| P1L6 payments | A 3% merchant fee is introduced after the initial recommendation; trial/retained cash register address two different concerns. No available double-negative pair recreates the former alternative. |
| P1L7 app/class | The correction/practice limitation belongs to this particular app. The options relate to the six-month trip rather than implying a general fact about apps. |
| P1L8 jobs | Family time, promotion, then a written monthly twenty-hour limit change the decision. The final recommendation distinguishes written from oral promises. |
| P1L9 Osaka | The already-discussed job is in Osaka. 近所の仕事 is inconsistent with the move and the expense of leaving the neighbourhood. |
| P1L10 supplies | Annual inspection directly follows concern about expiry; the listed そのため can correctly introduce this consequence. The one-option budget is respected. |
| P2L1 invoice | The surcharge provision and failure to disclose its amount are distinct; no unconditional authority to charge is claimed. |
| P2L2 rubbish | Designated bags and park box are local rules. Replacing 使う with 捨てる no longer yields a second sensible bag-use rule. |
| P2L3 late report | The reported estimate moved from three to ten days, with same-day escalation of the latter. 時点から can license an ongoing account, competing with 時点では. |
| P2L4 loyalty | 25 ordinary points/week × 52 = 1,300, tripled = 3,900. Only seven complete groups of 500 are currently spendable. The new canonical build fits the native bound. 使ったとしても also admits the stated hypothetical calculation. |
| P2L5 mobile plan | The prior discount expired. Neither the opener nor any later turn specifies the extra charge. 月に千円 versus canonical 月に二千円 yields two valid builds. |
| P2L6 notice | The objection route is attributed to this notice. 写真が書いてある does not name a normal listed item alongside the objection office; the former 住所が problem is gone. |
| P2L7 café | The doubled estimate arose once piping work was discovered; source then motivates specialist inspection before contracting. |
| P2L8 bookings | 24 hours is the normal timescale for email; three days is the validity window of the provisional booking. Telephone booking has its own callback path. |
| P2L9 bike scheme | 半分以上/以下 include the boundary. Below 40% ends the experiment; at 40% or above it extends. Both base texts now keep these thresholds. |
| P2L10 park | Weekend midnight-to-five closing applies only to the eastern square; the north–south route stays open. The exchanges give a consistent account of a requested restriction. |

**Mechanical test findings.** The unchanged native suite reaches 94/96. Its line 194 assigns 郊外の as if it were still an entire chip, causing DISTRACTOR_NATIVE_SHAPE instead of BUILD_DISTINCT. Line 195 splices an outdated P1L1 range so that the build no longer reconstructs the turn. `japanese-fixtures.patch` duplicates the actual first chip, then separately merges P1L10’s adjacent 災害時にすぐ and 使える with their readings. Their nine letters leave five legal chip slots and exact whole-turn reconstruction. The scratch copy of all 96 tests reaches the intended codes. No gate or app source changed for that proof.

## Russian, October reviewed sources

Replayed 70 Fable edits on both original drafts and matched both unpublished app copies by raw SHA-256. The app’s existing test suite fails on B1_SPEC_HASH before executing any named test. The present B1 specification and archived B1 source have identical 100 ordered trophy reservations but different raw bytes and non-ledger fields. The original pinned file is `tmp/V4_EXPANSION_20261003/B1_NATIVE_RUSSIAN_SPEC.json`, SHA-256 ff031e74d764c15e23ef54d6fe9094a23a3ad0a19c13aaf2980fdffb9146ea6f. Preserve both B1 authorities; point a B2-only test fixture at the original bytes.

| Severity | Location in the October candidate | Observation |
|---|---|---|
| HIGH | P2L5 /lessons/4/build | Its focus is 16 tokens. Chunk 0, на решение больше всего влияет, is five tokens. Limits are 7–12 per focus and 1–4 per chip. |
| HIGH | P2L10 /lessons/9/build | в сентябре трубы в подвале and в октябре трубы в подвале are five tokens each. The initial November repair separated the date and subject into reorderable chips, admitting трубы в подвале в сентябре протекли with exactly the same meaning. |
| HIGH | P2L8 /lessons/7/cloze/moveBlankIndex | The original index 0 points to an inflected-form blank Уточню; existing types require a connector or frame. Index 1 targets the actual reformulation connector то есть in this very turn. |
| HIGH | P1L1/P1L8 cloze, P2L5 cloze | Вы совсем правы can concede before presenting the author's counterpoint. Это так, хотя в тариф входит роутер… also answers the tariff objection. Both were offered as wrong answers. |
| HIGH | Russian gate, accepted(), protected-carrier edges and gender acknowledgements | Three isolated P1 probes succeed incorrectly: add недостаток (“disadvantage”) as an accepted alternative for преимущество (“advantage”); split С одной стороны between fixed prefix and focus; add Я приехал. in the learner turn and invent third-person subject сосед in its warning acknowledgement. See `russian-round-1-probe.jsonl` and exact probe source beside it. |
| HIGH | Russian gate, P2L6 learner turn 1 | Real gate rejects the genitive noun недели (within a week) with a past/gender warning. сначала, подвал and подвала also have suffixes that resemble verbal morphology in isolation. Assigning false gender acknowledgements to these nouns/adverbs would corrupt lesson evidence. |

P1 and P2 both use вы throughout; the loan/commuting trade-off, hybrid proposal, payment-system costs and written deposit conditions are coherent. P1L10’s раз и навсегда is the speaker’s rhetorical argument for a barrier, which the later conditional discussion qualifies. P2L9 now explicitly names rental of two parking spaces, repairing the earlier unsupported link between land area and price. P2L6’s фото, из которого видно is grammatical for drawing a conclusion from the picture; it need not be changed to a purely locative phrase. Warnings for real past-tense forms require concrete referents, including план in P2L7 and запуск in P2L10. Numerical, gender, answer equivalence, pragmatics and word order require semantic judgement even when native structural gates pass.

The de/en annotations, local-rule wording and accepted-answer tables belong to unpublished text candidates. A learner's ability to see the right cue, arrange alternate chip orders or use Japanese kana/Russian ё-equivalents in a delivered client remains a separate verification task.
