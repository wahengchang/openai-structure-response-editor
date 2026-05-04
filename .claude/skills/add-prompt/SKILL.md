---
name: add-prompt
description: Use when the user wants to add, update, or remove a prompt template — phrases like "add a prompt", "new prompt", "update this prompt", "I forget how to add", "新增 prompt". Covers the CLI append workflow, the >2048-char file fallback, the update paths for ?file vs ?data links, and (if asked to author) the three voice traits this library follows.
---

# Add / update / remove a prompt

The flow lives in `js/cli/generate-share-links.mjs`. Never hand-write `?data=` Base64 — it must come from the CLI or it diverges from `js/utils/share-core.mjs`.

## Add a new prompt
1. Write `_new-prompt.json` at repo root. **Must be an array**, even for one prompt:
   ```json
   [{
     "title": "Display name",
     "category": "Prompt Rewrite | Seeking Answer | Youtube | Report Analyse/Summary | Writing | …",
     "template": "...{{snake_case_var}}...",
     "fieldValues": { "snake_case_var": "[DEFAULT]" },
     "fields": [{ "name": "snake_case_var", "type": "textarea", "default": "[DEFAULT]" }]
   }]
   ```
2. Run: `node js/cli/generate-share-links.mjs _new-prompt.json`
   - Appends to `templates.json`.
   - If the encoded link would exceed 2048 chars, the CLI writes `prompts/<slug>.json` and emits a `?file=<slug>` link. Trust the fallback — don't compress the prompt to fit.
3. `rm _new-prompt.json` (pre-allowlisted in `.claude/settings.local.json`).

## Update an existing prompt
Check the `link` in `templates.json` first:
- **`?file=<slug>`** → edit `prompts/<slug>.json` directly. The share link keeps working. Done.
- **`?data=...`** → no in-place edit exists. Delete that entry from `templates.json` by hand, then re-run the add flow with the updated content.

## Remove a prompt
Delete the entry from `templates.json`. If it was `?file=<slug>`, also delete `prompts/<slug>.json`.

## Invariants — these break silently
- `fields[i].default` must equal `fieldValues[fields[i].name]`. On any edit, sync both.
- Placeholders are `{{snake_case}}` (alphanumeric + underscore). Unbalanced `{{`/`}}` throw at parse time.
- Categories are free-form strings but must match an existing one to group on `templates.html` — copy from a sibling entry, don't invent.

## Voice (only when asked to author content)
Existing prompts share three traits. Match them:
1. **Posture, not output.** Shape how the model thinks — multi-stage workflow, critique pass, termination rule. Avoid prescribing surface format.
2. **Lean and essential.** Distill steps are common ("v1 → critique → v2"). Cut anything present for symmetry rather than function.
3. **Concrete fill-in guides.** Field defaults use `[UPPER_BRACKET]` cues; a trailing `fillin_guide` field explains each placeholder in one line. `{{lang}}` defaults to `zh-tw` or `zh-cn` unless told otherwise.
