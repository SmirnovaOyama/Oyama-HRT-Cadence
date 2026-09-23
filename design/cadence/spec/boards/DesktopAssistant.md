# Artboard DesktopAssistant.dc.html — Assistant setup (desktop, MCP)
Size: 1440×1140 px, theme: light, canvas row: Dark and desktop

# Assistant setup (desktop, MCP)

**Scenario:** Wed Sep 23, 14:10. Claude Desktop is already connected. The person is adding Claude Code.

- Follow C0 to C27.
- Use the C1 light helmet.
- Root is 1440×1140; $preview matches.

## 1. Rail
C17 rail, with Assistant active.

## 2. Main area
A flex column with gap 24.

### 2a. Page intro
- h1 “Assistant”, display 600, 32/38.
- p at 16/24 muted, max-width 720: “Ask an AI assistant, like Claude, about your doses and levels in plain words. It reads only what you allow, and it can only suggest new entries. You approve each one.”

### 2b. Connected strip
A C11 surface block laid out as a flex row: align center, gap 16, padding 16px 20px.
- Laptop tile, 48×48, radius 12, neutral.
- Column (flex 1):
  - “Claude Desktop, on this computer” at 16/22, 600.
  - “Last used today at 14:02. Reads your dose history, estimated levels, schedules and on-time record from the last 90 days. Can suggest entries for you to approve. Access ends Mon Dec 21.” at 14/20 muted.
- Secondary 44 button “Change access”.
- Destructive-text button “End access”.

### 2c. Two-column grid
Columns 1fr and 424px, gap 32.

## 3. Left column: Add a connection
- h2 “Add a connection”.

### Step 1
- Label “Step 1 of 3: how it connects” at 16/22, 600.
- A C10 stack with gap 8:
  1. **Selected, with check.** Laptop tile. Title “On this computer”, plus the inline text “Recommended” in #2F6B45. Sub: “Uses this desktop app. Nothing is uploaded.”
  2. Cloud tile. Title “Through your account”. Sub: “For Claude on the web or your phone. Keeps a read-only copy of only what you pick on our server, like a share link, until access ends.”
  3. Terminal tile. Title “Local helper”. Sub: “For technical users. Unlocks your encrypted backup on your own machine.”

### Step 2
- Label “Step 2 of 3: what it can see”.
- Grid of 2 columns, gap 0 24, containing C13 switch rows:

| Label | Sub-line | State |
|---|---|---|
| Dose history | 142 doses | on |
| Estimated levels | | on |
| Schedules and on-time record | | on |
| Blood tests | 4 tests, off by default | off |
| Supplies | | off |
| Journal | Includes your own words | off |

- Row “How far back”: a C8 control, width 360. Options “90 days” (selected), “1 year”, “Everything”.
- Row “What it can do”: a C8 control, width 360. Options “Read only” and “Read and suggest” (selected). Sub-line p 14/20 muted: “You approve each suggestion on Today.”
- Row “Access ends”: C9 chips “7 days”, “30 days” (selected), “90 days”, “1 year”. Then p 14/20 muted: “Ends Fri Oct 23. You can end it sooner.”

### Step 3
- Label “Step 3 of 3: connect”.
- C8 control, width 480: “Claude Code” (selected), “Claude Desktop”, “Another app”.
- p 14/20: “Run this in your terminal:”
- C23 code block containing:
  claude mcp add oyama -- “/Applications/Oyama Tracker.app/Contents/MacOS/oyama-tracker” --mcp
  Use straight double quotes inside the code. Write them as &quot; entities.
- A secondary compact “Copy” button with the copy icon.
- p 14/20 muted: “Then ask something like “What’s my estimated estradiol right now?” The first time, this app asks you to allow it.”
- A primary 48 button, “Done”.

## 4. Right column
A flex column with gap 24.

### 4a. Before you connect
A C14 plate panel with padding 20.
- h3 “Before you connect”, display 600, 18/24.
- Four rows. Each has gap 10, a 20px icon, and text at 14/20:
  - **lock:** “With this option nothing is uploaded. Claude Code reads a file on this computer that only your user account can open.”
  - **send:** “Whatever the assistant reads is sent to the company that runs it, for example Anthropic.”
  - **ban:** “It can’t edit or delete anything. Suggestions wait on your Today page until you add them.”
  - **history:** “The activity log keeps what was asked and how many items, never the values.”

### 4b. What your assistant will read
A C11 surface block with padding 16, as a column with gap 10.
- h3 “What your assistant will read”.
- p 16/24: “Estimated estradiol about 186 pg/mL at 14:05 on Wed Sep 23, not measured. Inside your 100–200 target. Adjusted to 4 blood tests, usually within 3%. Next dose: cyproterone acetate 12.5 mg tonight at 21:00.”
- p 14/20 muted: “This exact sentence comes back from the current estimate tool, with the numbers behind it:”
- C23 code block, one item per line:
  - estradiol_pg_ml: 186
  - estimated: true
  - as_of: 2026-09-23T14:05+03:00
  - target_pg_ml: 100 to 200
  - adjusted_to_tests: 4

### 4c. What it can ask for
A C11 surface block.
- h3 “What it can ask for”, padding 16px 0 4px.
- Rows are min-height 56. Each has a title at 16/22 and a sub-line in mono 13/20 muted:

| Title | Mono sub-line |
|---|---|
| Your current estimate | get_current_estimate |
| Your level over time | get_level_series |
| Your dose history | list_doses |
| Your schedule and on-time record | get_schedule_and_adherence |
| Blood test results, only if allowed | list_labs |
| Suggest a dose or test for you to approve | propose_dose, propose_lab |

## Visible states and checks
- Visible states: “On this computer” is selected, the scopes are set, and 30 days is selected.
- All MCP privacy constraints appear in the copy:
  - no upload with the desktop option;
  - vendor exposure;
  - propose-only;
  - values never logged;
  - the account option stores a copy that expires.
- Tokens never appear in the URL.
