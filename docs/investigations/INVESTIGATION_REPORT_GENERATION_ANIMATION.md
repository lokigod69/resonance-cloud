# Investigation: Restore the Colorful Post-Submit Generation Animation

**Scope:** strictly read-only. No files were modified, created, or deleted during this investigation.
**Branch:** `main` at HEAD = `27380ca`.
**Date:** 2026-04-21.

---

## Summary

The colorful animation was a **conic-gradient "spinning gradient orb"** — a 96×96 rounded div filled with a 3-second linear rotation through the theme palette (`--pg-accent-teal` → `--pg-accent-violet` → `--pg-accent-rose` → back), with a blurred copy behind it at 40% opacity. It lived **only in `GeneratePG.tsx`** (the "Polish Glass" / Classic skin). `GenerateGO.tsx` (Glassy / Glass Orb skin) never had it — GO used to `navigate()` away on submit and render no post-submit screen at all.

It was lost in commit `cafafd5` (2026-04-21, "add queue position display for generation progress"), which replaced the spinning-orb JSX block in `GeneratePG.tsx` with a conditional rendering either `<QueuePositionDisplay>` or a plain glass card containing only the `queue.generating` text. The same commit *created* a new post-submit screen for `GenerateGO.tsx` using the same `<QueuePositionDisplay>` component. The follow-up commit `18adf08` did not touch the animation — it only added navigation guards.

Restoring the visual is straightforward: the original JSX is intact in git history (`0f211be`), the CSS color variables it depends on still exist in `frontend/src/index.css`, and the `generate.forgingMemories` i18n key is still present in the translations table. The backend hook (`useQueuePosition`) can stay wired without rendering `<QueuePositionDisplay>`.

---

## Git Archaeology

| Role | SHA | Description |
|---|---|---|
| Introduced the animation | `4e025ad` | *feat: custom Glass Orb generate flow, study physics, Polish Glass pages* — first commit where `conic-gradient` appears in `GeneratePG.tsx`. |
| Last commit with animation intact | `0f211be` | *fix: resilient generation submit with cached-credit fallback* — the commit immediately before `cafafd5` on `main`. The spinning orb renders here unchanged. |
| **Commit that removed the animation** | **`cafafd5`** | *feat(frontend): add queue position display for generation progress* — replaced the orb JSX with the `<QueuePositionDisplay>` conditional. |
| Follow-up (navigation only, NOT visual) | `18adf08` | *fix(frontend): hide queue banner on finished decks, stable generate-page navigation* — added `hasNavigatedToDeckRef` and broader effect deps. The post-submit JSX block was untouched. |

Searches used and their results:

- `git log --all -S "conic-gradient" --oneline` → only `cafafd5` (removal) and `4e025ad` (introduction).
- `git log --all -S "forgingMemories" --oneline` → i18n touches plus `cafafd5`.
- `git grep "conic-gradient"` in current tree → zero matches. The orb is not present anywhere today.
- `git grep "QueuePositionDisplay"` → five files, all touched by `cafafd5`/`18adf08`.

---

## The Pre-Change Code (what must come back)

**Source:** `git show 0f211be:frontend/src/pages/GeneratePG.tsx`, lines 130–184 of the old file. This is the entire `if (generated) { return ... }` block:

```jsx
if (generated) {
  return (
    <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col items-center text-center gap-8"
      >
        {/* Spinning gradient orb */}
        <div className="relative">
          <motion.div
            className="w-24 h-24 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, var(--pg-accent-teal), var(--pg-accent-violet), var(--pg-accent-rose), var(--pg-accent-teal))',
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
          <div
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: 'conic-gradient(from 0deg, var(--pg-accent-teal), var(--pg-accent-violet), var(--pg-accent-rose), var(--pg-accent-teal))',
              opacity: 0.4,
            }}
          />
        </div>

        <div className="space-y-2">
          <motion.h2
            className="text-3xl font-bold font-display"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            {t('generate.forgingMemories')}
          </motion.h2>
          <p className="text-sm text-[var(--pg-text-dim)] max-w-sm">
            {existingDeck
              ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
              : `${t('generate.deckBeingCreated')} ${t('generate.backgroundNotice')}`}
          </p>
        </div>

        <Link
          to={existingDeck ? `/deck/${existingDeck.id}` : '/dashboard'}
          className="px-6 py-3 rounded-full pg-glass text-sm font-display font-medium text-[var(--pg-accent-teal)] hover:bg-white/5 transition-all"
        >
          <ArrowLeft className="h-4 w-4 inline mr-2" />
          {existingDeck ? t('generate.backToDeck') : t('common.backToDecks')}
        </Link>
      </motion.div>
    </div>
  )
}
```

