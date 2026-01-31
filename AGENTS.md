# Repository Guidelines

## Quick Intent
Prompt Maker is a static Vue 3 + Tailwind web app for building, previewing, and sharing structured AI prompt templates. Key requirements: localStorage persistence, Base64 URL sharing (`?data=`), and a curated template library.

## Where to Change Code
- Edit only `index.html` and files under `js/`.
- UI and behavior live in `js/` (Vue app + router + components).
- Templates/data live in `templates.json` and `templates.html`.
- Docs live in `how-to/` and `how-to.html`.

## Project Structure (at a glance)
- `index.html` — app shell + CDN dependencies (Tailwind, Vue, Vue Router).
- `js/main.js` — app bootstrap.
- `js/router.js` — route definitions.
- `js/pages/` — page components (e.g., `Home.js`, `Navbar.js`).
- `js/pages/components/` — shared UI components.
- `js/utils/` — helpers (sharing, template parsing).
- `icon/` — favicon/app icons.

## Dev Commands
- `npm install` — install `serve`.
- `npm run dev` — local static server at `http://localhost:5001/`.
- `npm run clean` — remove `._*` files (macOS metadata).

## Coding Rules (strict)
- Use Tailwind utility classes only; do not add separate CSS files or frameworks.
- Use vanilla JavaScript (no extra frameworks/libraries beyond existing CDN Vue/Router).
- Keep Vue components in PascalCase filenames.
- Stick to the existing 4‑space indentation style.

## Testing & QA
- No automated tests. Validate manually:
  - Editor renders, fields update preview, share link works, and `?data=` imports correctly.
  - Templates load from `templates.json` and localStorage persists drafts.

## Git Hygiene
- Keep commits short and action‑oriented (e.g., `adding templates`).
- For UI changes, include screenshots in PRs and note any URL/share behavior changes.

## Feature Expectations
- Rich template editor with `{{field_name}}` placeholders.
- Live preview with field defaults.
- Base64 URL share links (static hosting only).
- Responsive dark UI, fast loading, and toast feedback.
