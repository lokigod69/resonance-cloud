# Music Cosmetic Investigation

## Issue 1 - Glassy selected mini-orb clipping
- Files/lines: `frontend/src/components/music/OrbThumbnailRow.tsx:36-44`, `frontend/src/components/music/OrbThumbnailRow.tsx:52-53`.
- Root cause: the selected/hovered mini-orb translates up 16px and scales to 1.2, but the scroll container uses horizontal overflow and the inner row only provides `py-4`; the transformed top edge and glow can extend above the row's scroll bounds.
- Fix applied: gave the thumbnail row more top/bottom breathing room while keeping horizontal scrolling hidden scrollbar behavior; `OrbVisualizer` was not changed.

## Issue 2 - Remove Repeat All mode
- Files/lines: `frontend/src/hooks/useMusicPlayer.ts:17`, `frontend/src/hooks/useMusicPlayer.ts:81-115`, `frontend/src/hooks/useMusicPlayer.ts:192-194`, `frontend/src/components/music/PlayerBar.tsx:153-156`, `frontend/src/pages/MusicPG.tsx:305-308`.
- Root cause: `RepeatMode` still includes `'all'`; `cycleRepeat` cycles `off -> all -> one -> off`; end-of-track logic stops at playlist end unless repeat-all is active.
- Fix applied: made repeat binary (`off | one`), cycle `off -> one -> off`, kept repeat-one replaying the current audio, and made repeat-off auto-advance/wrap through the queue using the existing next-track logic.

## Issue 3 - Glassy volume slider overlaps progress bar
- Files/lines: `frontend/src/pages/MusicPG.tsx:346-353`, `frontend/src/components/VolumeControl.tsx:12`, `frontend/src/components/VolumeControl.tsx:99-105`.
- Root cause: Glassy uses shared `VolumeControl` but leaves the default `popDirection="left"`, so the slider opens horizontally into the progress row. Classic already passes `popDirection="up"`.
- Fix applied: passed `popDirection="up"` from `MusicPG.tsx`.

## Issue 4 - Classic mobile player has no scrubber
- Files/lines: `frontend/src/components/music/PlayerBar.tsx:112-130`.
- Root cause: `SimulatedWaveform` is hidden on mobile with `hidden sm:block`; no mobile-only replacement seek control exists between the two time labels.
- Fix applied: added a mobile-only native range scrubber between the time labels, wired to `onSeek`, while leaving the desktop waveform unchanged.

## Issue 5 - Classic header sticks and spans full viewport
- Files/lines: `frontend/src/pages/Music.tsx:267-305`.
- Root cause: the page header wrapper is `sticky top-0` and has a full-width `bg-secondary`; the content inside is constrained, but the grey header background and sticky positioning are applied outside the content column.
- Fix applied: removed sticky positioning and full-width background, and placed the icon/title/filter inline inside the same `max-w-5xl` content column as the playlist.

## Issue 6 - Remove "X of Y songs" subtitle
- Files/lines: `frontend/src/pages/Music.tsx:262-276`, `frontend/src/pages/MusicPG.tsx:178-191`, `frontend/src/lib/translations.ts:235`, `frontend/src/lib/translations.ts:595`, `frontend/src/lib/translations.ts:983`.
- Root cause: both Music skins compute playable/total counts and render them in the header; translations still include `music.songCount`.
- Fix applied: removed the count calculations/rendering from both pages, removed the dead `music.songCount` translations, and used the existing localized `music.yourMusic` key in Glassy so EN/DE/FR headers remain correct.

## Fix Pass - Items A and B

### Item A - Repeat off must stop at the end
- Root cause: `frontend/src/hooks/useMusicPlayer.ts:101-104` wrapped linear end-of-track playback back to index `0`, which recreated repeat-all behavior with repeat off.
- Fix applied: `frontend/src/hooks/useMusicPlayer.ts:100-106` now stops only the linear non-shuffle branch at the end by pausing the audio, setting `isPlaying` false, and returning without changing the selected track. The shuffle branch at `frontend/src/hooks/useMusicPlayer.ts:97-99` was left unchanged. The manual `next()` button path at `frontend/src/hooks/useMusicPlayer.ts:132-142` is separate from `advanceNext` and was left unchanged.

### Item B - Mobile scrubber touch target
- Root cause: `frontend/src/components/music/PlayerBar.tsx:128-140` reused the `volume-slider` class, whose rendered mobile range was a 4px-tall track.
- Fix applied: `frontend/src/components/music/PlayerBar.tsx:70-108` adds shared seek-from-position handlers, `frontend/src/components/music/PlayerBar.tsx:111` gives the mobile player bar a two-row `h-20` layout while keeping `sm:h-16`, and `frontend/src/components/music/PlayerBar.tsx:207-232` replaces the raw 4px range with a 44px mobile seek target plus a thin accent visual track. The desktop waveform at `frontend/src/components/music/PlayerBar.tsx:197-205` remains `hidden sm:block`.

### Verification
- `npm run build` passed.
- Mobile Classic was checked in a 375x667 Playwright viewport with mocked Supabase data. The seek input and wrapper both rendered at `x=64, y=624, width=247, height=44`; the fixed player bar rendered at `height=80`, with no horizontal overflow.
- Mobile tap/drag seek was checked against a mocked 120s media duration: tapping near 75% set `currentTime` to `89.8785`, and dragging back near 25% set `currentTime` to `29.6356`.
- Desktop Classic was checked at 768px width: the mobile seek wrapper computed `display: none`, and the waveform container computed `display: block` with `height=32`.
