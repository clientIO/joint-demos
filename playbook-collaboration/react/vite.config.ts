import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    // Relative asset URLs so the build runs from any sub-path without a hardcoded base.
    base: './',
    build: { sourcemap: false },
    plugins: [
        react(),
        // React Compiler runs as a Babel pass and memoizes components for us.
        babel({ presets: [reactCompilerPreset()] }),
        // Tailwind CSS v4; its theme lives in src/index.css (@theme).
        tailwindcss(),
    ],
    resolve: {
        // `@/` points at `src/`.
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        // `@joint/react` declares its own React; without deduping Vite can load a
        // second copy and every hook throws "Invalid hook call".
        dedupe: ['react', 'react-dom', '@joint/react'],
    },
    optimizeDeps: {
        include: ['@joint/plus', '@joint/core', '@joint/react', '@joint/react/internal'],
    },
});
