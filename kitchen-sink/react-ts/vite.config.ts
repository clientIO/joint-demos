import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

import type { Plugin } from 'vite';

function serveStaticAssets(): Plugin {
    return {
        name: 'serve-static-assets',
        configureServer(server) {
            server.middlewares.use('/assets', (req, res, next) => {
                const filePath = path.resolve(__dirname, 'src', 'assets', decodeURIComponent(req.url || '/').replace(/^\//, ''));
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    const ext = path.extname(filePath).toLowerCase();
                    const mimeTypes: Record<string, string> = {
                        '.svg': 'image/svg+xml',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.woff': 'font/woff',
                        '.woff2': 'font/woff2',
                        '.ttf': 'font/ttf',
                    };
                    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
                    res.end(fs.readFileSync(filePath));
                } else {
                    next();
                }
            });
        }
    };
}

function copyStaticAssets(): Plugin {
    const assetsToCopy = [
        'src/assets',
        'src/assets/navigator',
    ];

    return {
        name: 'copy-static-assets',
        apply: 'build',
        async buildEnd() {
            for (const asset of assetsToCopy) {
                const files = fs.readdirSync(asset);

                const folderPath = path.join('dist', asset.split('/').slice(1).join('/'));
                fs.mkdirSync(folderPath, { recursive: true });

                for (const file of files) {
                    const srcPath = path.join(asset, file);
                    const destPath = path.join(folderPath, file);

                    if (fs.statSync(srcPath).isDirectory()) {
                        continue;
                    }

                    fs.copyFileSync(srcPath, destPath);
                }
            }
        },
    };
}

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
    plugins: [react(), copyStaticAssets(), serveStaticAssets()],
    resolve: {
        alias: {
            '/assets': path.resolve(__dirname, 'src/assets'),
            '/joint-light-theme': path.resolve(__dirname, 'joint-light-theme'),
        },
    },
    assetsInclude: '**/*.svg',
    build: {
        emptyOutDir: false,
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    const extension = assetInfo.name?.split('.').pop();
                    const path = extension === 'ttf' ? 'fonts/' : '';

                    return `assets/${path}[name].[ext]`;
                }
            },
        }
    }
});
