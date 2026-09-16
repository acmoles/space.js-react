/**
 * Shared pieces of the parity harnesses.
 *
 * Both `parity.mjs` (pixels) and `domparity.mjs` (layout and computed styles)
 * need to serve two builds side by side and open the same pages in headless
 * Chromium, so that setup lives here.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Revision holding the pre-port example pages. */
export const REV = process.env.PARITY_REV || '5d780b9';

/** Worktree the pre-port pages are checked out into. */
export const WORKTREE = '/tmp/parity-reference';

export const EXECUTABLE = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser']
    .find(candidate => fs.existsSync(candidate));

const MIME_TYPES = {
    '.css': 'text/css',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.html': 'text/html',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.mjs': 'text/javascript',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

export function run(command, args, options = {}) {
    return execFileSync(command, args, { cwd: root, stdio: 'pipe', ...options }).toString();
}

/**
 * Minimal static file server with SPA fallback.
 *
 * Deliberately dependency free: an external server binary that fails to start
 * would serve blank pages for both sides of the comparison, which reads as a
 * perfect match and hides every regression.
 */
export function serve(directory, port) {
    const server = http.createServer((request, response) => {
        const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);

        // Resolve inside `directory` only, so a `..` traversal cannot escape it
        let file = path.join(directory, path.normalize(requested));

        if (path.relative(directory, file).startsWith('..')) {
            response.writeHead(403).end();
            return;
        }

        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
            file = path.join(file, 'index.html');
        }

        // SPA fallback: unknown extensionless paths are client-side routes
        if (!fs.existsSync(file) && !path.extname(requested)) {
            file = path.join(directory, 'index.html');
        }

        if (!fs.existsSync(file)) {
            response.writeHead(404).end();
            return;
        }

        response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(response);
    });

    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(port, '127.0.0.1', () => resolve(server));
    });
}

/** Checks out the pre-port revision into a worktree, once. */
export function ensureReference() {
    if (!fs.existsSync(WORKTREE)) {
        run('git', ['worktree', 'add', '--detach', WORKTREE, REV]);
    }
}

/** Builds the current app into `directory`. */
export function build(directory) {
    execFileSync('npx', ['vite', 'build', '--outDir', directory, '--emptyOutDir'], { cwd: root, stdio: 'inherit' });
}

/** Every example route, read from the registry. */
export function listRoutes() {
    const registry = fs.readFileSync(path.join(root, 'src/examples/registry.js'), 'utf8');

    return [...registry.matchAll(/path: '\/examples\/([^']+)'/g)].map(match => match[1]);
}

export async function launch() {
    const { chromium } = await import('playwright-core');

    return chromium.launch({
        executablePath: EXECUTABLE,
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-device-scale-factor=1']
    });
}

/**
 * Opens a page at 1280×800 with the pre-port pages' `unpkg` import map served
 * from the local `three`, since the sandbox has no external network.
 */
export async function openPage(browser) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

    await page.route('https://unpkg.com/three/**', route => {
        const file = path.join(root, 'node_modules', decodeURIComponent(new URL(route.request().url()).pathname));

        if (!fs.existsSync(file)) {
            route.abort();
            return;
        }

        route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) });
    });

    return page;
}
