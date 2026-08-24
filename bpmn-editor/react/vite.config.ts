import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    // Relative asset URLs so the build runs from any sub-path without a
    // hardcoded base (e.g. served under /demos/bpmn-editor/react/).
    base: './',
    plugins: [react()],
    resolve: {
        // `@joint/react` declares its own React; without deduping, Vite loads a
        // second copy and every hook throws "Invalid hook call". Force one copy.
        dedupe: ['react', 'react-dom', '@joint/react']
    },
    // Pre-bundle the large JointJS dependencies into single chunks.
    optimizeDeps: {
        include: [
            '@joint/plus',
            '@joint/core',
            '@joint/react',
            '@joint/react/internal',
            '@joint/react-plus',
            '@joint/format-bpmn-import',
            '@joint/format-bpmn-export'
        ]
    }
});
