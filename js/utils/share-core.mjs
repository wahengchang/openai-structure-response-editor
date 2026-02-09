// Shared pure utilities for editor state encoding/decoding.
// Safe for both browser and Node.js environments.

export const MAX_URL_LENGTH = 2048;

function encodeBase64Utf8(input) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(input, 'utf8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(input)));
}

function decodeBase64Utf8(input) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(input, 'base64').toString('utf8');
        }
        return decodeURIComponent(escape(atob(input)));
    } catch (e) {
        return null;
    }
}

export function encodeEditorState(state) {
    const json = JSON.stringify(state);
    const compressed = encodeBase64Utf8(json);
    return encodeURIComponent(compressed);
}

export function decodeEditorState(data) {
    try {
        const compressed = decodeURIComponent(data);
        const json = decodeBase64Utf8(compressed);
        if (!json) throw new Error('Decompression failed');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

export function isDataTooLong(encodedData, maxLength = MAX_URL_LENGTH) {
    return encodedData.length > maxLength;
}
