import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { decodeEditorState, encodeEditorState, MAX_URL_LENGTH } from '../utils/share-core.mjs';
import { normalizeEditorState } from '../utils/editor-state.mjs';

export class TemplateSourceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'TemplateSourceError';
        this.status = status;
        this.code = code;
    }
}

function fail(status, code, message) {
    throw new TemplateSourceError(status, code, message);
}

function parseEntryIndex(value) {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0) {
        fail(400, 'invalid_entry', 'Template entry must be a non-negative integer.');
    }
    return index;
}

async function readJson(filePath, label) {
    let raw;
    try {
        raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') fail(404, 'missing_source', `${label} was not found.`);
        throw error;
    }

    try {
        return { raw, value: JSON.parse(raw) };
    } catch {
        fail(500, 'invalid_repository_json', `${label} is not valid JSON.`);
    }
}

function revisionFor(entry, sourceRaw = '') {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(entry))
        .update('\0')
        .update(sourceRaw)
        .digest('hex');
}

async function resolveFileSource(repoRoot, slug) {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
        fail(400, 'invalid_file_source', 'Template file source is invalid.');
    }

    const promptsRoot = path.resolve(repoRoot, 'prompts');
    const filePath = path.resolve(promptsRoot, `${slug}.json`);
    if (!filePath.startsWith(`${promptsRoot}${path.sep}`)) {
        fail(400, 'invalid_file_source', 'Template file source escapes the prompts directory.');
    }

    try {
        const [realPromptsRoot, realFilePath] = await Promise.all([
            fs.realpath(promptsRoot),
            fs.realpath(filePath)
        ]);
        if (!realFilePath.startsWith(`${realPromptsRoot}${path.sep}`)) {
            fail(400, 'invalid_file_source', 'Template file source escapes the prompts directory.');
        }
    } catch (error) {
        if (error instanceof TemplateSourceError) throw error;
        if (error.code !== 'ENOENT') throw error;
    }
    return { slug, filePath, sourcePath: path.relative(repoRoot, filePath) };
}

async function loadSource(repoRoot, rawEntryIndex) {
    const entryIndex = parseEntryIndex(rawEntryIndex);
    const templatesPath = path.resolve(repoRoot, 'templates.json');
    const templatesResult = await readJson(templatesPath, 'templates.json');
    if (!Array.isArray(templatesResult.value)) {
        fail(500, 'invalid_template_index', 'templates.json must contain an array.');
    }

    const entry = templatesResult.value[entryIndex];
    if (!entry || typeof entry !== 'object' || typeof entry.link !== 'string') {
        fail(404, 'missing_entry', 'Template entry was not found.');
    }

    let parsedLink;
    try {
        parsedLink = new URL(entry.link, 'http://localhost');
    } catch {
        fail(400, 'invalid_source_link', 'Template entry has an invalid link.');
    }

    const fileParam = parsedLink.searchParams.get('file');
    const dataParam = parsedLink.searchParams.get('data');
    if ((fileParam && dataParam) || (!fileParam && !dataParam)) {
        fail(400, 'unsupported_source_link', 'Template entry must use exactly one file or data source.');
    }

    if (fileParam) {
        const fileSource = await resolveFileSource(repoRoot, fileParam);
        const fileResult = await readJson(fileSource.filePath, fileSource.sourcePath);
        try {
            normalizeEditorState(fileResult.value);
        } catch (error) {
            fail(500, 'invalid_editor_state', `${fileSource.sourcePath}: ${error.message}`);
        }
        return {
            entryIndex,
            entry,
            templates: templatesResult.value,
            templatesPath,
            sourceType: 'file',
            sourcePath: fileSource.sourcePath,
            filePath: fileSource.filePath,
            sourceRaw: fileResult.raw,
            revision: revisionFor(entry, fileResult.raw)
        };
    }

    const decoded = decodeEditorState(dataParam);
    if (!decoded) {
        fail(400, 'invalid_data_source', 'Template data link cannot be decoded.');
    }
    try {
        normalizeEditorState(decoded);
    } catch (error) {
        fail(400, 'invalid_editor_state', `Template data link: ${error.message}`);
    }

    return {
        entryIndex,
        entry,
        templates: templatesResult.value,
        templatesPath,
        sourceType: 'data',
        sourcePath: 'templates.json',
        sourceRaw: '',
        revision: revisionFor(entry)
    };
}

function publicSource(source) {
    return {
        entry: source.entryIndex,
        title: source.entry.title || 'Untitled',
        category: source.entry.category || 'Uncategorized',
        sourceType: source.sourceType,
        sourcePath: source.sourcePath,
        link: source.entry.link,
        revision: source.revision
    };
}

async function atomicWrite(filePath, contents) {
    const directory = path.dirname(filePath);
    const temporaryPath = path.join(
        directory,
        `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
    );

    let mode = 0o644;
    try {
        const stats = await fs.stat(filePath);
        mode = stats.mode & 0o777;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    try {
        await fs.writeFile(temporaryPath, contents, { encoding: 'utf8', mode });
        await fs.rename(temporaryPath, filePath);
    } finally {
        await fs.rm(temporaryPath, { force: true });
    }
}

export async function getTemplateSource(repoRoot, entryIndex) {
    return publicSource(await loadSource(repoRoot, entryIndex));
}

export async function updateTemplateSource(repoRoot, entryIndex, expectedRevision, state) {
    if (typeof expectedRevision !== 'string' || expectedRevision.length === 0) {
        fail(400, 'missing_revision', 'A source revision is required.');
    }

    let normalizedState;
    try {
        normalizedState = normalizeEditorState(state);
    } catch (error) {
        fail(400, 'invalid_editor_state', error.message);
    }

    const source = await loadSource(repoRoot, entryIndex);
    if (source.revision !== expectedRevision) {
        fail(409, 'revision_conflict', 'Template source changed after it was loaded. Reload before updating.');
    }

    let warning = null;
    if (source.sourceType === 'file') {
        const fileContents = `${JSON.stringify(normalizedState, null, 4)}\n`;
        await atomicWrite(source.filePath, fileContents);
        source.sourceRaw = fileContents;
        source.revision = revisionFor(source.entry, fileContents);
    } else {
        const nextLink = `/?data=${encodeEditorState(normalizedState)}`;
        const nextEntry = { ...source.entry, link: nextLink };
        const nextTemplates = [...source.templates];
        nextTemplates[source.entryIndex] = nextEntry;
        await atomicWrite(source.templatesPath, `${JSON.stringify(nextTemplates, null, 4)}\n`);
        source.entry = nextEntry;
        source.templates = nextTemplates;
        source.revision = revisionFor(nextEntry);
        if (nextLink.length > MAX_URL_LENGTH) {
            warning = `Updated data URL is ${nextLink.length} characters (recommended maximum: ${MAX_URL_LENGTH}).`;
        }
    }

    return {
        ...publicSource(source),
        state: normalizedState,
        warning
    };
}
