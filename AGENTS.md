# AGENTS.md

Comprehensive guidance for AI coding agents working in the **Study Rack** repository.

## Overview

Study Rack is a standalone, dark-mode React 18 + Vite + Tailwind CSS v4 quiz and minigame web application for students from `JK`/`SK` through `Grade 12`. It is designed to work 100% client-side with zero required API keys or backend services, while optionally integrating with the Gemini API (`VITE_GEMINI_API_KEY`) and Firebase (`__firebase_config`, `__initial_auth_token`, `__app_id`).

---

## Architecture & Key Files

- **`src/StudyRack.jsx`**
  - Main React component (`App`), `RackLogo`, and `FlappyGame` (HTML5 Canvas minigame #1 using the Study Rack logo as the player character).
  - **3-Tier Developmental UI:** `getUiTier(selectedGrade)` maps `JK`, `SK`, `Grade 1–4` → `'junior'`; `Grade 5–8` → `'intermediate'`; `Grade 9–12` → `'senior'`. Styling tokens live in `TIER_STYLES`.
  - **Profile Persistence:** Uses `localStorage` under key `studyrack_profile_v1` (`points`, `country`, `customSubjects`, `unlockedGames`) as the default standalone store, and syncs to Firestore at `doc(db, 'artifacts', appId, 'users', user.uid)` (4-segment even path) when Firebase is configured.
  - **Header & Scroll:** Uses `lastScrollYRef` (`useRef`) to hide the fixed header on scroll down and show it on scroll up without re-attaching listeners on every scroll event.
- **`src/localQuizEngine.js`**
  - Exports `generateLocalQuiz(subject, grade, country, length)` and `generateLocalFeedback(grade, subject, correctCount, total, mistakes, rightAnswers)`.
  - Generates **120+ unique questions per subject** (`Science`, `Language Arts`, `Geography`, `History`, `French`, `US History`, `Art`, `Music`, `P.E.`, `Coding`, `Health`, plus dynamic `Math` and combinatorial custom-subject pools).
  - Filters/prioritizes questions by `minGrade` / `maxGrade` (`JK`/`SK` = `0`, `Grade 1–12` = `1–12`).
  - Tracks asked questions per subject in `localStorage` (`studyrack_asked_questions_v1`) so consecutive quizzes do not repeat questions until the full pool is exhausted.
  - Localizes `Math` question stems using `getLanguageFromCountry(country)`.
- **`src/i18n.js`**
  - Exports `getLanguageFromCountry(country)` and `TRANSLATIONS` for `en`, `fr`, `es`, `ru`, and `zh`.
  - Any country not explicitly mapped to `fr`, `es`, `ru`, or `zh` defaults to `'en'`.
  - Includes `gradeLabel(g)`, `subjects` map, `gameNames` array (all 10 games), and all UI/modal/feedback strings.
- **`src/countries.js`**
  - Exports `ALL_COUNTRIES`: `['Canada', 'USA', ...]` followed by all other sovereign countries in alphabetical order.
- **`src/Minigames.jsx`**
  - Exports `MinigameRouter({ gameIndex, title, onClose, t })` for games `1`–`9` (`Rack Breaker`, `Snake Rack`, `Space Scholar`, `Memory Match`, `Math Blitz`, `Rack Runner`, `Star Catcher`, `Whack-a-Bug`, `2048 Rack`).
- **`tests/studyrack.test.js`**
  - Unit tests using Node's built-in `node:test` and `node:assert/strict` (mocks `globalThis.localStorage`).
- **`vite.config.js` & `.github/workflows/deploy.yml`**
  - `vite.config.js` sets `base: './'` so built assets resolve on GitHub Pages subpaths (`/studyrack/`).
  - `.github/workflows/deploy.yml` runs `npm ci`, `npm test`, and `npm run build` on pushes to `main` and deploys `./dist` to GitHub Pages.

---

## Critical UX & Implementation Invariants

1. **Games Button Outside Transformed Header:** The bottom-left Games dot button (`fixed bottom-5 left-5`) MUST remain outside `<header>`. `<header>` uses `translate-y-0` / `-translate-y-full` (`transform`), which creates a new CSS containing block and breaks `position: fixed` for descendants.
2. **Exact-Match Country Selector:** The Country modal must remain a searchable, scrollable dropdown (showing ~5 rows via `max-h-[305px] overflow-y-auto`) backed by `ALL_COUNTRIES`, requiring an exact match to save—not a free-form text input.
3. **Editable Quiz Answers:** Quiz option buttons must NOT lock after first click (`disabled={hasAnswered}` must not be re-added); users must be able to change their answer before clicking **Next Question** / **Submit Quiz**.
4. **Feedback Contrast:** The post-quiz feedback screen must show both **What You Got Right** and **Here Are Things You Can Improve** (contrasting `"You selected"` vs `"Correct answer"`), and show `"CONGRATS YOU DID IT!"` on a 100% score.
5. **Custom Subject Removal:** Users must be able to remove custom subjects (both from the Custom Subject modal and via the `×` badge on custom subject cards).
6. **All Modals Closable:** Every modal and minigame screen must include an `"X"` close button.
7. **Firestore Even Path:** Keep Firestore document references to an even number of path segments (currently 4: `artifacts/{appId}/users/{uid}`).

---

## Commands

```sh
npm install       # Install dependencies
npm run dev       # Start Vite dev server
npm test          # Run unit tests (node --test tests/*.test.js)
npm run build     # Build production bundle to dist/
```

---

## Conventions

- **Explicit `.js` Extensions:** Files imported by `tests/studyrack.test.js` (`src/localQuizEngine.js`, `src/i18n.js`, `src/countries.js`) must use explicit `.js` extensions on relative imports so `node --test` resolves them in Node ESM without a bundler.
- **No Secrets:** Never commit `.env` files or API keys. The app must remain 100% functional standalone without `VITE_GEMINI_API_KEY` or Firebase config.
- **Verification Gate:** Always run `npm test && npm run build` and verify both pass before committing or pushing to `main`.
