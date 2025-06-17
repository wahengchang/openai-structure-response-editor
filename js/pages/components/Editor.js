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
        };
    },
    mounted() {
        // Now props are fully available
        this.template = this.initialTemplate || '';
        this.fields = this.initialFields.length ? JSON.parse(JSON.stringify(this.initialFields)) : [];
        this.fieldValues = { ...this.initialFieldValues };
        console.log('mounted template:', this.template);
        console.log('mounted fields:', this.fields);
        console.log('mounted fieldValues:', this.fieldValues);
    },
    watch: {
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
            this.$set(this.fieldValues, name, value);
        },
        onFieldsUpdate(newFields) {
            this.fields = newFields;
        },
        onTemplateInput(e) {
            this.template = e.target.value;
        }
    },
    template: `
        <div class="w-full flex justify-center min-h-screen bg-gray-900">
            <div class="bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-lg relative">
                <ModeSwitch :mode="mode" @update:mode="onModeSwitch" class="absolute top-4 right-4 z-10" />
                <div class="space-y-6">
                    <label class="block text-gray-300 font-medium mb-1">Template</label>

                    <div>
                        <Preview v-if="mode === 'working'" :template="template" :values="fieldValues" />
                        <textarea
                            class="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 transition min-h-[10rem]"
                            :value="template"
                            v-if="mode === 'setting'"
                            @blur="onTemplateBlur"
                            @input="onTemplateInput"
                            rows="3"
                            placeholder="Type your template here..."
                        ></textarea>
                        <div v-if="error" class="text-red-400 text-xs mt-1">{{ error }}</div>
                    </div>
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
    `
};
