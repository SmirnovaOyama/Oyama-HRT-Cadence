# Artboard You.dc.html — You and settings (mobile)
Size: 390×2000 px, theme: light, canvas row: Core mobile

# You and settings (mobile)

**Scenario:** Wed Sep 23, light theme. This is a single scrolling page that combines settings and account; there are no category drill-ins. Follow C0 to C27 and the C1 light helmet. Root is 390×2000, and $preview matches.

## 1. Header (C3)
h1 “You”.

## 2. Profile row
A button, full width, with display flex, gap 12, min-height 72, align-items center, border 0, and background transparent.
- Avatar: 56×56, border-radius 28px, background #F6DFD2, text “M” in display 600 24/24, colour #6E2A12, centred.
- Column:
  - “mika_e2” at 16/22 600
  - “Two-step sign-in on, 3 devices signed in” at 14/20 muted
- Chevron-right at the end.

## 3. Sync panel (C14 plate panel)
- Row with gap 12:
  - cloud-check icon, 22px, #2F6B45
  - column:
    - “Backed up 4 minutes ago.” at 16/22 600
    - “Encrypted, so only your password can open it.” at 14/20 muted
- C13 switch row, on, with no bottom border: “Keep this device and the cloud in step”.

## 4. Your routine
Section gap 32. C5 heading “Your routine”, then a C11 surface block. Rows have no tile; each has a title, a sub-line, and a right value plus chevron:

| Title | Sub-line | Right value |
|---|---|---|
| What you’re tracking | Each kind keeps its own records | Feminizing HRT |
| Body weight | Heavier means lower estimates for the same dose | 62.5 kg |
| Your target range | Used for the words and the band on your chart | 100–200 pg/mL |
| Reminders | Next: cyproterone tonight at 21:00 | 4 on |
| Supplies | Cyproterone needs reordering (sub-line in #8A5A00) | 3 tracked |

## 5. Connections
C5 heading “Connections”, then a surface block:

| Title | Right value |
|---|---|
| Assistant, with a plug tile | Claude Desktop, until Dec 21 |
| Share with someone, with a share-2 tile | 1 active link |

## 6. Display
C5 heading “Display”, then a surface block containing:

1. Row “Language”, right value “English” plus chevron.
2. Block “Appearance”, padding 12px 0, with a hairline bottom border:
   - Label at 16/22 600.
   - A 2-column grid with gap 8 of 48px option buttons (C9 style, radius 12):
     - “Light”
     - “Dark”
     - “System” (selected, with 2px ink border, #F6DFD2 fill, and check icon)
     - “Black and white”
3. C13 switch row, on: “Pixel cats”, sub-line “A cat sits in your dial. Its pose follows the time of day.”
4. Block “Cat colours”, padding 12px 0:
   - Label at 16/22 600.
   - A row of 3 option buttons, each flex 1, height 72, radius 12, flex column, centred, gap 6. Each has a 24×24 swatch box (radius 6, 1px #E2DACB border, overflow hidden) above a label at 14/18 600:
     - “Flag” (selected, with 2px ink border and #F6DFD2 fill). Its swatch is five stacked flat divs, each 24 wide and 4.8 tall, in this order: #9FD4EE, #F6BFCE, #FFFFFF, #F6BFCE, #9FD4EE.
     - “Blue”, with swatch fill #9FD4EE.
     - “Pink”, with swatch fill #F6BFCE.

## 7. Your data
C5 heading “Your data”, then a surface block:

| Tile | Title | Sub-line |
|---|---|---|
| history | Restore points | About an hour ago, yesterday, last week, last month |
| file-text | Letter for your clinician | A printable summary in any of 7 languages |
| lock | Save a backup file | Encrypted by default. Spreadsheet (CSV) is inside too |
| arrow-down | Bring in a backup file | Shows what’s inside before anything changes |

## 8. Advanced
C5 heading “Advanced”, then a surface block with 1 row:
- Title “Model details”
- Sub-line “Standard values. Blood tests usually personalise better.”
- Chevron.

## 9. About
Surface block with 1 row:
- Title “About Oyama Tracker”
- Sub-line “How the estimate works, transparency, disclaimer, source code”
- Right value “1.4.0” plus chevron.

## 10. Danger area
Gap 48 above, with a hairline top. Flex column, gap 8:
- Secondary button, full width, 48px, with log-out icon: “Sign out”.
- Destructive-text button “Clear all records on this device”, followed by p 14/20 muted “Your cloud backup is kept.”
- Destructive-text button “Delete account”.

## 11. Bottom bar
C16 light, with You active.

## Checks
- Every switch has an accessible name.
- The HRT-mode row warns in words.
- No drop shadows on switch knobs.
- The flag swatch uses flat stripes, not a gradient.
