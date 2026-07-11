# Art Style Master List — Cross-Reference & Curation Guide

> Extracted 2026-03-29 from three sources. Use this to curate down to ~50 (wizard) and ~27 (LLM auto-picker).

---

## Source 1: fieldConfigs.ts (Admin Settings Panel) — 88 styles + 3 meta

**Meta options:** `none`, `auto`, `random`

### Core (1)
| Value | Label |
|-------|-------|
| `photorealistic` | Photorealistic |

### Classic Fine Art (15)
| Value | Label |
|-------|-------|
| `oil_painting` | Oil Painting |
| `watercolor` | Watercolor |
| `impressionism` | Impressionism |
| `expressionist` | Expressionism |
| `surrealism` | Surrealism |
| `cubism` | Cubism |
| `renaissance` | Renaissance |
| `baroque` | Baroque |
| `art_nouveau` | Art Nouveau |
| `pointillism` | Pointillism |
| `fauvism` | Fauvism |
| `minimalism` | Minimalism |
| `abstract_art` | Abstract Art |
| `pop_art` | Pop Art |
| `chiaroscuro` | Chiaroscuro |

### Asian & Traditional (4)
| Value | Label |
|-------|-------|
| `ukiyo_e` | Ukiyo-e |
| `chinese_ink_wash` | Chinese Ink Wash |
| `persian_miniature` | Persian Miniature |
| `folk_art` | Folk Art |

### Animation & Comics (13)
| Value | Label |
|-------|-------|
| `studio_ghibli` | Studio Ghibli |
| `comic_book` | Comic Book |
| `manga` | Manga |
| `one_piece_style` | One Piece Style |
| `dragon_ball_style` | Dragon Ball Z Style |
| `rick_and_morty_style` | Rick and Morty Style |
| `south_park_style` | South Park Style |
| `disney_animation` | Disney Animation |
| `pixar_3d` | Pixar 3D |
| `cartoon_network` | Cartoon Network |
| `blue_eyed_samurai` | Blue Eye Samurai |
| `invincible` | Invincible |
| `big_mouth` | Big Mouth |

### Digital & Modern (11)
| Value | Label |
|-------|-------|
| `pixel_art` | Pixel Art |
| `synthwave` | Synthwave |
| `retro_90s` | Retro 90s |
| `vaporwave` | Vaporwave |
| `cyberpunk` | Cyberpunk |
| `flat_illustration` | Flat Illustration |
| `graffiti_street_art` | Graffiti / Street Art |
| `lowbrow_pop_surrealism` | Lowbrow / Pop Surrealism |
| `futurism` | Futurism |
| `glitch_art` | Glitch Art |
| `neon_noir` | Neon Noir |

### Craft & Tactile (8)
| Value | Label |
|-------|-------|
| `knitted` | Knitted |
| `paper_cut_art` | Paper Cut Art |
| `origami` | Origami |
| `claymation` | Claymation |
| `stained_glass` | Stained Glass |
| `mosaic` | Mosaic |
| `embroidery` | Embroidery |
| `woodblock_print` | Woodblock Print |

### Photography & Film (6)
| Value | Label |
|-------|-------|
| `noir` | Noir |
| `vintage_film` | Vintage Film |
| `polaroid` | Polaroid |
| `daguerreotype` | Daguerreotype |
| `double_exposure` | Double Exposure |
| `tilt_shift` | Tilt Shift |

### Illustration (7)
| Value | Label |
|-------|-------|
| `pen_and_ink` | Pen and Ink |
| `charcoal_sketch` | Charcoal Sketch |
| `engraving` | Engraving |
| `botanical_illustration` | Botanical Illustration |
| `doodle` | Doodle |
| `geometric` | Geometric |
| `isometric` | Isometric |

