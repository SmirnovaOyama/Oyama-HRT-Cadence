# Cadence tokens

Only flat colours. No box-shadow, drop-shadow or text-shadow anywhere. No linear, radial or conic gradients, and no gradient masks. No text-transform uppercase and no letter-spacing on labels.

## Fonts (one Google Fonts css2 link, used exactly as written)
https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;500&family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500..700&display=swap

- **Display, the voice:** 'Bricolage Grotesque', 'PingFang SC', 'Hiragino Sans', 'Noto Sans CJK SC', 'Microsoft YaHei', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif.
  - Weights 500 and 600, plus 700 only for today's weekday label in the dial.
  - Used for page titles, date titles, section headings, sheet titles, leads, block titles, the dial-centre number and stepper values.
- **Body and UI:** 'Atkinson Hyperlegible Next', 'PingFang SC', 'Hiragino Sans', 'Noto Sans CJK SC', 'Microsoft YaHei', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, -apple-system, 'Segoe UI', sans-serif.
  - Weights 400, 500 and 600.
  - Used for everything you read in rows or operate: buttons, chips, tabs, chart text and body copy.
- **Numeric:** numbers use the family of their context. body sets font-variant-numeric: tabular-nums. Big readings are Bricolage 600 with font-variant-numeric: lining-nums tabular-nums. Code phase: verify tnum in both families and fall back to proportional if either lacks it.
- **Mono:** 'Atkinson Hyperlegible Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace, weight 400. Used only for commands, config, server addresses and MCP tool names.
- **Language overrides (code phase):**
  - :lang(zh-TW) puts 'PingFang TC', 'Noto Sans TC' right after the Latin face.
  - :lang(yue) puts 'PingFang HK', 'Noto Sans HK' right after the Latin face.
  - :lang(ja) puts 'Hiragino Sans', 'Noto Sans JP' right after the Latin face.
  - :lang(ko) puts 'Apple SD Gothic Neo', 'Noto Sans KR' right after the Latin face.
  - CJK body line-heights get +4px (16/28, 14/24).
  - CJK headings fall back to the CJK sans at 600.
  - Nothing is italic and nothing is letter-spaced.
  - Both Latin families cover Turkish (ı, İ, ş, ğ).

## Light palette
| Token | Hex | Role |
|---|---|---|
| paper | #FBF8F3 | Page background. Future region of charts. |
| plate | #F3EEE6 | Dial plate, grouped panels, desktop rail, past region of charts, segmented track, code blocks, neutral icon tiles. |
| plate-strong | #E9E2D6 | Past non-dose days on the dial, switch-off track, progress-bar track. |
| surface | #FFFFFF | Rows block, sheets, bottom bar, inputs, secondary buttons, dial centre disc, active desktop nav item. |
| hairline | #E2DACB | Dividers and decorative outlines only. |
| rule | #CBBFAE | Chart baselines, sheet grab bar. |
| control | #8F8578 | Borders of inputs, chips, secondary buttons, selectable rows and switches, plus dashed "not logged" outlines. 3.4:1 on paper. |
| ink | #1F1B16 | Text (16:1), selected borders, Now rule and tab, measured blood-test marks, focus ring. |
| muted | #5F574C | Secondary text and axis labels. 6.7:1 on paper, 6.2:1 on plate. |
| accent | #A34A28 | Estradiol series, primary buttons, links, dose-taken fills. 5.6:1 on paper, 5.1:1 on plate. White on it is 5.9:1. |
| accent-hover | #8F3F20 | Hover state of accent. |
| accent-container | #F6DFD2 | Active tab pill, selected chip fill, today's dial segment, toast, EV icon tile. |
| on-accent-container | #6E2A12 | Text and icons on accent-container. 8.2:1. |
| second | #7A4A8C | Cyproterone (second medicine) series. 6.2:1 on paper. |
| second-tint | #EFE4F2 | CPA icon tile, due-now fill for CPA. |
| target-text | #2F6B45 | "In your target" words and icons. 6.0:1. |
| target-fill | #DCEBDF | In-target tag. |
| target-band | #2F6B45 at fill-opacity 0.12 | Chart band fill. Band edges are #2F6B45 at stroke-opacity 0.6, dashed 3 3. |
| attention-text | #8A5A00 | Above or below target, reorder soon. 5.6:1. |
| attention-fill | #F5E6C4 | Attention tags and panels. |
| danger | #A3261B | Destructive actions only. Never used for levels. |
| danger-fill | #F6DEDA | Background for destructive states. |
| forecast-band | #1F1B16 at fill-opacity 0.07 | Likely-range band. |
| scrim | rgba(31,27,22,0.32) | Flat scrim behind sheets. |
| cat | #9FD4EE blue, #F6BFCE pink, #FFFFFF white, #3A2F28 outline | Pixel cat. |

