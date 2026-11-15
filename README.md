# Study Rack

A dark-mode, standalone study quiz web app for students from **JK/SK through Grade 12**, built with React, Vite, and Tailwind CSS.

## Features

- **3-Tier Developmental UI:** Automatically adapts layout, typography, and color palette to the selected grade:
  - **Junior (`JK`, `SK`, `Grade 1–4`):** Large, tactile cards and high-contrast accents.
  - **Intermediate (`Grade 5–8`):** Balanced arcade-style rack shelves.
  - **Senior (`Grade 9–12`):** Sleek, distraction-free dark-slate interface.
- **Country Selector & 5-Language Localization:** Searchable/scrollable country dropdown (with **Canada** and **USA** pinned at the top) that localizes the UI, grade names, subjects, and math prompts across **English**, **French**, **Spanish**, **Russian**, and **Chinese**.
- **Subjects & Custom Subjects:** Includes Math, Science, Language Arts, History, Geography, Art, Music, P.E., Coding, Health, plus country-specific subjects (French for Canada, US History for USA) and user-added custom subjects.
- **Standalone Question Engine (120+ per Subject):** Works out of the box with no API key required, matches question difficulty to grade level, and tracks asked questions in `localStorage` to avoid repeats across quizzes. (Optionally supports Gemini API via `VITE_GEMINI_API_KEY` and Firebase persistence.)
- **Detailed Feedback & Points:**
  - Quiz lengths: `10` (5 pts), `20` (10 pts), `30` (15 pts), `40` (20 pts), `60` (25 pts).
  - Post-quiz breakdown showing **What You Got Right** and **Here Are Things You Can Improve** (contrasting your selected answer vs. the correct answer).
- **10 Unlockable Minigames:** Spend earned points (`15` to `105` pts) in the **Games Rack** to unlock 10 unique games, starting with **Flappy Rack**.

## Getting Started

```sh
npm install
npm run dev
```

To build for production:

```sh
npm run build
```

### Optional Gemini API Key

To use live Gemini quiz generation and feedback instead of the standalone local engine, create a `.env` file:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

## GitHub Pages Deployment

This repository includes `.github/workflows/deploy.yml` and `base: './'` in `vite.config.js`. Enable **Settings → Pages → Source → GitHub Actions** in your repository to publish automatically on pushes to `main`.
