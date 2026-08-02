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
        include: ['@joint/core', '@joint/plus', '@joint/react', '@joint/react/internal'],
    },
    build: {
        sourcemap: false,
        // Mermaid is a large dependency even though it is imported lazily; the
        // default 500 kB warning is noise here.
        chunkSizeWarningLimit: 3000,
    },
});
