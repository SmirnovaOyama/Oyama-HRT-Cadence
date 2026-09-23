# Cadence type scale, revision 2 (larger, user-friendly)

The user reviewed the boards and said the text is too small to be user-friendly and does not meet design
standards. The first scale used 12px captions, 14px secondary text and 16px body, and the desktop boards used the
same sizes as the phone boards (the app itself scales type 1.10x at 1280px and up, see --ui-scale in src/index.css).

New rules:
- Mobile (390px boards) follows Apple HIG Dynamic Type at its default size: body 17, subheadline 15,
  footnote 13, title sizes above. Nothing on a phone board is smaller than 13px, and 13px is only for chart
  axis/tick text, dial weekday labels and tab-bar labels. Everything people read in rows or paragraphs is 15px+.
- Desktop (1440px boards) is the mobile scale times about 1.1 (the app's own --ui-scale at 1440), rounded to even
  sizes: body 18, secondary 16. Nothing on a desktop board is smaller than 14px.
- Line-heights grow with the size (about 1.5 for body copy). Weights, families, colours and everything else stay as
  they are.

## Mapping (old size/line-height -> new)

Match on the old size AND line-height (and role where the table says so). SVG text in charts and the dial uses
the `caption` row.

| Role (old) | Old | Mobile new | Desktop new |
|---|---|---|---|
| caption: chart ticks and labels, dial weekday labels, ruler labels, tab-bar labels | 12/16 (SVG font-size 12 or 13) | 13/18 | 14/20 |
| mono: commands, server addresses, tool names | 13/20 | 14/22 | 15/24 |
| chip, tag, small button, field label | 14/18 | 15/20 | 16/22 |
| secondary: sub-lines, captions under blocks, muted text | 14/20 | 15/22 | 16/24 |
| button | 16/20 | 17/22 | 18/24 |
| row title, body-strong, status line | 16/22 | 17/24 | 18/26 |
| body | 16/24 | 17/26 | 18/28 |
| button-xl | 18/22 | 19/24 | 20/26 |
| block title | 18/24 | 20/26 | 22/28 |
| section heading | 20/26 | 22/28 | 24/30 |
| date title (Today header) | 22/28 | 26/32 | 36/44 (desktop page title) |
| lead | 22/30 | 24/32 | 26/34 |
| sheet title | 24/30 | 26/32 | 28/36 |
| page title | 28/34 (desktop 32/38) | 32/38 | 36/44 |
| stepper value | 28/32 | 30/36 | 32/38 |
| dial number | 40/40 (desktop 60/60) | 44/44 | 64/64 |
| unit under the dial number (pg/mL) | 14/18 | 15/20 | 18/24 |
| desktop rail nav item | 16/20 | n/a | 18/24 |

## Knock-on rules
- Anything sized to hold text grows with it: row min-heights (64 -> 68 on mobile when two lines of sub-text),
  tab bar (72 -> 76 so 13px labels keep 4px under the 36px icon pill), segmented-control tracks (44 -> 48 when
  labels are 15-16px), tags (min-height 32 -> 34/36), chips stay >= 44 tall.
- Charts and the dial keep their geometry. Where bigger labels would collide with curves, markers, the Now tab or
  each other, move or shorten the label (never shrink it below the floor). Widen a chart's left gutter if the
  y-axis labels need it.
- Text must still wrap cleanly inside 358px on phones; keep units glued to numbers with &nbsp;.
- The board grows to fit: set the root height and $preview to the new content height (content ends 24-40px above
  the mobile bottom bar; no more than ~80px of empty paper at the bottom of any board).
