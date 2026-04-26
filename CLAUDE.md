# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Prompt Maker — a static Vue 3 + Tailwind web app for building, previewing, and sharing structured AI prompt templates with `{{field_name}}` placeholders. Deployed to static hosting (no backend); persistence is browser localStorage and Base64-encoded share URLs.

## Commands

- `npm install` — installs only `serve`.
- `npm run dev` — local static server at `http://localhost:5001/`. There is no build step; edit files and refresh.
- `npm run clean` — deletes macOS `._*` metadata files.
- `node js/cli/generate-share-links.mjs <input.json> [output.json] [--base /]` — generates `/?data=...` links from a list of prompt objects. With no `output.json`, **appends** results into the root `templates.json`.

There are no automated tests, linters, or type checkers. Validate manually in the browser: editor renders, fields update preview, share link copies and round-trips through `?data=`, `templates.json` loads, localStorage persists drafts.

## Architecture

### Where code lives (and where it does not)
- `index.html` — app shell, CDN tags for Tailwind + Vue 3 + Vue Router 4, mounts `#app`.
- `js/main.js`, `js/router.js` — bootstrap and route table (single `/` → `Home` route).
- `js/pages/Home.js` — owns persistence: reads `?data=` on mount, falls back to localStorage key `template-editor-content`, re-saves on every editor save/share. Holds `editorContent`, `editorFields`, `editorFieldValues` and force-remounts `<Editor>` via `editorKey` after a save.
- `js/pages/components/Editor.js` — central UI with two modes (`setting` for editing template+fields, `working` for preview+filling values). Mode auto-switches to `working` if the page loaded with a `?data=` param. Emits `save-template` and `request-share` upward.
- `js/pages/components/{FieldList,Preview,ModeSwitch}.js` — UI sub-components.
- `templates.html` + `templates.json` — standalone (non-Vue) page that fetches `templates.json` and lists templates grouped by category, each linking via `?data=...`.
- `how-to.html` + `how-to/` — static help page.

Edit only `index.html`, `templates.html`, `how-to.html`, and files under `js/`. Templates/data live in `templates.json`.

### The share encoding pipeline (the load-bearing piece)
`js/utils/share-core.mjs` is the **single source of truth** for encoding `{ template, fields, fieldValues }` → `encodeURIComponent(base64(JSON))`. It's an `.mjs` module deliberately written to work in **both** the browser (uses `btoa`) and Node (uses `Buffer`) — the CLI and the web app must produce byte-identical share URLs. If you change encoding, update `share-core.mjs` only; `js/utils/share.js` is a thin browser wrapper that adds `getShareUrl()`, and `js/cli/generate-share-links.mjs` imports the same module.

`MAX_URL_LENGTH = 2048` is the soft cap. The Editor refuses to share above this; the CLI warns but still writes.

### Template variable syntax
`js/utils/template.js` parses `{{var_name}}` (alphanumeric + underscore). It also validates balanced `{{`/`}}` pairs and throws on mismatch — the Editor surfaces this as `error` on the textarea blur handler.

## Strict Coding Rules (from AGENTS.md)

- **Tailwind utility classes only.** Do not add CSS files or other CSS frameworks.
- **Vanilla JS only.** No frameworks/libraries beyond the existing CDN Vue 3 + Vue Router 4. No bundler, no npm-installed runtime deps.
- Vue component filenames in **PascalCase**.
- **4-space indentation** throughout.
- Keep commits short and action-oriented (e.g., `adding templates`). For UI changes, include screenshots in PRs and note any URL/share behavior changes.
