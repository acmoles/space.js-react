import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
            // `@alienkitty/alien.js` depends on `@alienkitty/space.js`. Point
            // that at the vendored copy in `lib/`, otherwise the app runs two
            // copies of the library and the `Stage` and `ticker` singletons
            // that alien.js and the ported components share diverge.
            '@alienkitty/space.js/three': fileURLToPath(new URL('./lib/three.js', import.meta.url)),
            '@alienkitty/space.js': fileURLToPath(new URL('./lib/index.js', import.meta.url))
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
