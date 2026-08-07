function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isEditorValue(value) {
    return typeof value === 'string' || typeof value === 'number';
}

export function normalizeEditorState(state) {
    if (!isPlainObject(state)) {
        throw new TypeError('Editor state must be an object.');
    }
    if (typeof state.template !== 'string') {
        throw new TypeError('Template must be a string.');
    }
    if (!Array.isArray(state.fields)) {
        throw new TypeError('Fields must be an array.');
    }
    if (!isPlainObject(state.fieldValues)) {
        throw new TypeError('Field values must be an object.');
    }

    const names = new Set();
    const fields = state.fields.map((field, index) => {
        if (!isPlainObject(field)) {
            throw new TypeError(`Field ${index + 1} must be an object.`);
        }
        if (typeof field.name !== 'string' || !/^[a-zA-Z0-9_]+$/.test(field.name)) {
            throw new TypeError(`Field ${index + 1} has an invalid name.`);
        }
        if (names.has(field.name)) {
            throw new TypeError(`Field name "${field.name}" is duplicated.`);
        }
        if (!['textarea', 'number'].includes(field.type)) {
            throw new TypeError(`Field "${field.name}" has an invalid type.`);
        }
        if (!isEditorValue(field.default)) {
            throw new TypeError(`Field "${field.name}" has an invalid default value.`);
        }

        names.add(field.name);
        return {
            name: field.name,
            type: field.type,
            default: field.default
        };
    });

    const fieldValues = {};
    fields.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(state.fieldValues, field.name)) return;
        const value = state.fieldValues[field.name];
        if (!isEditorValue(value)) {
            throw new TypeError(`Field value "${field.name}" is invalid.`);
        }
        fieldValues[field.name] = value;
    });

    return {
        template: state.template,
        fieldValues,
        fields
    };
}

export function snapshotEditorState(state) {
    return JSON.stringify(normalizeEditorState(state));
}

export function isEditorStateDirty(currentState, baselineState) {
    return snapshotEditorState(currentState) !== snapshotEditorState(baselineState);
}
