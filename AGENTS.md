# AGENTS.md

Guidance for AI coding agents working in the **Study Rack** repository.

## Overview

Study Rack is a standalone dark-mode React + Vite + Tailwind CSS v4 quiz and minigame web app for students from `JK`/`SK` through `Grade 12`.

## Key Files

- `src/StudyRack.jsx` — Main application, 3-tier developmental UI (`junior` JK–4, `intermediate` 5–8, `senior` 9–12), header/modals, quiz flow, **Flappy Rack** canvas game, and `localStorage` / optional Firebase profile persistence.
- `src/localQuizEngine.js` — Standalone quiz & feedback generator (`120+` unique questions per subject, grade-level filtering, cross-quiz history tracking in `localStorage`, and localized Math stems).
- `src/i18n.js` — Translations and country-to-language mapping for `en`, `fr`, `es`, `ru`, and `zh` (all other countries default to `en`).
- `src/countries.js` — Alphabetical country list with `Canada` and `USA` pinned at the top.
- `src/Minigames.jsx` — Unlockable minigames (`Rack Breaker`, `Snake Rack`, `Space Scholar`, `Memory Match`, `Math Blitz`, `Rack Runner`, `Star Catcher`, `Whack-a-Bug`, `2048 Rack`).
- `tests/studyrack.test.js` — Unit tests using `node:test` and `node:assert/strict`.
- `vite.config.js` — Uses `base: './'` for GitHub Pages subpath compatibility.
- `.github/workflows/deploy.yml` — Runs `npm ci`, `npm test`, and `npm run build`, then deploys `dist/` to GitHub Pages on pushes to `main`.

## Commands

```sh
npm install       # Install dependencies
npm run dev       # Start Vite dev server
npm test          # Run unit tests (node --test tests/*.test.js)
npm run build     # Build production bundle to dist/
```

## Conventions

- Keep relative imports in files tested by Node (`src/localQuizEngine.js`, `src/i18n.js`, `src/countries.js`) with explicit `.js` extensions so `node --test` resolves them without a bundler.
- Do not commit secrets or `.env` files; the app must remain functional standalone without `VITE_GEMINI_API_KEY` or Firebase config.
- Run `npm test && npm run build` before committing or pushing changes.
