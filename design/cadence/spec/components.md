# Cadence components. Every builder uses these recipes exactly.

## C0 Shared sample data (the same person on every board)

**Person**
- Username mika_e2. Feminizing HRT. Body weight 62.5 kg.
- Home time zone Istanbul (UTC+3). Language English. Appearance System.

**Routine**
1. Estradiol valerate 4 mg, injection into muscle, every 7 days on Saturdays at 09:00.
   - Reminder at 08:45.
   - Drawn as 0.10 mL from a 40 mg/mL vial (5 mL, opened Aug 1).
2. Cyproterone acetate 12.5 mg (a quarter of a 50 mg tablet), every day at 21:00.
   - Reminder at 21:00, and again at 22:00 if not logged.

**Injections logged**
| Date and time | Site | Note |
|---|---|---|
| Sat Sep 19, 09:12 | left thigh | |
| Sat Sep 12, 09:05 | right glute | |
| Sat Sep 5, 09:10 | left glute | |
| Sat Aug 29, 12:05 | right thigh | 3 hours late |

Suggested next site: right thigh, last used 28 days ago.

**Cyproterone logged**
- Every evening around 21:00, except Sun Sep 13 and Tue Sep 22 (not logged).
- Claude suggested an entry for Tue Sep 22 at 21:10.

**Now (default)**
- Wed Sep 23, 14:05. Estradiol about 186 pg/mL (683 pmol/L), in target 100–200.
- Day 5 of 7.
- Highest this cycle about 274 (Sun Sep 20, around 21:00).
- Lowest before the next shot about 151 (Sat Sep 26, 09:00).
- Mon Sep 21, 14:05 was about 243.
- Cyproterone estimate about 19 ng/mL.
- Other board states:
  - Dark board: Wed Sep 23, 21:04, estradiol about 181, cyproterone due since 21:00.
  - Log board: Sat Sep 26, 09:04, estradiol about 151.

**Blood tests**
| Date and time | Estradiol measured | Model expected | Difference | Timing | Status |
|---|---|---|---|---|---|
| Tue Sep 15, 08:30 | 212 pg/mL (778 pmol/L) | 196 | +8% | 3 days after shot | a little above target |
| Sat Aug 22, 08:40 | 150 (551 pmol/L) | 137 | +9% | just before shot | in target |
| Sat Jul 18, 10:05 | 161 (591 pmol/L) | 145 | +11% | 1 hour after shot | in target |
| Sat Jun 20, 08:30 | 147 (540 pmol/L) | 136 | +8% | just before shot | in target |

The Sep 15 draw also measured testosterone 24 ng/dL (0.83 nmol/L).

**Calibration**
- Balanced (Hybrid-MIPD).
- Runs about 10% higher than the standard model.
- Lasts about 8% longer.
- Usually within 3% of the tests.
- Based on 4 estradiol tests.
- "Let new tests update my past curve" is on.

**Next suggested test**
- Sat Oct 3, 07:30 to 08:30, before the 09:00 shot.
- Reminders Fri Oct 2 at 20:00 and Sat Oct 3 at 07:00.

**Supplies**
| Item | Left | Lasts until | Reorder |
|---|---|---|---|
| Estradiol valerate vial | about 3.8 mL (76%), about 25 shots | about Sat Mar 13, 2027 | |
| Cyproterone acetate 50 mg tablets | 6 of 30 (20%), about 24 days | runs out around Sat Oct 17 | by Sat Oct 3 (takes about 2 weeks) |
| Needles and syringes | 9 of 20 sets (45%) | about Sat Nov 21 | |

**Adherence**
- Injections on time 12 of the last 13 weeks.
- Cyproterone logged 23 of the last 25 evenings.

**Records**
- 142 doses since Sat Jan 3.
- 4 blood tests.

**Assistant**
- Claude Desktop, on this computer, connected Mon Sep 21.
- Reads dose history, estimated levels, schedules and on-time record for the last 90 days.
- Can suggest entries.
- Access ends Mon Dec 21. Last used today at 14:02.

**Account**
- Backed up 4 minutes ago. Auto sync on.
- Two-step sign-in on. 3 devices signed in. 1 active share link.
- Version Stable 1.4.0.

## C1 Helmet (every board)
Keep the template exactly: script support.js, x-dc, helmet.

Inside helmet:
- the preconnect link to https://fonts.googleapis.com;
- the one css2 link from the tokens;
- one style block.

Light style block:

