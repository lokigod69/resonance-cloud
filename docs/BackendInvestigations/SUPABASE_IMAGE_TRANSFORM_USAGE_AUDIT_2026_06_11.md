# Supabase Image Transform Usage Audit - 2026-06-11

## Scope

Audited:

- `frontend/src`
- `frontend/api`
- `frontend/public`
- Supabase storage helper usage reachable from those areas

Not touched:

- Supabase schema
- image files
- generation output formats

## Search Summary

Searches covered:

- `getPublicUrl(...)`, `createSignedUrl(...)`, `download(...)`
- Supabase SDK calls with `{ transform: ... }`
- `/storage/v1/render/image` and `/render/image/`
- Supabase storage URL params: `width`, `height`, `resize`, `quality`, `format`
- Public asset loaders for curriculum, category, guided/today, share, admin preview, avatar, and generated card surfaces

Results after the fix:

- No `/storage/v1/render/image` or `/render/image/` usage remains in `frontend/src`, `frontend/api`, or `frontend/public`.
- No Supabase public object URLs with image transform query params remain in `frontend/src`, `frontend/api`, or `frontend/public`.
- The only Supabase Storage SDK image lookup in scope is `frontend/src/hooks/useProfileAvatarUrl.ts:26`, which calls `createSignedUrl(avatarPath, SIGNED_URL_TTL_SECONDS)` with no transform option.

## Transform Usage Found

The only actual Supabase Storage Image Transformation implementation was centralized in `frontend/src/lib/imageUrls.ts`.

| File | Audit line | Usage | Route / feature affected | Required? |
| --- | ---: | --- | --- | --- |
| `frontend/src/lib/imageUrls.ts` | 4 | Built `TRANSFORM_PREFIX` as `/storage/v1/render/image/public/` | Shared image URL helper | Avoidable |
| `frontend/src/lib/imageUrls.ts` | 31 | Rewrote public object URLs to `TRANSFORM_PREFIX` | Shared image URL helper | Avoidable |
| `frontend/src/lib/imageUrls.ts` | 33-40 | Added `width`, `height`, `resize`, `quality`, `format` transform params | Shared image URL helper | Avoidable |

No `getPublicUrl(..., { transform: ... })`, `createSignedUrl(..., ..., { transform: ... })`, or `download(..., { transform: ... })` usages were found.

## Downstream Helper Callers Affected

These callers were indirectly generating Supabase image transformations before the helper change when their input URL was a Supabase public object URL.

| File | Line | Helper | Route / feature affected | Required? |
| --- | ---: | --- | --- | --- |
| `frontend/src/pages/Decks.tsx` | 318 | `getCardThumbUrl` | Deck list thumbnail | Avoidable; image element already sizes thumbnail |
| `frontend/src/pages/DecksPG.tsx` | 438 | `getCardThumbUrl` | Alternate deck list thumbnail | Avoidable; rendered by deck artwork CSS |
| `frontend/src/pages/DeckView.tsx` | 651 | `getCardThumbUrl` | Deck word grid thumbnail | Avoidable; CSS controls thumbnail frame |
| `frontend/src/pages/DeckViewPG.tsx` | 749 | `getCardThumbUrl` | Deck edit thumbnail grid | Avoidable; CSS controls frame |
| `frontend/src/pages/DeckViewPG.tsx` | 876 | `getCardFullUrl` | Deck study card still image | Avoidable; source asset should be pre-rendered |
| `frontend/src/pages/SharePage.tsx` | 90 | `getCardFullUrl` | SPA public share image fallback | Avoidable; keep public URL stable |
| `frontend/src/pages/admin/Content.tsx` | 624 | `getCardThumbUrl` | Admin content word preview | Avoidable; preview-only thumbnail |
| `frontend/src/components/admin/observability/CardImage.tsx` | 11 | `getCardFullUrl` | Admin observability image preview | Avoidable; preview-only image |
| `frontend/src/components/dashboard/WordLibrary.tsx` | 101 | `getCardThumbUrl` | Dashboard word library thumbnail | Avoidable; CSS controls visual size |
| `frontend/src/components/dashboard/WordDetailModal.tsx` | 111 | `getCardFullUrl` | Dashboard word detail image | Avoidable; CSS controls displayed size |
| `frontend/src/components/deck/CardWordViewerModal.tsx` | 145 | `getCardFullUrl` | Card word viewer modal | Avoidable; source asset should be pre-rendered |
| `frontend/src/components/OrbDock.tsx` | 49 | `getCardThumbUrl` | Study orb thumbnail dock | Avoidable; small CSS frame |
| `frontend/src/games/slicer/adapters/deckAdapter.ts` | 38 | `getCardThumbUrl` | Slicer deck/card thumbnails | Avoidable; game adapter can use stored asset |
| `frontend/src/games/runner/adapters/deckAdapter.ts` | 70 | `getCardThumbUrl` | Runner deck/card thumbnails | Avoidable; game adapter can use stored asset |
| `frontend/src/components/study/canvas/EmberCanvas.tsx` | 244, 249 | `getCardFullUrl` | Ember study canvas images | Avoidable; canvas CSS controls display |
| `frontend/src/components/study/canvas/FrostCanvas.tsx` | 220, 225 | `getCardFullUrl` | Frost study canvas images | Avoidable; canvas CSS controls display |
| `frontend/src/components/study/canvas/SyndicateCanvas.tsx` | 433, 438 | `getCardFullUrl` | Syndicate study canvas images | Avoidable; canvas CSS controls display |
| `frontend/src/components/study/canvas/ZenCanvas.tsx` | 364, 369 | `getCardFullUrl` | Zen study canvas images | Avoidable; canvas CSS controls display |
| `frontend/src/hooks/useMusicPlayer.ts` | 49 | `getThumbnailUrl` | Music player media session thumbnail | Avoidable; use stored thumbnail URL |
| `frontend/src/components/music/PlaylistRow.tsx` | 113 | `getThumbnailUrl` | Music playlist row thumbnail | Avoidable; CSS controls visual size |
| `frontend/src/components/music/PlayerBar.tsx` | 181 | `getThumbnailUrl` | Music player bar thumbnail | Avoidable; CSS controls visual size |
| `frontend/src/components/music/OrbVisualizer.tsx` | 208 | `getThumbnailUrl` | Music orb visualizer background | Avoidable; CSS controls cover behavior |
| `frontend/src/components/music/OrbThumbnailRow.tsx` | 48 | `getThumbnailUrl` | Music thumbnail row | Avoidable; CSS controls visual size |
| `frontend/src/components/music/LyricsSheet.tsx` | 474 | `getThumbnailUrl` | Lyrics sheet thumbnail | Avoidable; CSS controls visual size |

