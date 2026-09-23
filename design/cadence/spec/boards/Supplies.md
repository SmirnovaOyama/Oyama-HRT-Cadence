# Artboard Supplies.dc.html — Supplies (mobile, new)
Size: 390×1220 px, theme: light, canvas row: New features

# Supplies (mobile, light)

**Scenario:** Wed Sep 23.

**Setup:**
- Follow C0 to C27.
- Use the C1 light helmet.
- Root is 390×1220, and $preview matches.

## 1. Back header (C4)
- Back link: “You”
- h1: “Supplies”

## 2. Lead
A p at 16/24: “Counted from the doses you log, so there’s nothing to tick off.”

## 3. Attention panel (C14)
Gap 16 above. The panel is a flex column with gap 10.
- **Title row** (gap 10): triangle-alert icon at 20px in #8A5A00, then h2 “Reorder cyproterone by Sat Oct 3” in display 600, 18/24.
- **Body:** p at 16/24, “About 24 days of tablets left. It usually takes 2 weeks to arrive.”
- **Button row** (gap 8):
  - primary, 48px: “I’ve reordered”
  - secondary, 48px (surface fill): “Remind me Thursday”

## 4. Your supplies
Gap 32 above.
- C5 heading “Your supplies”, with a quiet link “Add” (plus icon) on the right.
- A C11 surface block. Each entry has padding 16 on the top and bottom, and a row with gap 12: the tile, then a column with gap 6.

### Entry 1: estradiol valerate vial
- **Tile:** estradiol, syringe icon
- **Title:** “Estradiol valerate 40 mg/mL, 5 mL vial”
- **Line:** “About 3.8 mL left, enough for about 25 shots” (14/20 ink)
- **Bar:** C22 at 76% accent
- **Note:** “Opened Aug 1. Lasts until about Mar 13, 2027.” (14/20 muted)

### Entry 2: cyproterone tablets
- **Tile:** cyproterone, pill icon
- **Title:** “Cyproterone acetate 50 mg tablets”
- **Line:** “6 tablets left. You take a quarter a day.”
- **Bar:** 20%, filled #8A5A00
- **Note:** “Runs out around Sat Oct 17. Reorder by Sat Oct 3.” (in #8A5A00)

### Entry 3: needles and syringes
- **Tile:** neutral, package icon
- **Title:** “Needles and syringes”
- **Line:** “9 sets left, one per shot”
- **Bar:** 45% accent
- **Note:** “Enough until about Sat Nov 21.”

## 5. How it’s counted
Gap 32 above.
- C5 heading: “How it’s counted”
- p at 16/24: “Each shot uses 0.10 mL, plus about 0.05 mL left in the needle.”
- p at 16/24: “Each cyproterone dose uses a quarter of a tablet.”
- Quiet link: “Change how it’s counted”

## 6. Privacy note (C14 plate panel)
A row with gap 10:
- lock icon, 20px
- p at 14/20: “Supplies are saved on this device and in your encrypted backup. They’re never included in share links, and your assistant can’t see them unless you allow it.”

## 7. Bottom bar
C16 light, with You active.

## Visible states
- One item needs attention.
- Progress bars are flat and always shown with words.
- The mL-per-shot rule is the same one that powers the “0.10 mL” shown in the Log sheet.