body{margin:0;background:#FBF8F3;color:#1F1B16;font-family:'Atkinson Hyperlegible Next','PingFang SC','Hiragino Sans','Noto Sans CJK SC','Microsoft YaHei','Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:24px;font-variant-numeric:tabular-nums}
button,input,select,textarea{font-family:inherit;font-size:inherit;line-height:inherit;color:inherit}
a{color:#A34A28}a:hover{color:#8F3F20}
:focus-visible{outline:3px solid #1F1B16;outline-offset:2px}

Dark style block: same rules, with body background #16130F, color #F1EBE2, a #E48A63, a:hover #EFA17F, and outline colour #F1EBE2.

The data-props $preview equals the root width and height.

Display font inline value: font-family:'Bricolage Grotesque','PingFang SC','Hiragino Sans','Noto Sans CJK SC','Microsoft YaHei','Apple SD Gothic Neo',system-ui,sans-serif

## C2 Root
The root div is position:relative, with width and height set to the artboard size, box-sizing:border-box, overflow:hidden, and background paper.

**Mobile**
- A content column: position:absolute; top:0; left:16px; right:16px; display:flex; flex-direction:column. Use the gaps given in each spec.
- The bottom bar (C16) is absolute at bottom:0.
- Content must end at least 24px above the bar. Any leftover height is plain paper.

**Desktop**
- Rail (C17) plus a main area with position:absolute; left:264px; right:0; top:0; bottom:0; padding:32px 40px; box-sizing:border-box.

## C3 Mobile top header (top-level tabs)
Container: display:flex; align-items:center; justify-content:space-between; min-height:64px; padding:12px 0; box-sizing:border-box.

The title is an h1 with margin:0 in the display font at 600 28px/34px ink. Today uses the date-title variant instead: 22/28 plus a 14/20 muted second line. Trailing actions are icon buttons (C6) or a secondary button.

## C4 Back header (sub-pages)
1. Row 1, min-height 56px: an anchor or button with display:inline-flex; align-items:center; gap:4px; height:44px; padding:0 8px 0 0; border:0; background:transparent; text-decoration:none; color:#1F1B16; font-weight:600; font-size:16px; line-height:20px. It holds an arrow-left icon (20px) and the parent name, for example "You".
2. Row 2: an h1 page-title, 28/34 in the display font 600, margin 0.
3. The first content block follows 16px below.

## C5 Section heading row
Container: display:flex; align-items:center; justify-content:space-between; min-height:44px; gap:12px.
- Heading: h2 with margin:0, display font 600 20px/26px, ink.
- Optional right link: a quiet button (C6) at 14px/18px 600 accent, followed by a chevron-right icon at 16px.

There are no dots, counters, caps or eyebrows.

## C6 Buttons
Every button also sets cursor:pointer and box-sizing:border-box.

**primary-xl**
- Light: display:flex; align-items:center; justify-content:center; gap:10px; width:100%; height:64px; padding:0 20px; border:0; border-radius:20px; background:#A34A28; color:#FFFFFF; font-weight:600; font-size:18px; line-height:22px.
- Dark: background #E48A63, color #2A1206.

**primary**
- Same as primary-xl, but height:48px; border-radius:12px; padding:0 20px; font-size:16px; line-height:20px; width:auto; display:inline-flex.

**secondary**
- Light: display:inline-flex; align-items:center; justify-content:center; gap:8px; height:48px (44px compact); padding:0 18px; border:1px solid #8F8578; border-radius:12px; background:#FFFFFF; color:#1F1B16; font-weight:600; font-size:16px; line-height:20px.
- Dark: background #1E1A16, border #857B6E, color #F1EBE2.

**quiet**
- Light: display:inline-flex; align-items:center; gap:6px; height:44px; padding:0 4px; border:0; background:transparent; color:#A34A28; font-weight:600; font-size:16px; line-height:20px; text-decoration:none.
- Dark: color #E48A63.

**destructive-text**
- The quiet button with color #A3261B (dark #F2998F).

**icon**
- width:44px; height:44px; border:0; border-radius:12px; background:transparent; display:grid; place-items:center; color:#1F1B16.
- Must have an aria-label. Icon size 22.

## C7 Inputs and stepper
**Field**
- A wrapper with display:flex; flex-direction:column; gap:6px.
- label: font-weight:600; font-size:14px; line-height:18px; with for/id linked.
- input: height:48px; width:100%; box-sizing:border-box; padding:0 14px; border:1px solid #8F8578; border-radius:12px; background:#FFFFFF; font-size:16px; line-height:24px.
- Dark: background #1E1A16, border #857B6E.

**Stepper**
- A row with display:flex; align-items:center; gap:12px.
- A 48×48 secondary "minus" button (aria-label "Less").
- The value in the centre: flex:1; text-align:center; display font 600 28px/32px.
- A 48×48 secondary "plus" button (aria-label "More").

## C8 Segmented control
**Track**
- Light: display:flex; gap:4px; padding:4px; background:#F3EEE6; border-radius:12px; box-sizing:border-box; height:44px. role=radiogroup.
- Dark: background #26211B.

**Segment**
- flex:1; height:36px; border:0; border-radius:8px; background:transparent; color:#5F574C; font-weight:600; font-size:14px; line-height:18px. role=radio.

**Selected segment**
- Light: background:#FFFFFF; border:2px solid #1F1B16; color:#1F1B16; aria-checked=true.
- Dark: background #1E1A16, border #F1EBE2, color #F1EBE2.

## C9 Choice chips
**Chip**
- display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 14px; box-sizing:border-box; border:1px solid #8F8578; border-radius:12px; background:#FFFFFF; color:#1F1B16; font-weight:600; font-size:14px; line-height:18px.

**Selected chip**
- Light: border:2px solid #1F1B16; padding:0 13px; background:#F6DFD2; color:#6E2A12. It has a leading check icon at 16px, and aria-pressed=true.
- Dark: background #4A2616, color #FFD9C7, border #F1EBE2.

**Two-line chip (sites)**
- flex-direction:column; align-items:flex-start; justify-content:center; min-height:64px; padding:8px 12px.
- Line 1 is 14/18 600. Line 2 is 14/18 400, in muted text (on-accent-container when selected).

## C10 Selectable rows (radio rows)
**Row**
- A button: display:flex; align-items:center; gap:12px; width:100%; min-height:64px; padding:12px 14px; box-sizing:border-box; border:1px solid #8F8578; border-radius:12px; background:#FFFFFF; text-align:left. role=radio.

**Selected row**
- border:2px solid #1F1B16; padding:11px 13px. A trailing check icon at 22px in ink, with aria-checked=true.
- Unselected rows have no trailing mark. There are no radio circles.

**Text**
- Title: 16/22 600.
- Optional inline tag text, for example "Recommended" as 14/18 600 #2F6B45. It is text only, never a pill.
- Sub-line: 14/20 muted.

Rows stack with gap 8.

## C11 List rows and icon tiles
**Surface block**
- Light: background:#FFFFFF; border:1px solid #E2DACB; border-radius:16px; padding:0 16px.
- Dark: background #1E1A16, border #3A332B.

**Row**
- display:flex; align-items:center; gap:12px; min-height:64px; padding:12px 0; box-sizing:border-box; border-bottom:1px solid #E2DACB. The last row has no border.
- Title: 16/22 600.
- Sub-lines: 14/20 muted.
- Trailing time or value: 14/20 muted, white-space:nowrap, followed by an optional chevron-right icon at 16px in muted.
- Tappable rows are buttons or anchors with text-align:left and full width.
- Rows grow in height with long text. Text never truncates.

**Icon tile**
- width:40px; height:40px; flex:none; border-radius:12px; display:grid; place-items:center. Icon size 20.

| Kind | Light (background / icon) | Dark (background / icon) |
|---|---|---|
| estradiol | #F6DFD2 / #A34A28 | #4A2616 / #E48A63 |
| cyproterone | #EFE4F2 / #7A4A8C | #3A2A42 / #CFA6DE |
| blood test | #F3EEE6 / #1F1B16 | #26211B / #F1EBE2 |
| attention | #F5E6C4 / #8A5A00 | #3D2F10 / #E8C170 |
| neutral | #F3EEE6 / #5F574C | #26211B / #B8AD9E |

## C12 Status language and tags
Status is always an icon plus words, and optionally a tonal fill.

**Level words (feminizing, target 100–200 pg/mL)**
| Level | Words | Icon | Colour |
|---|---|---|---|
| in range | In your target range (100–200) | circle-check | target |
| up to 20% above | A little above your target | arrow-up | attention |
| more than 20% above | Above your target | arrow-up | attention |
| up to 20% below | A little below your target | arrow-down | attention |
| more than 20% below | Below your target | arrow-down | attention |

- Transmasc mode uses "Testosterone (total)" with a 300–1000 ng/dL target. The unit switch is ng/dL or nmol/L.
- Red is never used for levels.

**Dose words**
Taken, Taken late, Not logged, Due now, Coming up, Skipped.

**Estimate words**
"about", "estimated, not measured", "If you keep your schedule".

**Tag**
- display:inline-flex; align-items:center; gap:6px; min-height:32px; padding:0 10px; border-radius:8px; font-weight:600; font-size:14px; line-height:18px. Icon size 16.

| Tag | Light | Dark |
|---|---|---|
| in-target | background #DCEBDF, color #2F6B45 | #1E3A28 / #8FCFA3 |
| attention | background #F5E6C4, color #8A5A00 | #3D2F10 / #E8C170 |
| neutral | background #F3EEE6, color #5F574C | |

**Status line (no fill)**
- A row with gap 8: icon at 20px, then text at 16/22 600, both in the status text colour.

## C13 Switch and switch rows
**Switch**
- A button with role=switch, aria-checked and aria-labelledby pointing to the row label id.
- position:relative; width:52px; height:32px; flex:none; padding:0; border-radius:16px; box-sizing:border-box.

| State | Track | Knob |
|---|---|---|
| Off, light | background #E9E2D6, border 1px solid #8F8578 | position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:12px; box-sizing:border-box; background:#FFFFFF; border:1px solid #8F8578 |
| On, light | background #A34A28, border 1px solid #A34A28 | left:23px; border-color:#A34A28 |
| Off, dark | #332C24 with border #857B6E | #B8AD9E, no border |
| On, dark | #E48A63 | #2A1206, no border |

The knob is flat. There is no shadow.

**Switch row**
- display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:64px; padding:12px 0; border-bottom:1px solid #E2DACB.
- The label is 16/22 600, with a 14/20 muted sub-line.

## C14 Panels
**Plate panel**
- Light: background:#F3EEE6; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px.
- Dark: #26211B.

**Dial plate**
- Same as the plate panel, with border-radius:28px.

**Attention panel**
- Light: background:#F5E6C4; border-radius:16px; padding:16px. The icon is #8A5A00 and the text is ink.
- Dark: #3D2F10 with icon #E8C170.

**Pending block (assistant suggestion, anything awaiting your decision)**
- Light: background:#FFFFFF; border:2px dashed #8F8578; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:8px.
- Dark: #1E1A16 with border #857B6E.
- It always names who suggested the entry.

**Due block**
- Light: background:#FFFFFF; border:2px solid #7A4A8C (cyproterone) or #A34A28 (estradiol); border-radius:16px; padding:16px.
- Dark: background #1E1A16, border #CFA6DE or #E48A63.

## C15 Toast with undo
- Light: display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:52px; padding:0 8px 0 16px; background:#F6DFD2; color:#6E2A12; border-radius:12px.
- Content: a check icon at 20px, then 14/20 600 text such as "Logged cyproterone 12.5 mg at 21:05", then a quiet "Undo" button in #6E2A12.
- Not drawn on any board. Documented for the code phase.

## C16 Bottom tab bar (mobile)
**Container**
- Light: nav aria-label=Main; position:absolute; left:0; right:0; bottom:0; height:72px; box-sizing:border-box; padding:6px 8px 10px; background:#FFFFFF; border-top:1px solid #E2DACB; display:grid; grid-template-columns:1fr 1fr 76px 1fr 1fr; align-items:start.
- Dark: background #1E1A16, border #3A332B.

**Slots in order**
| Slot | Icon | Label | Element |
|---|---|---|---|
| 1 | sun | Today | anchor |
| 2 | activity | Timeline | anchor |
| 3 | plus | Log | button |
| 4 | test-tube | Tests | anchor |
| 5 | user-round | You | anchor |

**Tab**
- display:flex; flex-direction:column; align-items:center; gap:4px; min-height:56px; text-decoration:none.
- Icon wrapper: width:56px; height:36px; border-radius:12px; display:grid; place-items:center.
- Icon size 22, stroke 1.75.
- Label: 12px/16px 600.

**Tab states**
| State | Light | Dark |
|---|---|---|
| Inactive | wrapper transparent, icon and label #5F574C | #B8AD9E |
| Active (aria-current=page) | wrapper background #F6DFD2, icon #6E2A12 at stroke 2, label #6E2A12 | wrapper #4A2616, icon and label #FFD9C7 |

**Log slot**
- A button with border:0; background:transparent; padding:0.
- Wrapper: width:60px; height:36px; border-radius:12px; background:#A34A28; color:#FFFFFF. Plus icon at 24px, stroke 2.25.
- Label "Log" in ink.
- Dark: #E48A63 wrapper with #2A1206 icon.

Sub-pages map to their parent tab. Reminders, Supplies, Assistant and Settings pages highlight You.

## C17 Desktop rail
**Container**
- Light: aside with position:absolute; left:0; top:0; bottom:0; width:264px; box-sizing:border-box; padding:24px 16px; background:#F3EEE6; border-right:1px solid #E2DACB; display:flex; flex-direction:column; gap:24px.

**Contents in order**
1. Wordmark row: display:flex; align-items:center; gap:10px; min-height:44px. The pixel cat (C24) at 32×22, then "Oyama Tracker" in the display font 600 18px/24px.
2. Action column (gap 8):
   - a primary button at 48px height, full width: plus icon and "Log a dose";
   - a secondary button at 44px, full width: test-tube icon and "Add a blood test".
3. Nav column (gap 4). Each item:
   - display:flex; align-items:center; gap:12px; height:44px; padding:0 12px; box-sizing:border-box; border-radius:12px; text-decoration:none; color:#5F574C; font-weight:500; font-size:16px; line-height:20px; border:1px solid transparent. Icon size 20.
   - Active item: background:#FFFFFF; border-color:#E2DACB; color:#1F1B16; font-weight:600; aria-current=page.

   | Item | Icon |
   |---|---|
   | Today | sun |
   | Timeline | activity |
   | Blood tests | test-tube |
   | Reminders | bell |
   | Supplies | package |
   | Assistant | plug |
   | You | user-round |

   Supplies has a trailing triangle-alert icon at 16px in #8A5A00, with aria-label "1 item to reorder", pushed right with margin-left:auto.
4. Spacer div with flex:1.
5. Footer column: border-top:1px solid #E2DACB; padding-top:16px; gap 4. Lines are 14/20 muted:
   - "Feminizing HRT"
   - "Next: cyproterone tonight at 21:00"
   - "Backed up 4 minutes ago"
   - "Claude Desktop can read until Dec 21"

## C18 Sheet and scrim
**Scrim**
- position:absolute; inset:0; background:rgba(31,27,22,0.32). Dark: rgba(0,0,0,0.55).

**Sheet**
- Light: position:absolute; left:0; right:0; bottom:0; top given per board; background:#FFFFFF; border-top-left-radius:28px; border-top-right-radius:28px; border-top:1px solid #E2DACB; display:flex; flex-direction:column.
- Dark: #1E1A16.
- Grab bar: width:36px; height:4px; border-radius:2px; background:#CBBFAE; align-self:center; flex:none. It sits in an 20px-tall row.
- Sticky footer: background:#FFFFFF; border-top:1px solid #E2DACB; padding:12px 16px 16px; display:flex; flex-direction:column; gap:12px.

## C19 Rhythm dial (the signature)
**Structure**
- The dial is one SVG with viewBox 0 0 300 300 and centre (150,150). Render it at 280×280 on mobile and 400×400 on desktop.
- role=img. The aria-label is given per board.
- The SVG sits inside a position:relative wrapper of the same size. An HTML centre button is overlaid on it:
  - mobile: left 73, top 73, 134×134;
  - desktop: left 104, top 104, 192×192.
- The centre button has border:0; border-radius:50%; background:transparent; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px.

**Outer ring: weekly estradiol segments, r106 to r128, calendar days starting at the top and running clockwise**

| Day | Path d |
|---|---|
| Sat | M153.4 22 A128 128 0 0 1 248 67.6 L231.1 81.8 A106 106 0 0 0 152.8 44 Z |
| Sun | M252.1 72.8 A128 128 0 0 1 275.5 175.2 L253.9 170.9 A106 106 0 0 0 234.6 86.1 Z |
| Mon | M274 181.7 A128 128 0 0 1 208.5 263.8 L198.5 244.3 A106 106 0 0 0 252.7 176.3 Z |
| Tue | M202.5 266.7 A128 128 0 0 1 97.5 266.7 L106.5 246.7 A106 106 0 0 0 193.5 246.7 Z |
| Wed | M91.5 263.8 A128 128 0 0 1 26 181.7 L47.3 176.3 A106 106 0 0 0 101.5 244.3 Z |
| Thu | M24.5 175.2 A128 128 0 0 1 47.9 72.8 L65.4 86.1 A106 106 0 0 0 46.1 170.9 Z |
| Fri | M52 67.6 A128 128 0 0 1 146.6 22 L147.2 44 A106 106 0 0 0 68.9 81.8 Z |

**Inner ring: daily cyproterone slots at 21:00, r90 to r98**

| Day | Path d |
|---|---|
| Sat | M210.3 72.8 A98 98 0 0 1 227.2 89.7 L220.9 94.6 A90 90 0 0 0 205.4 79.1 Z |
| Sun | M248 149 A98 98 0 0 1 245.3 172.8 L237.5 170.9 A90 90 0 0 0 240 149.1 Z |
| Mon | M211.9 226 A98 98 0 0 1 191.6 238.7 L188.2 231.5 A90 90 0 0 0 206.8 219.8 Z |
| Tue | M129.1 245.8 A98 98 0 0 1 106.6 237.9 L110.1 230.7 A90 90 0 0 0 130.8 237.9 Z |
| Wed | M62.1 193.4 A98 98 0 0 1 54.2 170.9 L62.1 169.2 A90 90 0 0 0 69.3 189.9 Z |
| Thu | M61.3 108.4 A98 98 0 0 1 74 88.1 L80.2 93.2 A90 90 0 0 0 68.5 111.8 Z |
| Fri | M127.2 54.7 A98 98 0 0 1 151 52 L150.9 60 A90 90 0 0 0 129.1 62.5 Z |

**Other elements**
- Next-shot tick: path M150 50 L150 14, stroke accent, 2.5 wide, round cap. It sits in the gap between Fri and Sat.
- Syringe glyph on the Sat segment: g transform='translate(193.8 37.6) scale(0.5833)' with fill none, stroke-width 3, round caps and joins, containing the syringe icon paths. Stroke #FFFFFF in light, #2A1206 in dark.
- Weekday labels: 12px text, text-anchor middle.

  | Day | x, y |
  |---|---|
  | Sat | 211.2, 27 |
  | Sun | 287.5, 122.6 |
  | Mon | 260.2, 241.9 |
  | Tue | 150, 295 |
  | Wed | 39.8, 241.9 |
  | Thu | 12.5, 122.6 |
  | Fri | 88.8, 27 |

  Normal labels are weight 500 muted. Today's label is weight 700 ink.
- Centre disc: circle cx 150, cy 150, r 72. Light: fill #FFFFFF, stroke #E2DACB 1. Dark: fill #1E1A16, stroke #3A332B.
- Hand: drawn last, stroke ink, 2.5 wide, round cap.

**State: light, Wed 14:05 (Main and desktop)**
- EV segments:
  - Sat: fill #A34A28 with the white syringe glyph.
  - Sun, Mon and Tue: fill #E9E2D6.
  - Wed: fill #F6DFD2, stroke #1F1B16, stroke-width 2.
  - Thu and Fri: fill #FFFFFF, stroke #E2DACB, width 1.
- CPA slots:
  - Sat, Sun and Mon: fill #7A4A8C.
  - Tue: fill none, stroke #8F8578, width 1.5, dasharray 3 2 (not logged).
  - Wed: fill none, stroke #7A4A8C, width 1.5, dasharray 3 2 (coming up tonight).
  - Thu and Fri: fill #FFFFFF, stroke #E2DACB.
- Hand: M87.1 192.6 L39 225.1.

**State: dark, Wed 21:04 (dark board)**
- EV segments:
  - Sat: #E48A63 with the #2A1206 glyph.
  - Sun, Mon and Tue: #332C24.
  - Wed: fill #4A2616, stroke #F1EBE2, width 2.
  - Thu and Fri: fill #1E1A16, stroke #3A332B.
- CPA slots:
  - Sat, Sun and Mon: #CFA6DE.
  - Tue: stroke #857B6E, dashed 3 2.
  - Wed (due now): fill #3A2A42, stroke #CFA6DE, width 2, solid.
  - Thu and Fri: fill #1E1A16, stroke #3A332B.
- Tick: #E48A63.
- Labels: #B8AD9E, with Wed in #F1EBE2.
- Hand: M78.2 174.9 L23.4 193.9, stroke #F1EBE2.

**Centre content**
- Mobile: C24 cat, the number in dial-number mobile (40/40), then "pg/mL" at 14/18 600 muted.
- Desktop: cat at 64×44, number 60/60, unit 16/20.

## C20 Range ruler (estradiol, scale 50 to 300 pg/mL)
**Mobile**
- SVG 326×44, viewBox 0 0 326 44.
- Zones:
  - rect x0 y4 w65.2 h24, fill #FFFFFF;
  - rect x65.2 y4 w130.4 h24, fill #DCEBDF;
  - rect x195.6 y4 w130.4 h24, fill #FFFFFF.
- Outline: rect x0.5 y4.5 w325 h23 rx6, fill none, stroke #8F8578.
- Inline text "Target 100–200" at x71 y20, 12px 600, #2F6B45.
- Marker for value v at x = (v−50)/250×326. For 186 that is 177.3: rect x176.3 y0 w2 h32 fill ink, plus a polygon at 171.3,0 183.3,0 177.3,7 in ink.
- Tick labels at y42, 12px 500 muted, anchor middle: "100" at x65.2, "200" at x195.6.
- Dark: zone fills #1E1A16 and #1E3A28, outline #857B6E, text #8FCFA3, marker #F1EBE2.

**Desktop**
- Width 472. Every x value × 1.4479: 100 is at 94.4, 200 at 283.2, and the 186 marker at 256.7.

## C21 Charts (shared recipe)
**Layers, bottom to top**
1. Unit caption, 12px 600 muted, top-left (for example "pg/mL").
2. Past-region rect, fill plate. The future region stays paper.
3. Target band rect, fill target at 0.12.
4. Band edges dashed 3 3.
5. Top gridline (hairline) and baseline (#CBBFAE).
6. Y tick labels, 12px 500 muted, anchor end.
7. Likely-range band path, ink at 0.07.
8. Past curve: solid accent, 2px, linejoin round, fill none.
9. Forecast curve: accent, 2px, dasharray 6 4.
10. Now rule: 2px ink, full plot height. The Now tab is a 20px-tall ink rect with rx6 and 12px 600 paper-colour text.
11. Marks.
12. Direct labels. Never a legend with swatches.

**Marks**
- Dose taken: an 8px-wide triangle on the baseline pointing up (x±4, from baseline−7 to baseline), filled accent.
- Dose planned: the same triangle, fill paper, stroke accent 1.5.
- Blood test measured: a 10×10 rect at x−5 y−5 with transform='translate(x y) rotate(45)', filled ink.
- Model expected, or next suggested test: the same rect, fill paper, stroke ink 2.
- Selected mark: an extra 16×16 rotated rect, stroke accent 2, fill none.
- Cyproterone lane: 12px vertical ticks, stroke second 3. Not logged: stroke control 1.5, dashed 2 2. Future: stroke second 1.5, dashed 2 2.
- Hover (desktop only): a 1px ink vertical line and a circle r5, fill surface, stroke ink 2, on the curve. Its readout goes in the strip below the chart, not in a floating tooltip.

**Rules**
- Every chart has an aria-label sentence.
- Axis and label text is at least 12px.
- No gradients. Fills are flat, using fill-opacity.

## C22 Progress bar (supplies)
- Track: height 8px; border-radius 4px; background #E9E2D6 (dark #332C24).
- Fill: flat accent, or #8A5A00 when attention is needed. Width is the percentage.
- Always paired with words ("About 3.8 mL left").

## C23 Code block
- Light: background:#F3EEE6; border-radius:12px; padding:12px 14px; font-family mono 13px/20px; color ink; white-space:pre-wrap; word-break:break-all.
- Dark: #26211B.
- Followed by a secondary compact "Copy" button with the copy icon.

## C24 Pixel cat
Use the app's REAL sprite, never a redrawn one: src/components/PixelCat.tsx (26x15 grid, donut and loaf poses, trans-flag bands with edge and shade tones, time-of-day states from src/contexts/PixelCatContext.tsx) with the --pixel-* colours in src/index.css. For artboards, generate it with scratchpad/pixelcat.py (cat_svg(pose, state, width, dark) and cat_css() for the animation rules). Widths are whole multiples of 26 (26, 52, 78) so pixels stay crisp. The state follows the clock, as in the app (14:05 is napping, 21:04 is asleep).

## C25 Icons (SUPERSEDED)
This section is obsolete. Icons are the original Cadence set in design/cadence/icons/icons.json, following icons/grammar.md. Never use lucide or any other icon library.

### Old notes, kept for history
Wrapper: svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'. Size 20 or 22.

**Navigation and actions**
- plus: path M5 12h14. path M12 5v14.
- minus: path M5 12h14.
- check: path M20 6 9 17l-5-5.
- x: path M18 6 6 18. path m6 6 12 12.
- chevron-right: path m9 18 6-6-6-6.
- chevron-down: path m6 9 6 6 6-6.
- arrow-left: path m12 19-7-7 7-7. path M19 12H5.
- arrow-up: path m5 12 7-7 7 7. path M12 19V5.
- arrow-down: path M12 5v14. path m19 12-7 7-7-7.
- sun: circle 12 12 r4. path M12 2v2. M12 20v2. m4.93 4.93 1.41 1.41. m17.66 17.66 1.41 1.41. M2 12h2. M20 12h2. m6.34 17.66-1.41 1.41. m19.07 4.93-1.41 1.41.
- activity: path M22 12h-4l-3 9L9 3l-3 9H2.
- user-round: circle 12 8 r5. path M20 21a8 8 0 0 0-16 0.
- plug: path M12 22v-5. M9 8V2. M15 8V2. M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z.
- share-2: circle 18 5 r3. circle 6 12 r3. circle 18 19 r3. path m8.59 13.51 6.83 3.98. m15.41 6.51-6.82 3.98.
- copy: rect 14×14 at x8 y8 rx2. path M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2.
- external-link: path M15 3h6v6. M10 14 21 3. M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6.
- repeat: path m17 2 4 4-4 4. M3 11v-1a4 4 0 0 1 4-4h14. m7 22-4-4 4-4. M21 13v1a4 4 0 0 1-4 4H3.
- log-out: path M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4. m16 17 5-5-5-5. M21 12H9.
- skip-forward: path M5 4l10 8-10 8Z. M19 5v14.

**Medicines and health**
- test-tube: path M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2. M8.5 2h7. M14.5 16h-5.
- syringe: path m18 2 4 4. m17 7 3-3. M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5. m9 11 4 4. m5 19-3 3. m14 4 6 6.
- pill: path m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z. m8.5 8.5 7 7.
- package: path m7.5 4.27 9 5.15. M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z. m3.3 7 8.7 5 8.7-5. M12 22V12.

**Status and time**
- bell: path M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9. M10.3 21a1.94 1.94 0 0 0 3.4 0.
- circle-check: circle 12 12 r10. path m9 12 2 2 4-4.
- info: circle 12 12 r10. path M12 16v-4. M12 8h.01.
- triangle-alert: path m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3. M12 9v4. M12 17h.01.
- clock: circle 12 12 r10. path M12 6v6l4 2.
- calendar: path M8 2v4. M16 2v4. rect 18×18 at x3 y4 rx2. path M3 10h18.
- history: path M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8. M3 3v5h5. M12 7v5l4 2.

**Devices and cloud**
- cloud-check: path m17 15-5.5 5.5L9 18. M5 17.743A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.742.
- cloud: path M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z.
- laptop: path M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16.
- smartphone: rect 14×20 at x5 y2 rx2. path M12 18h.01.
- terminal: path m4 17 6-6-6-6. M12 19h8.

**Privacy and security**
- lock: rect 18×11 at x3 y11 rx2. path M7 11V7a5 5 0 0 1 10 0v4.
- send: path m22 2-7 20-4-9-9-4Z. M22 2 11 13.
- ban: circle 12 12 r10. path m4.9 4.9 14.2 14.2.
- eye: path M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z. circle 12 12 r3.
- shield-check: path M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z. m9 12 2 2 4-4.

**Other**
- globe: circle 12 12 r10. path M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20. M2 12h20.
- file-text: path M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z. M14 2v4a2 2 0 0 0 2 2h4. M16 13H8. M16 17H8. M10 9H8.

Never use emoji.

## C26 Empty states (code phase, not drawn)
**Today, first run**
- The dial shows all segments as surface with a hairline border, the hand at now, and the awake cat in the centre with "No doses yet" (16/22 600).
- Under the dial: "Log your most recent dose and your estimate will start from it."
- A primary-xl button "Log your most recent dose". Quiet links "Bring in a backup file" and "Restore from your account".

**Other pages**
- Blood tests: "No blood tests yet", with the next-test guide (best time, what to bring back, units on the report) and the button "Add a result".
- Reminders: "No reminders yet". After 3 similar doses, the suggestion block "You’ve injected estradiol valerate 4 mg every 7 days lately. Remind you on Saturdays at 09:00?" with "Set it up" and "Not now".
- Timeline: "Nothing logged in this range", with a "Back to now" button.

**How this was worked out (sheet opened from the dial centre)**
- "The standard model gives about 169 pg/mL for your doses and your weight of 62.5 kg."
- "Your 4 blood tests say you run about 10% higher, so it becomes 186."
- "Your last shot was Sat Sep 19 at 09:12, estradiol valerate 4 mg."
- "Only a blood test measures it. This is an estimate."
- Rows: "See the doses behind this", "How your curve is adjusted", "Change your target range".

## C27 Instead of X, we do Y
| Instead of | We do |
|---|---|
| Drop shadows | Three tonal layers (paper, plate, surface), plus 1px hairline or control borders. |
| Gradient fills and fade masks | Flat fills with fill-opacity, hard edges, and visible "Show earlier" controls. |
| Uppercase eyebrows | Sentence-case Bricolage headings. |
| A coloured dot before a label, or dot plus word pills | An icon plus words, the colour of the text itself, or a shape: filled vs dashed segments, triangles, diamonds. |
| Middle-dot separators | Commas, full stops, line breaks or columns. |
| Chart legends with swatches | Direct labels on the lines ("Target 100–200", "If you keep your schedule"). |
| A radio circle | A 2px ink border and a trailing check icon. |
| Status pills | 8px-radius tags with an icon and words. |