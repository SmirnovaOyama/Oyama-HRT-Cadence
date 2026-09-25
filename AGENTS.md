# Oyama HRT Cadence

Commit authorship and contributor credits belong to the owner only. Do not add AI assistants as authors,
co-authors, or contributors, and do not add AI-generated attribution trailers to commits.

Read `CLAUDE.md` and `design/cadence/README.md` before changing this app. Preserve the existing Cadence visual design.

The owner's latest UI rules (2026-09-24) take precedence over older artboards:

- No shadows or gradients, including SVG effects and fade masks.
- No all-caps titles or labels; use sentence case.
- Minimise small section headings. Use spacing and grouped rows; keep visible field labels where needed for clarity.
- No popup menus, overlay dialogs, or bottom sheets. Use `SecondaryPage` with Back for substantial forms,
  choices, and confirmations that need a separate view; retain the parent page and unsaved drafts. Simple numeric
  values may be typed in place. Date/time capsules are buttons that expand an inline calendar or options within
  the page, without navigation, text boxes, overlays, or native popup pickers.
- Keep Apple system fonts, capsule buttons, the existing original icons, and the real pixel cat.
- Use capsule shapes for standalone buttons, icon buttons (circles when square), segmented tracks and segments,
  date/time triggers, single-line fields, and sidebar navigation. Preserve grouped list rows, containers, cards,
  chart marks, and multiline textareas; see `design/cadence/spec/fonts_buttons_v2.md`, revision 6.
- Keep controls visually light: shared button and Back labels use weight 500, secondary buttons use the plate
  fill, and fields have quiet edges with strong focus. Preserve page-title weights and approved segmented labels.
- Steppers may roll the number slightly in the increment/decrement direction; keep the unit stationary and
  update instantly when reduced motion is preferred.
- Keep rows light: a one-line title, with either a value or a short state line. Put explanations in group footers.
- Keep the desktop sidebar for navigation and main actions. Account, mode and backup details belong on the
  "我" / You page; do not restore the sidebar's status-text footer.

Use Bun, never npm or pnpm. Relevant checks are `bun test`, `bun run typecheck`, `bun run i18n:check`, and `bun run build`.
The app is English-only (latest owner request, 2026-09-24). All UI copy and date formatting must use English,
regardless of stored or browser language. Do not restore language selectors or non-English fallbacks.
Older translation packs are retained as source reference; new UI strings require English. Do not add an icon library.

Use a separate localhost port and synthetic records for browser checks; do not overwrite the user's existing browser data.

Latest owner update (2026-09-25): simple option selectors use dropdowns that expand in place,
not secondary pages. Selecting an option closes the dropdown and retains the form draft.
This overrides the older requirement to put simple choices on secondary pages; keep substantial
forms and confirmations on their existing pages.
