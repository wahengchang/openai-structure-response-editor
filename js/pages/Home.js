import Editor from './components/Editor.js';

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
        };
    },
    methods: {
        showToast(message, type = 'success') {
            this.toast = { show: true, message, type };
            setTimeout(() => {
                this.toast.show = false;
            }, 1800);
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
                return;
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
            } catch (e) {
                this.showToast(`Failed to load template file: ${name}`, 'error');
                this.loadFromStorageFallback();
            }
        },
    },
    mounted() {
        // Precedence: ?file= → ?data= → localStorage
        const params = new URLSearchParams(window.location.search);
        const fileParam = params.get('file');
        const dataParam = params.get('data');
        this.hasSharedParam = !!(fileParam || dataParam);
        if (fileParam) {
            this.loadFromFileParam(fileParam);
        } else if (dataParam) {
            import('../utils/share.js').then(utils => {
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
                }
            });
        } else {
            this.loadFromStorageFallback();
        }
    },
    template: `
        <div class="min-h-screen bg-gray-900 p-4 md:p-6 flex flex-col items-center">
            <!-- Toast Notification -->
            <transition name="fade">
                <div v-if="toast.show" :class="['fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow z-50', toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
                    {{ toast.message }}
                </div>
            </transition>
            <template v-if="!hasSharedParam">
                <h1 class="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Create &amp; Share Prompt Templates Instantly</h1>
                <p class="text-gray-400 mb-6 md:mb-8 text-center text-sm md:text-base">Design flexible prompts with placeholders. Generate a shareable link for friends or teammates—no sign up needed.</p>
            </template>
            <div class="w-full max-w-4xl bg-gray-800 rounded-xl shadow-lg p-3 md:p-8">
                <!-- Editor component -->
                <Editor
                    :key="editorKey"
                    :initial-field-values="editorFieldValues"
                    :initial-fields="editorFields"
                    :initial-template="editorContent"
                    placeholder="Write something..."
                    @save-template="onEditorSave"
                    @request-share="onEditorRequestShare"
                />
            </div>
        </div>
    `
});