### Artist-Inspired (14)
| Value | Label |
|-------|-------|
| `in_the_style_of_van_gogh` | Van Gogh Style |
| `in_the_style_of_kandinsky` | Kandinsky Style |
| `in_the_style_of_gerhard_richter` | Gerhard Richter Style |
| `in_the_style_of_basquiat` | Basquiat Style |
| `in_the_style_of_banksy` | Banksy Style |
| `in_the_style_of_monet` | Monet Style |
| `in_the_style_of_dali` | Dali Style |
| `in_the_style_of_hokusai` | Hokusai Style |
| `in_the_style_of_warhol` | Warhol Style |
| `in_the_style_of_picasso` | Picasso Style |
| `in_the_style_of_klimt` | Klimt Style |
| `in_the_style_of_escher` | Escher Style |
| `in_the_style_of_mucha` | Mucha Style |
| `in_the_style_of_rothko` | Rothko Style |

### Avant-Garde (5)
| Value | Label |
|-------|-------|
| `constructivism` | Constructivism |
| `suprematism` | Suprematism |
| `vorticism` | Vorticism |
| `de_stijl` | De Stijl |
| `brutalism` | Brutalism |

---

## Source 2: wizardData.ts (User-Facing Wizard) — 44 styles

### Classic & Fine Art (10)
`photorealistic`, `oil_painting`, `watercolor`, `renaissance`, `impressionist`, `expressionist`, `art_nouveau`, `art_deco`, `chiaroscuro`, `ukiyo_e`

### Modern & Graphic (7)
`comic_book`, `pop_art`, `bauhaus`, `minimalist`, `flat_design`, `geometric_abstract`, `collage`

### Illustration & Fantasy (8)
`studio_ghibli`, `disney_animation`, `anime`, `storybook`, `fantasy_art`, `cyberpunk`, `steampunk`, `surrealist`

### Texture & Craft (6)
`knitted`, `paper_cut`, `mosaic`, `stained_glass`, `embroidery`, `lego_voxel`

### Photography & Film (5)
`vintage_film`, `film_noir`, `double_exposure`, `synthwave`, `retro_90s`

### Stylized (8)
`pixel_art`, `low_poly`, `sketch`, `pen_and_ink`, `charcoal`, `blue_eyed_samurai`, `invincible`, `big_mouth`

---

## Source 3: models.py (Backend Presets) — 27 styles (incl. "auto")

```
auto, realistic photo, watercolor, oil_painting, noir, studio_ghibli,
comic_book, pixel_art, synthwave, ukiyo_e, renaissance, pen_and_ink,
retro_90s, knitted, expressionist, vintage_film, chiaroscuro, art_deco,
art_nouveau, surrealist, pop_art, brutalist, vaporwave, isometric,
papercraft, claymation, stained_glass, mosaic, charcoal_sketch, blueprint
```

---

## Cross-Reference Table

Key: FC = fieldConfigs.ts, WD = wizardData.ts, MP = models.py

