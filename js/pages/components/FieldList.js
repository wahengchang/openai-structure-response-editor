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
        }
    },
    template: `
        <div>
            <div v-if="mode === 'setting' && !hideType">
                <table class="w-full text-sm text-left text-gray-400">
                    <thead><tr class="bg-gray-700">
                        <th class="px-2 py-1">Variable</th>
                        <th class="px-2 py-1">Type</th>
                        <th class="px-2 py-1">Default</th>
                    </tr></thead>
                    <tbody>
                        <tr v-for="(field, idx) in localFields" :key="field.name" class="bg-gray-800">
                            <td class="px-2 py-1 text-white">{{ field.name }}</td>
                            <td class="px-2 py-1">
                                <select v-model="field.type" @change="updateField(idx, 'type', field.type)" class="bg-gray-700 text-white rounded px-1">
                                    <option value="textarea">Text</option>
                                    <option value="number">Number</option>
                                </select>
                            </td>
                            <td class="px-2 py-1">
                                <input v-if="field.type === 'number'" type="number" v-model="field.default" @input="updateField(idx, 'default', field.default)" class="bg-gray-700 text-white rounded px-1 w-20" />
                                <input v-else type="text" v-model="field.default" @input="updateField(idx, 'default', field.default)" class="bg-gray-700 text-white rounded px-1 w-32" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else>
                <div v-for="field in fields" :key="field.name" class="flex items-center mb-3">
                    <div class="w-1/3 text-gray-300 pr-2">{{ field.name }}</div>
                    <div class="w-2/3">
                        <input v-if="field.type === 'number'" :id="'fld-' + field.name" type="number" :value="field.default" @input="handleInput(field, $event.target.value)" class="w-full px-2 py-1 rounded bg-gray-700 text-white text-sm" />
                        <textarea v-else :id="'fld-' + field.name" :value="field.default" @input="handleInput(field, $event.target.value)" class="w-full px-2 py-1 rounded bg-gray-700 text-white text-sm resize-none" rows="2"></textarea>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `
};
