# CLI: Generate Base64 Share Links

## Script
- `js/cli/generate-share-links.mjs`

## Usage
```bash
node js/cli/generate-share-links.mjs <input.json> [output.json] [--base <basePath>]
```

## Examples
```bash
node js/cli/generate-share-links.mjs prompt-list.json
node js/cli/generate-share-links.mjs prompt-list.json templates.generated.json --base /
```

Default mode:
- If `output.json` is omitted, generated records are appended to `templates.json`.
- If `output.json` is provided, script writes only to that file.

## Input (`input.json`)
Array of prompt objects:
```json
[
    {
        "title": "Rewrite Prompt",
        "category": "Writing",
        "template": "Rewrite this in {{tone}} tone: {{input}}",
        "fieldValues": { "tone": "professional", "input": "hello" },
        "fields": [
            { "name": "tone", "type": "textarea", "default": "professional" },
            { "name": "input", "type": "textarea", "default": "hello" }
        ]
    }
]
```

## Output Record Shape
Each generated item:
```json
[
    {
        "title": "Rewrite Prompt",
        "category": "Writing",
        "link": "/?data=..."
    }
]
```

## Notes
- Uses shared core logic in `js/utils/share-core.mjs` (same encode logic as web app).
- Warns when generated link length exceeds `2048`.
