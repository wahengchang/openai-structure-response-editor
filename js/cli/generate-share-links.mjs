#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { encodeEditorState, MAX_URL_LENGTH } from '../utils/share-core.mjs';

function printUsage() {
    console.log('Usage: node js/cli/generate-share-links.mjs <input.json> [output.json] [--base <basePath>]');
    console.log('Example: node js/cli/generate-share-links.mjs prompt-list.json');
    console.log('Example: node js/cli/generate-share-links.mjs prompt-list.json templates.generated.json --base /');
}

function readJsonFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
}

function normalizeState(item) {
    return {
        template: item.template || '',
        fieldValues: item.fieldValues || {},
        fields: item.fields || []
    };
}

function normalizeOutputItem(item, link) {
    return {
        title: item.title || 'Untitled',
        category: item.category || 'Uncategorized',
        link
    };
}

function parseArgs(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        return { help: true };
    }

    const positional = [];
    let basePath = '/';

    for (let i = 0; i < args.length; i += 1) {
        const token = args[i];
        if (token === '--base') {
            basePath = args[i + 1] || '/';
            i += 1;
            continue;
        }
        positional.push(token);
    }

    const inputPath = positional[0];
    const outputPath = positional[1] || null;

    return { help: false, inputPath, outputPath, basePath };
}

function ensureBasePath(rawBasePath) {
    if (!rawBasePath || rawBasePath === '/') return '/';
    const withLeadingSlash = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function main() {
    const parsed = parseArgs(process.argv);
    if (parsed.help || !parsed.inputPath) {
        printUsage();
        process.exit(parsed.help ? 0 : 1);
    }

    const inputAbsolute = path.resolve(parsed.inputPath);
    const outputAbsolute = parsed.outputPath ? path.resolve(parsed.outputPath) : null;
    const inputList = readJsonFile(inputAbsolute);

    if (!Array.isArray(inputList)) {
        throw new Error('Input JSON must be an array of prompt objects.');
    }

    const basePath = ensureBasePath(parsed.basePath);
    const result = [];
    const warnings = [];

    inputList.forEach((item, index) => {
        const state = normalizeState(item);
        const encodedData = encodeEditorState(state);
        const link = `${basePath}?data=${encodedData}`;

        if (link.length > MAX_URL_LENGTH) {
            warnings.push({
                index,
                title: item.title || 'Untitled',
                length: link.length
            });
        }

        result.push(normalizeOutputItem(item, link));
    });

    if (outputAbsolute) {
        fs.writeFileSync(outputAbsolute, `${JSON.stringify(result, null, 4)}\n`, 'utf8');
        console.log(`Generated ${result.length} link(s): ${outputAbsolute}`);
    } else {
        const templatesPath = path.resolve('templates.json');
        const existing = readJsonFile(templatesPath);

        if (!Array.isArray(existing)) {
            throw new Error('templates.json must be an array.');
        }

        existing.push(...result);
        fs.writeFileSync(templatesPath, `${JSON.stringify(existing, null, 4)}\n`, 'utf8');
        console.log(`Appended ${result.length} link(s) to: ${templatesPath}`);
    }
    if (warnings.length > 0) {
        console.warn(`Warning: ${warnings.length} link(s) exceed ${MAX_URL_LENGTH} characters.`);
        warnings.forEach(w =>
            console.warn(`- [${w.index}] ${w.title}: ${w.length}`)
        );
    }
}

main();
