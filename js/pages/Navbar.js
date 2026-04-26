export default Vue.defineComponent({
    template: `
        <nav class="bg-gray-800 border-b border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-12">
                    <div class="flex items-center space-x-6">
                        <a href="/" class="text-base md:text-lg font-bold text-white">Prompt Maker</a>
                        <div class="flex space-x-6">
                            <a href="/templates" class="text-sm border-b-2 border-transparent text-gray-400 hover:text-blue-400 hover:border-blue-500 px-1 pt-1">Templates</a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `
});
