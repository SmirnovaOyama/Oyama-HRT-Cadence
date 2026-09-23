# Artboard DesktopToday.dc.html — Today (desktop)
Size: 1440×1000 px, theme: light, canvas row: Dark and desktop

# Today (desktop, light)

**Scenario:** Wed Sep 23, 14:05.

- Follow C0–C27. Use the C1 light helmet.
- Root is 1440×1000 on paper. $preview is 1440×1000.

## 1. Rail
C17, with Today active and the Supplies attention icon showing.

## 2. Main area (C2 desktop)
Flex column, gap 24.

### 2a. Header row
Flex, space-between, align end.

**Left column**
- h1 “Wednesday, September 23”, display 600 32/38.
- p “Feminizing HRT. Updated 14:05.”, 14/20 muted.

**Right row** (gap 8), two secondary compact buttons (44):
- share-2 icon, “Share”
- file-text icon, “Letter for your clinician”

### 2b. Two columns
Grid with columns 520px and 1fr, gap 32. The right column is 544 wide.

## 3. Left column: dial plate
C14 dial plate: radius 28, padding 24, gap 12.

1. **Text pair**
   - “Day 5 of 7 in your weekly cycle”, 16/22 600.
   - “Shot taken Sat 09:12. Next shot Sat 09:00.”, 14/20 muted.
2. **Dial:** C19 at 400×400, state “light, Wed 14:05”, same aria-label as the Main board.
   - Centre button is 192×192 at left 104, top 104. It holds:
     - C24 loaf cat, eyes closed, 64×44;
     - “186”, display 600 60/60;
     - “pg/mL”, 16/20 600 muted.
3. **Status line** (C12), in target: “In your target range (100–200)”.
4. **Ruler:** C20 desktop, 472 wide, marker at 256.7.
5. p 16/24: “Falling slowly. Lowest before Saturday’s shot, about 151.”
6. p 14/20 muted: “Estimated from your doses and 4 blood tests, not measured.”
7. Quiet button: “How is this worked out?”
8. p 16/24: “Next: cyproterone 12.5 mg, tonight at 21:00”.
9. **Primary-xl button:** plus icon, “Log a dose”. Tooltip text via the title attribute: “Shortcut: L”.

## 4. Right column
Flex column, gap 24.

### 4a. Pending block (C14)
- Row: plug icon + “Waiting for you”, display 600 18/24.
- p 16/24: “Claude suggested adding cyproterone acetate 12.5 mg, tablet, for Tue Sep 22 at 21:10.”
- p 14/20 muted: “From Claude Desktop, today at 14:03. Nothing is saved until you add it.”
- Buttons: primary 48 “Add it”, secondary 48 “Change first”, quiet “Don’t add”.

### 4b. Chart panel
C11 surface block with padding 16px 0 12px, flex column, gap 12.

**Header row** (padding 0 20, flex, space-between, align center)
- h2 “Your level”, display 600 20/26.
- C8 segmented control, width 300: “2 weeks”, “3 weeks” (selected), “Month”.

**Chart SVG**
- width 544, height 220, viewBox 0 0 544 220.
- aria-label: “Estimated estradiol from Sep 12 to Oct 3, about 186 now.”

