# Cadence design

Cadence is the redesign of Oyama's HRT Tracker. Today is built around a dial. Its rim shows the dosing routine: the outer ring is the injection cycle and the inner ring is daily pills. The centre shows the estimated level and the pixel cat. A plain-language sentence underneath says whether that is okay.

The live design canvas is https://claude.ai/artifact/TXvv5QraYATpKNdkCmQnCq (private to its owner). `boards/` is a copy of it.

## Source of truth, in priority order

1. `boards/*.dc.html`: the final artboards. When a spec disagrees with a board, the board wins. The boards are self-contained HTML with inline styles, so exact values can be read straight from them.
2. `icons/icons.json` and `icons/grammar.md`: the original icon set (61 icons) and its construction rules. Each value in `icons.json` is the inner markup of `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">`. The stroke width follows optical sizing: 1.75 at 22px and up, 2 at 18–21px, 2.25 below 18px.
3. `spec/typescale.md`: type sizes (revision 2). Mobile uses Apple HIG sizes (body 17, secondary 15, 13 only for chart ticks and tab labels). Desktop is about 1.1× that.
4. `spec/fonts_buttons_v2.md`: Apple system fonts and the button system.
5. `spec/listview_v3.md`: choosers are iOS-style inset grouped lists.
6. `spec/tokens.md` (colours, radii, spacing) and `spec/components.md` (component recipes and shared sample data). A section in either file marked "superseded" has been replaced by one of the files above.
7. `spec/direction.md`, `spec/boards/*.md` and `spec/features_and_concepts.json`: the original direction, the per-board briefs, and the new-feature research (reminders, supplies, MCP assistant, lab planner, site rotation, clinician letter), with their technical and privacy constraints.

## Rules the owner set (do not break)

- No shadows of any kind and no gradients (CSS or SVG, including fade masks). Depth comes from tone, borders and spacing.
- No all-caps titles or labels. Use sentence case.
- Never put a dot (or `·` / `•`) before a label. Show status with an icon plus words.
- Icons are our own drawings. Never use lucide or any other icon library.
- A check mark is exactly two straight line segments meeting at a sharp (miter) vertex. It has no curves.
- Fonts are Apple system fonts only: `-apple-system` / SF Pro, PingFang for CJK, and SF Mono for code. No web fonts.
- Type is large, following HIG. Never go below 13px on mobile or 14px on desktop.
- Buttons are Apple-style and never chunky: primary 50px with radius 14, compact 44px, secondary a borderless tinted fill, and one filled primary per region.
- Pick-one and pick-many choices use grouped list views with a trailing check. Never use chip groups or 2-column option cards.
- The pixel cat is the app's real sprite from `src/components/PixelCat.tsx`, with its colours from `src/index.css`. Never redraw it.
