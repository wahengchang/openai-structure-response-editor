export default {
    props: {
        fields: { type: Array, default: () => [] },
        mode: { type: String, default: 'setting' },
        hideType: { type: Boolean, default: false },
    },
    emits: ['input', 'update:fields'],
    data() {
        return {
            localFields: JSON.parse(JSON.stringify(this.fields))
        };
    },
    watch: {
        fields: {
            handler(newFields) {
                this.localFields = JSON.parse(JSON.stringify(newFields));

                if (this.mode === 'working' && newFields.length > 0) {
                    this.$nextTick(() => {
                        newFields.forEach((field) => {
                            this.handleInput(field, field.default);
                        });
                    });
                }
            },
            deep: true
        }
    },
    methods: {
        updateField(idx, key, value) {
            this.localFields[idx][key] = value;
            this.$emit('update:fields', this.localFields);
        },
        handleInput(field, val) {
            this.$emit('input', field.name, val);
        },
        handleInputResize(field, event) {
            this.handleInput(field, event.target.value);
            this.autoResize(event.target);
        },
        autoResize(element) {
            if (!element) return;
            element.style.height = 'auto';
            const computed = window.getComputedStyle(element);
            const max = parseFloat(computed.maxHeight);
            const target = isFinite(max) && max > 0
                ? Math.min(element.scrollHeight, max)
                : element.scrollHeight;
            element.style.height = target + 'px';
        },
        resizeAll() {
            this.$nextTick(() => {
                const textareas = this.$el.querySelectorAll('textarea');
                textareas.forEach(el => this.autoResize(el));
            });
        }
    },
    mounted() {
        this.resizeAll();
    },
    updated() {
        this.resizeAll();
    },

    template: `
        <div>
            <div v-if="mode === 'setting' && !hideType">
                <template v-if="localFields.length === 0">
                    <div class="flex flex-col items-center justify-center py-8 text-gray-400 text-sm italic opacity-80">
                        <svg class="w-6 h-6 mb-1 text-gray-500 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5C7.305 20.5 3.5 16.695 3.5 12S7.305 3.5 12 3.5 20.5 7.305 20.5 12 16.695 20.5 12 20.5Z"></path></svg>
                        No variables defined yet. Add variables to your template for dynamic prompts!
                    </div>
                </template>
                <template v-else>
                    <table class="w-full text-xs text-left text-gray-400">
                        <thead><tr class="bg-gray-700">
                            <th class="px-2 py-0.5">Variable</th>
                            <th class="px-2 py-0.5">Type</th>
                            <th class="px-2 py-0.5">Default</th>
                        </tr></thead>
                        <tbody>
                            <tr v-for="(field, idx) in localFields" :key="field.name" class="bg-gray-800">
                            <td class="px-2 py-0.5 text-white font-mono">{{ field.name }}</td>
                            <td class="px-2 py-0.5">
                                <select v-model="field.type" @change="updateField(idx, 'type', field.type)" class="bg-gray-700 text-white rounded px-1 py-0.5 text-xs">
                                    <option value="textarea">Text</option>
                                    <option value="number">Number</option>
                                </select>
                            </td>
                            <td class="px-2 py-0.5">
                                <input v-if="field.type === 'number'" type="number" v-model="field.default" @input="updateField(idx, 'default', field.default)" class="bg-gray-700 text-white rounded px-1 py-0.5 text-xs w-full" />
                                <input v-else type="text" v-model="field.default" @input="updateField(idx, 'default', field.default)" class="bg-gray-700 text-white rounded px-1 py-0.5 text-xs w-full" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else>
                <template v-if="fields.length === 0">
                    <div class="flex flex-col items-center justify-center py-8 text-gray-400 text-sm italic opacity-80">
                        <svg class="w-6 h-6 mb-1 text-gray-500 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5C7.305 20.5 3.5 16.695 3.5 12S7.305 3.5 12 3.5 20.5 7.305 20.5 12 16.695 20.5 12 20.5Z"></path></svg>
                        No variables to fill in. Define variables in your template to see them here!
                    </div>
                </template>
                <template v-else>
                    <div v-for="field in fields" :key="field.name" class="flex flex-col mb-2">
                        <label :for="'fld-' + field.name" class="mb-0.5 text-gray-300 font-mono text-xs break-words">{{ field.name }}</label>
                        <div class="w-full">
                            <input v-if="field.type === 'number'" :id="'fld-' + field.name" type="number" :value="field.default" @input="handleInput(field, $event.target.value)" class="w-full px-2 py-1 rounded bg-gray-700 text-white text-xs" />
                            <textarea v-else :id="'fld-' + field.name" :value="field.default" @input="handleInputResize(field, $event)" class="w-full px-2 py-1 rounded bg-gray-700 text-white text-xs resize-none overflow-auto" rows="1" style="min-height: 2rem; max-height: 14rem;"></textarea>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    `
};