## Dark palette
| Token | Hex |
|---|---|
| paper | #16130F |
| plate | #26211B |
| plate-strong | #332C24 |
| surface | #1E1A16 |
| hairline | #3A332B |
| rule | #574E42 |
| control | #857B6E (3.8:1 on plate) |
| ink | #F1EBE2 |
| muted | #B8AD9E (7.2:1 on plate) |
| accent | #E48A63. Primary button fill #E48A63 with text #2A1206 (6.8:1). |
| accent-hover | #EFA17F |
| accent-container | #4A2616 |
| on-accent-container | #FFD9C7 |
| second | #CFA6DE. Text on a second-coloured fill is #1E1022. |
| second-tint | #3A2A42 |
| target-text | #8FCFA3 |
| target-fill | #1E3A28 |
| target-band | #8FCFA3 at 0.12 |
| attention-text | #E8C170 |
| attention-fill | #3D2F10 |
| danger | #F2998F |
| danger-fill | #3E1D19 |
| forecast-band | #F1EBE2 at 0.08 |
| scrim | rgba(0,0,0,0.55) |
| focus ring | #F1EBE2 |
| cat | Unchanged. The bright fills carry the shape. |

Black and white theme (code phase): swap the tokens to greys (accent #3D3D3D, second #6B6B6B, target #2E2E2E) instead of applying a grayscale filter. The meaning survives because of shape and words: solid vs dashed lines, filled vs outlined segments, icons plus words.

## Radii
- 4: progress bars, adherence cells.
- 6: chart Now tab, flag swatch, notification app tile.
- 8: status tags, segmented segments.
- 12: buttons 44 to 48px tall, inputs, chips, selectable rows, icon tiles (40px), nav active pill, segmented track, readout strip, toast.
- 16: panels and blocks, switch track (52×32).
- 20: the 64px primary-xl button.
- 28: dial plate, sheet top corners.

No status pills anywhere.

## Spacing
- Base 4. Steps: 4, 8, 12, 16, 24, 32, 48.
- Mobile side gutter 16. Desktop content padding 32 top, 40 sides. Desktop rail padding 24 16.
- Section gap 32. Heading to content 12.
- Rows are at least 56px, or 64px when they have an icon tile.
- Every interactive target is at least 44×44.

## Type scale
SUPERSEDED by spec/typescale.md (revision 2, larger). Use that file for every size and line-height.

## Borders
- 1px hairline for dividers.
- 1px control for anything you can operate.
- 2px ink for selected and current.
- 2px dashed control for "not logged" and "waiting for your decision".
- 2px solid in the medicine's colour for "due now".
- Chart forecast lines are dashed 6 4. Band edges are dashed 3 3.

## Focus
:focus-visible gets a 3px solid ink outline with 2px offset (dark: #F1EBE2).

## Motion
- The dial hand eases into position over 300ms on first open only.
- The chart does not replay its sweep on revisits.
- Numbers never count up from 0.
- Sheets slide up over 200ms.
- Text cross-fades over 120ms.
- All motion is off under prefers-reduced-motion.

## Copy rules
- Sentence case everywhere.
- Separate with commas, full stops, line breaks or columns. Never use the middle dot or bullet characters.
- Units exactly as written: pg/mL, pmol/L, ng/dL, nmol/L, ng/mL, mg, mL, µg/day.
- Dates are written "Sat Sep 26". With a time: "Sat Sep 26, 09:00". Long form: "Wednesday, September 23". Times are 24-hour. Add the year only when it is not the current year.
- Estimates always carry "about" or "estimated".
- The forecast is always "If you keep your schedule".