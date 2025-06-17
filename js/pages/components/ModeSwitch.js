// ModeSwitch component stub
export default {
    props: {
        mode: { type: String, default: 'setting' }
    },
    emits: ['update:mode'],
    template: `
        <span class="cursor-pointer opacity-80 hover:opacity-100 text-gray-200 hover:text-blue-400 transition" @click="$emit('update:mode', mode === 'setting' ? 'working' : 'setting')">
            <span v-if="mode === 'setting'">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487a2.75 2.75 0 1 1 3.89 3.89L7.5 21.63l-4.243.354.354-4.243L16.862 4.487Z"></path></svg>
            </span>
            <span v-else>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M1.75 12s3.5-7.25 10.25-7.25S22.25 12 22.25 12s-3.5 7.25-10.25 7.25S1.75 12 1.75 12Zm10.25 3.25A3.25 3.25 0 1 0 8.75 12a3.25 3.25 0 0 0 3.25 3.25Z"></path></svg>
            </span>
        </span>
    `
};
