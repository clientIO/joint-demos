import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Standalone from vite.config.ts on purpose: the unit tests exercise pure logic
// (SQL import/export, schema<->cells), so they need only the `@/` alias — not the
// React Compiler babel pass or Tailwind. node-sql-parser's per-dialect CJS builds
// resolve through esbuild here exactly as they do in the dev/build bundle.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
