# Artboard TodayDark.dc.html — Today, dose due (mobile, dark)
Size: 390×844 px, theme: dark, canvas row: Dark and desktop

# Today, dose due (mobile, dark)

**Scenario:** Wed Sep 23, 21:04. Cyproterone has been due since 21:00.

**Setup:**
- Follow C0 to C27, using every DARK value.
- Use the C1 dark helmet: body background #16130F, text colour #F1EBE2.
- Root is 390×844, background #16130F, and $preview is 390×844.

## 1. Header (C3 date variant)
- h1 “Wednesday, September 23” in #F1EBE2.
- Line “Feminizing HRT” in #B8AD9E.
- Icon button with the cloud-check icon in #8FCFA3, aria-label “Backed up 2 minutes ago”.

## 2. Dial plate
The plate has background #26211B, radius 28, padding 16 and gap 12.

**Text pair**
- “Day 5 of 7 in your weekly cycle” at 16/22 600, #F1EBE2.
- “Shot taken Sat 09:12. Next shot Sat 09:00.” at 14/20, #B8AD9E.

**Dial**
- C19 at 280×280, in the “dark, Wed 21:04” state. The hand points at the Wednesday cyproterone slot, which is drawn filled #3A2A42 with a solid 2px #CFA6DE outline.
- aria-label: “Day 5 of 7 in your weekly cycle. Cyproterone is due now. Estradiol valerate next Saturday at 09:00.”
- Centre button:
  - C24 awake cat with its empty bowl, 66×33, placed in the 22-unit viewBox.
  - “181” in display 600 40/40, #F1EBE2.
  - “pg/mL” at 14/18 600, #B8AD9E.

**Status line**
- circle-check icon in #8FCFA3, then “In your target range (100–200)” in #8FCFA3.

## 3. Due block (C14 due, dark cyproterone)
Gap 16 above. Background #1E1A16, 2px solid #CFA6DE border, radius 16, padding 16, flex column, gap 12.

1. Row with gap 12:
   - Tile: background #3A2A42, pill icon in #CFA6DE.
   - Column:
     - h2 “Cyproterone acetate 12.5 mg is due now” in display 600 20/26, #F1EBE2.
     - p “Due at 21:00, 4 minutes ago. A quarter of a 50 mg tablet.” at 14/20, #B8AD9E.
2. Primary-xl button, dark: background #E48A63, text #2A1206, check icon, label “Log it now”.
3. Row with gap 8:
   - Secondary compact button (dark), clock icon, label “Snooze 1 hour”.
   - Quiet button in #E48A63, label “Skip this one”.

## 4. Bottom bar
C16 dark, with Today active.

## Contrast checks
- Muted #B8AD9E on #26211B is 7.2:1.
- Accent-button text is 6.8:1.
- There is no red anywhere. The cat is shown waiting, not sad.
