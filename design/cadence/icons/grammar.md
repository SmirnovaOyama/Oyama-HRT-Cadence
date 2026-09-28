# Cadence icons (revision 4)

Owner update, 2026-09-28: the owner drew the icon set themselves. Their 46 drawings replace every earlier revision
and its construction rules (optical stroke sizing, the miter check, fixed circle radii, the protected Today dial).
When a drawing and an older rule disagree, the drawing wins. `sheet.png` shows the set in both themes at 48, 20 and
16px.

## How the set is drawn

- A 24 × 24 view box, outline only, in `currentColor`: `fill="none"`, round caps and round joins.
- One stroke width for every icon at every size: 1.7 in the 24-unit box (`ICON_STROKE_WIDTH` in
  `src/components/icons/Icon.tsx`). Icons render exactly as drawn; call sites set size and colour only.
- Small solid dots (warning, information and help punctuation, the two-step code, the test-tube bubbles) are filled
  circles with no stroke.
- No text, images, gradients, filters, masks or clip paths. Markup is limited to self-closing `path`, `circle`,
  `rect`, `line`, `polyline`, `polygon` and `ellipse`, which `scripts/gen-icons.ts` accepts.

## The set

Only icons the app shows are kept. Keys are stable; the React components are their PascalCase names.

- Navigation: today, timeline, tests, reminder, supplies, you, shield (admin), log.
- Routes and records: injection, tablet, sublingual, gel, patch (on and off), blood-drop.
- Actions: plus, minus, close, back, share, copy, external, delete, select, search, eye, eye-off.
- Chevrons and selection: chevron-right, chevron-left, chevron-down, chevron-up, check.
- Status: attention, info, help, in-target, clock, spinner, verified.
- Sync and account: backed-up, cloud, cloud-off, sync, lock, two-step, passkey, notice.

## Where icons appear (owner update, 2026-09-28)

- Navigation: the desktop rail and the mobile tab bar.
- Content rows (doses, schedules, results, supplies, route and supply-kind choices): one 20px glyph in the muted ink
  via `RowGlyph`, no tile and no medicine colour. An "Add" row may take the accent plus; a reorder row the attention
  colour.
- Settings-style rows (You, Account, sub-pages, reminder and supply options), field labels and group headings:
  no icons.
- Text buttons: words only, except add (+), share, copy and icon-only buttons. Busy states keep their spinner.
- Status: warning, in-target, lock and similar markers stay, always beside words.

## Adding or replacing an icon

Ask the owner for the drawing. Paste the SVG's inner markup into `icons.json` under its kebab-case key, run
`bun run icons` (which writes `src/components/icons/generated.tsx`; do not edit that file by hand), and check the icon
in both themes at the sizes it is used, including the desktop rail and the mobile tab bar. Keep `Icon.tsx`
accessibility behaviour and forwarded SVG props intact, and never add an icon library.
