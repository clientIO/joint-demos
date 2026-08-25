import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

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
        // `yarn build:analyze` — treemap of the production bundle to dist/stats.html.
        process.env.ANALYZE === '1' &&
      visualizer({ filename: 'dist/stats.html', gzipSize: true }),
    ],
    resolve: {
    // `@/` → `src/`.
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
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
        // Re-bundle deps on every dev start — the `@joint/*` packages are linked
        // workspaces and Vite hashes pre-bundled deps by version + lockfile, not by
        // dist/ contents, so a rebuilt (same-version) lib never invalidates the cache.
        // Set VITE_NO_FORCE_OPTIMIZE=1 to opt out when not touching the libraries.
        force: process.env.VITE_NO_FORCE_OPTIMIZE !== '1',
    },
});
