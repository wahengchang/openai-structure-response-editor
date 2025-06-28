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
    },
    mounted() {
        // Check for ?data= in URL
        const params = new URLSearchParams(window.location.search);
        const dataParam = params.get('data');
        if (dataParam) {
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
                    this.showToast('Loaded shared draft!', 'success');
                    // Save to storage for persistence
                    this.saveEditorStateToStorage(this.editorContent, this.editorFieldValues, this.editorFields);
                }
            });
        } else {
            this.loadFromStorageFallback();
        }
    },
    template: `
        <div class="min-h-screen bg-gray-900 p-4 flex flex-col items-center">
            <!-- Toast Notification -->
            <transition name="fade">
                <div v-if="toast.show" :class="['fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow z-50', toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
                    {{ toast.message }}
                </div>
            </transition>
            <h1 class="text-3xl font-bold text-white mb-2 text-center">Welcome</h1>
            <p class="text-gray-400 mb-8 text-center">A simple todo application with dark theme</p>
            <div class="w-full max-w-4xl bg-gray-800 rounded-xl shadow-lg p-8">
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
