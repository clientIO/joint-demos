import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// libavoid-js (a dependency of @joint/router-avoid) does not export its wasm
// binary, and package managers may hoist it, so resolve the file from the
// package entry instead of a hard-coded node_modules path. Kept a separate
// served file (LGPL-2.1).
const LIBAVOID_DIST = dirname(createRequire(import.meta.url).resolve('libavoid-js'));

// https://vite.dev/config/
export default defineConfig({
    // Relative asset URLs so the build runs from any sub-path without a hardcoded base.
    base: './',
    build: { sourcemap: false },
    plugins: [
        react(),
        // React Compiler runs as a Babel pass — auto-memoizes components.
        babel({ presets: [reactCompilerPreset()] }),
        // Tailwind CSS v4 — config lives in src/index.css (@theme).
        tailwindcss(),
        // `npm run build:analyze` — treemap of the production bundle to dist/stats.html.
        process.env.ANALYZE === '1' &&
      visualizer({ filename: 'dist/stats.html', gzipSize: true }),
    ],
    resolve: {
    // `@/` → `src/`.
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'libavoid-js-dist': LIBAVOID_DIST,
        },
        // `@joint/react` declares its own React; without deduping Vite loads a second
        // copy and every hook throws "Invalid hook call". Force one copy.
        dedupe: ['react', 'react-dom', '@joint/react'],
    },
    optimizeDeps: {
        include: [
            '@joint/plus',
            '@joint/core',
            '@joint/react',
            '@joint/react/internal',
        ],
        // The avoid router spawns its Worker via `new URL('./Worker.mjs',
        // import.meta.url)`; pre-bundling moves the module and breaks that path.
        exclude: ['@joint/router-avoid'],
    },
});
