# Cadence revision 3: Apple system fonts and refined buttons

User feedback (2026-09-23): "字体全部用 Apple font" (use Apple fonts for all text) and "有些按钮设计也是粗犷"
(some buttons look crude/clunky — they circled the 64px full-width terracotta "Log it now" button with its
outlined "Snooze 1 hour" and "Skip this one" link beside it). Sizes stay as in spec/typescale.md (revision 2 —
those are Apple HIG sizes, which were designed for SF Pro).

## 1. Fonts: Apple system fonts everywhere

- Remove the Google Fonts `<link rel="preconnect">` and the `fonts.googleapis.com/css2` `<link>` from every board.
  No web fonts at all.
- Every font-family (helmet body rule, inline styles, SVG `font-family` attributes on charts and the dial) becomes
  one of these two stacks, exactly:
  - UI and display: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'PingFang SC', 'PingFang TC', 'Hiragino Sans', 'Apple SD Gothic Neo', system-ui, sans-serif`
    (inside an SVG attribute written with double quotes, use the same list with single quotes as shown.)
  - Mono (commands, server addresses, tool names): `ui-monospace, 'SF Mono', Menlo, monospace`
- `-apple-system` gives SF Pro with automatic optical sizes (Text below 20px, Display above) and Apple's own
  tracking. Do not add letter-spacing.
- Weights: page titles and the Today date title 700 (like an iOS large title); section headings, block titles,
  sheet titles, row titles, buttons, tabs 600; body 400; the big dial number 600 with
  `font-variant-numeric: tabular-nums`. Everything else keeps its weight.
- SF Pro is narrower than the old Atkinson face, so text re-wraps: re-check every heading, row and chart label, and
  re-fit the board height.

## 2. Buttons: refined, Apple-like, never chunky

Retire the 64px "primary-xl" completely. The set is:

| Kind | Height | Radius | Fill / text (light) | Fill / text (dark) | Type |
|---|---|---|---|---|---|
| Primary | 50 | 14 | #A34A28 / #FFFFFF | #B5532F / #FFFFFF | 17/22 600 |
| Primary compact (inside cards, sidebars, inline) | 44 | 12 | same | same | 17/22 600 |
| Secondary (tinted, NO border) | 50 or 44, matching the primary beside it | 14 / 12 | #EFE8DD / #1F1B16 | #332C24 / #F1EBE2 | 17/22 600 |
| Plain (text button) | 44 | none | transparent / #A34A28 | transparent / #E48A63 | 17/22 600 |
| Destructive plain | 44 | none | transparent / #A3261B | transparent / #F2998F | 17/22 600 |
| Icon button | 44×44 | 12 | transparent / ink | transparent / ink | icon 22 |

Desktop boards use the same kinds at the desktop type size (18/24 600); heights stay 50/44.

Rules:
- Only ONE filled primary per region. A primary may be full width only when it is the single main action of a
  screen or sheet (Today's "Log a dose", the Log sheet's save button). Otherwise buttons size to their label with
  20px side padding.
- Pairs in a card: primary + secondary side by side, equal width (flex: 1 1 0), gap 12, both 44 tall. A third,
  lesser action becomes a plain text button on its own row below, left-aligned (e.g. "Skip this one").
- Icons inside buttons: only on the primary, 20px, 8px gap; secondary and plain buttons are text only.
- No outlined (bordered) buttons anymore; the tinted secondary replaces them. Inputs, chips and selectable rows
  keep their borders because they are fields, not buttons.
- Selected states are quieter: a selected row or chip uses a 2px #A34A28 border (dark #E48A63) with the trailing
  check in the same colour, instead of 2px ink; a selected segment in a segmented control is white (dark #1E1A16)
  with a 1px #CBBFAE border (dark #574E42) and ink text 600, instead of 2px ink.
- Mobile tab bar: the centre Log button is a 56×36 capsule (radius 18) in the primary fill with a white 22px log
  icon; the active tab's pill also becomes a capsule (radius 18). Desktop rail: "Log a dose" is primary compact
  (44), "Add a blood test" secondary compact (44), both full rail width.
- On a tinted surface (plate #F3EEE6, the desktop rail) the secondary fill is #FFFFFF instead of #EFE8DD, so it still reads as a button.
- Hit targets stay >= 44px. Contrast: white on #A34A28 is 5.9:1, white on #B5532F 4.95:1, ink on #EFE8DD 14:1.
