import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { decodeEditorState, encodeEditorState } from '../utils/share-core.mjs';
import {
    getTemplateSource,
    TemplateSourceError,
    updateTemplateSource
} from './template-source.mjs';

const originalState = {
    template: 'Hello {{name}}',
    fieldValues: { name: 'Ada' },
    fields: [{ name: 'name', type: 'textarea', default: 'Ada' }]
};

async function createFixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-maker-update-'));
    await fs.mkdir(path.join(root, 'prompts'));
    await fs.writeFile(
        path.join(root, 'prompts', 'file-template.json'),
        `${JSON.stringify(originalState, null, 4)}\n`
    );
    const templates = [
        {
            title: 'Data template',
            category: 'Test',
            link: `/?data=${encodeEditorState(originalState)}`
        },
        {
            title: 'File template',
            category: 'Test',
            link: '/?file=file-template'
        }
    ];
    await fs.writeFile(path.join(root, 'templates.json'), `${JSON.stringify(templates, null, 4)}\n`);
    t.after(() => fs.rm(root, { force: true, recursive: true }));
    return root;
}

test('updates a data entry in place and prunes stale field values', async (t) => {
    const root = await createFixture(t);
    const source = await getTemplateSource(root, 0);
    const nextState = {
        template: 'Updated {{name}}',
        fieldValues: { name: 'Grace', stale: 'remove me' },
        fields: [{ name: 'name', type: 'textarea', default: 'Grace' }]
    };

    const result = await updateTemplateSource(root, 0, source.revision, nextState);
    const templates = JSON.parse(await fs.readFile(path.join(root, 'templates.json'), 'utf8'));
    const encoded = new URL(templates[0].link, 'http://localhost').searchParams.get('data');

    assert.equal(result.sourceType, 'data');
    assert.deepEqual(decodeEditorState(encoded), {
        template: 'Updated {{name}}',
        fieldValues: { name: 'Grace' },
        fields: [{ name: 'name', type: 'textarea', default: 'Grace' }]
    });
    assert.equal(templates[1].link, '/?file=file-template');
});

test('updates the existing file source without changing the index', async (t) => {
    const root = await createFixture(t);
    const source = await getTemplateSource(root, 1);
    const nextState = {
        template: 'File update',
        fieldValues: {},
        fields: []
    };

    const result = await updateTemplateSource(root, 1, source.revision, nextState);
    const stored = JSON.parse(await fs.readFile(path.join(root, 'prompts', 'file-template.json'), 'utf8'));
    const templates = JSON.parse(await fs.readFile(path.join(root, 'templates.json'), 'utf8'));

    assert.equal(result.sourceType, 'file');
    assert.deepEqual(stored, nextState);
    assert.equal(templates[1].link, '/?file=file-template');
});

test('rejects a stale revision without overwriting external changes', async (t) => {
    const root = await createFixture(t);
    const source = await getTemplateSource(root, 0);
    const templatesPath = path.join(root, 'templates.json');
    const templates = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
    templates[0].title = 'Changed elsewhere';
    await fs.writeFile(templatesPath, `${JSON.stringify(templates, null, 4)}\n`);

    await assert.rejects(
        updateTemplateSource(root, 0, source.revision, originalState),
        (error) => error instanceof TemplateSourceError && error.status === 409
    );
    const stored = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
    assert.equal(stored[0].title, 'Changed elsewhere');
});

test('keeps oversized updates as data links and returns a warning', async (t) => {
    const root = await createFixture(t);
    const source = await getTemplateSource(root, 0);
    const result = await updateTemplateSource(root, 0, source.revision, {
        template: 'x'.repeat(3000),
        fieldValues: {},
        fields: []
    });

    assert.equal(result.sourceType, 'data');
    assert.match(result.link, /^\/\?data=/);
    assert.match(result.warning, /recommended maximum/);
});

test('rejects unsafe file slugs and invalid editor state', async (t) => {
    const root = await createFixture(t);
    const templatesPath = path.join(root, 'templates.json');
    const templates = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
    templates.push({ title: 'Unsafe', category: 'Test', link: '/?file=../outside' });
    await fs.writeFile(templatesPath, `${JSON.stringify(templates, null, 4)}\n`);

    await assert.rejects(
        getTemplateSource(root, 2),
        (error) => error instanceof TemplateSourceError && error.code === 'invalid_file_source'
    );

    const source = await getTemplateSource(root, 0);
    await assert.rejects(
        updateTemplateSource(root, 0, source.revision, {
            template: 'Invalid',
            fieldValues: {},
            fields: [{ name: '../bad', type: 'textarea', default: '' }]
        }),
        (error) => error instanceof TemplateSourceError && error.code === 'invalid_editor_state'
    );
});

test('rejects prompt symlinks that escape the prompts directory', async (t) => {
    const root = await createFixture(t);
    const outsidePath = path.join(root, 'outside.json');
    await fs.writeFile(outsidePath, `${JSON.stringify(originalState)}\n`);
    await fs.symlink(outsidePath, path.join(root, 'prompts', 'linked.json'));
    const templatesPath = path.join(root, 'templates.json');
    const templates = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
    templates.push({ title: 'Linked', category: 'Test', link: '/?file=linked' });
    await fs.writeFile(templatesPath, `${JSON.stringify(templates, null, 4)}\n`);

    await assert.rejects(
        getTemplateSource(root, 2),
        (error) => error instanceof TemplateSourceError && error.code === 'invalid_file_source'
    );
});
