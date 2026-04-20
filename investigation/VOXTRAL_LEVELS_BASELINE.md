# Voxtral Levels Baseline

Scope: this baseline covers the current Voxtral character path for bilingual practice (`targetLang != nativeLang`), which is the path used for Arthur / EN->DE. Same-language mode has separate `LEVEL:` labels and is out of scope here.

## System prompt level names

L1 (`level === 'beginner'`)

```text
BEGINNER — The student knows basic words and simple phrases in {targetLang}.
```

L2 (`level === 'intermediate'` / default branch)

```text
INTERMEDIATE — The student can hold a conversation in {targetLang} with support.
```

L3 (`level === 'advanced'`)

```text
ADVANCED — The student wants fluent, challenging practice in {targetLang}.
```

## Language mix

- L1: `About 50% {nativeLang}, 50% {targetLang}.`
- L2: `About 80% {targetLang}, 20% {nativeLang}.`
- L3: `95-100% {targetLang}. Use {nativeLang} only if explicitly asked.`

## Current user-role greeting instruction

Current Voxtral character greeting construction does not distinguish L1, L2, and L3. All three levels share the same non-zero-level greeting template.

Style tutors (`character.tier === 'style'`) at L1, L2, and L3:

```text
You are {character.name}. {character.directive}

Open the conversation in {targetLangName}. Be true to who you are.
```

Persona/public tiers (`character.tier !== 'style'`) at L1, L2, and L3:

```text
You are {character.name}. {character.identity}{character.directive}

Open the conversation in {targetLangName}. Be true to who you are.
```

Notes:

- `character.identity` is included only when present and already includes a trailing space in the concatenation path.
- `studyWord` is not used in the current Voxtral L1/L2/L3 greeting path.

## 33c15d1 regression-pattern check

Because Voxtral L1/L2/L3 all use the same non-zero greeting template, the pattern status is the same at each level.

| Level | Character-act license | Anti-anatomy license | Directive double-injection | Result |
| --- | --- | --- | --- | --- |
| L1 | Present (`Be true to who you are`) | Not present | Present | Partial 33c15d1 pattern present |
| L2 | Present (`Be true to who you are`) | Not present | Present | Partial 33c15d1 pattern present |
| L3 | Present (`Be true to who you are`) | Not present | Present | Partial 33c15d1 pattern present |

Interpretation:

- The exact L0 anti-anatomy phrase (`not as a vocabulary lesson`) is not present at L1/L2/L3.
- The character-act license and directive double-injection are still present at L1/L2/L3 on the current Voxtral character path.
