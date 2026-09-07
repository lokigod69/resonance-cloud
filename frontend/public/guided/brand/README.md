# Guided artwork

Round three follows the owner's selected café reference: one dark page plane,
amber/pink/violet glass pieces, a quiet gem path and an L-to-wave success mark.
Words, numbers, feedback and actions are real HTML, never baked into artwork.

Nine new transparent WebPs total 106,894 bytes. `manifest.json` records actual
export dimensions and file sizes. Original six assets remain available for
existing references; loading is limited to the art each screen uses.

The three `tile-*-v3.webp` files are 600 × 200. `TodayPractice.css` uses a
nine-slice border image with a 90-pixel source slice and a filled center. Keep
the slice below half the image height: a 100-pixel slice leaves no center and
produces a visible band. Do not stretch the old multicolour `word-rim.webp`
across word buttons. Keep CSS material fallbacks beneath decorative images.

The gem assets have separate colours so state changes do not require a large
sprite or animation engine. Motion is brief, driven by user actions and
disabled with Reduce Motion. Completed and assisted answers remain distinct
in text; decorative colour never supplies correctness.

Source PNGs and the locked/rejected reference pair are preserved locally in
`design/today-guided/round-03/` at the workspace root. Raster artwork was made
with the image-generation tool, inspected for real alpha, then cropped,
resized and exported to WebP. Two painted-checkerboard candidates were rejected.
