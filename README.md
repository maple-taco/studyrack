# Study Rack

A dark-mode, standalone study quiz and minigame web application for students from **Junior Kindergarten (`JK`) / Senior Kindergarten (`SK`) through `Grade 12`**, built with React 18, Vite, and Tailwind CSS v4.

Live site: **https://maple-taco.github.io/studyrack/**

---

## Features

### 1. 3-Tier Developmental UI
The interface automatically adapts its layout, corner radius, spacing, typography, and color palette based on the selected grade level:
- **Junior (`JK`, `SK`, `Grade 1–4`):** Large, tactile `rounded-3xl` cards, high-contrast amber/pink/sky accents, oversized quiz answer buttons, and bold typography.
- **Intermediate (`Grade 5–8`):** Balanced arcade-style `rounded-2xl` rack shelves with sky/purple/emerald accents.
- **Senior (`Grade 9–12`):** Sleek, distraction-free dark-slate aesthetic (`bg-slate-950`, `rounded-lg`/`rounded-xl` cards, hairline borders, and streamlined typography).

### 2. Header, Navigation & Modals
- **Scroll-Aware Header:** Automatically hides when scrolling down and reappears when scrolling up, with a centered white-outline **Rack** SVG logo and `"Study rack"` title.
- **Top-Left Country Selector:** Opens a full-screen searchable, scrollable dropdown containing all sovereign countries alphabetically with **Canada** and **USA** pinned at the top. Requires an exact match from the list (no free-form text).
- **Top-Right Actions:**
  - **Add custom subject:** Full-screen modal to add custom subjects and remove existing custom subjects (custom subjects can also be removed directly via the `×` badge on the subject rack).
  - **Pro Trial Modal:** `"Sign in for $2.99/mo or 2 month free trial"` opens a modal with an `X` close button.
- **Bottom-Left Games Dot:** A viewport-fixed glowing dot button in the bottom-left corner opens the **Games Rack**.

### 3. 5-Language Localization
Selecting a country automatically translates the UI, grade labels, subject names, modals, feedback labels, and Math question stems into one of five supported languages:
- **English (`en`)** — Default for USA, Canada, UK, Australia, and all other countries not mapped below.
- **French (`fr`)** — France, Belgium, Luxembourg, Monaco, Senegal, Haiti.
- **Spanish (`es`)** — Spain, Mexico, Argentina, Colombia, Peru, Chile, and other Spanish-speaking countries.
- **Russian (`ru`)** — Russia, Belarus, Kazakhstan.
- **Chinese (`zh`)** — China, Taiwan, Singapore, Hong Kong.

### 4. Subjects & Standalone Question Engine
- **Base Subjects:** `Math`, `Science`, `Language Arts`, `History`, `Geography`, `Art`, `Music`, `P.E.`, `Coding`, `Health`.
- **Country-Specific Subjects:** Adds `French` for Canada and `US History` for USA.
- **Standalone Mode (`src/localQuizEngine.js`):**
  - Works out of the box with zero API keys or backend configuration.
  - **120+ unique questions per subject** (combining curated banks, procedural generators, and dynamic grade-scaled Math problems).
  - **Grade-Level Matching:** Questions carry `minGrade` / `maxGrade` bounds so younger students receive age-appropriate prompts and older students receive upper-grade material.
  - **Cross-Quiz History:** Tracks previously asked questions per subject in `localStorage` so taking five 20-question quizzes in a row does not repeat questions.
- **Optional Gemini API & Firebase:** If `VITE_GEMINI_API_KEY` is provided in `.env`, quizzes and feedback use the Gemini API (with automatic fallback to the local engine on failure). If `__firebase_config` is injected, profiles sync to Firestore; otherwise, profiles persist in `localStorage`.

### 5. Quiz Flow, Points & Feedback
- **Quiz Lengths & Points:** `10` Qs (5 pts), `20` Qs (10 pts), `30` Qs (15 pts), `40` Qs (20 pts), `60` Qs (25 pts). Points are awarded when at least 1 question is answered correctly.
- **Flexible Answer Selection:** Students can freely change their selected answer on a question before clicking **Next Question** or **Submit Quiz**.
- **Detailed Feedback:**
  - Perfect score displays **`CONGRATS YOU DID IT!`**.
  - Non-perfect scores display **What You Got Right** and **Here Are Things You Can Improve**, explicitly contrasting `"You selected: ..."` against `"Correct answer: ..."`.

### 6. 10 Unlockable Minigames
Spend earned points in the **Games Rack** to permanently unlock 10 unique games (costing `15` to `105` pts in `10`-pt increments):
1. **Flappy Rack** (`15` pts) — HTML5 Canvas side-scroller featuring the Study Rack logo character, sky gradient, drifting clouds, and 3D-shaded pipes.
2. **Rack Breaker** (`25` pts) — Brick-breaker arcade.
3. **Snake Rack** (`35` pts) — Classic grid snake with keyboard and on-screen D-pad controls.
4. **Space Scholar** (`45` pts) — Space shooter against falling meteors.
5. **Memory Match** (`55` pts) — 4×4 card-flip memory puzzle.
6. **Math Blitz** (`65` pts) — 30-second rapid arithmetic challenge.
7. **Rack Runner** (`75` pts) — Endless obstacle jumper.
8. **Star Catcher** (`85` pts) — Catch falling stars while dodging red bombs.
9. **Whack-a-Bug** (`95` pts) — 3×3 reflex arcade with a 30-second timer.
10. **2048 Rack** (`105` pts) — 4×4 sliding tile merge puzzle.

---

## Project Structure

```text
studyrack/
├── .github/workflows/deploy.yml   # Runs npm ci, npm test, npm run build, and deploys dist/ to GitHub Pages
├── index.html                     # Root HTML entry point
├── package.json                   # Dependencies and npm scripts
├── vite.config.js                 # Vite config with React, Tailwind v4, and base: './'
├── src/
│   ├── main.jsx                   # React root mount
│   ├── index.css                  # Tailwind CSS v4 import
│   ├── StudyRack.jsx              # Main app, 3-tier UI, header/modals, quiz flow, Flappy Rack
│   ├── localQuizEngine.js         # Standalone 120+ question pools, grade filtering, feedback generator
│   ├── i18n.js                    # 5-language translations (en, fr, es, ru, zh) and country mapping
│   ├── countries.js               # Alphabetical country list with Canada & USA pinned at top
│   └── Minigames.jsx              # Minigames 2–10 (MinigameRouter)
└── tests/
    └── studyrack.test.js          # Node built-in unit tests (node:test)
```

---

## Getting Started

```sh
npm install       # Install dependencies
npm run dev       # Start Vite dev server (http://localhost:5173/)
npm test          # Run unit tests
npm run build     # Build production bundle to dist/
```

### Optional `.env` for Gemini AI

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `npm ci`, `npm test`, and `npm run build`, then publishes `dist/` to GitHub Pages.
