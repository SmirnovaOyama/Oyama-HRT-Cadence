# Artboard Assistant.dc.html — Connect an AI assistant, MCP (mobile, new)
Size: 390×1780 px, theme: light, canvas row: New features

# Your assistant (MCP), mobile, light

**Scenario:** Wed Sep 23, 14:05. Claude Desktop is already connected. This is the management view.

**Setup:** Follow C0 to C27 and the C1 light helmet. Root is 390×1780, and $preview matches.

## 1. Back header (C4)
- Back link: “You”
- h1: “Assistant”

## 2. Lead
p at 16/24: “Ask an AI assistant, like Claude, about your doses and levels in plain words. It reads only what you allow and can only suggest new entries. You approve each one.”

## 3. Connected
- C5 heading: “Connected”
- C11 surface block with padding 16, as a flex column with gap 12:
  - **Top row** (gap 12): laptop tile (neutral), then a column with:
    - “Claude Desktop” at 16/22, weight 600
    - “On this computer. Last used today at 14:02.” at 14/20, muted
  - **Four lines**, a column with gap 4, each 14/20 ink:
    - “Reads your dose history, estimated levels, schedules and on-time record.”
    - “Covers the last 90 days.”
    - “Can suggest entries. Nothing is saved until you add it.”
    - “Access ends Mon Dec 21.”
  - **Button row** (gap 8):
    - secondary compact 44: “Extend”
    - destructive-text: “End access”

## 4. What it can see
- C5 heading: “What it can see”
- Surface block of C13 switch rows:

| Label | Sub-line | State |
|---|---|---|
| Dose history | 142 doses | on |
| Estimated levels | Worked out from your doses and tests | on |
| Schedules and on-time record | | on |
| Blood tests | 4 tests | off |
| Supplies | | off |
| Journal | Includes your own words | off |

## 5. What it will read
C14 plate panel:
- h3 at display 600, 18/24: “What it will read”
- p at 16/24 ink: “Estimated estradiol about 186 pg/mL at 14:05 on Wed Sep 23, not measured. Inside your 100–200 target. Adjusted to 4 blood tests, usually within 3%. Next dose: cyproterone acetate 12.5 mg tonight at 21:00.”
- p at 14/20 muted: “This is the exact sentence your assistant gets when it asks for your current estimate, with the numbers behind it.”

## 6. Recent activity
- C5 heading: “Recent activity”
- Surface block. Each row has the time at 14/20, weight 600, in a 96px-wide left column, then the text at 14/20:

| Time | Text | Extra |
|---|---|---|
| Today 14:03 | Suggested an entry. It’s waiting for you on Today. | Trailing quiet “Review” |
| Today 14:02 | Read your dose history, last 7 days, 7 entries | |
| Today 14:02 | Read your current estimate | |
| Mon Sep 21, 19:40 | Read your on-time record, 90 days | |

- Caption at 14/20 muted: “We keep what was asked and how many items, never the values.”

## 7. Your privacy
C14 plate panel:
- h3: “Your privacy”
- Four rows, each with gap 10, a 20px icon in ink, and text at 14/20:
  - **send:** “Whatever your assistant reads is sent to the company that runs it, for example Anthropic.”
  - **laptop:** “This connection uses the desktop app, so nothing is uploaded to our server.”
  - **cloud:** “A connection through your account keeps a read-only copy of only what you pick on our server until access ends. Your encrypted backup stays unreadable to us.”
  - **ban:** “Your assistant can never edit or delete anything.”

## 8. Add another connection
Secondary button, full width, 48px, with a plus icon: “Connect another assistant”.

## 9. Bottom bar
C16 light, with You active.

## Checks
- Every privacy constraint is visible in the copy:
  - vendor exposure;
  - server copy for account connections;
  - suggestion-only writing;
  - activity log without values.
- No “MCP” jargon in headings.
