# Implementation status

Updated 2026-09-24. This records the current implementation; the owner's UI rules in `README.md` and `AGENTS.md` remain the design authority.

## Implemented

- The app is English-only, including first-run onboarding, existing saved language preferences, date formatting and error screens. Language selectors have been removed; user-entered records are preserved as entered.
- Reminders and Supplies are connected to Today, the sidebar and You. Their records participate in local persistence, encrypted backup, import and sync, with compatibility for older backups.
- In-app reminders support due states, snooze, skip and optional system notifications while the app runs. Calendar export is the fallback when the app is closed.
- Supply amounts follow logged use, with forecasts and refill editing.
- Explicit schedules participate in the dial and projected chart. Projection uses the complete log, including histories too short to infer a routine.
- Backup previews and additive merge include schedules and supplies, including backups containing only those records.
- Forms and confirmations use secondary pages. Returning from a nested choice or confirmation retains the parent draft.
- Date and time capsules expand selectors in place. Schedule editing uses these controls directly, with multiple daily times and an anchor date for interval plans.
- Shared capsule selection and numeric steppers have restrained motion and respect reduced-motion preferences.
- Logging from a due reminder records its exact occurrence while retaining the actual dose timestamp. Late entries complete only their own occurrence; the association survives editing, import and sync and is excluded from shared snapshots.
- Full backups work when only plans, supplies or templates exist, including records in the other mode. Invalid pasted imports retain their draft.
- Protected account pages return to Account when access is lost. The desktop rail contains navigation; mode and backup details live in You. Localised page titles match their navigation labels.
- Blood-test units use a quiet inline capsule without a surrounding track or selected border; values and field labels use regular weight. The approved chart range control is unchanged.
- Dialog and secondary-page contexts retain their identity across UI hot updates, avoiding development-time blank pages while keeping unsaved form values.

## Verification boundaries

- Unit tests cover reminder timing, calendar export, supply calculations, sync, backup merge, projection and calendar field changes.
- TypeScript, English string coverage and the production build are checked locally. Historical translations remain in source, but are not offered by the English-only app.
- Browser checks use separate localhost origins and ordinary synthetic examples. They do not modify the owner's browser records or cloud account.
- Checks in the actual app cover plan/supply import and export, late reminder completion, automatic stock deduction, persistence after reload, stock editing, lab entry, template saving and keyboard chart inspection. The user-facing local entry is the app root, not a fixture.
- An isolated local Worker check covers fresh migrations, registration/login, encrypted five-record-type backup round trips, account isolation and cleanup. The local development API runs independently of production storage.
- `capsule-check.local/` and `tracker-check.local/` are ignored local preview fixtures, not application routes or shipped features.
- Production account operations and deployment have not been exercised by these checks.

## Outside this implementation

The assistant/MCP, journal, clinician letter and other concepts in `features_and_concepts.json` are design proposals, not completed features. The current reminder delivery is in-app plus calendar; there is no new server push service.