### Structural analysis of the animation

- **Kind:** no SVG, no Canvas, no Lottie, no imported component. It is a **pair of plain `<motion.div>` / `<div>` elements** styled with inline `background: conic-gradient(...)` and driven by Framer Motion's `animate={{ rotate: 360 }}` with `repeat: Infinity, duration: 3, ease: 'linear'`.
- **Layered composition:** a foreground rotating disc (`w-24 h-24 rounded-full`) stacked over an absolutely-positioned, blurred (`blur-xl`), 40-opacity copy — the blur ring is what gives the "drifting glow" feel. The color drift the product owner perceives comes from the conic gradient rotating, not from any color-change keyframe; each color sweeps around the wheel once every 3 seconds.
- **Dependencies, all still present in HEAD:**
  - `framer-motion` — present (it's already imported in the current `GeneratePG.tsx` at line 3).
  - CSS vars `--pg-accent-teal` / `--pg-accent-violet` / `--pg-accent-rose` — defined at [index.css:471–475](orchestrator/frontend/src/index.css#L471-L475) as `#0de2c3`, `#f43f5e`, `#8b5cf6` respectively.
  - i18n key `generate.forgingMemories` — still in [translations.ts:145](orchestrator/frontend/src/lib/translations.ts#L145) (`"Forging Memories"`) and [translations.ts:835](orchestrator/frontend/src/lib/translations.ts#L835) (French: `"Création des souvenirs"`). Keys `generate.deckBeingCreated`, `generate.backgroundNotice`, `generate.backToDeck`, `common.backToDecks` are also still present.
- **No shared CSS file, no Tailwind config extension, no custom keyframes.** The animation is self-contained inline JSX + Framer Motion + existing theme vars.
- **Reuse:** zero. A codebase-wide grep for `conic-gradient` returns no matches in the current tree. The orb was only ever inlined in `GeneratePG.tsx`.

### GenerateGO.tsx — the symmetric question

`GenerateGO.tsx` **did not have this animation before `cafafd5`.** Before that commit, GO's submit handler ended with:

```js
await refreshProfile()
navigate(existingDeck ? `/deck/${existingDeck.id}` : '/dashboard')
```

i.e. it navigated immediately and never rendered a generated-state screen. Verified by `git show 0f211be:frontend/src/pages/GenerateGO.tsx` — no `conic`, no `rotate`, no `generating`, no `forgingMemories`, no equivalent animation block anywhere in the file.

This is a divergence from the brief's assumption that both pages had the same animation before. **Only the Classic skin (PG) had it.** The Glassy skin (GO) went straight to the deck view.

---

## The Current Code (what sits there today)

### `GeneratePG.tsx` — [lines 154–201](orchestrator/frontend/src/pages/GeneratePG.tsx#L154-L201)

```jsx
if (generated) {
  return (
    <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex w-full max-w-xl flex-col items-center text-center gap-8"
      >
        {queueDeckId ? (
          <QueuePositionDisplay
            jobsAhead={jobsAhead}
            queuePaused={queuePaused}
            hasChecked={hasChecked}
            variant="glassy"
            className="w-full"
          />
        ) : (
          <div className="w-full rounded-[32px] border border-white/10 bg-white/5 px-6 py-8 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <motion.h2
              className="text-3xl font-bold font-display"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {t('queue.generating')}
            </motion.h2>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-[var(--pg-text-dim)] max-w-sm">
            {existingDeck
              ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
              : `${t('generate.deckBeingCreated')} ${t('generate.backgroundNotice')}`}
          </p>
        </div>

        <Link
          to={queueDeckId ? `/deck/${queueDeckId}` : existingDeck ? `/deck/${existingDeck.id}` : '/dashboard'}
          className="px-6 py-3 rounded-full pg-glass text-sm font-display font-medium text-[var(--pg-accent-teal)] hover:bg-white/5 transition-all"
        >
          <ArrowLeft className="h-4 w-4 inline mr-2" />
          {queueDeckId ? t('generate.backToDeck') : t('common.backToDecks')}
        </Link>
      </motion.div>
    </div>
  )
}
```

The orb is gone. The space the orb used to fill is now either `<QueuePositionDisplay variant="glassy" className="w-full">` or (fallback, when `queueDeckId` is null — which in practice rarely happens post-submit) a plain glass card containing just a pulsing `queue.generating` headline.

### `GenerateGO.tsx` — [lines 323–357](orchestrator/frontend/src/pages/GenerateGO.tsx#L323-L357)

```jsx
if (generated) {
  return (
    <div className="gen-container">
      <div className="gen-section" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
       {queueDeckId ? (
          <QueuePositionDisplay
            jobsAhead={jobsAhead}
            queuePaused={queuePaused}
            hasChecked={hasChecked}
            variant="glassy"
          />
        ) : (
          <div className="glass-card" style={{ padding: '2rem 1.5rem' }}>
            <h3 style={{ marginBottom: 0 }}>{t('queue.generating')}</h3>
          </div>
        )}

        <p style={{ color: 'var(--go-text-secondary)', fontSize: '0.95rem', marginTop: 18 }}>
          {existingDeck
            ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
            : `${t('generate.deckBeingCreated')} ${t('generate.backgroundNotice')}`}
        </p>

        <button
          type="button"
          className="gen-orb selected breadcrumb"
          style={{ marginTop: 20 }}
          onClick={() => navigate(queueDeckId ? `/deck/${queueDeckId}` : '/dashboard')}
        >
          {queueDeckId ? t('generate.backToDeck') : t('common.backToDecks')}
        </button>
      </div>
    </div>
  )
}
```

This whole block is new — it did not exist before `cafafd5`. GO now shows the same `<QueuePositionDisplay variant="glassy">` (or the identical plain glass-card fallback) that PG shows. The component is what the product owner is calling "weird" / "so bad".

### `QueuePositionDisplay.tsx` — [entire file, 126 lines](orchestrator/frontend/src/components/QueuePositionDisplay.tsx)

What it renders visually:
- A single bordered rounded-3xl container.
- An optional amber "paused" banner.
- A `Loader2` lucide icon spinning (4×4 pixels) when `isChecking`, otherwise a `Sparkles` icon (not animated).
- A headline: one of `queue.checking` / `queue.generating` / `"{N} {queue.jobsAhead}"`.
- When queued (`jobsAhead > 0`): a two-up grid of sub-cards with "N jobs ahead" and "~X min" ETA.

There is **no rotating gradient, no color drift, no large animation of any kind** — only a tiny `animate-spin` 4×4-pixel `Loader2`.

### Textual diff: what the old animation showed vs. what the current component shows

| | Old orb state | Current `QueuePositionDisplay` |
|---|---|---|
| Headline | `generate.forgingMemories` — "Forging Memories" (pulsing opacity) | `queue.checking` / `queue.generating` / `"N queue.jobsAhead"` |
| Sub-caption | `generate.deckBeingCreated` + `generate.backgroundNotice` | Optional two-up grid: jobsAhead number + ETA minutes |
| Visual focal point | 96×96 rotating conic gradient + blurred halo | 16×16 `Loader2` spinner or static `Sparkles` icon |
| Queue-paused signal | None | Amber `AlertCircle` banner + `queue.paused` text |
| Queue count / ETA | Never shown | Shown as large card grid when `jobsAhead > 0` |

The old screen said "your deck is being made, check back soon." The new screen says "you are currently at position N in the queue, ETA ~X minutes." Different information, different feel.

---

## Restoration Options

All options keep `useQueuePosition` imported and running so the navigation effect (`hasNavigatedToDeckRef` + navigate-when-done logic) continues to work. The question is purely what to render in the generated-state JSX.

### Option A — Restore the orb verbatim, drop the queue card entirely

- **PG:** replace the `queueDeckId ? <QueuePositionDisplay…/> : <glass fallback/>` conditional with the exact pre-`cafafd5` spinning-gradient orb + `forgingMemories` headline. Keep the hook call and navigation effect untouched.
- **GO:** decide one of two sub-options:
  - **A1:** remove the entire `if (generated)` return block, restore `navigate(...)` on successful submit. GO returns to its pre-`cafafd5` behavior (no post-submit screen). Simplest. Loses the "small intermediate confirmation" GO gained.
  - **A2:** add a mirror of the PG orb inside GO's generated-state block, styled with GO's glass tokens (`--go-text-secondary`, `glass-card`, `gen-container`). This gives both skins the same polished screen, something the product never actually had before but that matches the user's stated desire for symmetry.
- **Surface area:** 1 JSX block in PG; in GO either ~35 lines removed (A1) or ~30 lines of orb JSX added (A2). No CSS changes, no new imports, no translation changes (all keys exist). `QueuePositionDisplay` usage in the two generate pages would be removed; the component itself stays in the repo because it is also rendered on `DeckView.tsx` / `DeckViewPG.tsx`.
- **Queue info:** no queue number shown post-submit. User only sees it on the deck view.

### Option B — Orb as the visual shell, queue count as a small overlay/caption

- Restore the orb as the dominant visual. Below it (replacing today's plain `<p>`), conditionally show a short line like "`{jobsAhead} {t('queue.jobsAhead')}`" or "~X min" when `hasChecked && jobsAhead > 0`, styled as a small caption — not as the full `<QueuePositionDisplay>` card.
- **Surface area:** 1 JSX block in PG, 1 in GO; roughly 10–15 extra lines in each for the conditional caption. No new imports.
- **Queue info:** preserved in a subtle form. Keeps the investment in the backend user-visible. Users who like the info still get it; users who liked the orb get the orb back.

### Option C — Mechanical path: restore the orb inside `QueuePositionDisplay` itself

- Rewrite `QueuePositionDisplay` so that the top of the card *is* the rotating orb (instead of the tiny `Loader2` / `Sparkles` icon). Keep the queue-count and ETA sub-cards beneath as today.
- **Surface area:** single-component change. No touches to `GeneratePG.tsx` / `GenerateGO.tsx` / `DeckView*`. But: the orb would also appear inside `DeckView` / `DeckViewPG`'s queue banner, which the brief says is explicitly out of scope for behavioral change. The visual would change there too.
- **Queue info:** preserved, same as today.

### Recommendation

**Option A2** if the product owner wants the polished post-submit screen in both skins with no distraction from queue numbers. **Option B** if they want the orb back AND keeping the queue-position visibility that this session bought. Option B is probably the right answer given the product owner said the backend can stay — it means the queue info stays *discoverable* but the hero visual is the pretty wheel again. Option C changes visuals in the deck pages which the brief rules out.

---

## Open Questions for the Product Owner

1. **Headline text.** The old orb said "Forging Memories" (`generate.forgingMemories`). The current `<QueuePositionDisplay>` uses `queue.generating` ("Generating…" or similar). Which headline do you want? Both translation keys still exist.
2. **GO symmetry.** Before `cafafd5`, `GenerateGO` did not show a post-submit screen at all — it navigated straight to the deck. The orb animation was only ever on the Classic (PG) skin. Two choices:
   - Restore PG's orb, and make GO also navigate-away again (A1 — GO gets no intermediate screen, matches pre-`cafafd5` behavior exactly).
   - Restore PG's orb AND add a matching orb screen to GO (A2 — new symmetry, better than what existed).
3. **Queue count visibility post-submit.** Today the user sees "N jobs ahead · ~Y min" right after submit. Old behavior showed no queue number at all. Do you want to keep the number visible as a small caption (Option B), or drop it entirely from the post-submit state and only show it on the deck page (Option A)?
4. **"Check back soon" sub-caption.** The old orb screen included the paragraph `generate.deckBeingCreated` + `generate.backgroundNotice` directly under the heading. The current code preserved that paragraph. Assuming we keep it — confirm, so the restore is verbatim.

---

## Discipline Notes

- No files were modified during this investigation. `git status` for tracked files is clean.
- All claims above cite either a git SHA + path, or a current-tree file path and line number.
- No implementation code was written. The pre-change JSX is reproduced only as an archaeological artifact for the follow-up implementation prompt.
