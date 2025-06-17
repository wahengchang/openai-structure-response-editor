export default Vue.defineComponent({
    template: `
        <nav class="bg-gray-800 border-b border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center space-x-8">
                        <h1 class="text-xl font-bold text-white">Todo App</h1>
                        <div class="flex space-x-8">
                            <a href="/" class="border-b-2 border-transparent text-gray-400 hover:text-white hover:border-blue-500 px-1 pt-1">Home</a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `
});
