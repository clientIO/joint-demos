import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    // Relative base so the built demo works from any sub-path on the demos site.
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
        // `@joint/react` arrives transitively through `@joint/react-plus`; two
        // copies would mean two React contexts and no graph in the Paper.
        dedupe: ['react', 'react-dom', '@joint/react'],
    },
    optimizeDeps: {
        include: ['@joint/core', '@joint/plus', '@joint/react'],
    },
    build: {
        sourcemap: false,
        // `@joint/plus` alone is past the default 500 kB warning; there is no
        // split to make here that would change what the page has to download.
        chunkSizeWarningLimit: 1500,
    },
});
