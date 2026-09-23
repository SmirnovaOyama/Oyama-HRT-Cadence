# Artboard BloodTests.dc.html — Blood tests and calibration (mobile)
Size: 390×1980 px, theme: light, canvas row: Core mobile

# Blood tests and calibration (mobile)

**Scenario:** Wed Sep 23. Light theme.

**Setup:** Follow C0 to C27 and the C1 light helmet. Root is 390×1980, and $preview matches.

## 1. Header (C3)
- h1 “Blood tests”.
- Right: a secondary compact button (44px) with a plus icon, labelled “Add a result”.

## 2. Lead
- p, display 500 22/30, ink: “Your last test found estradiol at 212 pg/mL, a little above your 100–200 target.”
- p 16/24 ink: “It was taken on Tue Sep 15, 3 days after a shot, while levels are still high. A test just before a shot shows your lowest level.”

## 3. Next test planner
C14 plate panel, gap 12, 24px below the lead.
- h2 “Your next test”, display 600 20/26.
- p 16/24 600: “Best time: Sat Oct 3, 07:30 to 08:30, before your 09:00 shot.”
- p 14/20 muted: “That’s your low point, the number clinics usually ask for. Ask the lab to write down the exact time.”
- Button row, gap 8:
  - primary 48 with bell icon: “Remind me”
  - secondary 48 with calendar icon: “Add to calendar”
- Checklist, a column with gap 6. Each line is a row: check icon (18px, #2F6B45), then text at 14/20 ink.
  - “Take the test before your shot, not after”
  - “Use the same lab if you can”
  - “Write down the exact time”

## 4. Measured against the model
Gap 32 above.
- C5 heading “Measured against the model”.
- SVG 358×176, viewBox 0 0 358 176.
  - aria-label: “Four estradiol tests compared with what the standard model expected. Each measured about 8 to 11 percent higher.”
- Chart elements:
  1. Text “pg/mL” at x0, y10, 12px 600, muted.
  2. Band: rect x36 y56 w322 h80, fill #2F6B45, fill-opacity 0.12. Band edges: path M36 56H358M36 136H358, dashed 3 3.
  3. Tick labels, 12px 500 muted, anchor end: “200” at x28 y60, “100” at x28 y140.
  4. For each test, in this order:
     - an accent connector line from expected to measured, 2px;
     - a hollow diamond at the expected value (fill paper, stroke ink 2);
     - a filled ink diamond at the measured value.
  5. Test positions:

     | Test | x | Expected y | Measured y |
     |---|---|---|---|
     | Jun 20 | 76 | 107.2 | 98.4 |
     | Jul 18 | 150 | 100 | 87.2 |
     | Aug 22 | 224 | 106.4 | 96 |
     | Sep 15 | 298 | 59.2 | 46.4 |

  6. Value labels, all anchor middle:
     - Measured values, 12px 600 ink, placed 10px above: “147” at 76,88; “161” at 150,77; “150” at 224,86; “212” at 298,36.
     - Expected values, 12px 500 muted, placed below: “136” at 76,125; “145” at 150,118; “137” at 224,124; “196” at 298,77.
  7. “Target 100–200” at x350 y130, anchor end, green 12px 600.
  8. X labels at y164, 12px 500 muted, anchor middle: “Jun 20” 76, “Jul 18” 150, “Aug 22” 224, “Sep 15” 298.
- Caption, 14/20 muted: “Hollow: what the standard model expected. Filled: what the lab measured. Your tests run about 10% above the model, so your curve is adjusted up 10%.”

## 5. Your results
Gap 32 above.
- C5 heading “Your results”.
- C11 surface block. Entries are buttons with a grid of 76px and 1fr, gap 12, padding 16px 0, hairline between entries, and a chevron-right at top right.
- Left column: date at 14/20 600, then time at 14/20 muted.

**Entry 1: “Sep 15”, “08:30”**
- “Estradiol 212 pg/mL” at 16/22 600, then “(778 pmol/L)” at 14 muted.
- C12 attention tag with arrow-up: “A little above your target”.
- p 14/20 muted: “The model expected 196, so you measured 8% higher. Taken 3 days after your shot.”
- A 1px hairline, then “Testosterone 24 ng/dL (0.83 nmol/L)” at 16/22 600.
- p 14/20 muted: “In the usual range for your treatment, under 50. Shown on your chart; it doesn’t adjust the curve.”

**Entry 2: “Aug 22”, “08:40”**
- “Estradiol 150 pg/mL (551 pmol/L)”.
- In-target tag with circle-check: “In your target”.
- “Expected 137, 9% higher. Just before your shot, your low point.”

**Entry 3: “Jul 18”, “10:05”**
- “Estradiol 161 pg/mL (591 pmol/L)”.
- In-target tag.
- “Expected 145, 11% higher. 1 hour after your shot.”

**Entry 4: “Jun 20”, “08:30”**
- “Estradiol 147 pg/mL (540 pmol/L)”.
- In-target tag.
- “Expected 136, 8% higher. Just before your shot.”

## 6. How your curve is adjusted
Gap 32 above.
- C5 heading “How your curve is adjusted”.
- Four p lines at 16/24 ink, gap 4:
  - “Your estradiol runs about 10% higher than the standard model.”
  - “It lasts about 8% longer between doses.”
  - “The adjusted curve is usually within 3% of your tests.”
  - “Based on 4 estradiol tests.”
- Label “Choose how tests adjust it” at 16/22 600.
- C10 stack, gap 8:
  1. Selected, with trailing check: title “Balanced” followed by the inline text “Recommended” (14 600 #2F6B45); sub “Follows your tests and ignores one odd result. Technical name: Hybrid-MIPD.”
  2. “Follows recent changes”, sub “Recent tests count most; older ones fade after about 2 weeks. Technical name: OU-Kalman.”
  3. “Remembers every test”, sub “Every test keeps counting, even old ones. Technical name: EKF.”
  4. “Off”, sub “Show the standard model only.”
- C13 switch row, on: “Let new tests update my past curve”, sub “On: adding a test today can also redraw last month.”
- Row with gap 8: info icon (18px, muted), then p 14/20 muted: “Only estradiol tests adjust the curve. Testosterone tests are shown on your chart.”

## 7. Advanced model settings
C11 surface block with one row: neutral tile, title “Advanced model settings”, sub “Standard values. Blood tests usually personalise better than editing these.”, and a chevron.

## 8. Danger area
Gap 48 above, with a hairline on top.
- Destructive-text button: “Delete all blood test results”.
- p 14/20 muted: “Deletes 4 tests from this device and your backup. Your curve goes back to the standard model.”

## 9. Bottom bar
C16 light, with Tests active.

## Visible states
- Balanced is selected.
- Switch is on.
- The two tag types are shown.
- No per-lab dots and no “×1.30” chips.
