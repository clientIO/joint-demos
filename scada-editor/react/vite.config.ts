import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    // Relative asset URLs so the build runs from any sub-path.
    base: './',
    server: { port: 5191 },
    plugins: [
        react(),
        // React Compiler memoizes components and hooks.
        babel({ presets: [reactCompilerPreset()] }),
        tailwindcss(),
    ],
    resolve: {
        // `@joint/react` declares React as a peer: one copy of each, or hooks throw.
        dedupe: ['react', 'react-dom', '@joint/react'],
    },
    optimizeDeps: {
        include: ['@joint/plus', '@joint/core', '@joint/react', '@joint/react/internal'],
    },
});
