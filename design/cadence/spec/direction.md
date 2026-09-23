# Direction: Cadence: your routine on the rim, your level in the middle

The Rhythm dial wins because it is built around the three questions people open an HRT tracker with, in the order they ask them: when is my next dose, did I take the last one, and am I okay. It does this without turning the home screen into a pharmacology chart. I made one structural change. The radial level trace is dropped, so each part of the dial answers one question. The rim answers "when": seven day segments for a weekly estradiol valerate shot, an inner ring of daily cyproterone slots, and a clock hand for now. The centre disc answers "how much": the estimated estradiol level, set large, with the pixel cat above it. A sentence directly under the dial answers "is that okay", and it is always visible at every width. It gives the target range in plain words, sets the value on a range ruler, and describes the trend ("Falling slowly. Lowest before Saturday's shot, about 151."). The dial reads like a watch face with a complication. The idea is original, but the shape is familiar enough that nobody needs a tutorial.

Everything else follows from the routine:
- One Log action is always present: the centre slot of the bottom bar, and the first button in the desktop rail.
- Reminders, supplies, injection-site rotation and the lab planner are all things that happen on the rim or in "Coming up". They are not new dashboards.
- The curve sits one short scroll down on Today, and in full on Timeline. Past and future are split by a hard tonal edge at a labelled "Now" rule. The forecast is dashed, sits inside a flat likely-range band, and is labelled "If you keep your schedule".

Jargon is removed from every surface:
- The "×1.18" factor becomes "Adjusted up 10% to match your 4 blood tests".
- EKF and Hybrid-MIPD become "Balanced, recommended", with the technical name kept as a secondary line.
- Theta and "E2 equivalent" become "about 3.1 mg of that is estradiol itself".
- Lab rows become sentences with context: "Taken 3 days after your shot."

The AI assistant (MCP) can only read what the person allows and can only suggest entries. A suggestion appears as a dashed "Waiting for you" block that names who suggested it. The privacy trade-offs appear where the choice is made:
- whatever the assistant reads goes to the AI vendor;
- the account option keeps a plaintext copy on the server;
- push reminders reveal reminder times but never the medicine.

Visually the system is flat and warm: paper, plate and surface tones stacked instead of shadows, 1px borders, and one terracotta accent plus a plum for the second medicine. Status is carried by an icon plus words, never by a dot. Bricolage Grotesque gives the headings character, and Atkinson Hyperlegible Next keeps every control legible for low-vision users. All text pairs are 4.5:1 or better and every target is 44px or larger. Pinch zoom and text selection come back.

It is feasible:
- The dial is a pure SVG driven by a new synced schedules record, which extends doseTemplates.
- The chart keeps the current simulation.
- New synced kinds (schedules, supplies) are wired through syncMerge, MODE_SUFFIXES, export and sanitizers.
- Site indexes are stripped from share snapshots so live links don't fail with a 400.
- Push delivery is opt-in, and in-app reminders plus an ICS calendar file stay as fallbacks.

## Grafts
From Tideline:
1. Charts split past and future with a hard tonal edge. The past region sits on plate #F3EEE6 and the future on paper #FBF8F3, divided by a 2px ink Now rule with a solid ink tab reading "Now, 14:05".
2. The past curve is solid. The forecast is the same colour, dashed 6 4, inside a flat likely-range band (ink at 7% opacity) that widens with distance from now. It is always captioned "If you keep your schedule".
3. Tap-to-read readout strip instead of hover tooltips. A tapped blood test shows "Measured 212 pg/mL. The model expected 196".
4. The Log sheet shows a ghost preview of what this dose does ("Should rise to about 274 pg/mL by Sunday night").
5. Choosing a future time changes the verb to "Plan", and adds Repeat and Remind rows. This is a code-phase state and is not drawn.
6. A patch is shown as one wear span with a "Taken off" action. This is a code-phase item.
7. "Back to now" appears after panning. Planned doses never count as taken.

From The daily letter:
1. A plain-language sentence under the reading: status in the person's own target range, the trend, and "estimated, not measured" as visible text rather than inside a modal.
2. Tap the number to see how it was worked out. The dial centre is a button that opens a sheet showing where 186 comes from (standard model 169, plus 10% from 4 tests). On desktop the same working appears in the readout.
3. One narrate.ts module writes the exact sentences used on Today, the share page, the clinician letter and the MCP tool results. Each tool returns {text, data}, and the Assistant screens preview that exact sentence.
4. Assistant proposals arrive as a named "Waiting for you" postscript on Today, with Add it, Change first and Don't add.
5. The Log sheet echoes the form back as one confirmation sentence above the button: "Will be logged as: estradiol valerate 4 mg (0.10 mL), injection, right thigh, Sat Sep 26 at 09:04". This keeps the safety benefit of the letter's composer without a free-text parser.
6. Calibration methods get plain titles with the technical name as a secondary line, and the fit is written as four sentences.
7. Atkinson Hyperlegible Next is used for every control.
8. Adherence appears as neutral counts and shape-coded strips, never as streaks.

Kept from Rhythm, with changes:
1. The dial now places the level in the centre. The radial trace is removed.
2. The centre Log slot in a docked bar with no shadow.
3. Forgiving due, missed and skip states.
4. Supplies derived from logged doses.
5. Site suggestion inside the Log sheet.
6. The pixel cat sits in the dial centre. It naps by the clock and waits by an empty bowl only when a dose is due. It never looks sad.
