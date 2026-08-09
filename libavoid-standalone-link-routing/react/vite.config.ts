import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Absolute path to `libavoid.wasm`.
 *
 * The router worker has to hand Libavoid the URL of its own WebAssembly binary
 * — a worker has no `document`, so the library cannot work out where it was
 * served from. `libavoid-js` does not export the file as a subpath, so it is
 * located next to the entry point that *is* exported and aliased below, which
 * lets `?url` treat it as an ordinary asset: hashed and emitted by the build,
 * served straight from `node_modules` in dev.
 */
const require = createRequire(import.meta.url);
const libavoidWasm = join(dirname(require.resolve('libavoid-js')), 'libavoid.wasm');

export default defineConfig({
    // Relative base so the built demo works from any sub-path on the demos site.
    base: './',
    plugins: [react()],
    resolve: {
        // The array form, because the wasm entry has to match an id that
        // carries a `?url` query — the object form only matches a bare
        // specifier or a `<key>/…` subpath.
        alias: [
            { find: /^@\//, replacement: `${fileURLToPath(new URL('./src', import.meta.url))}/` },
            { find: /^libavoid-wasm/, replacement: libavoidWasm },
        ],
        // `@joint/react` arrives transitively through `@joint/react-plus`; two
        // copies would mean two React contexts and no graph in the Paper.
        dedupe: ['react', 'react-dom', '@joint/react'],
    },
    optimizeDeps: {
        include: ['@joint/core', '@joint/plus', '@joint/react', '@joint/react/internal'],
    },
    worker: {
        // The router worker imports `@joint/core` and `libavoid-js` as ES
        // modules; the default `iife` worker format cannot carry those.
        format: 'es',
    },
    build: {
        sourcemap: false,
        // `@joint/plus` alone is past the default 500 kB warning; there is no
        // split to make here that would change what the page has to download.
        chunkSizeWarningLimit: 1500,
    },
});
