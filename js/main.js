import { router } from './router.js';
import Navbar from './pages/Navbar.js';

const app = Vue.createApp({
    template: `
        <div class="min-h-screen bg-gray-900">
            <Navbar />
            <div class="pt-16">
                <router-view></router-view>
            </div>
        </div>
    `
});

app.use(router);
app.component('Navbar', Navbar);
app.mount('#app');
