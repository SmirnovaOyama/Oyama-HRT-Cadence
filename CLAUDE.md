# Oyama HRT Cadence

This repository is the Cadence redesign of Oyama's HRT Tracker. It started as a copy of
https://github.com/xunxunProjects/Oyama-s-HRT-Tracker at c8d0756 and is maintained separately from it.

Before any UI work, read `design/cadence/README.md`. It lists the design files in priority order and the owner's
non-negotiable UI rules: no shadows or gradients, no all-caps, no dot-before-label, our own icons (check marks are two
straight segments), Apple system fonts, large HIG type, Apple-style buttons, list views for choices, and the real pixel
cat only.

The pharmacokinetic engine (`logic.ts`), the Cloudflare Worker backend (`worker.ts`, `migrations/`), cloud sync and the
7 UI languages (`src/i18n/translations.ts`) are carried over unchanged. Every new string needs all 7 languages.
