# Cadence revision 3: list views instead of chips and option cards

User feedback (2026-09-23), on the Log sheet: the "When" chips (Now, 09:04 / Due time, 09:00 / Earlier...) —
"这个改成 list view" (make this a list view); and the 2-column injection-site cards (Right thigh / Left thigh / Right
glute / ...) — "这个也是，很多要改成 list view" (this too; many things should become list views).

So every place where people pick from options becomes an Apple-style inset grouped list. Scan EVERY board for:
choice chips (wrapped rows of bordered pills), 2-column option grids, stacks of bordered selectable cards/rows
(radio-style rows such as calibration methods, reminder repeat choices, appearance/theme, language, HRT mode,
unit choices with more than 3 options), and "pick one" tiles. Convert them all. Keep as they are: switches in
switch rows, text inputs, steppers, and short segmented controls (2-4 short labels such as chart ranges "2 weeks /
3 weeks / Month" or units "pg/mL / pmol/L").

## Grouped list (inset, iOS style) — exact recipe
- Optional group header above the list: sentence case, 15/20 600 (desktop 16/22), muted #5F574C (dark #B8AD9E),
  padding 0 16px, 8px above the group. Never caps, never a dot.
- Group: background #FFFFFF (dark #1E1A16); border 1px solid #E2DACB (dark #3A332B) — the border stands in for
  the elevation Apple would use, since shadows are banned; border-radius 14px; overflow hidden; padding 0.
- Row: a real <button> (single choice: role="radio" inside a role="radiogroup" with aria-checked; multiple choice:
  aria-pressed) or <a> for drill-ins; display flex; align-items center; gap 12px; width 100%; min-height 52px
  (64px when it has a sub-line or a 40px icon tile); padding 12px 16px; box-sizing border-box; background
  transparent; border 0; text-align left.
- Separator: a 1px #E2DACB (dark #3A332B) line between rows, inset so it starts at the row's text (16px from the
  left, or 68px when rows have a 40px icon tile) and runs to the right edge. No separator above the first row or
  below the last. Implement as border-bottom on an inner wrapper that starts at the text column, or as a
  separate 1px div with margin-left; never a full-width line.
- Row content: optional leading icon tile (40px, as before); a text column (flex 1) with title 17/24 400 ink
  (desktop 18/26) and optional sub-line 15/22 muted (desktop 16/24); optional trailing value 17/24 muted,
  right-aligned, white-space nowrap; then the trailing mark.
- Selection: the selected row gets a trailing check icon (Cadence "check", 22px, stroke-width 1.75,
  color #A34A28, dark #E48A63) and nothing else changes — no fill, no border, no bold. Unselected rows show no
  mark. There are no radio circles.
- Drill-in rows (open a picker or another screen, e.g. "Earlier" or "Other site"): trailing value (if any) plus a
  chevron-right icon 16px in muted. No check.
- Emphasis inside a row ("Suggested") is words in the sub-line coloured #A34A28 (dark #E48A63), 15/22 600 —
  e.g. title "Right thigh", sub-line "Suggested. Last used 28 days ago".

## Examples from the Log sheet
When (single choice):
- "Now" .......... trailing value "09:04" .......... check (selected)
- "Due time" ..... trailing value "09:00"
- "Earlier" ...... trailing chevron (opens the date and time picker)
Footer line under the group (15/22 muted): "Saturday, September 26".

Injection site (single choice), with the rotation note kept as a footer under the group:
- Right thigh / "Suggested. Last used 28 days ago" ........ check (selected)
- Left thigh / "Last used 7 days ago"
- Right glute / "Last used 14 days ago"
- Left glute / "Last used 21 days ago"
- Belly, under the skin / "Not used yet"
- Other site / "Pick on a body map" ........ chevron
