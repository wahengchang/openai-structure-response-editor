import assert from 'node:assert/strict';
import test from 'node:test';

import { findUniqueTemplateEntry, linkMatchesSource } from '../utils/dev-update.mjs';
import { isEditorStateDirty } from '../utils/editor-state.mjs';

const baseline = {
    template: 'Hello {{name}}',
    fieldValues: { name: 'Ada' },
    fields: [{ name: 'name', type: 'textarea', default: 'Ada' }]
};

function editorContext(overrides = {}) {
    return {
        updateAvailable: true,
        updateBaseline: baseline,
        template: baseline.template,
        fieldValues: { ...baseline.fieldValues },
        fields: baseline.fields.map(field => ({ ...field })),
        ...overrides
    };
}

function hasChanges(context) {
    return isEditorStateDirty({
        template: context.template,
        fieldValues: context.fieldValues,
        fields: context.fields
    }, context.updateBaseline);
}

test('matches file and data sources without duplicating the long data value', () => {
    assert.equal(linkMatchesSource('/?file=example', { type: 'file', value: 'example' }), true);
    assert.equal(linkMatchesSource('/?data=YWJjJTJC', { type: 'data', value: 'YWJjJTJC' }), true);
    assert.equal(linkMatchesSource('/?file=other', { type: 'file', value: 'example' }), false);
});

test('discovers only a unique template entry', () => {
    const source = { type: 'data', value: 'encoded-state' };
    const templates = [
        { link: '/?file=example' },
        { link: '/?data=encoded-state' }
    ];
    assert.equal(findUniqueTemplateEntry(templates, source), 1);
    assert.equal(findUniqueTemplateEntry([...templates, { link: '/?data=encoded-state' }], source), null);
});

test('dirty tracking covers template, field defaults, and preview values', () => {
    assert.equal(hasChanges(editorContext()), false);
    assert.equal(hasChanges(editorContext({ template: 'Changed {{name}}' })), true);
    assert.equal(hasChanges(editorContext({
        fields: [{ name: 'name', type: 'textarea', default: 'Grace' }]
    })), true);
    assert.equal(hasChanges(editorContext({ fieldValues: { name: 'Grace' } })), true);
});

test('dirty tracking ignores stale values for fields that are no longer visible', () => {
    assert.equal(hasChanges(editorContext({
        fieldValues: { name: 'Ada', removed: 'stale value' }
    })), false);
});
