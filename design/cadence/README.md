# Cadence design

Cadence is the redesign of Oyama's HRT Tracker. Today is built around a dial. Its rim shows the dosing routine: the outer ring is the injection cycle and the inner ring is daily pills. The centre shows the estimated level and the pixel cat. A plain-language sentence underneath says whether that is okay.

The live design canvas is https://claude.ai/artifact/TXvv5QraYATpKNdkCmQnCq (private to its owner). `boards/` is a copy of it.

Current implementation and verification boundaries are recorded in [implementation-status.md](implementation-status.md).

## Source of truth, in priority order

0. `spec/format_rules.md`: row density and page structure, including the owner's 2026-09-24 preference to minimise small section headings. It overrides the boards' row layouts: one-line titles, a value OR a short sub-line (never both), explanations in group footers, no icon tiles in settings lists, destructive actions in their own group, and no redundant group headers.
1. `boards/*.dc.html`: the final artboards. When a spec disagrees with a board, the board wins unless a later owner rule below overrides it. The boards are self-contained HTML with inline styles, so exact values can be read straight from them.
2. `icons/icons.json` and `icons/grammar.md`: the owner's own icon set (46 icons, revision 4 of 2026-09-28) and how it is used. Each value in `icons.json` is the inner markup of `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">`, and every icon renders at that drawn weight. `icons/sheet.png` shows the set in both themes.
3. `spec/typescale.md`: type sizes (revision 2). Mobile uses Apple HIG sizes (body 17, secondary 15, 13 only for chart ticks and tab labels). Desktop is about 1.1× that.
4. `spec/fonts_buttons_v2.md`: Apple system fonts and the control system. Revision 6 records the owner's capsule-control update and lighter treatment, overriding older control shapes and weights.
5. `spec/listview_v3.md`: choosers are iOS-style inset grouped lists.
6. `spec/tokens.md` (colours, radii, spacing) and `spec/components.md` (component recipes and shared sample data). A section in either file marked "superseded" has been replaced by one of the files above.
7. `spec/direction.md`, `spec/boards/*.md` and `spec/features_and_concepts.json`: the original direction, the per-board briefs, and the new-feature research (reminders, supplies, MCP assistant, lab planner, site rotation, clinician letter), with their technical and privacy constraints.

## Rules the owner set (do not break)

- The app is English-only (latest owner request, 2026-09-24). Use English UI copy and date formatting regardless of browser or saved language, with no language selector or non-English fallback. This overrides the older seven-language UI requirement; retained translations are source reference only.
- No shadows of any kind and no gradients (CSS or SVG, including fade masks). Depth comes from tone, borders and spacing.
- No all-caps titles or labels. Use sentence case.
- Minimise small section headings. Prefer whitespace and grouped rows; retain a visible field or choice label only when the control would otherwise be unclear.
- No popup menus, floating dialogs or bottom sheets. Substantial forms, selectors and confirmations that need a separate view belong in secondary pages inside the existing app window, with Back and preserved parent drafts. Simple numeric values may be typed in place. Date/time capsules are buttons expanding an inline calendar or options within the page, without navigation, text boxes, overlays, or native popup pickers. This owner update (2026-09-24) overrides all modal/sheet artboards and older recipes.
- Never put a dot (or `·` / `•`) before a label. Show status with an icon plus words.
- Icons are our own drawings. Never use lucide or any other icon library.
- A check mark is two straight line segments with no curves (the owner's 2026-09-28 drawing joins them round).
- Fonts are Apple system fonts only: `-apple-system` / SF Pro, PingFang for CJK, and SF Mono for code. No web fonts.
- Type is large, following HIG. Never go below 13px on mobile or 14px on desktop.
- Buttons are Apple-style capsules (fully rounded) and never chunky: primary 50px, compact 44px, small 36px, secondary a borderless tinted fill, and one filled primary per region.
- Capsule shapes also apply to icon buttons (circles when square), segmented tracks and segments, date/time triggers, single-line fields, and sidebar navigation. Keep grouped list rows, containers, cards, chart marks, and multiline textareas in their existing shapes. This owner update (2026-09-24) overrides the older rectangular-control rule.
- Keep controls visually light: shared button and Back labels use weight 500, secondary buttons use the plate fill, and field edges are quiet while focus remains clear. Steppers use smaller visible circles without shrinking hit targets. Page titles and approved segmented labels retain their weights; exact values are in revision 6.
- Stepper numbers may roll slightly in the increment/decrement direction while their units stay still. Updates are instant when reduced motion is preferred.
- Pick-one and pick-many choices use grouped list views with a trailing check. Never use chip groups or 2-column option cards.
- Rows stay light: one-line titles, a trailing value or a one-line state sub-line (never both), explanations only in group footers (`spec/format_rules.md`).
- The pixel cat is the app's real sprite from `src/components/PixelCat.tsx`, with its colours from `src/index.css`. Never redraw it.

Latest owner update (2026-09-25): simple option selectors use dropdowns that expand in place,
not secondary pages. Selecting an option retains the form draft. Latest owner update (2026-09-26): keep the
dropdown open after selection; close it only with its trigger or Escape.
This overrides the older requirement to put simple choices on secondary pages; keep substantial
forms and confirmations on their existing pages.

Owner update (2026-09-25, superseded by 2026-09-28 below): use the revised simple outline icon set; preserve Today exactly.

Owner update (2026-09-26; its icon and colour requests are superseded by 2026-09-28 below): make interactions more colorful and fluid. Use brief press responses,
smooth inline expansion and selection feedback, and clear save confirmations. Keep motion tied to actions,
respect reduced motion, preserve drafts and immediate data updates, and retain the no-shadow/no-gradient rule.
The same update requests icons throughout forms, actions, settings, reminders, supplies and sharing.
Use the existing original glyphs with visible labels, colorful medicine/route tiles, and compact colored
outline glyphs for ordinary settings and field labels. Preserve the approved Today glyph and pixel cat.

Latest owner update (2026-09-26): support English and Simplified Chinese, with an inline language selector on the You page and localized dates. Preserve existing language preferences. This overrides all earlier English-only instructions. Deploy the redesign to hrt.mahiro.uk while preserving the original site’s accounts, encrypted backups, avatars and browser records.

Latest owner update (2026-09-28): people criticised the UI as cluttered ("眼花缭乱") and the icons as AI slop. Calm
everything down and redraw the icons like the ones in Claude's apps. This overrides the icon and colour parts of
the 2026-09-25/26/27 updates, including the approved Today glyph, colorful route and medicine tiles, the estradiol
artwork in pickers, and colored settings and field-label glyphs.

- Icons are the owner's own drawings (`icons/grammar.md` revision 4). Ask the owner for new ones rather than drawing them.
- One accent. Colour carries meaning only: the accent for the primary action and selection, green, amber and red for
  status, and the chart's series. No colour-coding of medicines in lists, pickers, supply bars or confirmations.
- Settings-style rows, field labels and small group headings carry no icons. Content rows (doses, schedules, results,
  supplies, route choices) lead with one muted 20px glyph (`RowGlyph`), never a tinted tile.
- Text buttons are words only, except add (+), share, copy, external links and icon-only buttons.
- Say a thing once: Today drops the range ruler under the dial (the status sentence names the target) and keeps its
  details to quiet text lines. The chart's "Now" marker, past shading and read-off box are removed or reduced to text.
- The desktop rail's actions are capsule rows with a small circle (accent for Log a dose), like Claude's "New chat".
- Timeline history is one card with each day as a quiet heading inside it.
