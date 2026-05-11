# Spirit Sheet Notes

File: `assets/production/character/spirit-sheet.png`

Canvas: 2048x2048 transparent PNG. Layout is 8 columns by 8 rows, with 256x256 cells.

## Frame Counts

| Row | Animation | Populated cells | Empty cells |
| --- | --- | ---: | --- |
| 1 | Idle float | 8 | none |
| 2 | Run forward | 8 | none |
| 3 | Lane shift left | 6 | 7-8 |
| 4 | Lane shift right | 6 | 7-8 |
| 5 | Landing / correct | 6 | 7-8 |
| 6 | Fall through / wrong | 6 | 7-8 |
| 7 | Progression glow states | 5 | 6-8 |
| 8 | Special bullet-time motes | 4 | 5-8 |

## FPS Recommendations

| Row | Animation | FPS | Playback |
| --- | --- | ---: | --- |
| 1 | Idle float | 6 fps | Loop |
| 2 | Run forward | 12 fps | Loop |
| 3 | Lane shift left | 24 fps | Play once |
| 4 | Lane shift right | 24 fps | Play once |
| 5 | Landing / correct | 18-24 fps | Play once, then return to idle |
| 6 | Fall through / wrong | 14-18 fps | Play once, then transition to recovery/session state |
| 7 | Progression glow states | n/a | Static state frames |
| 8 | Special bullet-time motes | 18-24 fps | Play once over character/effects layer |

## Loop Points

| Row | Loop / sequence |
| --- | --- |
| 1 | Frames 1-8 loop back to frame 1. The bob is subtle and should crossfade cleanly at the boundary. |
| 2 | Frames 1-8 loop back to frame 1 for continuous hover-run. |
| 3 | Frames 1-6 play once; frame 6 is the returned lane position. |
| 4 | Frames 1-6 play once; frame 6 is the returned lane position. |
| 5 | Frames 1-6 play once; frame 6 is a settled continuation of frame 5. |
| 6 | Frames 1-6 play once; frame 6 is frame 5 faded further for disappearance. |
| 7 | Use frame 1 through frame 5 as discrete mastery intensity states. |
| 8 | Frames 1-4 play once; frame 4 is the largest burst. Fade the layer out after playback if needed. |

## Inspection Notes

- Visual identity is strongest in rows 1-4 and 7: the robe silhouette, scarf trail, halo, and cold cyan glow stay close to the canonical `spirit.png`.
- Row 5 frames 1-5 came from the accepted generation. Frame 6 was repaired by repeating the settled final landing pose so the row has the required six populated cells.
- Row 6 frames 1-5 came from the accepted generation. Frame 6 was repaired by fading frame 5 further; this keeps the disappearance readable without introducing a new off-model generated pose.
- Row 8 is effect-only and suitable as an overlay burst. It intentionally omits the full character.
- A targeted row regeneration was attempted for landing/fall, but it changed the scarf and robe silhouette too much, so those frames were not used.
- The transparent edge cleanup was validated after export; no visible magenta chroma-key pixels remain.
