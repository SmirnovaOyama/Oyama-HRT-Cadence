# Artboard Reminders.dc.html — Reminders (mobile, new)
Size: 390×1880 px, theme: light, canvas row: New features

# Reminders (mobile, new)

**Scenario:** Wed Sep 23, 14:05, light theme.

**Setup:**
- Follow C0 to C27 and use the C1 light helmet.
- Root is 390×1880; $preview matches.
- The page is under You, so the bottom bar shows You as active.

## 1. Back header (C4)
- Back link: “You”.
- h1: “Reminders”.

## 2. Lead
p at 16/24, ink: “Next: cyproterone acetate 12.5 mg tonight at 21:00. Then estradiol valerate 4 mg on Sat Sep 26 at 09:00.”

## 3. Your schedules
Gap 24 above the section.

- C5 heading: “Your schedules”.
- A C11 surface block with 4 rows. Each row has:
  - a tile;
  - a text column (title 16/22 at 600, line 1 at 14/20 ink, line 2 at 14/20 muted);
  - a C13 switch at the right, with aria-label “Remind me about” plus the title.

| Row | Tile | Title | Line 1 | Line 2 | Switch |
|---|---|---|---|---|---|
| 1 | estradiol, syringe | Estradiol valerate 4 mg, injection | Every 7 days at 09:00, counted from your last shot | Reminds you at 08:45. Next: Sat Sep 26 | on |
| 2 | cyproterone, pill | Cyproterone acetate 12.5 mg, tablet | Every day at 21:00 | Reminds you at 21:00, and at 22:00 if not logged | on |
| 3 | blood test, test-tube | Blood test | Sat Oct 3, 07:30, before your shot | Reminds you Fri Oct 2 at 20:00 and that morning at 07:00 | on |
| 4 | attention, package | Reorder cyproterone | By Sat Oct 3 | From Supplies | on |

Below the block: a secondary 48 button with a plus icon, “New reminder”.

## 4. When a reminder is due
Gap 32 above the section.

- C5 heading: “When a reminder is due”.

### Notification preview
A surface block: 1px border #E2DACB, radius 16, padding 12px 14px, flex column, gap 6. No shadow.

- **Top row** (flex, gap 8, align center):
  - a 20×20 tile, radius 6, background #F3EEE6, containing the C24 loaf cat at 16×11;
  - “Oyama Tracker” at 12/16, weight 600, muted;
  - spacer;
  - “now” at 12/16, muted.
- **Title:** “Time for your dose”, 16/22 at 600.
- **Body:** “Tap to log it.”, 14/20.
- A hairline.
- **Actions row** (flex, gap 24): quiet 14/18 buttons “Taken” and “Snooze 1 hour”.

### Explanation
- Caption, 14/20 muted: “This is all a notification says, unless you choose to show the medicine name.”
- Three lines, each a row with gap 10: a 20px icon in muted, then text at 14/20 ink.
  - check: “Taken logs it at the moment you tap. You can undo it next time you open the app.”
  - clock: “Snooze 1 hour reminds you again.”
  - skip-forward: “Skip this one never counts as taken, and your curve shows the gap.”

## 5. How reminders reach you
Gap 32 above the section.

- C5 heading: “How reminders reach you”.
- A surface block with these rows:

**1. In the app**
- Tile: neutral, bell.
- Title: “In the app”.
- Sub: “Works whenever Oyama Tracker is open.”
- Right: text “On” at 14/18, weight 600, #2F6B45.

**2. When the app is closed**
- Tile: neutral, smartphone.
- Title: “When the app is closed”.
- Sub: “Uses notifications on this phone. Our server keeps only the times of your next 14 days of reminders, with random labels. It never learns the medicine or the dose.”
- Below the sub: a quiet link “What this means”.
- Switch: on.

**3. iPhone note**
Inside the block: a C14 plate panel, radius 12, padding 12, row with gap 8.
- Icon: info, 18px.
- Text, 14/20: “On iPhone, add Oyama Tracker to your Home Screen first.”

**4. Show the medicine name**
- Tile: neutral, eye.
- Title: “Show the medicine name in notifications”.
- Sub: “Off: notifications just say “Time for your dose”.”
- Switch: off.

**5. Add to my calendar**
- Tile: neutral, calendar.
- Title: “Add to my calendar”.
- Sub: “Downloads a calendar file. Events are titled “Reminder”, so your calendar never sees the medicine.”
- Right: a secondary compact 44 button, “Download”.

**6. Desktop app**
- Tile: neutral, laptop.
- Title: “Desktop app”.
- Sub: “Reminds you while Oyama Tracker is running on your computer.”
- Right: a quiet button, “Set up”.

## 6. When you travel
Gap 32 above the section.

- C5 heading: “When you travel”.
- p at 16/24: “Your schedules follow Istanbul time (UTC+3). If your phone changes time zone, we’ll ask whether daily tablets should follow local time. Injections always stay 7 days apart.”
- A quiet link: “Change home time zone”.

## 7. Try a different routine
Gap 32 above.

A C11 surface block with one row:
- Tile: neutral, repeat.
- Title: “Try a different routine”.
- Sub: “See how another dose or interval might compare before you talk to your clinician. An estimate, not advice.”
- A chevron.

## 8. Bottom bar
C16, light, with You active.

## Visible states
- Four schedules are shown, all switched on.
- Closed-app push is on.
- The medicine name is hidden.
- The privacy trade-off is spelled out in plain words.
