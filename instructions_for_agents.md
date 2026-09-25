# Oyama HRT Cadence

This repository is the Cadence redesign of Oyama's HRT Tracker. It started as a copy of
https://github.com/xunxunProjects/Oyama-s-HRT-Tracker at c8d0756 and is maintained separately from it.

Before any UI work, read `design/cadence/README.md`. It lists the design files in priority order and the owner's
non-negotiable UI rules: no shadows or gradients, no all-caps, no dot-before-label, our own icons (check marks are two
straight segments), Apple system fonts, large HIG type, Apple-style buttons, list views for choices, and the real pixel
cat only.

Latest owner preference (2026-09-24): minimise small section headings. Omit redundant list-group headers; keep a
visible field/choice label only when it is needed to understand the control. This overrides older advice to title
every settings group. Keep a single page title, with sentence case for Latin titles and labels.
The owner also prohibits popup menus and floating dialog/sheet windows. Use in-app secondary pages with a Back
action for substantial forms, selectors and confirmations that need a separate view
(`src/components/ui/SecondaryPage.tsx`), retaining parent drafts. Simple numeric values may be typed in place.
Date/time capsules are buttons that expand an inline calendar or options within the page; do not replace them
with text boxes or open another page, overlay, or native popup picker.
The owner approved capsule controls: standalone buttons and icon buttons, segmented tracks and segments,
date/time triggers, single-line fields, and sidebar navigation use fully rounded ends. Keep grouped list rows,
containers, cards, chart marks, and multiline textareas in their existing shapes. See revision 6 in
`design/cadence/spec/fonts_buttons_v2.md`; it overrides older rectangular-control artboards and recipes.
The owner's follow-up asks for lighter controls: shared button and Back labels use weight 500, secondary buttons
use the plate fill, fields have quiet borders with strong focus, and steppers have smaller visible circles within
their existing hit targets. Page titles and the approved segmented labels retain their weights; see revision 6.
Stepper numbers may roll slightly in the increment/decrement direction while the unit stays still; use instant
updates with reduced motion.

Use bun, never npm or pnpm: `bun install`, `bun run dev`, `bun run typecheck`, `bun run build`, `bun run icons`
(regenerates `src/components/icons/generated.tsx` from `design/cadence/icons/icons.json`). Icons come from
`src/components/icons`. Never add lucide-react or any other icon library.

The pharmacokinetic engine (`logic.ts`) and Cloudflare Worker backend (`worker.ts`, `migrations/`) are carried over.
The local data and encrypted backup layers now also include schedules and supplies.
Latest owner request (2026-09-24): the app is English-only, overriding the earlier seven-language UI requirement.
Use English UI copy and dates regardless of stored or browser language; do not restore language selectors or
non-English fallbacks. Existing translation packs remain as source reference. New UI strings require English.
See `design/cadence/implementation-status.md` for current coverage.

Latest owner update (2026-09-25): simple option selectors use dropdowns that expand in place,
not secondary pages. Selecting an option closes the dropdown and retains the form draft.
This overrides the older requirement to put simple choices on secondary pages; keep substantial
forms and confirmations on their existing pages.
