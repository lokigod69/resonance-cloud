# Curriculum Image Set — Metadata Architecture (design note)

Date: 2026-05-21
Status: Design only. Nothing in this doc is implemented in the same pass that introduces admin-controlled active image sets, unless it is trivial fallout.

## Why this note exists

When we introduce multiple curriculum image sets (Set A · Minimal, Set C · Symbolic, future culturally specific sets), there is a natural temptation to attach image-related metadata to the curriculum word entry. That conflates two distinct concerns:

- **Canonical word data** — translation, IPA, POS, examples, grammar. This is linguistic.
- **Visual asset data** — the caption a visual depicts, the style family, the cultural reference, the render batch, the prompt route, the review status of the rendered image. This is per-asset.

Changing the active image set must not change the word's linguistic metadata. Therefore we separate them.

## Ownership rules

| Concept | Owner | Notes |
|---|---|---|
| Translation, IPA, POS, gender, plural, examples, mnemonic, etymology | curriculum word entry | Canonical. Same across all sets. |
| visual_caption / visual_rationale | image asset | Why this image shows what it shows. Differs per set. |
| style_tags (e.g. `minimal`, `photoreal`, `symbolic`, `cinematic`) | image asset | Differs per set. |
| cultural_notes | image asset | A future German Set may include a Bavarian beer-stein for "Bier"; the Italian Set may show a different cultural anchor. Belongs to the asset. |
| exact_text_review_status (text-in-image QA) | image asset | Per-asset review. |
| prompt_route (which prompt template generated this image) | image asset | Belongs to the render batch / asset. |
| source_render_batch / source_png_path | image asset | Belongs to the asset. |
| quality / review_status | image asset | Per-asset. |
| alt_text | image asset | Per-asset; may differ across visually different sets even for the same word. |

## Where this could live later (not in this pass)

Two reasonable shapes; the choice can be deferred until we need it:

### Shape A: per-asset metadata table

```sql
create table public.curriculum_image_set_assets (
  language_iso       text not null,
  set_key            text not null,
  normalized_word    text not null,
  public_path        text not null,
  width              integer,
  height             integer,
  alt_text           text,
  visual_caption     text,
  visual_rationale   text,
  style_tags         text[],
  cultural_notes     text,
  exact_text_review_status text,
  prompt_route       text,
  source_render_batch text,
  source_png_path    text,
  review_status      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (language_iso, set_key, normalized_word),
  foreign key (language_iso, set_key) references public.curriculum_image_sets (language_iso, set_key)
);
```

This is the right shape if we want to query/filter assets in SQL (e.g. "show me all Set C assets pending text-in-image QA").

### Shape B: static per-set manifest extension

The existing per-set manifest JSON (`/curriculum/en/manifests/set-a.json`, `set-c.json`) is already per-asset. We can extend it with the additional fields above and read them from the frontend without a DB roundtrip. The current manifest already carries `source_png_path`, `source_route`, `recommendation`, and `fallback_to_set` — close to half of the above.

This is the right shape if image-set metadata is mostly read by the frontend at render time and rarely written, and if the source of truth lives in the curriculum render pipeline.

A reasonable compromise: keep the manifest as the source of truth (Shape B), and only materialize into Shape A if/when admin tooling needs to query across assets. The migration is mechanical.

## What the entry-detail modal could surface later

The modal already shows linguistic metadata. With image-set-specific metadata available, it could additionally show, for the currently active image set:

- visual caption ("Two figures shaking hands at sunrise.")
- visual rationale ("Symbolic depiction of a new beginning.")
- cultural note ("Set IT shows an espresso bar; Set A shows a generic café.")
- (admin-only) prompt route, render batch, review status

The current modal already reads `enrichment` (linguistic) — adding an `assetMetadata` block driven by the manifest is a small follow-up. Not implemented here.

## What changes the word entry might still need

A small one, eventually: when a Set's visual deliberately depicts a culturally specific concept for the same target word (e.g. a Bavarian context for "Bier" in a hypothetical Set DE-BAV), the linguistic gloss does NOT change but a per-set hint may be useful to the learner ("This image shows a Bavarian Maß; in standard German any large mug of beer counts."). That hint is asset-side, not entry-side. The entry remains canonical.

## Out of scope (decided)

- No `image_set_id` on `decks` or `words`. (See deck/import audit.)
- No retroactive media rewrite on imported decks.
- No metadata UI in this pass.
- No new metadata table in this pass.

This note exists so future passes don't accidentally couple image metadata to canonical word metadata.
