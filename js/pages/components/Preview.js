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
        </div>
    `
};
