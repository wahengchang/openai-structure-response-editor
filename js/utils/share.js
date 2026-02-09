import {
    encodeEditorState,
    decodeEditorState,
    isDataTooLong,
    MAX_URL_LENGTH
} from './share-core.mjs';

// --- Utility: get full share URL ---
export function getShareUrl(encodedData) {
    return window.location.origin + window.location.pathname + '?data=' + encodedData;
}

export { encodeEditorState, decodeEditorState, isDataTooLong };
export const SHARE_URL_MAX_LENGTH = MAX_URL_LENGTH;
