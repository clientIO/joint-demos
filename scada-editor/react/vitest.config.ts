import { defineConfig } from 'vitest/config';

// Standalone from vite.config.ts on purpose: the unit tests exercise the pure
// plant simulation, so they need neither the React Compiler pass nor Tailwind.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
