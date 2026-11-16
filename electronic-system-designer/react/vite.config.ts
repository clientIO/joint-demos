import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// libavoid-js (a dependency of @joint/router-avoid) does not export its wasm
// binary, and package managers may hoist it, so resolve the file from the
// package entry instead of a hard-coded node_modules path. Kept a separate
// served file (LGPL-2.1).
const LIBAVOID_DIST = dirname(createRequire(import.meta.url).resolve('libavoid-js'));

/**
 * WORKAROUND: remove this plugin (and its two uses below) once a fix for
 * https://github.com/clientIO/joint/issues/3595 (both options, see
 * https://github.com/clientIO/joint/issues/3595#issuecomment-6914961577)
 * is merged and released, and
 * pass the options to `initAvoidRouter` in `src/canvas/use-avoid-routing.ts`
 * instead. Until then the plugin warns at build time if the package source
 * changes and the switch no longer applies.
 *
 * The router always turns both on, with no option to turn them off:
 * - `nudgeOrthogonalSegmentsConnectedToShapes` nudges the end segments of
 *   wires that share a pin apart, so they attach beside the pin, not on it;
 * - `nudgeSharedPathsWithCommonEndPoint` nudges wires leaving one pin apart
 *   along their whole shared path, so three GND wires run as three parallel
 *   lines instead of one trunk that branches (the schematic convention).
 * In the Worker they run inside the package's own module, so they are
 * switched off in the package source at build time (both providers).
 */
const ROUTER_OPTIONS_OFF = ['nudgeOrthogonalSegmentsConnectedToShapes', 'nudgeSharedPathsWithCommonEndPoint'];

function keepRouteEndsOnPorts(): Plugin {
    return {
        name: 'workaround-router-avoid-keep-route-ends-on-ports',
        transform(code, id) {
            if (!id.includes('@joint/router-avoid') || !/(Worker|MainThreadProvider)\.mjs$/.test(id.split('?')[0] ?? '')) return null;
            let patched = code;
            for (const option of ROUTER_OPTIONS_OFF) {
                const on = `setRoutingOption(Avoid.${option}, true)`;
                if (!patched.includes(on)) {
                    // The package changed: check whether the option is exposed now.
                    this.warn(`router-avoid workaround for ${option} did not apply to ${id}`);
                    continue;
                }
                patched = patched.replace(on, `setRoutingOption(Avoid.${option}, false)`);
            }
            return { code: patched, map: null };
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    // Relative asset URLs so the build runs from any sub-path without a hardcoded base.
    base: './',
    build: { sourcemap: false },
    plugins: [
        keepRouteEndsOnPorts(),
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
    // The router's Worker is bundled on its own: it needs the workaround too.
    worker: { format: 'es', plugins: () => [keepRouteEndsOnPorts()] },
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