Chart elements, in order:
1. text “pg/mL” at x8 y16, 12px 600 muted.
2. Past rect: x44 y28 w257 h160, fill #F3EEE6.
3. Band rect: x44 y92 w488 h64, fill #2F6B45, fill-opacity 0.12. Edges: path M44 92H532M44 156H532, dashed 3 3, stroke-opacity 0.6.
4. Gridline M44 28H532 (#E2DACB). Baseline M44 188H532 (#CBBFAE).
5. Y labels, anchor end, 12px muted: “300” at 36,32; “200” at 36,96; “100” at 36,160.
6. Likely band, ink 0.07:
   M301 97.4 L304.6 99.2 L310.2 101.9 L315.7 104.4 L321.3 106.6 L326.8 108.6 L332.4 110.5 L337.9 112.2 L343.5 113.7 L349 115.1 L354.5 116.4 L360.1 117.6 L362.9 118.1 L365.6 103.6 L368.4 90.5 L371.2 78.9 L374 68.7 L376.7 59.8 L379.5 52.3 L382.3 46.2 L385 41.3 L387.8 37.6 L390.6 35.1 L393.4 33.6 L396.1 33.1 L398.9 37.1 L404.5 44.5 L410 51.4 L415.5 57.7 L421.1 63.4 L426.6 68.7 L432.2 73.6 L437.7 78 L443.3 82.1 L448.8 85.8 L454.4 89.2 L459.9 92.3 L465.5 95.1 L471 97.7 L476.5 100.1 L482.1 102.2 L487.6 104.2 L493.2 106 L498.7 107.7 L504.3 109.1 L509.8 110.5 L515.4 111.7 L518.1 112.3 L520.9 96.9 L523.7 83.1 L526.5 70.8 L529.2 60 L532 50.7 L532 87 L529.2 94 L526.5 102.3 L523.7 111.7 L520.9 122.5 L518.1 134.5 L515.4 133.8 L509.8 132.4 L504.3 131 L498.7 129.4 L493.2 127.7 L487.6 125.8 L482.1 123.8 L476.5 121.6 L471 119.2 L465.5 116.6 L459.9 113.8 L454.4 110.7 L448.8 107.4 L443.3 103.8 L437.7 99.8 L432.2 95.5 L426.6 90.9 L421.1 85.8 L415.5 80.2 L410 74.2 L404.5 67.6 L398.9 60.4 L396.1 56.6 L393.4 56.7 L390.6 57.6 L387.8 59.5 L385 62.4 L382.3 66.4 L379.5 71.5 L376.7 77.8 L374 85.4 L371.2 94.2 L368.4 104.3 L365.6 115.8 L362.9 128.6 L360.1 127.9 L354.5 126.4 L349 124.9 L343.5 123.2 L337.9 121.4 L332.4 119.4 L326.8 117.2 L321.3 114.9 L315.7 112.3 L310.2 109.6 L304.6 106.6 L301 104.5 Z
7. Past curve, solid accent 2px:
   M44 121.4 L46.8 122.1 L49.5 122.7 L52.3 123.3 L52.4 123.4 L55.1 110 L57.9 97.7 L60.6 86.8 L63.4 77.3 L66.2 69 L69 62.1 L71.7 56.4 L74.5 51.9 L77.3 48.6 L80 46.4 L82.8 45.2 L85.6 44.8 L88.4 48.6 L91.1 52.4 L93.9 56 L96.7 59.4 L99.5 62.7 L102.2 65.9 L105 68.9 L107.8 71.8 L110.5 74.5 L113.3 77.2 L116.1 79.7 L118.9 82.2 L121.6 84.5 L124.4 86.7 L127.2 88.9 L130 90.9 L132.7 92.9 L135.5 94.7 L138.3 96.5 L141 98.2 L143.8 99.9 L146.6 101.5 L149.4 103 L152.1 104.4 L154.9 105.8 L157.7 107.1 L160.5 108.4 L163.2 109.6 L166 110.8 L168.8 111.9 L171.5 113 L174.3 114 L177.1 115 L179.9 115.9 L182.6 116.8 L185.4 117.7 L188.2 118.5 L191 119.3 L193.7 120 L196.5 120.8 L199.3 121.5 L202 122.1 L204.8 122.8 L207.6 123.4 L207.8 123.4 L210.4 110.6 L213.1 98.2 L215.9 87.2 L218.7 77.6 L221.5 69.3 L224.2 62.4 L227 56.6 L229.8 52.1 L232.5 48.7 L235.3 46.5 L238.1 45.2 L240.9 44.8 L243.6 48.5 L246.4 52.2 L249.2 55.8 L252 59.3 L254.7 62.6 L257.5 65.7 L260.3 68.8 L263 71.7 L265.8 74.4 L268.6 77.1 L271.4 79.6 L274.1 82.1 L276.9 84.4 L279.7 86.6 L282.5 88.8 L285.2 90.8 L288 92.8 L290.8 94.7 L293.5 96.5 L296.3 98.2 L299.1 99.8 L301 100.9
8. Forecast, dashed 6 4:
   M301 100.9 L304.6 102.9 L310.2 105.8 L315.7 108.4 L321.3 110.7 L326.8 112.9 L332.4 114.9 L337.9 116.8 L343.5 118.5 L349 120 L354.5 121.4 L360.1 122.7 L362.9 123.3 L365.6 109.7 L368.4 97.4 L371.2 86.5 L374 77 L376.7 68.8 L379.5 61.9 L382.3 56.3 L385 51.8 L387.8 48.6 L390.6 46.4 L393.4 45.2 L396.1 44.8 L398.9 48.7 L404.5 56.1 L410 62.8 L415.5 69 L421.1 74.6 L426.6 79.8 L432.2 84.6 L437.7 88.9 L443.3 92.9 L448.8 96.6 L454.4 99.9 L459.9 103 L465.5 105.8 L471 108.4 L476.5 110.8 L482.1 113 L487.6 115 L493.2 116.8 L498.7 118.5 L504.3 120.1 L509.8 121.5 L515.4 122.8 L518.1 123.4 L520.9 109.7 L523.7 97.4 L526.5 86.5 L529.2 77 L532 68.8
9. Now rule: M301 28V188, ink, 2px. Tab: rect x261 y4 w80 h20 rx6, ink, with text “Now, 14:05” at 301,18 in paper colour.
10. Dose triangles, base y188, apex y181. Taken (filled): x52.4, x207.8. Planned (hollow): x362.9, x518.1.
11. Blood test:
    - Filled ink diamond at 118.4, 84.3.
    - Label “Measured 212” at 118.4, 72, anchor middle, 12px 600 ink.
    - Hollow diamond at 517.2, 123.2 for the next test, with label “Next test” at 532, 146, anchor end, 12px 600 muted.
12. Hover state:
    - Line M256.7 28V188, ink, 1px.
    - Circle cx256.7 cy64.8 r5, fill #FFFFFF, stroke ink 2.
13. Direct labels:
    - “Target 100–200” at 48, 150, green.
    - “If you keep your schedule” at 308, 176, 12px 500 muted.
14. X labels at y208, 12px 500 muted, anchor middle: “Sep 12” 55.1, “Sep 14” 99.5, “Sep 16” 143.8, “Sep 18” 188.2, “Sep 20” 232.5, “Sep 22” 276.9, “Sep 24” 321.3, “Sep 26” 365.6, “Sep 28” 410, “Sep 30” 454.4, “Oct 2” 498.7.

**Readout strip**
Padding 0 20. Plate radius 12, padding 10px 14px.
- “Mon Sep 21, 14:05”, 14/20 600.
- “About 243 pg/mL, estimated. Above your target, which is usual for 2 to 3 days after a shot.”, 14/20.

**Caption**
p 14/20 muted, padding 0 20: “Adjusted up 10% to match your 4 blood tests.”

### 4c. Coming up
- C5 heading “Coming up”, with a quiet link “Reminders” on the right.
- Surface block with 3 rows:
  1. Cyproterone tonight 21:00, “in 7 hours”.
  2. Estradiol valerate Sat Sep 26 09:00, “Suggested site: right thigh”, “in 2 days”.
  3. “Blood test at your low point”, Sat Oct 3 07:30, “in 10 days”.

## Keyboard
- L opens the Log sheet as a centred 560px dialog.
- Arrow keys move the chart cursor only when the chart has focus.
- There are no global key handlers in the mock.
