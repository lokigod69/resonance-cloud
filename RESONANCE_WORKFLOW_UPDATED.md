# Resonance Workspace — Workflow & Next Steps (Updated)

**Companion to:** MASTER_ABSTRACT_v1.md  
**Updated:** March 4, 2026  
**Purpose:** Current status and next steps. Replaces the original WORKFLOW.md.

---

## Current Status

| Item | Status | Notes |
|---|---|---|
| Master Abstract | ✅ Done (v1.0) | Architecture defined, validated by 4 AIs |
| Concept Engine Abstract | ✅ Done | ENGINE_CONCEPT.md |
| Song Engine Abstract | ✅ Done (v1.1) | ENGINE_SONG.md updated with inline language tag findings |
| Image Engine Abstract | ✅ Done | ENGINE_IMAGE.md |
| Video Engine Abstract | ✅ Done | ENGINE_VIDEO.md |
| Assembly Engine Abstract | ✅ Done | ENGINE_ASSEMBLY.md |
| Orchestrator Abstract | ✅ Done (v1.0) | ENGINE_ORCHESTRATOR.md — March 4, 2026 |
| Concept Engine | ✅ Built + Tested | Port 8080, DeepSeek v3 via OpenRouter |
| Song Engine | ✅ Built + Tested | Port 8000, Ace-Step 1.5 (Gradio at 7860) |
| Image Engine | ✅ Built + Tested | Port 8082, DeepSeek storyboard → Gemini rendering |
| Video Engine | ✅ Built | Port 8086, Ken Burns local + LTX/Kling via Fal.ai |
| Assembly Engine | ✅ Built | Port 8085, FFMPEG wrapper |
| Engine `/run` endpoints | ✅ All 5 added | Orchestrator-compatible endpoints with output_dir control |
| Orchestrator | ❌ Not started | **NEXT — ready to build** |

### Phases Completed

- **Phase 1** ✅ — Ace-Step validation, all engine abstracts written
- **Phase 2** ✅ — All five engines built, core engines tested
- **Phase 4** ✅ — Visual pipeline engines built (Image, Video, Assembly)

### Current Phase

- **Phase 3 + 5 (combined)** — Build orchestrator with UI. The original plan 
  separated workspace scaffolding (Phase 3) from UI (Phase 5). Since all 
  engines are now ready, we're building both together.

---

## Key Findings from Engine Testing

These findings inform orchestrator defaults and pipeline behavior:

1. **Inline language tags are mandatory** for Song Engine. The engine 
   injects them automatically — orchestrator sends raw lyrics.

2. **Vocal-forward captions** produce best pronunciation. Lead with 
   voice description, then genre. (Inform Concept Engine prompt design.)

3. **Sparse lyrics**: 3-5 lines for 30s clips, 2-3 for 15s. Density 
   degrades Ace-Step pronunciation.

4. **BPM hints** help genre-specific music (e.g., 120 BPM for techno).

5. **Single frame (image_count=1) with ping-pong loop** is the strong 
   default for video. Simpler and more reliable than multi-frame.

6. **DeepSeek v3** works well for storyboards and concept generation 
   but needs tight prompt constraints.

7. **Gemini** renders Latin text near-perfectly, Hangul reliably. 
   Occasional misspelling on 11+ character words (~1-2% rate).

8. **Ken Burns** (local FFMPEG) is free and reliable for MVP. Cloud 
   modes (LTX, Kling) available for higher quality.

---

## What To Do Next

### BUILD: Orchestrator (Phase 3+5)

**Agent setup:**
- Working directory: `D:/CODING/ResonanceWorkspace/orchestrator/`
- Own `.venv` via `uv`
- Port: 8090

**Provide to agent:**
1. RESONANCE_MASTER_ABSTRACT_v1.md
2. ENGINE_ORCHESTRATOR.md (the new spec)
3. All five ENGINE_*.md abstracts (for payload reference)

**Expected output:** Working orchestrator with:
- CSV import
- Workspace creation
- Pipeline execution for all 5 stages
- Web UI with word list, pipeline view, settings panels
- Audio player for song take selection
- Manifest and lineage tracking

### THEN: End-to-End Test

1. Import the German Humor & Wordplay CSV (5 words)
2. Run full pipeline for "Klobrille"
3. Verify: concept → song (listen, select take) → image → video → assembly → final MP4
4. Check manifest.json is correct
5. Test batch run on remaining 4 words

### THEN: Enrichment Integration

Once the pipeline works end-to-end:
1. Update Concept Engine: inject mnemonic/etymology into LLM prompts
2. Update Image Engine: inject mnemonic/etymology into storyboard prompts
3. Test: do enriched prompts produce better content than bare word+translation?

### FUTURE: Production Testing (Phase 6)

- Batch test: 20+ words in Autopilot
- Quality review across all 5 target languages
- Iterate on prompts and settings based on output quality

---

## Documentation Checklist

```
docs/
├── MASTER_ABSTRACT.md          ✅ Done (v1.0)
├── WORKFLOW.md                 ✅ Updated (this document, March 4, 2026)
├── PROJECT_OPS.md              ✅ Done (needs minor update for orchestrator folder)
├── ENGINE_CONCEPT.md           ✅ Done
├── ENGINE_SONG.md              ✅ Done (v1.1)
├── ENGINE_IMAGE.md             ✅ Done
├── ENGINE_VIDEO.md             ✅ Done
├── ENGINE_ASSEMBLY.md          ✅ Done
├── ENGINE_ORCHESTRATOR.md      ✅ Done (v1.0, March 4, 2026)
├── CHANGELOG.md                ⬜ Start when orchestrator build begins
└── TESTING_NOTES.md            ⬜ Optional — formalize testing findings
```
