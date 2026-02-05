import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';

function copyAndDeleteThemeAssets() {
    const srcDir = 'joint-light-theme/assets';
    const destDir = 'src/assets';

    const pathsToDeleteAfterCopy = [];

    function copyAssets(srcDir, destDir) {
        const files = fs.readdirSync(srcDir);

        for (const file of files) {
            const srcPath = path.join(srcDir, file);
            const destPath = path.join(destDir, file);

            if (fs.statSync(srcPath).isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyAssets(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
                pathsToDeleteAfterCopy.push(destPath);
            }
        }
    }

    return {
        name: 'copy-and-delete-assets',
        async buildStart() {
            copyAssets(srcDir, destDir);
        },
        async buildEnd() {
            for (const pathToDelete of pathsToDeleteAfterCopy) {
                fs.unlinkSync(pathToDelete);
            }
        },
    };
}

function copyStaticAssets() {
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
    plugins: [react(), copyAndDeleteThemeAssets(), copyStaticAssets()],
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