| # | Style Value | Display Label | FC | WD | MP | Notes |
|---|------------|---------------|----|----|-----|-------|
| 1 | `photorealistic` | Photorealistic | Core | Classic & Fine Art | `realistic photo` | **Name mismatch**: MP uses `realistic photo` |
| 2 | `oil_painting` | Oil Painting | Classic Fine Art | Classic & Fine Art | yes | |
| 3 | `watercolor` | Watercolor | Classic Fine Art | Classic & Fine Art | yes | |
| 4 | `renaissance` | Renaissance | Classic Fine Art | Classic & Fine Art | yes | |
| 5 | `impressionist` | Impressionist | `impressionism` | Classic & Fine Art | -- | **Name mismatch**: FC uses `impressionism` |
| 6 | `expressionist` | Expressionist/ism | Classic Fine Art | Classic & Fine Art | yes | FC label says "Expressionism" |
| 7 | `art_nouveau` | Art Nouveau | Classic Fine Art | Classic & Fine Art | yes | |
| 8 | `art_deco` | Art Deco | Classic Fine Art | Classic & Fine Art | yes | |
| 9 | `chiaroscuro` | Chiaroscuro | Classic Fine Art | Classic & Fine Art | yes | |
| 10 | `ukiyo_e` | Ukiyo-e | Asian & Traditional | Classic & Fine Art | yes | |
| 11 | `surrealist` | Surrealist | `surrealism` | Illustration & Fantasy | yes | **Name mismatch**: FC uses `surrealism` |
| 12 | `pop_art` | Pop Art | Classic Fine Art | Modern & Graphic | yes | |
| 13 | `comic_book` | Comic Book | Animation & Comics | Modern & Graphic | yes | |
| 14 | `studio_ghibli` | Studio Ghibli | Animation & Comics | Illustration & Fantasy | yes | |
| 15 | `disney_animation` | Disney Animation | Animation & Comics | Illustration & Fantasy | -- | |
| 16 | `cyberpunk` | Cyberpunk | Digital & Modern | Illustration & Fantasy | -- | |
| 17 | `pixel_art` | Pixel Art | Digital & Modern | Stylized | yes | |
| 18 | `synthwave` | Synthwave | Digital & Modern | Photography & Film | yes | |
| 19 | `retro_90s` | Retro 90s | Digital & Modern | Photography & Film | yes | |
| 20 | `vaporwave` | Vaporwave | Digital & Modern | -- | yes | |
| 21 | `knitted` | Knitted | Craft & Tactile | Texture & Craft | yes | |
| 22 | `mosaic` | Mosaic | Craft & Tactile | Texture & Craft | yes | |
| 23 | `stained_glass` | Stained Glass | Craft & Tactile | Texture & Craft | yes | |
| 24 | `embroidery` | Embroidery | Craft & Tactile | Texture & Craft | -- | |
| 25 | `claymation` | Claymation | Craft & Tactile | -- | yes | |
| 26 | `noir` | Noir | Photography & Film | `film_noir` | yes | **Name mismatch**: WD uses `film_noir` |
| 27 | `vintage_film` | Vintage Film | Photography & Film | Photography & Film | yes | |
| 28 | `double_exposure` | Double Exposure | Photography & Film | Photography & Film | -- | |
| 29 | `pen_and_ink` | Pen and Ink | Illustration | Stylized | yes | |
| 30 | `charcoal_sketch` | Charcoal Sketch | Illustration | `charcoal` | yes | **Name mismatch**: WD uses `charcoal` |
| 31 | `isometric` | Isometric | Illustration | -- | yes | |
| 32 | `blue_eyed_samurai` | Blue Eye Samurai | Animation & Comics | Stylized | -- | |
| 33 | `invincible` | Invincible | Animation & Comics | Stylized | -- | |
| 34 | `big_mouth` | Big Mouth | Animation & Comics | Stylized | -- | |
| 35 | `brutalist` | Brutalism | Avant-Garde | -- | yes | |
| 36 | `papercraft` | Papercraft | -- | -- | yes | **MP only** |
| 37 | `blueprint` | Blueprint | -- | -- | yes | **MP only** |
| 38 | `cubism` | Cubism | Classic Fine Art | -- | -- | **FC only** |
| 39 | `baroque` | Baroque | Classic Fine Art | -- | -- | **FC only** |
| 40 | `pointillism` | Pointillism | Classic Fine Art | -- | -- | **FC only** |
| 41 | `fauvism` | Fauvism | Classic Fine Art | -- | -- | **FC only** |
| 42 | `minimalism` | Minimalism | Classic Fine Art | `minimalist` | -- | **Name mismatch** |
| 43 | `abstract_art` | Abstract Art | Classic Fine Art | -- | -- | **FC only** |
| 44 | `chinese_ink_wash` | Chinese Ink Wash | Asian & Traditional | -- | -- | **FC only** |
| 45 | `persian_miniature` | Persian Miniature | Asian & Traditional | -- | -- | **FC only** |
| 46 | `folk_art` | Folk Art | Asian & Traditional | -- | -- | **FC only** |
| 47 | `manga` | Manga | Animation & Comics | -- | -- | **FC only** |
| 48 | `one_piece_style` | One Piece Style | Animation & Comics | -- | -- | **FC only** |
| 49 | `dragon_ball_style` | Dragon Ball Z Style | Animation & Comics | -- | -- | **FC only** |
| 50 | `rick_and_morty_style` | Rick and Morty Style | Animation & Comics | -- | -- | **FC only** |
| 51 | `south_park_style` | South Park Style | Animation & Comics | -- | -- | **FC only** |
| 52 | `pixar_3d` | Pixar 3D | Animation & Comics | -- | -- | **FC only** |
| 53 | `cartoon_network` | Cartoon Network | Animation & Comics | -- | -- | **FC only** |
| 54 | `flat_illustration` | Flat Illustration | Digital & Modern | -- | -- | **FC only** |
| 55 | `graffiti_street_art` | Graffiti / Street Art | Digital & Modern | -- | -- | **FC only** |
| 56 | `lowbrow_pop_surrealism` | Lowbrow / Pop Surrealism | Digital & Modern | -- | -- | **FC only** |
| 57 | `futurism` | Futurism | Digital & Modern | -- | -- | **FC only** |
| 58 | `glitch_art` | Glitch Art | Digital & Modern | -- | -- | **FC only** |
| 59 | `neon_noir` | Neon Noir | Digital & Modern | -- | -- | **FC only** |
| 60 | `paper_cut_art` | Paper Cut Art | Craft & Tactile | `paper_cut` | -- | **Name mismatch** |
| 61 | `origami` | Origami | Craft & Tactile | -- | -- | **FC only** |
| 62 | `woodblock_print` | Woodblock Print | Craft & Tactile | -- | -- | **FC only** |
| 63 | `polaroid` | Polaroid | Photography & Film | -- | -- | **FC only** |
| 64 | `daguerreotype` | Daguerreotype | Photography & Film | -- | -- | **FC only** |
| 65 | `tilt_shift` | Tilt Shift | Photography & Film | -- | -- | **FC only** |
| 66 | `engraving` | Engraving | Illustration | -- | -- | **FC only** |
| 67 | `botanical_illustration` | Botanical Illustration | Illustration | -- | -- | **FC only** |
| 68 | `doodle` | Doodle | Illustration | -- | -- | **FC only** |
| 69 | `geometric` | Geometric | Illustration | -- | -- | **FC only** |
| 70 | `in_the_style_of_van_gogh` | Van Gogh Style | Artist-Inspired | -- | -- | **FC only** |
| 71 | `in_the_style_of_kandinsky` | Kandinsky Style | Artist-Inspired | -- | -- | **FC only** |
| 72 | `in_the_style_of_gerhard_richter` | Gerhard Richter Style | Artist-Inspired | -- | -- | **FC only** |
| 73 | `in_the_style_of_basquiat` | Basquiat Style | Artist-Inspired | -- | -- | **FC only** |
| 74 | `in_the_style_of_banksy` | Banksy Style | Artist-Inspired | -- | -- | **FC only** |
| 75 | `in_the_style_of_monet` | Monet Style | Artist-Inspired | -- | -- | **FC only** |
| 76 | `in_the_style_of_dali` | Dali Style | Artist-Inspired | -- | -- | **FC only** |
| 77 | `in_the_style_of_hokusai` | Hokusai Style | Artist-Inspired | -- | -- | **FC only** |
| 78 | `in_the_style_of_warhol` | Warhol Style | Artist-Inspired | -- | -- | **FC only** |
| 79 | `in_the_style_of_picasso` | Picasso Style | Artist-Inspired | -- | -- | **FC only** |
| 80 | `in_the_style_of_klimt` | Klimt Style | Artist-Inspired | -- | -- | **FC only** |
| 81 | `in_the_style_of_escher` | Escher Style | Artist-Inspired | -- | -- | **FC only** |
| 82 | `in_the_style_of_mucha` | Mucha Style | Artist-Inspired | -- | -- | **FC only** |
| 83 | `in_the_style_of_rothko` | Rothko Style | Artist-Inspired | -- | -- | **FC only** |
| 84 | `constructivism` | Constructivism | Avant-Garde | -- | -- | **FC only** |
| 85 | `suprematism` | Suprematism | Avant-Garde | -- | -- | **FC only** |
| 86 | `vorticism` | Vorticism | Avant-Garde | -- | -- | **FC only** |
| 87 | `de_stijl` | De Stijl | Avant-Garde | -- | -- | **FC only** |
| 88 | `bauhaus` | Bauhaus | -- | Modern & Graphic | -- | **WD only** |
| 89 | `flat_design` | Flat Design | -- | Modern & Graphic | -- | **WD only** |
| 90 | `geometric_abstract` | Geometric Abstract | -- | Modern & Graphic | -- | **WD only** |
| 91 | `collage` | Collage | -- | Modern & Graphic | -- | **WD only** |
| 92 | `anime` | Anime / Cel Shading | -- | Illustration & Fantasy | -- | **WD only** |
| 93 | `storybook` | Storybook Illustration | -- | Illustration & Fantasy | -- | **WD only** |
| 94 | `fantasy_art` | Fantasy Art | -- | Illustration & Fantasy | -- | **WD only** |
| 95 | `steampunk` | Steampunk | -- | Illustration & Fantasy | -- | **WD only** |
| 96 | `lego_voxel` | Lego / Voxel | -- | Texture & Craft | -- | **WD only** |
| 97 | `low_poly` | Low Poly | -- | Stylized | -- | **WD only** |
| 98 | `sketch` | Sketch / Pencil | -- | Stylized | -- | **WD only** |

