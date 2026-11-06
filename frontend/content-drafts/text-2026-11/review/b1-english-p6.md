# Independent English reread, 2026-11-06

The reviewer did not write these English lessons. I read all ten episodes in each file and checked the full target replies, every offered cloze and recall alternative, the timing of pattern examples and the trophy senses against the German explanations. I also checked answer positions and literal cue giveaways against the component that displays the options. These decisions apply to the exact bytes listed.

| Candidate | SHA-256 | Decision |
|---|---|---|
| ../en-p6-arbitration/english-p6.json | 9cbb5c188ebe747b76fad26c2346acef8784a469cb6d3420fc05dd64036fa642 | PASS |
| ../en-p7-arbitration/schema-mapped.json | 2fcced2e8a2101fa22c0e705bf106788542d83c2272e639e4bc25ff1a1aa3732 | HOLD |
| ../en-p10-review/english-p10.json | 97c37bbe81f5b276e4c30e2812959bee1b5938ca3983d3175ba7a03dee973317 | HOLD |

**P6.** L1–10 have independent transfer examples and no literal answer in any form cue. L1's opening now invites the learner's question. L2's follow-up asks about oversized boxes. The L4 German prompt preserves the scope of deciding on a date. L5–7 offer “was” in the former “to be” slot, removing the three equally grammatical alternatives. L8 now uses “bulletin board” and explains singular past passive correctly. L3, L9 and L10 have coherent complications and one credible completion per offered bank. No remaining material finding.

**P7.** L1–10 each now grade both a connector and a form. The pattern examples no longer give away the complete delayed reply. All form cues avoid printing the answer. L3 accepts five o'clock, L4 uses US “cardstock”, and L6 asks for the entrance. One new HIGH finding remains. Every one of the ten connector banks puts the accepted word in slot one. Form answers sit in slot four in lessons 1–7, slot one in lesson 8 and slot two in lessons 9–10. The chip screen renders the options directly using segment.blank.choices.map, so choosing the first connector works throughout without reading. Rotate the banks while keeping all words and canonical answers fixed. A minor wording refinement would be “If you tell me which entrance to use” in L6, though the present “tell me the entrance” is understandable.

**P10.** L1–9 build coherent episodes around distinct memories, and all ten pattern examples retain the delayed reveal. In L10 the recall bank offers “belong” and “belonged”. Both “I started to feel like I belong here when the team saved me a seat” and “… I belonged here …” are idiomatic. English backshift remains possible when the speaker still feels at home. HIGH, change the distractor or select a different unambiguous content blank. MEDIUM, three displayed form cues literally print the answer: L3 “make”, L5 “choose”, L10 “save”. The rest of each cue already supplies a form hint. Remove the literal accepted word in these three cases. The remaining cloze banks have a defensible target reading.

These are draft-language decisions only. No English source, app code, provider or database was changed by this review.

P7 chip-order follow-up — PASS for ../en-p7-arbitration/final-en-p7.json, SHA-256 9ccf98a6bffdc3c56fcee1fe60fbdd2c9f6344ad68372bee83a9e99c1de2a432. A deep comparison showed that only 13 permutations changed. After normalizing those arrays to the original order, the complete JSON structures matched exactly. The ten connector positions are now 2,1,3,3,2,1,1,4,3,3 and the form positions vary as well.

P10 follow-up — PASS for ../en-p10-arbitration/schema-mapped.json, SHA-256 2d7a5a8efb08baaaccbbcee11107a0cf02d9646a4172e7f2e8eac92ee08ce3b6. The arbitrated file before the register-label mapping was cd12822bf07e4b8fba1c3c86668ccb498dc7abc05a5c5fdfc8b90497defd717c. A complete comparison isolated the new “belongings” distractor replacing “belonged” and the three German cues for make, choose and save. No P10 form cue now contains the accepted surface as a standalone word. The schema-mapped file subsequently changed only the ten casual labels to the existing informal enum. All learner text matched.
