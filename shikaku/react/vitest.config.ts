import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Standalone from vite.config.ts: the unit tests cover the puzzle logic in
// `src/puzzle`, which is plain TypeScript with no React and no JointJS, so the
// `@/` alias is the only thing they need from the app's build config.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
