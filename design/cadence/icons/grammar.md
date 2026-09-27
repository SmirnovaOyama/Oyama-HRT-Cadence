# Cadence icon grammar

Owner update, 2026-09-25: redraw the control and navigation icons as simple outlines. Preserve the approved Today icon exactly. This revision replaces the older requirement for a toned area in every icon.

## Drawing style

- Original drawings in a 24 × 24 view box. No icon library, raster substitutions, shadows, gradients, filters, masks or clip paths.
- One recognisable silhouette and only the interior strokes needed to explain it. Avoid double outlines, miniature ticks and decorative fill areas.
- Use `currentColor`, `fill="none"`, round caps and round joins. Today retains its original 0.18 tone and segmented rim. Sublingual uses a 0.12 tablet fill. Tests uses a subtle 0.16 sample fill, following the owner’s 2026-09-26 request for more definition. Appearance fills its dark half solid (owner request, 2026-09-27).
- Warning, information and help punctuation dots are solid. These dots are part of the symbol, not decorative bullets.
- Each check is exactly two straight segments with a sharp vertex: `stroke-linejoin="miter" stroke-miterlimit="10"`. Its endpoints remain rounded.
- Aim for stroke centres inside 3–21 with balanced optical padding. Small adjustments for diagonal and organic forms are allowed. Keep distinct strokes far enough apart to remain legible at 16px.
- Use a 0.5-unit grid where practical. Curves may use arcs or cubic paths for natural silhouettes. Do not add perspective or shaded faces to small objects.
- App icons, the pixel cat, charts and the rhythm dial are separate assets and are not part of this set.

## Optical weight

Keep the existing shared sizing in `src/components/icons/Icon.tsx`:

| Rendered size | Stroke width in the 24-unit view box |
|---|---|
| 22px and larger | 1.75 |
| 18–21px | 2 |
| Under 18px | 2.25 |

This keeps icons legible next to the Apple system font. Today uses the same unmodified helper. Call sites control size and colour, not stroke weight.

## Construction

Owner request, 2026-09-27: polish every icon. These rules keep the set consistent and are checked at 16px on a 1× display as well as at 20 and 22px.

- Circles share Today's rim: radius 9 about the centre (info, help, clock, in-target, off, globe, radar, spinner). Rotating arrows (reset, activity log, sync) use exact arcs of radius 8.5 about the centre.
- Punctuation dots have radius 1.25, so they are never thinner than the 2.25 stroke used below 18px.
- Rounded corners are tangent to both edges they join; there are no kinks where an arc meets a straight edge. Every arc radius fits its chord, so the browser never silently rescales it.
- Plus, minus and log span 5.5–18.5; close spans 6.5–17.5, so the diagonal cross does not look larger than the plus.
- Families share one outline: cloud, backed up, cloud off, upload and download use the same three-lobe cloud; shield, two-step and shield off use the same shield. Off variants cut the outline 3.25 units clear of the slash rather than drawing over it.
- Keep parallel strokes at least 3.5 units apart where possible so they stay separate at 16px (for example the permissions toggles and the single graduation on the syringe).
- Centre each glyph's bounding box on (12, 12) to within half a unit, unless an organic shape needs an optical offset.

## Main silhouettes

- Today: the approved segmented day dial, unchanged.
- Timeline: three round event markers joined by a vertical line, with short horizontal entries.
- Tests: a tilted sample tube with a distinct rim, sample-level line and subtle liquid fill.
- You: a round head and open shoulders.
- Reminders: a bell with a separate clapper.
- Supplies: a medicine bottle with a simple cross.
- Routes: a syringe, scored capsule, peeled patch, pump bottle and a tablet with a downward arrow for sublingual administration (no tongue, per the owner’s 2026-09-26 update). Route labels remain visible. The Taken as dropdown uses vivid colored tiles (owner update, 2026-09-26), with plus/minus badges for Patch on/off; selected route and medicine glyphs also appear beside their values in the trigger (owner update, 2026-09-26). Estradiol and all five supported esters use the owner-provided pink spiral artwork in `src/assets/estradiol.png`, with a distinct background color for each compound (2026-09-26). Other medicine options use the original abstract Molecule glyph in distinct two-tone tiles; these are decorative symbols, not molecular structure diagrams.
- Actions: simple plus, arrows, chevrons and checks with no enclosing decoration.
- Settings: a symmetric six-tooth gear with a round centre.
- HRT type: three fused hormone rings, like the steroid core estradiol and testosterone share (owner request, 2026-09-27; the owner rejected the transgender symbol). Disclaimer: a page with a folded corner and an exclamation mark, no longer Admin's shield. Appearance: half sun, half moon.
- Key: a plain bow at lower left and a blade rising to the upper right with a two-step bit, so it never resembles the search magnifier. Passkey: a person with a key standing beside them (the common passkey mark), replacing the fingerprint (owner request, 2026-09-27).
- Two-step and verified: two-step is a shield with a check; verified is a scalloped seal with a check, so the two no longer look identical.
- Off states: an open or interrupted outline and a diagonal stroke; do not pile a slash over dense detail.

## Source and generation

`icons.json` contains 106 icons. Keep the existing kebab-case keys and React aliases stable. All markup must consist of self-closing `path`, `circle`, `rect`, `line`, `polyline`, `polygon` or `ellipse` primitives accepted by `scripts/gen-icons.ts`.

Run `bun run icons` after editing the JSON. This writes `src/components/icons/generated.tsx`; do not edit that file by hand. Keep `Icon.tsx` accessibility behaviour and forwarded SVG props intact.

Check the generated icons in both light and dark themes at 16, 20 and 22px, including the desktop sidebar and mobile tab bar. Large-size previews help check geometry but do not replace checks at the actual control sizes.