---

## Name Mismatches Across Sources

These styles exist in multiple sources but use different `value` strings:

| Concept | fieldConfigs | wizardData | models.py |
|---------|-------------|------------|-----------|
| Photorealistic | `photorealistic` | `photorealistic` | `realistic photo` |
| Impressionism | `impressionism` | `impressionist` | -- |
| Surrealism | `surrealism` | `surrealist` | `surrealist` |
| Minimalism | `minimalism` | `minimalist` | -- |
| Noir | `noir` | `film_noir` | `noir` |
| Paper Cut | `paper_cut_art` | `paper_cut` | -- |
| Charcoal | `charcoal_sketch` | `charcoal` | `charcoal_sketch` |

---

## Flat Master List — All 98 Unique Styles

Alphabetical. For curation: mark each as KEEP (wizard ~50) or CUT, and separately mark LLM (~27).

```
  1. abstract_art              — Abstract Art
  2. anime                     — Anime / Cel Shading
  3. art_deco                  — Art Deco
  4. art_nouveau               — Art Nouveau
  5. baroque                   — Baroque
  6. bauhaus                   — Bauhaus
  7. big_mouth                 — Big Mouth
  8. blue_eyed_samurai          — Blue Eye Samurai
  9. blueprint                 — Blueprint
 10. botanical_illustration     — Botanical Illustration
 11. brutalism                 — Brutalism
 12. cartoon_network            — Cartoon Network
 13. charcoal / charcoal_sketch — Charcoal (reconcile name)
 14. chiaroscuro               — Chiaroscuro
 15. chinese_ink_wash           — Chinese Ink Wash
 16. claymation                — Claymation
 17. collage                   — Collage
 18. comic_book                — Comic Book
 19. constructivism            — Constructivism
 20. cubism                    — Cubism
 21. cyberpunk                 — Cyberpunk
 22. daguerreotype             — Daguerreotype
 23. de_stijl                  — De Stijl
 24. disney_animation           — Disney Animation
 25. doodle                    — Doodle
 26. double_exposure            — Double Exposure
 27. dragon_ball_style          — Dragon Ball Z Style
 28. embroidery                — Embroidery
 29. engraving                 — Engraving
 30. expressionist             — Expressionism
 31. fantasy_art               — Fantasy Art
 32. fauvism                   — Fauvism
 33. film_noir / noir          — Film Noir (reconcile name)
 34. flat_design               — Flat Design
 35. flat_illustration          — Flat Illustration
 36. folk_art                  — Folk Art
 37. futurism                  — Futurism
 38. geometric                 — Geometric
 39. geometric_abstract         — Geometric Abstract
 40. glitch_art                — Glitch Art
 41. graffiti_street_art        — Graffiti / Street Art
 42. impressionism / impressionist — Impressionism (reconcile name)
 43. in_the_style_of_banksy     — Banksy Style
 44. in_the_style_of_basquiat   — Basquiat Style
 45. in_the_style_of_dali       — Dali Style
 46. in_the_style_of_escher     — Escher Style
 47. in_the_style_of_gerhard_richter — Gerhard Richter Style
 48. in_the_style_of_hokusai    — Hokusai Style
 49. in_the_style_of_kandinsky  — Kandinsky Style
 50. in_the_style_of_klimt      — Klimt Style
 51. in_the_style_of_monet      — Monet Style
 52. in_the_style_of_mucha      — Mucha Style
 53. in_the_style_of_picasso    — Picasso Style
 54. in_the_style_of_rothko     — Rothko Style
 55. in_the_style_of_van_gogh   — Van Gogh Style
 56. in_the_style_of_warhol     — Warhol Style
 57. invincible                — Invincible
 58. isometric                 — Isometric
 59. knitted                   — Knitted / Crochet
 60. lego_voxel                — Lego / Voxel
 61. low_poly                  — Low Poly
 62. lowbrow_pop_surrealism     — Lowbrow / Pop Surrealism
 63. manga                     — Manga
 64. minimalism / minimalist   — Minimalism (reconcile name)
 65. mosaic                    — Mosaic
 66. neon_noir                 — Neon Noir
 67. oil_painting              — Oil Painting
 68. one_piece_style            — One Piece Style
 69. origami                   — Origami
 70. paper_cut / paper_cut_art — Paper Cut (reconcile name)
 71. papercraft                — Papercraft
 72. pen_and_ink               — Pen and Ink
 73. persian_miniature          — Persian Miniature
 74. photorealistic / realistic_photo — Photorealistic (reconcile name)
 75. pixel_art                 — Pixel Art
 76. pixar_3d                  — Pixar 3D
 77. pointillism               — Pointillism
 78. polaroid                  — Polaroid
 79. pop_art                   — Pop Art
 80. renaissance               — Renaissance
 81. retro_90s                 — Retro 90s
 82. rick_and_morty_style       — Rick and Morty Style
 83. sketch                    — Sketch / Pencil
 84. south_park_style           — South Park Style
 85. stained_glass             — Stained Glass
 86. steampunk                 — Steampunk
 87. storybook                 — Storybook Illustration
 88. studio_ghibli             — Studio Ghibli
 89. suprematism               — Suprematism
 90. surrealism / surrealist   — Surrealism (reconcile name)
 91. synthwave                 — Synthwave / Retrowave
 92. tilt_shift                — Tilt Shift
 93. ukiyo_e                   — Ukiyo-e
 94. vaporwave                 — Vaporwave
 95. vintage_film              — Vintage Film / Polaroid
 96. vorticism                 — Vorticism
 97. woodblock_print            — Woodblock Print
 98. cyberpunk                 — Cyberpunk
```

---

## Summary Stats

| Source | Count | Purpose |
|--------|-------|---------|
| fieldConfigs.ts | 88 + 3 meta | Admin settings panel (power users) |
| wizardData.ts | 44 | User-facing wizard (simplified) |
| models.py | 27 (incl. auto) | Backend validation tuple |
| **Unique across all** | **98** | Master list for curation |
| Name mismatches | **7** | Must reconcile before sync |

## Action Items for Curation

1. **Reconcile 7 naming mismatches** — pick one canonical value per concept
2. **Curate wizard list** — target ~50 styles from this master list
3. **Curate LLM auto-picker list** — target ~27 styles to inject into the prompt when `art_style == "auto"`
4. **Sync models.py** — update `ART_STYLE_PRESETS` tuple to match curated LLM list
5. **Consider**: should the LLM prompt include the full curated list, or just a subset of "safe bets"?
