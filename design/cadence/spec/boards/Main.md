# Artboard Main.dc.html — Today (mobile)
Size: 390×1880 px, theme: light, canvas row: Core mobile

# Today, mobile, light

**Scenario:** Wed Sep 23, 14:05. Follow C0 to C27. Use the C1 light helmet. Root is 390×1880 per C2, and $preview is 390×1880.

The content column is absolute: top 0, left 16, right 16. It is a flex column. The gaps between regions are given below.

## 1. Header (C3, date variant)
- Left: h1 “Wednesday, September 23” in display 600 22/28 ink. Under it, p “Feminizing HRT” at 14/20 muted.
- Right: icon button 44×44 with the cloud-check icon at 22px in #2F6B45. aria-label “Backed up 4 minutes ago”.

## 2. Dial plate (C14 dial plate)
Gap 8 after the header. Radius 28, padding 16, flex column, gap 12.

### 2a. Text pair (gap 2)
- “Day 5 of 7 in your weekly cycle”: 16/22 600 ink.
- “Shot taken Sat 09:12. Next shot Sat 09:00.”: 14/20 muted.

### 2b. Dial
- Wrapper: 280×280, position relative, align-self center.
- SVG: C19 in state “light, Wed 14:05”.
- aria-label: “Day 5 of 7 in your weekly cycle. Estradiol valerate taken Saturday at 09:12, next shot Saturday at 09:00. Cyproterone taken Saturday to Monday, Tuesday not logged, next tonight at 21:00.”
- Centre overlay: a button (C19) with aria-label “Estradiol about 186 pg/mL, estimated. How this is worked out”. It contains:
  - C24 loaf cat with eyes closed, 48×33;
  - “186” in display 600 40/40 ink;
  - “pg/mL” at 14/18 600 muted.

### 2c. Status line (C12)
The circle-check icon at 20 in #2F6B45, then “In your target range (100–200)” at 16/22 600 #2F6B45.

### 2d. Ruler
C20 mobile, marker at 186.

### 2e to 2h. Text under the ruler
- 2e. p 16/24 ink: “Falling slowly. Lowest before Saturday’s shot, about 151.”
- 2f. p 14/20 muted: “Estimated from your doses and 4 blood tests, not measured.”
- 2g. Quiet button (C6), align-self flex-start: “How is this worked out?” followed by chevron-right at 16.
- 2h. p 14/20 muted: “Outer ring: your weekly shot. Inner ring: daily cyproterone. Tuesday’s isn’t logged yet.”

## 3. Action
Gap 16 after the plate. Flex column, gap 8.
- p 16/24 ink: “Next: cyproterone 12.5 mg, tonight at 21:00”.
- C6 primary-xl button: plus icon at 22 (stroke 2), then “Log a dose”.

## 4. Waiting for you (C14 pending block)
Gap 32 after the action.
- Row with gap 8: the plug icon at 20 in muted, then “Waiting for you” in display 600 18/24.
- p 16/24: “Claude suggested adding cyproterone acetate 12.5 mg, tablet, for Tue Sep 22 at 21:10.”
- p 14/20 muted: “From Claude Desktop, today at 14:03. Nothing is saved until you add it.”
- Button row (flex, wrap, gap 8):
  - primary 48: “Add it”;
  - secondary 48: “Change first”;
  - quiet: “Don’t add”.

## 5. Coming up
Gap 32.
- C5 heading row: h2 “Coming up”. On the right, the quiet link “Reminders” with a chevron.
- 12px below: a C11 surface block with 4 rows. Each row has a tile, a title, a sub-line and a trailing value.

