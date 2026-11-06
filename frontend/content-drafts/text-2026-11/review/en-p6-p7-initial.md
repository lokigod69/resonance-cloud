# Independent English B1 P6 and P7 text review, 2026-11-06

Reviewed every field in the two candidate JSON files. The reviewer authored neither English path. The file identities below are the original bytes. Findings refer to the lesson starting at the specified line. Each path has ten complete four-turn episodes. Both preserve the ten October trophy allocations and the later architect's grammar staging. This review made no edits to the English files.

| File | SHA-256 | Verdict |
|---|---|---|
| ../english/english-p6.json | 0e186a1286b42642a14fa4cef5692125ab33705b7836242a628637d431e15c6b | REWORK |
| ../english/english-p7.json | 58e305c37a0e78bcb4b57321dafc834692ff0621453d44a462651c29bac13f15 | REWORK |

## Findings affecting multiple lessons

- HIGH, both paths. In all 20 lessons, pattern.examples[1] gives dialogue[3] verbatim, including the information needed after the delayed turn. The real pattern card displays all examples at step 3 and can be reopened while answering step 5. For example, P6 L1 already reveals locker codes and P7 L1 reveals the need for personal cups. Keep the first reply as the episode example, write a distinct transfer example, and remove delayed details from the rule. The B1 design specifies the reveal order in FABLE_B1_LEARNING_PATH_DESIGN.md lines 165–167. Match-pair vocabulary may legitimately prepare words. Focus on removing completed answers and avoiding identification of the specific later twist.
- HIGH, P6 L5–7, cloze lines 832, 1021, 1216. Every first slot offers “to be”. Paired with the accepted second-slot participle, it creates a coherent question about the proposed procedure. All three alternatives are quoted below. Replace “to be” in each bank with a form that fails after the already-printed “Is the …”, such as “was”. The current “be after is” cue does not rule the alternate out.
- HIGH, P7 L1–10. The authoritative October architecture assigns connector and form blanks. All 20 blanks are forms. The cues display the accepted word verbatim in 18 of the 20 slots. The two exceptions are “runs” and “needs”. The interface prints each cue under its blank (ComplicationStep.tsx lines 303–304). Restore meaningful connector decisions across P7 and use short German form cues that describe the grammatical operation. Test combinations against the conversational context. For example, distinguish a precaution taken now from a result that happens only if the condition comes true before offering “in case” alongside competing connectors.

## P6 lesson-by-lesson

| Lesson, source line | Additional findings |
|---|---|
| 1, 18 | LOW. A yes/no question about a first delivery receives only a counterquestion. An opening such as “What would you like to know about deliveries here?” sets up the reply without giving away the locker arrangement. The code-delivery cloze itself has one credible answer. |
| 2, 207 | MEDIUM. Turn 3 says the boxes are too big for the bin. The reply asks what to do when the bin is full, which is a different problem. Ask where oversized boxes are left. Keep the passive cloze and update the dependent fields. |
| 3, 396 | No additional issue. The Monday replacement date explains the question about temporary passes. Issued/replaced carry the correct service-counter senses. |
| 4, 585 | LOW. The German translation of the first reply places “bevor ich mich … festlege” after “genehmigt”, suggesting the approval itself comes before choosing a date. Put the speaker's decision first in German as in English. The form slots have one credible completion. |
| 5, 774 | HIGH alternate: “Is the address to be checked against my original order?” makes sense when the clerk says someone is checking the order. The address-label problem is a good reason to ask. |
| 6, 963 | HIGH alternate: “Is the whole table to be photographed for the report?” naturally asks about the scope of the requested documentation. |
| 7, 1158 | HIGH alternate: “Is the line to be tested while you work up here?” naturally asks about the schedule. |
| 8, 1353 | MEDIUM. “Notice board” is comprehensible, but “bulletin board” is the everyday US choice. The rule also claims the follow-up begins with “Was” because it concerns the same cancellation. The correct choice follows from a singular subject and a completed past posting. Update both. |
| 9, 1542 | No additional issue. The Tuesday/Monday discrepancy supports the timing question. Confirmed/moved are distinct and accurately glossed. |
| 10, 1737 | No additional issue. The specific delivery and contrasting usual practice motivate the two passive tenses. The conjecture about the office is a question staff can answer. |

## P7 lesson-by-lesson

| Lesson, source line | Additional findings |
|---|---|
| 1, 18 | MEDIUM. “Ask people to bring” is a verb complement. The rule does distinguish it, but the example pair gives no clear action followed by its purpose. A transfer example such as “We can meet outside to welcome the new neighbors” demonstrates the intended relation. Cues give “ask” and “bring”. |
| 2, 207 | No additional issue. A centrally available paper list answers the broken-phone constraint. Cues give “leave” and “add”. |
| 3, 396 | MEDIUM. The learner originally proposes meeting at four and then delegates vegetable preparation, but never accepts meeting at five. Work the revised time into the response while retaining the division of work. Cues give “chop” and “set”. |
| 4, 585 | LOW. “One sheet of card” is less idiomatic for the US variety than “one sheet of cardstock”. Update spoken turn and term. Cues give “cut” and “write”. |
| 5, 774 | No additional issue. Keeping cleaner under controlled access genuinely modifies the initial open-access plan. Cues give “lock” and “hand”. |
| 6, 963 | MEDIUM. The volunteers already ask which entrance to use. Providing only “the address” cannot distinguish entrances at one address. Ask for the entrance name/directions in the first reply and corresponding practice fields. Cues give “text” and “send”. |
| 7, 1152 | No additional issue. Emailing the figures in advance addresses the need to start with those figures. The exception and precaution are distinct. Cue gives “email”. |
| 8, 1341 | No additional issue. The poorly visible sign motivates a person meeting guests. Cues give “stand” and “meet”. |
| 9, 1530 | No additional issue. Switching from a closed ticket booth to receiving guests indoors is a specific modification. Cues give “greet” and “set”. |
| 10, 1719 | No additional issue. Checking the bus schedule before knowing whether a driver is available is a natural precaution. Cue gives “check”. |

I checked the target-language cloze alternatives in their complete sentences, the first-reply recall alternatives, the changes of plan, the return to each assigned grammar family and the trophy senses. The three P6 “to be” alternatives are the clear competing answers. P7's current principal problems are early answer disclosure and lack of connector practice. Each path needs arbitration and a fresh check of the resulting file hash.
