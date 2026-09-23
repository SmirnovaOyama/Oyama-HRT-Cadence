# Artboard LogDose.dc.html — Log a dose (mobile sheet)
Size: 390×1520 px, theme: light, canvas row: Core mobile

# Log a dose (mobile sheet, light)

**Scenario:** Sat Sep 26, 09:04. The sheet was opened from the due reminder.

- Follow C0 to C27. Use the C1 light helmet.
- Root: 390×1520, $preview 390×1520.

## Background
- Show only the Today header, per the Main board: h1 “Saturday, September 26” at the top.
- Cover the whole root with the C18 scrim, rgba(31,27,22,0.32).

## Sheet (C18)
- Positioned at top 40px.
- Body padding: 0 16px 160px (keeps content clear of the footer).
- Flex column, gap 24.

### 1. Header
- Grab bar row (C18).
- Title row, flex space-between:
  - h2 “Log a dose”, display 600 24/30;
  - icon button 44 with the x icon, aria-label “Close”.
- 12px below: C8 segmented control, “Dose” (selected) and “Blood test”, full width.

### 2. What
- Label “What” at 16/22 600.
- Then a C10 stack with gap 8:
  - **Row 1, selected:** estradiol tile with syringe icon.
    - Title: “Estradiol valerate 4 mg, injection”
    - Sub: “Your weekly shot, due now”
    - Trailing check.
  - **Row 2:** cyproterone tile with pill icon.
    - Title: “Cyproterone acetate 12.5 mg, tablet”
    - Sub: “Daily, next tonight at 21:00”
  - **Row 3:** neutral tile with plus icon.
    - Title: “Something else”
    - Sub: “Pill, under the tongue, gel, patch or another injection”
    - Trailing chevron-right instead of a check.

### 3. When
- Label “When”.
- Chip row (C9, wrap, gap 8):
  - “Now, 09:04” (selected, with leading check);
  - “Due time, 09:00”;
  - “Earlier…”.
- p 14/20 muted: “Saturday, September 26”.

### 4. How much
- Row, space-between:
  - label “How much” at 16/22 600;
  - compact C8 segmented control, width 140: “mL” (selected) and “mg”.
- C7 stepper showing “0.10 mL”.
- p 16/24 ink: “= 4 mg from your 40 mg/mL vial.” followed by an inline quiet link “Change vial”. The link is 44px tall and sits on its own line if it wraps.
- p 14/20 muted: “About 3.1 mg of that is estradiol itself. The model uses this.”

### 5. Where
- Label “Where”.
- p 14/20 muted: “Rotating sites helps avoid soreness and lumps.”
- Grid with 2 columns (1fr 1fr), gap 8, of C9 two-line chips:

| Chip | Line 1 | Line 2 | State |
|---|---|---|---|
| 1 | Right thigh | Suggested, 28 days ago | selected |
| 2 | Left thigh | 7 days ago | |
| 3 | Right glute | 14 days ago | |
| 4 | Left glute | 21 days ago | |
| 5 | Belly, under the skin | Not used yet | |
| 6 | Other site | Pick on a body map | |

### 6. What this dose does
A C14 plate panel with padding 16 0 (no side padding), gap 8.

**Heading**
- p 16/22 600, padding 0 16: “What this dose does”.

**Chart**
- SVG: width 358, height 124, viewBox 0 0 358 124.
- aria-label: “Estimated estradiol for the next 8 days with this dose.”
- Elements, in order:
  1. Target band: rect x8 y56 w342 h44, fill #2F6B45, fill-opacity 0.12.
  2. Band edge: path M8 56H350, stroke #2F6B45, stroke-opacity 0.6, dasharray 3 3.
  3. Baseline: path M8 100H350, stroke #CBBFAE.
  4. Past (solid accent, 2px): M8 76.2 L13.3 76.7 L18.7 77.1 L24 77.5 L24.1 77.6
  5. Preview, dashed 6 4, accent 2px: M24.1 77.6 L29.4 68.4 L34.7 59.9 L40.1 52.4 L45.4 45.8 L50.8 40.2 L56.1 35.4 L61.4 31.5 L66.8 28.4 L72.1 26.2 L77.5 24.6 L82.8 23.8 L88.2 23.6 L93.5 26.2 L98.8 28.8 L104.2 31.2 L109.5 33.6 L114.9 35.9 L120.2 38 L125.6 40.1 L130.9 42.1 L136.2 44 L141.6 45.8 L146.9 47.6 L152.3 49.2 L157.6 50.8 L163 52.4 L168.3 53.8 L173.7 55.2 L179 56.6 L184.3 57.9 L189.7 59.1 L195 60.3 L200.4 61.4 L205.7 62.5 L211.1 63.6 L216.4 64.5 L221.8 65.5 L227.1 66.4 L232.4 67.3 L237.8 68.1 L243.1 68.9 L248.5 69.7 L253.8 70.4 L259.2 71.1 L264.5 71.8 L269.8 72.4 L275.2 73.1 L280.5 73.7 L285.9 74.2 L291.2 74.8 L296.6 75.3 L301.9 75.8 L307.2 76.3 L312.6 76.7 L317.9 77.1 L323.3 77.6 L328.6 68.2 L334 59.7 L339.3 52.2 L344.7 45.7 L350 40.1
  6. Now rule: path M24.1 8V100, ink, width 2.
  7. Now tab: rect x24 y0 w40 h18 rx6, ink, with text “Now” at x44 y13, anchor middle, 12px 600, #FBF8F3.
  8. Ghost dose (the one being logged): path M24.1 102 L28.1 110 L20.1 110 Z, fill #A34A28, fill-opacity 0.4, stroke #A34A28, width 1.5.
  9. Planned Oct 3 dose: path M323.3 102 L327.3 110 L319.3 110 Z, fill #F3EEE6, stroke #A34A28, width 1.5.
  10. Labels:
      - “About 274, Sun night” at x96 y20, 12px 600 #5F574C;
      - “About 151” at x316 y92, anchor end, 12px 600 #5F574C;
      - “Target 100–200” at x34 y94, 12px 600 #2F6B45.
  11. Weekday labels at y122, 12px 500 #5F574C, anchor middle: Sat 29.4, Sun 72.1, Mon 114.9, Tue 157.6, Wed 200.4, Thu 243.1, Fri 285.9, Sat 328.6.

**Text below the chart (padding 0 16)**
- p 14/20 ink: “Should rise to about 274 pg/mL by Sunday night, then ease to about 151 by next Saturday. An estimate, not a measurement.”

### 7. Safety guide disclosure
- A button row: min-height 56, full width, border-top and border-bottom 1px #E2DACB.
- Content: shield-check icon at 20 in muted, “Injection safety guide” at 16/22 600, chevron-down at the right.
- aria-expanded is false.

### Sticky footer (C18)
Positioned absolute at the bottom of the sheet.
- p 14/20 ink: “Will be logged as: estradiol valerate 4 mg (0.10 mL), injection, right thigh, Sat Sep 26 at 09:04.”
- C6 primary-xl button with check icon: “Log it”.

## Visible states and rules
- Selected routine row, selected chips, mL mode, the ghost dose on the preview.
- No blocking alerts. Errors would appear inline under their field in #A3261B, for example “Enter an amount above 0”.
- Code-phase note, not drawn: choosing a future time changes the title to “Plan a dose” and the button to “Add to plan”, and adds Repeat and Remind me rows.