| Row | Tile | Title | Sub-line | Trailing |
|---|---|---|---|---|
| 1 | cyproterone tile, pill icon | Cyproterone acetate 12.5 mg, tablet | Tonight, 21:00 | in 7 hours |
| 2 | estradiol tile, syringe icon | Estradiol valerate 4 mg, injection | Sat Sep 26, 09:00. Suggested site: right thigh | in 2 days |
| 3 | blood test tile, test-tube icon | Blood test at your low point | Sat Oct 3, 07:30, before your shot | in 10 days |
| 4 | attention tile, package icon | Reorder cyproterone | By Sat Oct 3. About 24 days of tablets left. (shown in #8A5A00) | in 10 days |

## 6. This week
Gap 32.
- C5 heading row: h2 “This week”. On the right, the quiet link “Timeline” with a chevron.
- 12px below: the chart SVG. width 358, height 192, viewBox 0 0 358 192, font-family Atkinson.
- aria-label: “Estimated estradiol this week. Highest about 274 on Sunday night, about 186 now, lowest about 151 before Saturday’s shot.”

### Chart elements, in draw order
1. text “pg/mL” at x0 y12, 12px 600 #5F574C.
2. Past-region rect: x40 y24 w158 h140, fill #F3EEE6.
3. Target band rect: x40 y80 w310 h56, fill #2F6B45, fill-opacity 0.12.
4. Band edges: path M40 80H350M40 136H350, stroke #2F6B45, stroke-opacity 0.6, dasharray 3 3.
5. Gridline M40 24H350 in stroke #E2DACB. Baseline M40 164H350 in stroke #CBBFAE.
6. Y labels, anchor end, 12px 500 #5F574C: “300” at x34 y28, “200” at 34,84, “100” at 34,140.
7. Likely band: fill #1F1B16, fill-opacity 0.07. d = M198 84.7 L199.3 85 L203.6 86.1 L207.9 87.2 L212.2 88.2 L216.5 89.2 L220.8 90.1 L225.1 90.9 L229.4 91.8 L233.8 92.5 L238.1 93.3 L242.4 94 L246.7 94.7 L251 95.3 L255.3 95.9 L259.6 96.5 L263.9 97 L268.2 97.5 L272.5 98 L276.8 98.5 L281.1 98.9 L285.4 99.3 L289.7 99.7 L294 100.1 L298.3 86.8 L302.6 74.9 L306.9 64.2 L311.2 54.7 L315.6 46.5 L319.9 39.5 L324.2 33.7 L328.5 29.1 L332.8 25.5 L337.1 23 L341.4 21.4 L345.7 20.7 L350 24.2 L350 60.1 L345.7 56.7 L341.4 56.6 L337.1 57.1 L332.8 58.5 L328.5 60.6 L324.2 63.7 L319.9 67.8 L315.6 72.9 L311.2 79 L306.9 86.2 L302.6 94.6 L298.3 104.1 L294 114.8 L289.7 114.1 L285.4 113.3 L281.1 112.6 L276.8 111.8 L272.5 111 L268.2 110.2 L263.9 109.3 L259.6 108.4 L255.3 107.5 L251 106.5 L246.7 105.5 L242.4 104.4 L238.1 103.3 L233.8 102.2 L229.4 101.1 L225.1 99.8 L220.8 98.6 L216.5 97.3 L212.2 95.9 L207.9 94.5 L203.6 93 L199.3 91.4 L198 90.9 Z
8. Past curve: stroke #A34A28, width 2, fill none, linejoin round. d = M40 105.8 L44.3 106.4 L48.6 106.9 L52.9 107.4 L53.2 107.5 L57.2 96.3 L61.5 85.4 L65.8 75.8 L70.1 67.4 L74.4 60.2 L78.8 54.1 L83.1 49 L87.4 45.1 L91.7 42.1 L96 40.2 L100.3 39.1 L104.6 38.7 L108.9 41.9 L113.2 45.2 L117.5 48.4 L121.8 51.4 L126.1 54.3 L130.4 57 L134.7 59.7 L139 62.2 L143.3 64.6 L147.6 67 L151.9 69.2 L156.2 71.3 L160.6 73.3 L164.9 75.3 L169.2 77.2 L173.5 79 L177.8 80.7 L182.1 82.3 L186.4 83.9 L190.7 85.4 L195 86.9 L198 87.8
9. Forecast curve: same stroke, dasharray 6 4. d = M198 87.8 L199.3 88.2 L203.6 89.6 L207.9 90.8 L212.2 92 L216.5 93.2 L220.8 94.3 L225.1 95.4 L229.4 96.4 L233.8 97.4 L238.1 98.3 L242.4 99.2 L246.7 100.1 L251 100.9 L255.3 101.7 L259.6 102.4 L263.9 103.2 L268.2 103.8 L272.5 104.5 L276.8 105.1 L281.1 105.8 L285.4 106.3 L289.7 106.9 L294 107.4 L298.3 95.5 L302.6 84.7 L306.9 75.2 L311.2 66.9 L315.6 59.7 L319.9 53.7 L324.2 48.7 L328.5 44.9 L332.8 42 L337.1 40.1 L341.4 39 L345.7 38.7 L350 42.1
10. Now rule and tab:
    - rule: path M198 24V164, stroke #1F1B16, width 2;
    - tab: rect x162 y2 w72 h20 rx6, fill #1F1B16;
    - tab text “Now, 14:05” at x198 y16, anchor middle, 12px 600, fill #FBF8F3.
11. Dose triangles:
    - taken: path M53.2 157 L57.2 164 L49.2 164 Z, fill #A34A28;
    - planned: path M294 157 L298 164 L290 164 Z, fill #FBF8F3, stroke #A34A28, width 1.5.
12. Direct labels:
    - “High 274” at x105 y18, anchor middle, 12px 600 #5F574C;
    - “Low 151” at x294 y128, anchor middle, 12px 600 #5F574C;
    - “Target 100–200” at x44 y132, 12px 600 #2F6B45;
    - “If you keep your schedule” at x204 y152, 12px 500 #5F574C.
13. Day labels at y182, anchor middle, 12px 500 #5F574C: Sat 57.2, Sun 91.7, Mon 126.1, Tue 160.6, Wed 195, Thu 229.4, Fri 263.9, Sat 298.3, Sun 332.8. The Wed label is 700 ink.

### Caption
8px below the chart, 14/20 muted: “Estimated estradiol. Solid is what has happened. Dashed is where it’s heading if you keep your schedule; the shaded area shows how sure that is.”

## 7. Bottom bar
C16 light, with Today active.

## Visible interactions
- The dial centre is a button.
- “How is this worked out?” link.
- Log a dose.
- The assistant suggestion actions.
- Row chevrons.

Nothing counts up. There are no shadows anywhere.
