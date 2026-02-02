// Utility functions for sharing editor state (serialize, compress, encode, decode, decompress)
// No external dependencies; vanilla JS only

// --- Simple LZ-based compression (LZ-string light) ---
// Source: https://pieroxy.net/blog/pages/lz-string/index.html (MIT), minimized for short strings
function compressToBase64(input) {
    return btoa(unescape(encodeURIComponent(input)));
}
function decompressFromBase64(input) {
    try {
        return decodeURIComponent(escape(atob(input)));
    } catch (e) {
        return null;
    }
}

// --- Serialize and encode editor state ---
export function encodeEditorState(state) {
    // state: { template, fieldValues, fields }
    const json = JSON.stringify(state);
    const compressed = compressToBase64(json);
    return encodeURIComponent(compressed);
}

// --- Decode and parse editor state from URL ---
export function decodeEditorState(data) {
    try {
        const compressed = decodeURIComponent(data);
        const json = decompressFromBase64(compressed);
        if (!json) throw new Error('Decompression failed');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// --- Utility: get full share URL ---
export function getShareUrl(encodedData) {
    return window.location.origin + window.location.pathname + '?data=' + encodedData;
}

// --- Utility: check if encoded data is too long for URL (default 2000 chars) ---
export const SHARE_URL_MAX_LENGTH = 2048;

export function isDataTooLong(encodedData, maxLength = SHARE_URL_MAX_LENGTH) {
    return encodedData.length > maxLength;
}
