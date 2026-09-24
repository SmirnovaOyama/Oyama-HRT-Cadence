# Cadence format rules (revision 4)

The owner reviewed the built You and Blood tests pages on a phone and said "format not good". The boards put a
title, a trailing value and a two-line explanation into almost every row. On a 375px screen that wraps titles
("What you're / tracking"), stacks three-line grey paragraphs under every row and makes every group look busy.
These rules replace the row density of the boards. When a board and this file disagree, this file wins.

## List rows (Apple Settings style)
1. **One-line titles.** A row title is short and stays on one line at 375px (about 26 characters of 17px text). If a
   title is longer, shorten the copy, never let it wrap next to a value.
2. **A value or a sub-line, not both.** A row may show EITHER a trailing value (right-aligned, muted, one line:
   "English", "62.5 kg", "Feminizing HRT") OR one short sub-line under the title — never both. The trailing value
   never pushes the title onto two lines: the title keeps its natural width and the value takes what is left
   (text-align right, it may truncate with an ellipsis only if it is a user-entered name).
3. **Sub-lines are state, not explanations.** A sub-line says what is true now ("Last used 7 days ago", "Backed up 4
   minutes ago", "Off") in one line, 15px, at most about 40 characters. Explanations ("Heavier means lower estimates
   for the same dose", "Encrypted if you like, or as a spreadsheet...") are removed or moved to the group footer.
4. **Group footers carry the explanation.** One short sentence under the group, 15/22 muted, only when it genuinely
   helps. Most groups need none.
5. **No icon tiles in settings-style lists** (You, Account, sub-pages, dialogs). Tiles stay only where the icon IS
   content: medicines and blood tests (Today's Coming up, Timeline history, the Log sheet's What list, blood-test
   results). Within one group, either every row has a tile or none does.
6. **Destructive actions get their own group at the bottom**: red title rows ("Clear all records", "Delete account",
   "Sign out" is a plain ink or accent title row in that same bottom group), no tile, no sub-line; a footer may say
   what is kept ("Your cloud backup is kept.").
7. **Switch rows**: title (one line) + Switch; the explanation, if needed, goes to the group footer.

## Page structure
Owner update (2026-09-24): substantial forms, selectors and confirmations that need a separate view use in-app
secondary pages with Back. No popup menus, overlay dialogs, floating windows or bottom sheets. Keep the existing
sidebar/tab bar, preserve parent-page drafts and restore focus when returning. Use `SecondaryPage` for these
nested flows. Simple numeric values may be typed in place. Date/time capsules are buttons that expand an inline
calendar or options within the page; they are not text boxes and must not open another page, overlay, or native
popup picker. Secondary pages are not required for every small change.

8. **Minimise small section headings (owner update, 2026-09-24).** Settings-style pages should normally use
   whitespace and grouped rows without a header. Omit labels that repeat the page title or obvious row content.
   Keep a visible field or choice-group label only when it is needed to understand the control, at 15/20 600 muted,
   sentence case, 16px inset. Keep 22px Section titles only where they help distinguish content regions on Today,
   Timeline and Blood tests ("Coming up", "This week", "Your results"). This supersedes the older advice to put a
   small heading above every settings group.
9. **Spacing rhythm**: 24px between groups on settings pages, 32px between content sections, 8px from a group
   header to its group, 8px from a group to its footer.
10. **Lead text**: a page may open with one summary sentence at 17px/26 600 (not 22px), followed by at most one
    short muted line. No repeated facts ("It was taken on Tue Sep 15. Taken 3 days after your shot." becomes
    "Taken Tue Sep 15, 3 days after your shot.").
11. **Numbers and units never split** (non-breaking space between a number and its unit, and inside short date
    phrases like "Sep 15").
12. **Desktop**: content pages (Timeline, Blood tests) use two columns from xl (chart and summary left, list right)
    instead of one 670px column with empty space. Settings-style pages (You, Account, sub-pages) stay one centred
    column about 640px wide.
13. **Desktop sidebar (owner update, 2026-09-24)**: keep navigation and main actions. Account, mode and backup
    details stay on the "我" / You page; omit the sidebar's status-text footer and its bottom-pushing spacer.
