# Cadence icon grammar

These are original drawings for the Cadence redesign. The icons are flat and drawn with line strokes. Each one carries a single toned area.

## The `<svg>` element
```html
<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
     stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <!-- inner markup from icons.json -->
</svg>
```
- Colour always comes from `currentColor`. The tone uses the same colour through `fill="currentColor" fill-opacity="0.18" stroke="none"`, so the icons work in light, dark and black-and-white themes and on accent tiles with no extra tokens.
- The markup uses only `path`, `circle`, `rect`, `line`, `polyline`, `polygon` and `ellipse`. There are no gradients, filters, shadows, text, masks or clip paths.

## Stroke and optical sizing
| Rendered size | stroke-width (in 24-unit space) | Ink on screen |
|---|---|---|
| 22 to 24px and above (tabs, icon buttons) | 1.75 | 1.6 to 1.75px |
| 20px (icon tiles, back header, tags) | 2 | 1.67px |
| 16px (chevrons, tag icons, chips) | 2.25 | 1.5px |

In React: `strokeWidth = size >= 22 ? 1.75 : size >= 18 ? 2 : 2.25`. The geometry never changes between sizes. Only the weight changes, so small icons keep the visual weight of Atkinson Hyperlegible's strokes.

## Construction
- **Caps and joins:** always round. The ends are soft, which matches the terracotta-and-paper warmth, and a round cap also survives antialiasing at 16px.
- **Grid:** every coordinate sits on a 0.5 grid. There is one exception: points on a circle are placed exactly (to 2 decimals) so that a rim divides evenly, as in the Today dial's seven segments. Never snap a rim.
- **Live area:** stroke centres stay inside 3 to 21, and ink stays inside the 2px safe padding at every weight. The box is 17 to 18 units across, so a circle is r 8.5 to 9. A tall object such as a tube or bottle is about 18 units high and 5 to 10 units wide.
- **Corner radius:** there are three steps. 1.5 on small parts (caps, stoppers), 2.5 on medium bodies (bottle, tube bottom), and 3.5 on large plates (patch). Only radii from this scale are used.
- **Curves:** built from circular or elliptical arcs and straight lines. Free cubic curves appear only for organic or data shapes (the level curve, the bell's flare, the patch curl). Each one has horizontal tangents at its extremes, so a peak reads as a smooth crest and never as a spike.
- **Perspective:** only as a single ellipse used for thickness (tablet, sublingual tablet). There is no other 3D.
- **Density:** at most 3 to 4 ideas per icon, and gaps of at least 1.5 units between parallel strokes so they don't fill in at 16px.
- **Forbidden:** dots or anything bullet-like (clappers, holes and the tongue groove are open arcs or lines), three-dot "more" icons, sparkles, robot faces, letters and emoji.

## Signature trait: the level
**Each icon has one flat tone at fill-opacity 0.18, and it fills only the part that has already happened or is already inside. It always stops at a stroke that works as a level:** a Now rule, a fill line, a stopper, a score line, a fold, or the icon's own base line.

This is the Cadence idea at icon scale. On the dial the elapsed part of the day is toned. On charts the past sits on plate and the future on paper, split at the Now rule. The icons use the same logic:
- today: the day so far, up to the hand
- timeline: one completed level curve over simple axes, toned down to the base line; no crossing Now rule or repeated peaks at navigation size
- tests: the sample, up to its fill line, in a wide rounded tube with a single open rim; no enclosed cap or small graduation marks
- injection: the dose in the barrel, up to the stopper
- tablet: the half you take, up to the score
- patch: the part still on the skin, up to the peel fold
- gel: the gel, up to its level
- sublingual: a small tablet beneath an open side-view tongue outline; only the tablet is toned. Keep the two shapes separated, without a mouth ellipse or tongue groove, so the glyph stays quiet and legible at 16px.
- reminder: the sounding band of the bell
- you: the body, on its base line
- site: the side of the body used last time, up to the centre line
- assistant: the plug, your side of the connection

Rules:
1. Use one toned area per icon. Tone is never a status signal on its own: status is still an icon plus words.
2. The tone is drawn first, with no stroke, underneath the outline. Its level side always lands on a stroke. Its other edges follow the outline, except on the dial, where the sector's start and radius stay soft, like a sweep.
3. Pure action glyphs (log / plus, and later chevrons, close and check) carry **no** tone. They sit on filled buttons or are too small to need one.
4. Fill-opacity stays at 0.18, within the allowed 0.16 to 0.22. On an accent tile (#A34A28 on #F6DFD2) and in dark mode (#F1EBE2 on #16130F) it reads as the same "plate" step as the charts.

## Shared parts
- **Tick:** every check mark is exactly two straight line segments meeting at a sharp (miter) vertex, with no curves at all (the user asked for this explicitly). The same shape is used alone (check), in a ring (in-target), in the shield (two-step) and in the cloud (backed-up). The vertex of the tick is a SHARP corner: the tick path carries stroke-linejoin="miter" stroke-miterlimit="10" (the user asked for crisp corners on every check mark); its two ends keep round caps.
- **Arrowheads:** open heads of about 100 degrees on up, down and back. Diagonal and circular arrows (external, sync, repeat, activity-log) use short open corners or chevrons laid on the path.
- **Person:** you and site share one figure: an r 3.5 head at y 7.5 over an r 7.5 half-disc body on the y 20.5 base line.

## Originality
Every icon was checked against lucide, the app's current set. Where a concept is shared (calendar, lock, copy, share and so on), the construction is different: the proportions, the parts, the arrangement and the tone all differ. Universal signs (plus, minus, close) use this set's own lengths on its own optical scale.

## How to extend the set
Draw the object in outline at 1.75 on the 0.5 grid inside 3 to 21. Ask which part of it is "done" or "inside", and tone only that part, stopping at a real stroke. If nothing in the icon is done or inside (arrows, close, chevrons), leave it untoned. Check it at 16px in dark mode before you ship it.

## Additions (second round: the app-wide set)
These 42 icons replace every remaining lucide import. They follow the rules above, plus these shared parts:
- **Off form** (cloud-off, shield-off, image-off, off): a 45-degree slash from top left to bottom right (3.5 to 20.5, or 4 to 20 on the shorter cloud). The outline is cut back about 2.3 units on each side of the slash, measured at right angles to it. Each cut end is a point on the rim or on the 0.5 grid. The off form has no tone, because nothing is on or inside. `off` is the in-target ring cut this way; it is not a ring with a bar across it.
- **Hidden** (eye-off) is a shut eye, not a slashed one: the lower lid of `eye` with three lashes. `eye` and `eye-off` toggle as a pair.
- **Spinner** is an open three-quarter arc on r 8.5 with no tone. Rotate the whole icon to animate it (the React component accepts `className="animate-spin"`). Loading is a passing state, so it carries no tone.
- **Chevrons** (up, down, left, right) are the same 11 by 4.5 open corner turned four ways.
- **Calibration methods** form a family: off, gauge (MIPD: the dial swept up to the needle), radar (EKF: the wedge just swept, up to the sweep line) and wind (OU-Kalman: a windsock, with the first band toned up to a band stroke). Forward and rewind put a Now rule on one side with two open chevrons running away from it.
- **Ester decorations** (helpers.tsx) form a small science family, all toned on their core part: molecule (E2), shield (CPA, the shield split down the middle with the left half toned), shell (EV), ring (EB, a benzene hexagon), orbit (EC), helix (EN) and flask (EU and the default case).
- **Gel.** Route.gel uses the existing `gel` pump bottle, to match the other route icons. `gel-drop` (a dollop on the skin line) is kept for inline places where the bottle is too busy.
- **Hard drive** is a desk drive seen from the front: a housing on a base slab with a short slot stroke. The slab is toned up to the housing line. It has no platter, because a platter and arm read as a "Q" at 14px.
- Free cubics are also allowed for the helix strands and the gel dollop. They are organic shapes, and they have vertical tangents at the helix extremes and a horizontal tangent at the dollop crest.

## React
`bun run icons` reads this file's `icons.json` and writes `src/components/icons/generated.tsx`. `src/components/icons/index.ts` exports each icon in PascalCase (`InTarget`, `ChevronRight`), plus lucide-named aliases (`Home`, `Loader2`) during the migration. Optical stroke sizing follows the table above. `sheet.png` next to this file shows every icon at 48, 20 and 16px in both themes.
