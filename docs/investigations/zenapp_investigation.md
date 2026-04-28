# ZenApp Investigation Report
## Category Word Suggestion System & Flashcard Modal Design

---

## A. Category Word Suggestion System

### A1. Complete Category List

**29 categories** organized into **7 groups**. All hardcoded in [categories.ts](file:///d:/CODING/ZENAPP/src/lib/categories.ts).

| # | Group | ID | Label | Icon | Description |
|---|-------|-----|-------|------|-------------|
| 1 | 🎯 Essentials | `greetings` | Greetings & Introductions | 👋 | First impressions matter |
| 2 | 🎯 Essentials | `food` | Food & Dining | 🍜 | Order like a local |
| 3 | 🎯 Essentials | `travel` | Travel & Directions | ✈️ | Navigate confidently |
| 4 | 🎯 Essentials | `family` | Family & Relationships | 👨‍👩‍👧 | Talk about people |
| 5 | 🎯 Essentials | `numbers` | Numbers & Time | 🔢 | Count, pay, schedule |
| 6 | 📚 Language Building | `verbs` | Verbs (Actions) | 🏃 | Do stuff |
| 7 | 📚 Language Building | `adjectives` | Adjectives (Descriptions) | 🎨 | Describe the world |
| 8 | 📚 Language Building | `nouns` | Nouns (Things) | 📦 | Name everything |
| 9 | 📚 Language Building | `idioms` | Idioms & Expressions | 💬 | Sound native |
| 10 | 🌶️ Real Talk | `slang` | Slang & Street Language | 🔥 | How people actually talk |
| 11 | 🌶️ Real Talk | `romantic` | Romantic & Flirting | 💕 | Make connections |
| 12 | 🌶️ Real Talk | `nightlife` | Drinking & Nightlife | 🍻 | Party vocab |
| 13 | 🌶️ Real Talk | `texting` | Texting & Internet | 📱 | Chat online |
| 14 | 🌶️ Real Talk | `insults` | Playful Insults | 😜 | Banter with friends |
| 15 | 🌶️ Real Talk | `taboo` | Taboo & Swearing | 🤬 | Uncensored vocabulary |
| 16 | 🎭 Cultural | `proverbs` | Proverbs & Wisdom | 🦉 | Ancient knowledge |
| 17 | 🎭 Cultural | `untranslatable` | Untranslatable Words | 🌸 | Words with no English equivalent |
| 18 | 🎭 Cultural | `philosophical` | Philosophical Concepts | 🧘 | Deep ideas |
| 19 | 🎭 Cultural | `poetic` | Poetic & Literary | 📜 | Beautiful language |
| 20 | 🎭 Cultural | `humor` | Humor & Wordplay | 😂 | Jokes and puns |
| 21 | 🎪 Fun & Unique | `tonguetwister` | Tongue Twisters | 👅 | Pronunciation challenge |
| 22 | 🎪 Fun & Unique | `onomatopoeia` | Onomatopoeia (Sound Words) | 💥 | Boom, splash, meow |
| 23 | 🎪 Fun & Unique | `quotes` | Famous Quotes | ✨ | Memorable phrases |
| 24 | 🎪 Fun & Unique | `compliments` | Compliments & Flattery | 🌹 | Make people smile |
| 25 | 💼 Practical | `negotiation` | Negotiation & Haggling | 🤝 | Get better deals |
| 26 | 💼 Practical | `emergency` | Emergencies | 🚨 | Critical situations |
| 27 | 💼 Practical | `frustration` | Complaining & Frustration | 😤 | Express annoyance |
| 28 | 💼 Practical | `emotions` | Emotional Nuance | 🎭 | Subtle feelings |
| 29 | 🎲 Surprise Me | `random` | Random Mix | 🎲 | Surprise me with variety! |

Each category exports: `{ id, label, icon, description }`.

---

### A2. Full LLM Prompts

#### System Prompt

Source: [prompts.ts:buildSystemPrompt()](file:///d:/CODING/ZENAPP/src/lib/prompts.ts#L13-L66)

The `nativeLanguage` parameter is interpolated into the prompt (shown as `${nativeLanguage}` below):

```
You are a vocabulary deck generator for a language learning app called ZenApp. Your job is to create high-quality, culturally authentic vocabulary cards.

CRITICAL: You must respond with ONLY valid JSON. No markdown code blocks, no explanation, no additional text - JUST the raw JSON object.

OUTPUT FORMAT (exact structure required):
{
  "deckName": "Suggested deck name (concise and descriptive)",
  "cards": [
    {
      "headword": "The word/phrase in the target language",
      "definition": "Clear, concise meaning in ${nativeLanguage} (1-2 short definitions, NOT a paragraph)",
      "synonyms": "2-4 related words in TARGET language, comma-separated (e.g., if Korean word: 멋지다, 굉장하다, 최고)",
      "pos": "Part of speech: noun, verb, adj, adv, phrase, interjection, etc.",
      "ipa": "Pronunciation guide (IPA notation or romanization)",
      "example": "Natural example sentence in the target language",
      "exampleGloss": "Translation of the example sentence in ${nativeLanguage}",
      "mnemonic": "Creative memory aid, cultural context, or usage tip",
      "etymology": "Word origin or interesting background (if relevant, otherwise empty string)",
      "tags": "Comma-separated tags for categorization (e.g., 'casual,informal,young')"
    }
  ]
}

IMPORTANT FIELD REQUIREMENTS:
- **definition**: Keep SHORT - 1-3 words in ${nativeLanguage}. NOT a full sentence.
- **synonyms**: ALWAYS in the TARGET language (Korean synonyms for Korean words, Japanese for Japanese, etc.). Provide 2-4 related words.
- **exampleGloss**: ALWAYS translate the example sentence so learners understand the context.
- **mnemonic**: Include cultural context, memory tricks, usage warnings for slang/taboo words.

QUALITY GUIDELINES:
1. **Be culturally authentic** - Use phrases native speakers ACTUALLY say, not textbook garbage
2. **For slang/informal language**: Include context about when and how to use it appropriately
3. **For untranslatable words**: Explain the concept thoroughly in the mnemonic field
4. **For idioms**: Include literal translation AND actual meaning in the mnemonic
5. **For proverbs**: Add cultural background and when people use them
6. **For taboo/swearing**: Be honest and accurate, but include usage warnings in mnemonic
7. **Always include pronunciation** - IPA preferred, romanization acceptable
8. **Make mnemonics memorable** - Use humor, imagery, cultural insights, or clever associations
9. **Examples must be natural** - How people really talk, not "The apple is red" nonsense
10. **If category is "Random Mix"**: Include variety from different categories and difficulty levels

CRITICAL RULES:
- MAXIMUM 20 CARDS PER DECK - Never generate more than 20 cards, even if asked. If user requests more, generate exactly 20.
- NO boring textbook phrases
- Prefer vocabulary that makes learners sound fluent and natural
- Include cultural nuance and real-world context
- Be accurate - don't make up words or false etymologies
- Always provide all required fields (use empty string "" if field not applicable)

Remember: This is NOT Duolingo. This is real language learning.

CRITICAL: Your response must be ONLY valid JSON. No markdown, no ```json blocks, no explanation before or after. Just the raw JSON object starting with { and ending with }
```

#### User Prompt — Quick Generate Mode

Source: [prompts.ts:buildUserPrompt()](file:///d:/CODING/ZENAPP/src/lib/prompts.ts#L68-L93)

```
Generate ${cardCount} ${level}-level vocabulary cards for learning ${targetLanguage}.

Category: ${getCategoryDescription(category)}
Difficulty Level: ${level}

Requirements:
- All cards should fit the "${category}" category
- Appropriate for ${level} learners
- Include ${cardCount} unique, high-quality cards
- Follow all quality guidelines from the system prompt

Remember: Make these cards interesting, culturally relevant, and actually useful for real conversations. No boring textbook content!
```

#### User Prompt — Chat Mode

Source: [prompts.ts:buildUserPrompt()](file:///d:/CODING/ZENAPP/src/lib/prompts.ts#L73-L78)

When `customRequest` is provided (Chat mode), the compiled conversation history is sent as:
```
${conversationText}

Based on this conversation, generate ${cardCount} vocabulary cards (maximum 20). Extract the target language, category, and level from the context above.
```

> [!IMPORTANT]
> **No duplicate prevention mechanism exists.** The prompt does not pass in previously known words or existing deck contents. Each generation is independent. There is no "words the user already knows" exclusion.

> [!NOTE]
> **Phrase handling:** The prompt makes no distinction between single words and multi-word phrases. The `pos` field can be set to `"phrase"`, and the system prompt instructs the LLM to handle idioms, proverbs, tongue twisters, etc. naturally. Etymology for phrases is handled by the instruction: *"Word origin or interesting background (if relevant, otherwise empty string)"* — the LLM is expected to return an empty string when etymology doesn't apply.

---

### A3. Output JSON Schema

Source: [openrouter.ts:CardData](file:///d:/CODING/ZENAPP/src/lib/openrouter.ts#L2-L13)

```typescript
interface CardData {
  headword: string;      // REQUIRED - Target language word/phrase
  definition: string;    // REQUIRED - Meaning in native language (1-3 words)
  synonyms?: string;     // 2-4 related words in TARGET language, comma-separated
  pos: string;           // Part of speech: noun, verb, adj, adv, phrase, interjection
  ipa: string;           // IPA pronunciation or romanization
  example: string;       // Natural example sentence in target language
  exampleGloss?: string; // Translation of example sentence
  mnemonic: string;      // Memory aid, cultural context, usage tip
  etymology: string;     // Word origin (empty string if N/A)
  tags: string;          // Comma-separated category tags
}

interface DeckGeneration {
  deckName: string;      // AI-suggested deck name
  cards: CardData[];     // Array of cards (max 20)
}
```

**Example output (inferred from prompt spec):**
```json
{
  "deckName": "Korean Street Slang Essentials",
  "cards": [
    {
      "headword": "대박",
      "definition": "Awesome, jackpot",
      "synonyms": "멋지다, 짱이다, 쩐다",
      "pos": "interjection",
      "ipa": "tɛ.bak",
      "example": "이 영화 진짜 대박이야!",
      "exampleGloss": "This movie is seriously awesome!",
      "mnemonic": "Think: 'Da Bomb' → 대박 (dae-bak). Originally meant 'big profit' in gambling, evolved into youth slang for anything amazing.",
      "etymology": "From 大博 (big gambling win). Entered mainstream through Korean TV dramas in the 2000s.",
      "tags": "slang,casual,youth"
    }
  ]
}
```

#### Database Schema (after ingestion)

Source: [openrouter.ts:prepareCardsForDb()](file:///d:/CODING/ZENAPP/src/lib/openrouter.ts#L210-L240)

| DB Column | Source Field | Notes |
|-----------|-------------|-------|
| `headword` | `headword` | Trimmed |
| `definition` | `definition` | Trimmed |
| `synonyms` | `synonyms` | Trimmed |
| `pos` | `pos` | Trimmed |
| `ipa` | `ipa` | Trimmed |
| `example` | `example` | Trimmed |
| `example_gloss` | `exampleGloss` | **camelCase → snake_case** |
| `mnemonic` | `mnemonic` | Trimmed |
| `etymology` | `etymology` | Trimmed |
| `tags` | `tags` | Trimmed |
| `state` | — | Default `0` (New) |
| `interval` | — | Default `0` |
| `due` | — | Default `now()` |
| `freq` | — | Default `0` |

Additional database columns added after generation (via Gardener edit modal):
- `gloss_de` — German translation (manually edited)
- `image_url` — Legacy single image field
- `image_urls` — Array of generated image URLs
- `selected_image_index` — Which image is active

---

### A4. API Integration

| Setting | Value | Source |
|---------|-------|--------|
| **Provider** | OpenRouter | [openrouter.ts](file:///d:/CODING/ZENAPP/src/lib/openrouter.ts#L33) |
| **Endpoint** | `https://openrouter.ai/api/v1/chat/completions` | L33 |
| **Model** | `moonshotai/kimi-k2-0905` (KIMI K2) | L28 |
| **Max Tokens** | 4000 | L29 |
| **Temperature** | 0.7 | L30 |
| **Response Format** | `{ type: 'json_object' }` (forced JSON) | L59 |
| **API Key** | `OPENROUTER_API_KEY` (server-side env var) | [+server.ts](file:///d:/CODING/ZENAPP/src/routes/api/generate-deck/+server.ts#L5) |
| **Headers** | `HTTP-Referer: https://zenapp.vercel.app`, `X-Title: ZenApp Vocabulary Generator` | L48-49 |

**Robust JSON recovery**: The client includes balanced brace matching, markdown block stripping, trailing comma fixes, and single-to-double quote conversion as fallbacks for malformed LLM responses.

---

### A5. Category Selection UI Flow

Source: [QuickGenerate.svelte](file:///d:/CODING/ZENAPP/src/components/QuickGenerate.svelte)

**Two generation modes:**

#### Quick Generate (Form-based)
- **Category selector**: Standard HTML `<select>` dropdown with `<optgroup>` grouping
- All 29 categories shown in a grouped dropdown, organized by the 7 category groups
- Each option shows: `{icon} {label}` (e.g., "🔥 Slang & Street Language")
- Group headers shown as optgroup labels (e.g., "🌶️ Real Talk")
- **Default selection**: `random` (Random Mix)
- **No description preview** — user only sees the label until they select and generate
- Additional controls: Language dropdown, Difficulty (3 levels), Card count slider (5–20)

#### Chat Mode (Conversational)
- No explicit category selection — extracted from conversation
- User describes what they want in natural language
- Simple client-side heuristic asks 2–3 clarifying questions
- Full conversation history compiled and sent as the user prompt
- Category defaults to `random` if not extracted

---

## B. Flashcard Modal / Word Detail View

### B1. Data Fields Displayed

All four skins display the **same data fields** in their reveal modal. The flashcard modal shows:

| Field | Always Shown | Conditional | Notes |
|-------|-------------|-------------|-------|
| `gloss_de` | — | ✅ if exists | German translation, shown at top |
| `headword` | ✅ | — | Large, interactive (click for TTS) |
| `ipa` | — | ✅ if exists | Shown as `/{ipa}/` |
| `definition` | ✅ | — | Primary meaning |
| Image | — | ✅ if exists | Card-attached image |
| `mnemonic` | — | ✅ if exists | Inside styled box |
| `etymology` | — | ✅ if exists | Italic text |
| `example` | — | ✅ if exists | Quoted, labeled "USAGE" |
| `example_gloss` | — | ✅ if exists | Translation of example |
| **Pass/Fail buttons** | ✅ | — | ✓ and ✗ at bottom |

> [!NOTE]
> `synonyms`, `pos`, and `tags` are **NOT displayed** in any themed modal. They exist in the database and are generated by the LLM but are only visible in the standard (non-themed) card view's "Related Words" section for synonyms. `pos` and `tags` are never rendered in any study UI.

---

### B2. Layout Structure Per Skin

All four themed study views share the same architectural pattern:
- **Full-screen container** with floating words positioned as % coordinates
- **Click a word** → opens a centered modal overlay with backdrop blur
- **Modal structure**: Scrollable content area + fixed action buttons at bottom
- **Max width**: ~460–512px (`max-w-lg` or `max-w-md`)
- **Max height**: 85vh with scrolling

---

#### 🔥 EMBER (`EmberGarden.svelte`) — PRIMARY FOCUS

Source: [EmberGarden.svelte:L576-L668](file:///d:/CODING/ZENAPP/src/components/EmberGarden.svelte#L576-L668)

**Background & Container:**
- Full-screen `#050505` (near-black) with crosshair cursor
- Warmth gradient rising from bottom: `rgba(255,69,0,0.4)` → transparent, height scales logarithmically with progress
- 150 floating ember particles (orange `#ff4500`, golden `#ffd700`)
- Click background → spawn 12 golden embers with scatter + sound

**Floating Words (pre-reveal):**
- Positioned as `%`-based coordinates with collision physics
- Card text: boxed `inline-flex` with `rgba(255,107,53,0.08)` bg, `1px solid rgba(255,107,53,0.2)` border, 8px radius
- 5 hue variations cycling through warm fire palette:
  - Hue 0: `rgba(255,160,100,0.85)` (Warm orange)
  - Hue 1: `rgba(255,190,120,0.85)` (Amber gold)
  - Hue 2: `rgba(255,130,100,0.85)` (Coral red)
  - Hue 3: `rgba(255,200,140,0.85)` (Soft gold)
  - Hue 4: `rgba(255,145,85,0.85)` (Deep flame)
- Font size: `clamp(0.85rem, 3.5vw, 1.2rem)`, `nowrap`
- Mastered words: Golden `#ffd700` with strong glow animation, 115% scale
- Hover: brightness 1.15x
- Fail: Word burns (opacity 0, scale 150%, blur), respawns at new position
- Pass: Turns gold + spawns 15 golden embers

**Modal Layout (top → bottom):**
```
┌──────────────────────────────────┐
│ [✕]                    (close)   │  ← absolute top-right
│                                  │
│   German Gloss (if exists)       │  ← orange-500, serif, lg
│   ▼ HEADWORD ▼                   │  ← 4xl–6xl, orange-100, clickable TTS
│   /ipa/                          │  ← orange-500/50, sm, sans, tracking-widest
│                                  │
│   definition text                │  ← xl–2xl, gray-200, light
│                                  │
│   [Card Image]                   │  ← max 140×140 (md: 160×160), rounded-lg
│                                  │
│ ─── border-t orange-900/30 ────  │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ MNEMONIC                     │ │  ← orange-900/10 bg, orange-900/20 border
│ │ (label: "Mnemonic")          │ │  ← 10px uppercase orange-500
│ │ mnemonic text here           │ │  ← base, gray-300
│ └──────────────────────────────┘ │
│                                  │
│ ETYMOLOGY (label)                │  ← 10px uppercase gray-500
│ etymology text (italic)          │  ← base, gray-400
│                                  │
│ USAGE (label)                    │  ← 10px uppercase orange-500/60
│ "example sentence"               │  ← lg, orange-200/80, italic
│ "example gloss"                  │  ← base, gray-300
│                                  │
│ ─── border-t orange-900/30 ────  │
│                                  │
│   ┌─────────┐   ┌─────────┐     │
│   │    ✗    │   │    ✓    │     │  ← 3xl glyphs
│   │  (fail) │   │ (pass)  │     │
│   └─────────┘   └─────────┘     │
│    orange-600     yellow-600     │
└──────────────────────────────────┘
```

**Ember Color Palette:**
- Background: `#050505` (near-black), `#121212` (modal bg)
- Primary/Text: `orange-100` (#fff7ed), `orange-200` (#fed7aa)
- Accent: `orange-500` (#ff6b35), `orange-900` deep borders
- Gold/Mastered: `#ffd700`
- Fail button: `orange-600/30` border
- Pass button: `yellow-600/30` border
- Gradient: `from-[#121212] to-black`

**Typography:**
- Headword: `font-ember` (likely Cormorant Garamond), 4xl–6xl
- Body: `font-ember`, light weight
- Labels: 10px uppercase, tracking-widest
- IPA: `font-sans` for legibility

**Animations:**
- Word floating drift (0.02px sine wave)
- Ember particles rising continuously
- Mastered word pulse animation (brightness oscillation)
- Burn on fail: opacity→0, scale→150%, blur over 1200ms
- Golden ember burst on pass (15 particles)
- Modal: Svelte `fade` + `scale` transitions

---

#### ❄️ FROST (`FrostGlass.svelte`)

Source: [FrostGlass.svelte:L692-L781](file:///d:/CODING/ZENAPP/src/components/FrostGlass.svelte#L692-L781)

**Background:** Dark navy gradient (`#0f1a28` → `#152535` → `#0a1520`), frosted glass pane overlay, condensation drops, ice crystal corners, distant lights through window

**Floating Words:** Ice-blue text with blur states. Mastered = crystal clear with SVG frost crystals growing at corners. Hover = "breath on glass" mechanic with radial gradient spots.

**Modal:**
- Background: `slate-800/95` with backdrop blur
- Border: `#a8d8ea/30` (ice blue)
- Headword: `text-[#a8d8ea]`, 4xl–5xl, `font-finger` (handwriting)
- IPA: `#a8d8ea/50`
- Definition: `gray-300`, lg–xl, `font-hand`
- Mnemonic label: "Hint" (not "Mnemonic"), `#a8d8ea/70`
- Buttons: ice blue accent (`#a8d8ea/20` bg), pass = `#2a4a6a` navy

**Unique:** 5 hue variations for ice palette, click spawns snowflakes (❄ ❅ ❆ ✻ ✼), crystallization SVG animation on pass

---

#### 🖤 ZEN (`ZenVoid.svelte`)

Source: [ZenVoid.svelte:L732-L830](file:///d:/CODING/ZENAPP/src/components/ZenVoid.svelte#L732-L830)

**Background:** Pure `#000000` (black) with subtle noise texture and breathing ring animation (expanding/contracting circle). Click → water ripple wave displacing nearby words.

**Floating Words:** Ultra-minimal gray text. Active word highlighted. Words dissolve into particles on pass (80 particles float upward).

**Modal:**
- Background: `#080808` with `#222` border
- Headword: Uses `zen-living-gradient` (animated gradient text), 3xl–5xl, font-light
- IPA: `#555`
- Definition: `#777`, lg–2xl, font-light
- Mnemonic label: "Mnemonic", `#666`
- Etymology: `#777`, italic
- Buttons: dark gray with subtle glow, very muted

**Unique:** Particle dissolve effect on pass, wave ripple click interaction, breathing ring, 5 zen hue variations (near-invisible grays)

---

#### 💚 SYNDICATE (`SyndicateGrid.svelte`)

Source: [SyndicateGrid.svelte:L843-L932](file:///d:/CODING/ZENAPP/src/components/SyndicateGrid.svelte#L843-L932)

**Background:** `#050505` with cyan grid lines (`#00fff2`), scanlines overlay, Matrix-style data rain (katakana + 01), pixel particle explosions

**Floating Words:** Bracketed text `[headword]` with RGB split glitch animation, cyan/green/red hue variations, velocity-based physics

**Modal:**
- Background: `#0a0a0a`, border `#00fff2/50`
- Headword: `text-[#00fff2]` (cyan), 3xl–5xl, bracketed `[word]`, `syndicate-pulse` animation
- IPA: `#39ff14/50` (green), tracking-widest
- German gloss: `#ff0040/70` (red), prefixed with `#`
- Definition: `gray-300`
- Mnemonic label: `// MEMORY_HOOK` (code comment style), `#ff0040/70`
- Etymology label: `// ORIGIN`, `#00fff2/50`
- Usage label: `// USAGE`, `#39ff14/50`
- Fail button: `#ff0040` (red), Pass button: `#39ff14` (green)

**Unique:** Pixel explosion on pass (40 char particles), glitch teleport on fail with random directional shake, data rain backdrop, grid glitch burst click effect

---

### B3. Interaction Patterns

All four skins support:

| Action | How | Available When |
|--------|-----|----------------|
| **Play audio (TTS)** | Click the headword in modal | Always (modal open) |
| **Mark as known (Pass)** | ✓ button in modal | Modal open |
| **Mark as unknown (Fail)** | ✗ button in modal | Modal open |
| **Close modal** | ✕ button or click backdrop | Modal open |
| **Toggle image mode** | Toolbar button (top-right) | Study active |
| **Cycle theme** | Theme button (top-right) | Study active |
| **Exit session** | Exit button (top-right) | Study active |

**No editing, deleting, or other actions from the themed flashcard modal.** The Gardener edit modal (for editing headword, definition, mnemonic, etymology, gloss_de, and generating images) is only accessible from the **Inspect view** (card list), not from within the themed study views.

---

### B4. Image Handling

- **Source:** AI-generated via `ImageGenerator.svelte` component (accessed from Gardener edit modal)
- **Storage:** `image_urls` (array) + `selected_image_index` in Supabase; legacy `image_url` for backward compat
- **Signed URLs:** Images fetched via `getSignedImageUrl()` from Supabase storage
- **Display in modal:** `max-w-[140px] max-h-[140px]` (md: 160×160px), `rounded-lg`, centered, `object-cover`
- **Display in floating view:** `w-20 h-20 md:w-24 md:h-24`, replaces text when image mode is on
- **Fallback:** `onerror` handler sets `imageFailed: true`, reverts to text display
- **Not generated by default** — requires manual trigger from Gardener modal

---

## C. Metadata Gap Analysis

### C1. Complete ZenApp Fields Per Word

| # | ZenApp Field | Type | Source | Description |
|---|-------------|------|--------|-------------|
| 1 | `headword` | `string` | LLM | Target language word/phrase |
| 2 | `definition` | `string` | LLM | Short meaning in native language |
| 3 | `synonyms` | `string` | LLM | 2–4 related words in TARGET language |
| 4 | `pos` | `string` | LLM | Part of speech |
| 5 | `ipa` | `string` | LLM | IPA pronunciation / romanization |
| 6 | `example` | `string` | LLM | Example sentence in target language |
| 7 | `example_gloss` | `string` | LLM | Translation of example sentence |
| 8 | `mnemonic` | `string` | LLM | Memory aid, cultural context, usage tip |
| 9 | `etymology` | `string` | LLM | Word origin / background |
| 10 | `tags` | `string` | LLM | Comma-separated category tags |
| 11 | `gloss_de` | `string` | Manual | German translation (user-edited) |
| 12 | `image_url` | `string` | AI Gen | Legacy single image |
| 13 | `image_urls` | `string[]` | AI Gen | Multiple generated images |
| 14 | `selected_image_index` | `number` | User | Which image is active |
| 15 | `state` | `integer` | SRS | 0–5 spaced repetition state |
| 16 | `interval` | `integer` | SRS | Days until next review |
| 17 | `due` | `timestamp` | SRS | Next review date |
| 18 | `freq` | `integer` | System | Frequency counter |

---

### C2. Mapping: ZenApp → Resonance Cloud

> [!NOTE]
> This mapping assumes Resonance Cloud's `words` table and enrichment layer fields. Adjust based on actual Resonance schema.

| ZenApp Field | Resonance Equivalent | Status | Notes |
|-------------|---------------------|--------|-------|
| `headword` | `word` / `input_text` | ✅ EXISTS | Direct equivalent |
| `definition` | `definition` / enrichment `meaning` | ✅ EXISTS | Resonance may store longer definitions |
| `synonyms` | — | ❌ **MISSING** | Zen stores related words in target language |
| `pos` | `part_of_speech` (enrichment layer) | ✅ EXISTS | Concept engine generates this |
| `ipa` | `phonetic` (enrichment layer) | ✅ EXISTS | Concept engine generates pronunciation |
| `example` | `usage_example` (enrichment) | ✅ EXISTS | Concept engine generates usage |
| `example_gloss` | — | ❌ **MISSING** | Translation of example sentence |
| `mnemonic` | `mnemonic` (enrichment) | ✅ EXISTS | Concept engine generates memory aids |
| `etymology` | `etymology` (enrichment) | ✅ EXISTS | Concept engine generates origins |
| `tags` | `category` (concept engine) | ⚠️ PARTIAL | Zen uses comma-separated tags; Resonance uses single category |
| `gloss_de` | — | ❌ **MISSING** | German translation (language-specific) |
| `image_url` / `image_urls` | Concept engine image assets | ⚠️ DIFFERENT | Resonance uses scene-based images, not per-word flashcard images |
| `selected_image_index` | — | ❌ **MISSING** | Not applicable to Resonance's image model |

### C3. Metadata Gap Summary

#### Fields Resonance is MISSING (would need to add):

| Field | Priority | Effort | Notes |
|-------|----------|--------|-------|
| `synonyms` | 🔴 High | Low | Add to enrichment prompt; comma-separated related words in target language |
| `example_gloss` | 🔴 High | Low | Add to enrichment prompt; translation of usage example |
| `gloss_de` | 🟡 Medium | Low | Only relevant if supporting German UI; could be LLM-generated |
| `tags` | 🟢 Low | Low | Resonance already has categories; extend to multi-tag support |

#### Fields Resonance ALREADY has that Zen DOESN'T:

| Resonance Field | Description |
|----------------|-------------|
| Cultural context blurb | Concept engine's cultural significance text |
| Lyric data | Suno-generated song lyrics (completely absent in Zen) |
| Video/audio assets | Full video pipeline output |
| Storyboard scenes | Multi-scene visual narrative |
| Emotional tone | Sentiment/mood classification |

### C4. Phrase Handling — Etymology & Mnemonic

ZenApp handles phrases (multi-word inputs) **the same way as single words:**

- **Etymology for phrases:** The prompt says *"if relevant, otherwise empty string"*. For phrases like idioms/proverbs, the LLM typically returns **the origin of the expression** (e.g., "This phrase originated from a Confucian text from the 3rd century"). For tongue twisters or texting abbreviations, it returns `""`.

- **Mnemonic for phrases:** The prompt explicitly instructs: *"For idioms: Include literal translation AND actual meaning in the mnemonic."* and *"For proverbs: Add cultural background and when people use them."* So the mnemonic field carries more weight for phrases, serving as both memory aid and contextual explanation.

- **No structural difference:** The JSON schema is identical regardless of whether the content is a single word or a multi-word phrase. The `pos` field is set to `"phrase"`, `"proverb"`, or `"expression"` to differentiate.

---

## Appendix: Quick Reference for Integration

### What Resonance needs to hook into Zen's category flow:

1. **Import the 29 categories** — Copy `CATEGORIES` object and `CATEGORY_GROUPS` from [categories.ts](file:///d:/CODING/ZENAPP/src/lib/categories.ts)
2. **Adapt the system prompt** — The prompt in [prompts.ts](file:///d:/CODING/ZENAPP/src/lib/prompts.ts) is self-contained and model-agnostic
3. **Output 5 words** — Change `cardCount` to 5 (default is 10, max is 20) and feed results into Resonance's existing generation pipeline as if the user typed them
4. **Map fields** — Only `headword` needs to be extracted from the Zen output to feed into Resonance's word input; the rest of the card metadata is Zen-specific

### What Resonance needs for the flashcard modal:

1. **Add `synonyms` and `example_gloss`** to the enrichment layer
2. **Adapt the Ember modal layout** — The layout is CSS/Tailwind, straightforward to port into a React modal
3. **TTS integration** — Zen uses Web Speech API via a simple `speak(text, lang)` utility
4. **No SRS needed** — Resonance has its own learning model; the Pass/Fail buttons would map to whatever Resonance uses