## Likely Sources Of The 195 Transformations

Likely:

- Generated card thumbnails and full card stills through `getCardThumbUrl` and `getCardFullUrl`.
- Deck list, deck view, dashboard word library/detail, study canvas modes, and game adapters.
- Admin content previews and observability previews.
- Music thumbnails through `getThumbnailUrl` if those thumbnails are Supabase public object URLs.
- SPA share page image fallback through `getCardFullUrl`.

Unlikely or not found:

- Avatars: `useProfileAvatarUrl` signs private avatar URLs without a transform option.
- Curriculum image set admin page: previews resolve local `/curriculum/.../*.webp` paths through `resolveCurriculumImageSetAsset`.
- Category cards/static curriculum assets: loaders resolve local `/curriculum/categories/.../*.webp` or `/curriculum/generated-categories/.../*.webp` paths.
- Guided/today images: local `/guided/...` images are used directly; the Supabase URLs found there are video object URLs, not image render URLs.
- Public share OG API: `frontend/api/share.ts` emits the stored `thumbnail_url` directly and does not call the image helper.

## Changes Made

- `frontend/src/lib/imageUrls.ts`
  - Removed Supabase render endpoint URL construction.
  - Removed transform query param generation.
  - Kept existing exported helper names and option signatures for compatibility.
  - `getStorageImageUrl`, `getThumbnailUrl`, `getCardThumbUrl`, and `getCardFullUrl` now return the stored URL directly, or `null` for empty input.

- `frontend/scripts/test-image-urls.ts`
  - Updated the helper contract test to assert direct storage URLs.
  - Added checks that helpers do not produce `/storage/v1/render/image/` paths or transform query params.

## Remaining Transform Usage

None intentionally kept.

The only remaining Supabase Storage image access in the audited frontend scope is avatar signed URL creation without transformation.

## Future Asset Pipeline Recommendation

- Keep generated card, curriculum, category, guided, and static assets as pre-rendered WebP/static files.
- If a true smaller thumbnail is needed, materialize it during generation, for example:
  - `.../cards/<card-id>.webp`
  - `.../cards/thumbs/<card-id>-256.webp`
  - `.../cards/thumbs/<card-id>-512.webp`
- Store the precomputed thumbnail URL/path in metadata or a dedicated column instead of using Supabase image transform params.
- Use CSS sizing, `object-fit`, and fixed containers for display-only downsizing.
- Add/keep a regression check that fails if `/storage/v1/render/image/` or Supabase image transform query params reappear in frontend source.
