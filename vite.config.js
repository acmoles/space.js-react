import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@lib': fileURLToPath(new URL('./lib', import.meta.url))
        }
    },
    build: {
        // Keep class and function names when using `Thread` from Space.js
        minify: 'terser',
        terserOptions: {
            keep_classnames: true,
            keep_fnames: true
        }
    },
    worker: {
        format: 'es',
        rolldownOptions: {
            preserveEntrySignatures: 'strict'
        }
    }
});
