# Speak and Lens
Verified from source: 2026-09-07. Full audit: D:/CODING/ResonanceTEST/investigations/SPEAK_LENS_REFINEMENT_2026_09_07.md.

**Later September 7 update:** [[hardening-2026-09-07]] supersedes earlier open items for stable Lens identity/per-row receipts, Live reservation billing, whole-request deadlines and client-authored personality fields. Those are implemented in c0192206 with applied migrations. Physical device/live-provider quality and a trusted server-enforced Live cost ceiling remain open.

## Providers
- Default Live Speak: xAI `grok-voice-think-fast-1.0`; manual tap-to-send over WebSocket, PCM 24 kHz. Existing iOS acknowledgement/audio protocol remains authoritative.
- Other Speak voices: Groq `whisper-large-v3` transcription → Groq `llama-3.3-70b-versatile` reply → Mistral `voxtral-mini-tts-2603` or Google `gemini-3.1-flash-tts-preview` audio. Mistral/Gemini are TTS engines, not the reply model.
- Corrections: Groq Llama 3.3, newest 40 transcript entries, 4,000 characters per entry.
- Lens: Google `gemini-2.5-flash-lite`, one structured image call. OpenRouter fallback is an unused stub.

## Prompt rules
- Shared level mix must survive greetings and scenarios: Zero 70% base/30% target; Beginner half and half; Intermediate 80% target; Advanced 95–100% target. Same-language practice uses only that language.
- The async tutor receives a transcript; Grok hears audio. Avoid contradictory claims about what either can hear or do.
- Meaning glosses use a natural connector in the base language. No fixed German/English examples in shared prompts. Never ask Grok to call an unavailable search tool.
- Persona identity belongs once in the system prompt. TTS performance instructions are a separate layer. Do not flatten away provider-specific voice controls.
- Lens assigns explicit target/base roles, limits items and alternatives, and retains ambiguity, language grammar, photographed-text reading and sensitive-image handling.

## Reliability and UI
- Async provider budget: remainder of 40 seconds from handler entry; client 55 seconds through JSON body consumption. Supabase gates/refunds are not all under a hard whole-request deadline.
- Optional usage transport: 1.5 seconds; a complete core-action analytics operation: 3 seconds. Opt-out lookup failure suppresses emission. Keep the vendor CommonJS boundary marker.
- Keep the full conversation text, but only the latest four assistant replay-audio payloads. Grok audio transcript is authoritative with text-event fallback.
- Reconnect carries bounded recent context, but token minting still spends a new 10-minute block. A later socket failure does not yet refund it; disclose this before reconnect.
- Mistral characters are offered only for its actual supported languages. Preserve the eight-language beta selection.
- Lens waits for canonical target/base languages; cancels obsolete scans; stops camera tracks on capture, recap, background and exit; callback video attachment handles immediate camera promises.
- An alternative word must clear grammar/IPA/example from the original guess and replace its unsaved recap entry. Do not infer individual save outcomes from aggregate counts.
- Speak history/extraction and Lens recap are named, themed body portals with focus containment, Escape, background inert handling and restoration. Real theme/layout/assets are required in visual fixtures.

## Deliberate follow-ups
Physical iPhone and live-provider quality/latency are separate gates. Lens deck identity still depends on a mutable name; exact mixed recap receipts need row identities from the RPC. Both require a reviewed save-contract/migration change. Billing reservations/refunds, older hardening configuration, and Today/guided paths were not redesigned in this pass.
