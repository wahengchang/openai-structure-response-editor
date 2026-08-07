import Editor from './components/Editor.js';
import { findUniqueTemplateEntry, linkMatchesSource } from '../utils/dev-update.mjs';
import { normalizeEditorState } from '../utils/editor-state.mjs';

function isLoopbackHost(hostname) {
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

// Home page using Editor component
export default Vue.defineComponent({
    components: {
        Editor
    },
    data() {
        return {
            editorContent: '',
            editorFieldValues: {},
            editorFields: [],
            lastAction: 'No actions yet',
            storageKey: 'template-editor-content',
            editorKey: 0, // for force re-render
            toast: { show: false, message: '', type: 'success' }, // simple toast state
            hasSharedParam: false, // hides marketing block when arriving via ?file= or ?data=
            updateContext: null,
            updatePending: false,
            updateBaseline: null,
        };
    },
    methods: {
        showToast(message, type = 'success', duration = 2000) {
            this.toast = { show: true, message, type };
            setTimeout(() => {
                this.toast.show = false;
            }, duration);
        },
        // Handler for editor change (optional)
        onEditorInput(newValue) {
            this.lastAction = `Editor updated at ${new Date().toLocaleTimeString()}`;
        },
        onEditorRequestShare(payload) {
            // Save state, then call continueShare callback
            this.saveEditorStateToStorage(payload.template, payload.fieldValues, payload.fields);
            if (payload.continueShare && typeof payload.continueShare === 'function') {
                payload.continueShare();
            }
        },
        saveEditorStateToStorage(template, fieldValues, fields) {
            try {
                const data = { template, fieldValues, fields };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                this.lastAction = `Template, values, and fields saved at ${new Date().toLocaleTimeString()}`;
            } catch (e) {
                this.lastAction = 'Failed to save editor data';
            }
        },
        readEditorStateFromStorage() {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return { template: '', fieldValues: {}, fields: [] };
            try {
                const data = JSON.parse(raw);
                return {
                    template: data.template || '',
                    fieldValues: data.fieldValues || {},
                    fields: data.fields || []
                };
            } catch (e) {
                return { template: '', fieldValues: {}, fields: [] };
            }
        },
        onEditorSave(payload) {
            // payload: { template, fieldValues, fields }
            this.saveEditorStateToStorage(payload.template, payload.fieldValues, payload.fields);
            // Update parent state and force re-render Editor
            this.editorContent = payload.template;
            this.editorFieldValues = payload.fieldValues;
            this.editorFields = payload.fields;
            this.editorKey += 1; // force Editor to re-mount with new props
        },
        getCurrentEditorState() {
            return normalizeEditorState({
                template: this.editorContent,
                fieldValues: this.editorFieldValues,
                fields: this.editorFields
            });
        },
        replaceSourceUrl(link, entry) {
            const nextUrl = new URL(link, window.location.origin);
            nextUrl.searchParams.set('entry', String(entry));
            const nextLocation = `${nextUrl.pathname}${nextUrl.search}${window.location.hash}`;
            window.history.replaceState(null, '', nextLocation);
        },
        async fetchJson(url, options = {}) {
            const response = await fetch(url, {
                cache: 'no-store',
                ...options
            });
            let body = null;
            try {
                body = await response.json();
            } catch {
                // The caller will surface the HTTP failure below.
            }
            if (!response.ok) {
                const error = new Error(body?.error?.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.code = body?.error?.code || 'request_failed';
                throw error;
            }
            return body;
        },
        async discoverTemplateEntry(source) {
            const params = new URLSearchParams(window.location.search);
            const providedEntry = params.get('entry');
            if (providedEntry !== null) {
                const entry = Number(providedEntry);
                return Number.isInteger(entry) && entry >= 0 ? entry : null;
            }

            const response = await fetch('/templates.json', { cache: 'no-store' });
            if (!response.ok) return null;
            const templates = await response.json();
            if (!Array.isArray(templates)) return null;
            return findUniqueTemplateEntry(templates, source, window.location.origin);
        },
        async initializeDevUpdate(source) {
            this.updateContext = null;
            this.updateBaseline = null;
            if (!isLoopbackHost(window.location.hostname)) return;

            try {
                const status = await this.fetchJson('/__dev/status');
                if (!status?.writable) return;
                const entry = await this.discoverTemplateEntry(source);
                if (entry === null) return;
                const context = await this.fetchJson(`/__dev/templates/${entry}`);
                if (!linkMatchesSource(context.link, source, window.location.origin)) return;

                this.updateContext = context;
                this.updateBaseline = this.getCurrentEditorState();
                this.replaceSourceUrl(context.link, context.entry);
            } catch (error) {
                // A normal static server has no dev API; keep the production UI unchanged.
                this.updateContext = null;
                this.updateBaseline = null;
            }
        },
        async onEditorUpdate(payload) {
            if (!this.updateContext || this.updatePending) return;

            let state;
            try {
                state = normalizeEditorState(payload);
            } catch (error) {
                this.showToast(error.message, 'error', 5000);
                return;
            }

            this.updatePending = true;
            try {
                const context = this.updateContext;
                const result = await this.fetchJson(`/__dev/templates/${context.entry}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        revision: context.revision,
                        state
                    })
                });

                this.editorContent = result.state.template;
                this.editorFieldValues = result.state.fieldValues;
                this.editorFields = result.state.fields;
                this.saveEditorStateToStorage(
                    result.state.template,
                    result.state.fieldValues,
                    result.state.fields
                );
                this.updateContext = result;
                this.updateBaseline = result.state;
                this.lastAction = `Updated ${result.sourcePath}`;

                let urlWarning = null;
                try {
                    this.replaceSourceUrl(result.link, result.entry);
                } catch {
                    urlWarning = 'The browser address could not be refreshed; reload from Templates before editing again.';
                }

                const warning = [result.warning, urlWarning].filter(Boolean).join(' ');
                if (warning) {
                    this.showToast(`Updated ${result.sourcePath}. ${warning}`, 'warning', 6000);
                } else {
                    this.showToast(`Updated ${result.sourcePath}.`);
                }
            } catch (error) {
                const message = error.code === 'revision_conflict'
                    ? 'Source changed outside the editor. Reload before updating.'
                    : `Update failed: ${error.message}`;
                this.showToast(message, 'error', 6000);
            } finally {
                this.updatePending = false;
            }
        },
        loadFromStorageFallback() {
            const saved = this.readEditorStateFromStorage();
            if (saved.template) {
                this.editorContent = saved.template;
                this.lastAction = 'Loaded template from storage';
            }
            if (saved.fieldValues) {
                this.editorFieldValues = saved.fieldValues;
            }
            if (saved.fields) {
                this.editorFields = saved.fields;
            }
        },
        async loadFromFileParam(name) {
            // Restrict to safe slug characters — no path traversal, no absolute URLs.
            if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
                this.showToast('Invalid file name in share link.', 'error');
                this.loadFromStorageFallback();
                return false;
            }
            try {
                const resp = await fetch(`prompts/${name}.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                this.editorContent = data.template || '';
                this.editorFieldValues = data.fieldValues || {};
                this.editorFields = data.fields || [];
                this.lastAction = `Loaded "${name}" from file`;
                this.saveEditorStateToStorage(this.editorContent, this.editorFieldValues, this.editorFields);
                return true;
            } catch (e) {
                this.showToast(`Failed to load template file: ${name}`, 'error');
                this.loadFromStorageFallback();
                return false;
            }
        },
    },
    async mounted() {
        // Precedence: ?file= → ?data= → localStorage
        const params = new URLSearchParams(window.location.search);
        const fileParam = params.get('file');
        const dataParam = params.get('data');
        this.hasSharedParam = !!(fileParam || dataParam);
        if (fileParam) {
            const loaded = await this.loadFromFileParam(fileParam);
            if (loaded) await this.initializeDevUpdate({ type: 'file', value: fileParam });
        } else if (dataParam) {
            const utils = await import('../utils/share.js');
            const decoded = utils.decodeEditorState(dataParam);
            if (!decoded) {
                this.showToast('Invalid or corrupted share link.', 'error');
                this.loadFromStorageFallback();
            } else {
                this.editorContent = decoded.template || '';
                this.editorFieldValues = decoded.fieldValues || {};
                this.editorFields = decoded.fields || [];
                this.lastAction = 'Loaded shared draft from URL';
                this.saveEditorStateToStorage(this.editorContent, this.editorFieldValues, this.editorFields);
                await this.initializeDevUpdate({ type: 'data', value: dataParam });
            }
        } else {
            this.loadFromStorageFallback();
        }
    },
    template: `
        <div class="min-h-screen bg-gray-900 p-2 md:p-4 flex flex-col items-center">
            <!-- Toast Notification -->
            <transition name="fade">
                <div v-if="toast.show" :class="['fixed top-3 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow z-50 text-sm', toast.type === 'success' ? 'bg-green-600 text-white' : (toast.type === 'warning' ? 'bg-amber-500 text-gray-950' : 'bg-red-600 text-white')]">
                    {{ toast.message }}
                </div>
            </transition>
            <template v-if="!hasSharedParam">
                <h1 class="text-lg md:text-2xl font-bold text-white mb-1 mt-2 text-center">Create &amp; Share Prompt Templates Instantly</h1>
                <p class="text-gray-400 mb-3 md:mb-4 text-center text-xs md:text-sm">Design flexible prompts with placeholders. Generate a shareable link for friends or teammates—no sign up needed.</p>
            </template>
            <div class="w-full max-w-4xl bg-gray-800 rounded-lg shadow-lg p-1.5 md:p-3">
                <!-- Editor component -->
                <Editor
                    :key="editorKey"
                    :initial-field-values="editorFieldValues"
                    :initial-fields="editorFields"
                    :initial-template="editorContent"
                    :update-available="!!updateContext"
                    :update-baseline="updateBaseline"
                    :update-pending="updatePending"
                    placeholder="Write something..."
                    @save-template="onEditorSave"
                    @request-share="onEditorRequestShare"
                    @update-template="onEditorUpdate"
                />
            </div>
        </div>
    `
});
