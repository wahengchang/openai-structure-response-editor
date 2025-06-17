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
        };
    },
    methods: {
        // Handler for editor change (optional)
        onEditorInput(newValue) {
            this.lastAction = `Editor updated at ${new Date().toLocaleTimeString()}`;
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
        }
    },
    mounted() {
        // Auto-load template, fieldValues, and fields from storage on mount
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
    template: `
        <div class="min-h-screen bg-gray-900 p-4 flex flex-col items-center">
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
                />
            </div>
        </div>
    `
});
