import FieldList from './FieldList.js';
import ModeSwitch from './ModeSwitch.js';
import Preview from './Preview.js';
import { extractVariables, renderTemplate } from '../../utils/template.js';

export default {
    components: { FieldList, ModeSwitch, Preview },
    props: {
        initialTemplate: {
            type: String,
            default: ''
        },
        initialFieldValues: {
            type: Object,
            default: () => ({})
        },
        initialFields: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            mode: 'setting', // 'setting' or 'working'
            template: '',
            fields: [], // will be set in mounted
            fieldValues: {}, // will be set in mounted
            error: '',
            highlightVars: [],
            showVariableModal: false, // Controls reference modal
            shareToast: { show: false, message: '', type: 'success' }
        };
    },
    computed: {
        variableReferenceList() {
            // Example variables for reference; update as needed
            return [
                { name: 'user_name', desc: 'The name of the user' },
                { name: 'date', desc: 'Current date in YYYY-MM-DD format' },
                { name: 'email', desc: 'The user\'s email address' },
                // Add more as needed
            ];
        }
    },
    mounted() {
        // Set initial values from props
        this.template = this.initialTemplate;
        this.fields = JSON.parse(JSON.stringify(this.initialFields));
        this.fieldValues = { ...this.initialFieldValues };
        this.highlightVars = extractVariables(this.template);
        this.$nextTick(() => {
            this.autoResizeTextarea();
        });
    },
    watch: {
        template(newVal) {
            this.$nextTick(() => {
                this.autoResizeTextarea();
            });
        },
        initialTemplate(newVal) {
            this.template = newVal || '';
        },
        initialFields(newVal) {
            this.fields = newVal.length ? JSON.parse(JSON.stringify(newVal)) : [];
        },
        initialFieldValues(newVal) {
            this.fieldValues = { ...newVal };
        }
    },
    methods: {
        displayVar(name) {
            return `{{${name}}}`;
        },
        onTemplateBlur() {
            // Extract variables and validate
            try {
                this.highlightVars = extractVariables(this.template);
                // Merge with existing fields by name
                const prevFields = this.fields.reduce((acc, f) => { acc[f.name] = f; return acc; }, {});
                this.fields = this.highlightVars.map(v => prevFields[v] || { name: v, type: 'textarea', default: '' });
                this.error = '';
            } catch (e) {
                this.error = e.message || 'Template error';
            }
        },
        onModeSwitch(newMode) {
            if (newMode === 'working') {
                // Initialize fieldValues from prop if available, else from defaults
                const vals = {};
                this.fields.forEach(f => {
                    if (this.initialFieldValues && this.initialFieldValues.hasOwnProperty(f.name)) {
                        vals[f.name] = this.initialFieldValues[f.name];
                    } else {
                        vals[f.name] = f.default;
                    }
                });
                this.fieldValues = vals;
            }
            this.mode = newMode;
        },
        onFieldChange(name, value) {
            this.fieldValues[name] = value;
        },
        onFieldsUpdate(newFields) {
            this.fields = newFields;
        },
        onTemplateInputAutoResize(e) {
            this.template = e.target.value;
            this.$nextTick(() => {
                this.autoResizeTextarea();
            });
        },
        autoResizeTextarea() {
            const textarea = this.$refs.templateTextarea;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
        },
        async onShareClick() {
            // Always emit to parent to save first, then continue sharing
            this.$emit('request-share', {
                template: this.template,
                fields: this.fields,
                fieldValues: this.fieldValues,
                continueShare: async () => {
                    // After parent saves, read latest from storage
                    const utils = await import('../../utils/share.js');
                    // Read from storage for freshest data
                    const raw = localStorage.getItem('template-editor-content');
                    let state;
                    try {
                        state = raw ? JSON.parse(raw) : {
                            template: '', fields: [], fieldValues: {}
                        };
                    } catch (e) {
                        state = { template: '', fields: [], fieldValues: {} };
                    }
                    if (!state.template && (!state.fields || state.fields.length === 0)) {
                        this.showShareToast('Nothing to share!', 'error');
                        return;
                    }
                    const encoded = utils.encodeEditorState(state);
                    if (utils.isDataTooLong(encoded)) {
                        this.showShareToast('Draft too large to share by link!', 'error');
                        return;
                    }
                    const url = utils.getShareUrl(encoded);
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(url);
                        } else {
                            // Fallback for older browsers or insecure contexts
                            const textarea = document.createElement('textarea');
                            textarea.value = url;
                            textarea.setAttribute('readonly', '');
                            textarea.style.position = 'absolute';
                            textarea.style.left = '-9999px';
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                        }
                        this.showShareToast('Link copied!');
                    } catch (e) {
                        console.error('Failed to copy link:', e);
                        this.showShareToast('Failed to copy link.', 'error');
                    }
                }
            });
        },
        showShareToast(message, type = 'success') {
            this.shareToast = { show: true, message, type };
            setTimeout(() => { this.shareToast.show = false; }, 2000);
        }
    },
    template: `
        <div class="w-full">
            <!-- Share Toast Notification -->
            <transition name="fade">
                <div v-if="shareToast.show" :class="['fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow z-50', shareToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
                    {{ shareToast.message }}
                </div>
            </transition>
            <!-- Variables Reference Modal -->
            <div v-if="showVariableModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                    <h2 class="text-xl font-bold mb-4 text-gray-900">Available Variables</h2>
                    <ul class="mb-6">
                        <li v-for="v in variableReferenceList" :key="v.name" class="mb-2">
                            <span class="font-mono bg-gray-200 px-2 py-1 rounded text-gray-800" v-text="displayVar(v.name)"></span>
                            <span class="ml-2 text-gray-700">- {{ v.desc }}</span>
                        </li>
                    </ul>
                    <button @click="showVariableModal = false" class="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button @click="showVariableModal = false" class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Close</button>
                </div>
            </div>
            <div class="flex flex-col md:flex-row max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-lg p-0 overflow-hidden">
                <!-- Left: Template Section -->
                <button @click="showVariableModal = true" class="absolute top-4 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
                    Variables Reference
                </button>
                <div class="flex-1 min-w-[220px] p-8 md:pr-6 flex flex-col">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <label class="block text-gray-300 font-medium">Template</label>
                            <button
                                @click="onShareClick"
                                @keydown.enter.space.prevent="onShareClick"
                                tabindex="0"
                                class="ml-1 px-3 h-6 rounded-full border border-indigo-500 text-indigo-500 bg-transparent hover:border-indigo-600 hover:text-indigo-600 focus:border-indigo-700 focus:text-indigo-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 relative group transition"
                                :aria-label="'Copy share link'"
                                title="Copy share link"
                            >
                                Share
                                <!-- Tooltip -->
                                <span class="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 rounded bg-gray-800 text-xs text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                    Copy share link
                                </span>
                            </button>
                        </div>
                        <ModeSwitch :mode="mode" @update:mode="onModeSwitch" />
                    </div>
                    <Preview v-if="mode === 'working'" :template="template" :values="fieldValues" />
                    <textarea
                        ref="templateTextarea"
                        class="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 transition min-h-[10rem] resize-none"
                        :value="template"
                        v-if="mode === 'setting'"
                        @blur="onTemplateBlur"
                        @input="onTemplateInputAutoResize"
                        rows="3"
                        placeholder="Type your template with {{variable}} here..."
                    ></textarea>
                    <div v-if="error" class="text-red-400 text-xs mt-1">{{ error }}</div>
                </div>
                <!-- Divider -->
                <div class="hidden md:block w-px bg-gray-700 my-8"></div>
                <!-- Right: Settings/Variables Section -->
                <div class="flex-1 min-w-[220px] p-8 md:pl-6 flex flex-col">
                    <div v-if="mode === 'setting'">
                        <div class="mb-2 text-gray-200 font-medium">Setting</div>
                        <FieldList :fields="fields" mode="setting" :hide-type="false" @update:fields="onFieldsUpdate" />
                        <button
                            class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition"
                            @click="$emit('save-template', { template, fields, fieldValues })"
                        >
                            Save
                        </button>
                    </div>
                    <div v-else>
                        <div class="mb-2 text-gray-200 font-medium">Variables</div>
                        <FieldList :fields="fields" mode="working" :hide-type="true" @input="onFieldChange" />
                    </div>
                </div>
            </div>
        </div>
        </div>
    `
};
