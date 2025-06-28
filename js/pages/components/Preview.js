import { renderTemplate } from '../../utils/template.js';

export default {
    props: {
        template: { type: String, default: '' },
        values: { type: Object, default: () => ({}) }
    },
    computed: {
        rendered() {
            return renderTemplate(this.template, this.values);
        }
    },
    data() {
        return { copied: false };
    },
    methods: {
        async copyToClipboard() {
            try {
                await navigator.clipboard.writeText(this.rendered);
                this.copied = true;
                setTimeout(() => { this.copied = false; }, 1200);
            } catch (e) {
                // fallback or error
            }
        }
    },
    template: `
        <div class="relative group bg-gray-900 p-4 rounded border border-gray-700 min-h-[3rem] text-white whitespace-pre-wrap cursor-default select-text opacity-90">
            <template v-if="!rendered || rendered.trim() === ''">
                <div class="flex flex-col items-center justify-center h-20 text-gray-400 text-sm italic opacity-80">
                    <svg class="w-6 h-6 mb-1 text-gray-500 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5C7.305 20.5 3.5 16.695 3.5 12S7.305 3.5 12 3.5 20.5 7.305 20.5 12 16.695 20.5 12 20.5Z"></path></svg>
                    Nothing to preview. Start by entering a template!
                </div>
            </template>
            <template v-else>
                {{ rendered }}
                <button
                    class="absolute bottom-2 right-2 px-2 py-1 rounded text-xs bg-gray-700 text-gray-200 hover:bg-blue-600 hover:text-white outline-none"
                    @click.stop="copyToClipboard"
                    tabindex="0"
                    title="Copy to clipboard"
                >
                    <span v-if="!copied">Copy</span>
                    <span v-else>Copied!</span>
                </button>
            </template>
        </div>
    `
};
