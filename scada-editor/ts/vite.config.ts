import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5173,
        // Allow the dev server to be reached through a tunnel, e.g. ngrok.
        // allowedHosts: ['.ngrok-free.app']
    }
});
