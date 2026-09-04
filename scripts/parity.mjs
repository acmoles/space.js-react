#!/usr/bin/env node

/**
 * Visual parity harness.
 *
 * Renders a route from the current app and the equivalent page from the
 * pre-port revision side by side in headless Chromium and reports the number
 * of differing pixels, so a port can be checked against the original it
 * replaces.
 *
 * A route also fails if the page logged an uncaught error or unhandled
 * rejection in the browser console that is not attributable to expected
 * sandbox noise (blocked Google Fonts requests, failed WebSocket connections).
 *
 * The pre-port pages live in the last revision before the React port, which is
 * checked out into a git worktree and served statically.
 *
 * Usage:
 *   node scripts/parity.mjs                       Compare every known route
 *   node scripts/parity.mjs ui panel details      Compare specific routes
 *   npm run parity                                 Same — prints summary table
 *
 * Options (environment variables):
 *   PARITY_REV      Revision holding the pre-port pages (default 5d780b9)
 *   PARITY_SETTLE   Milliseconds to wait before capturing (default 3500)
 *   PARITY_OUT      Directory for screenshots (default /tmp/parity)
 *
 * Requires `playwright-core` and a local Chromium, plus ImageMagick for the
 * pixel count:
 *   npm install --no-save playwright-core
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REV = process.env.PARITY_REV || '5d780b9';
const SETTLE = Number(process.env.PARITY_SETTLE || 3500);
const OUT = process.env.PARITY_OUT || '/tmp/parity';
const WORKTREE = '/tmp/parity-reference';
const REFERENCE_PORT = 8099;
const CURRENT_PORT = 4199;

const EXECUTABLE = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser']
    .find(candidate => fs.existsSync(candidate));

// Console noise that is expected in the sandbox and must not fail a route.
const NOISE_PATTERNS = [
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /WebSocket/i,
    /ws:\/\//,
    /wss:\/\//,
    /net::ERR_/,
    /Failed to load resource/,
    /favicon\.ico/
];

function isNoise(text) {
    return NOISE_PATTERNS.some(re => re.test(text));
}

function run(command, args, options = {}) {
    return execFileSync(command, args, { cwd: root, stdio: 'pipe', ...options }).toString();
}

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

/**
 * Minimal static file server with SPA fallback.
 *
 * Deliberately dependency free: an external server binary that fails to start
 * would serve blank pages for both sides of the comparison, which reads as a
 * perfect zero-pixel match and hides every regression.
 */
function serve(directory, port) {
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

function listRoutes() {
    const registry = fs.readFileSync(path.join(root, 'src/examples/registry.js'), 'utf8');

    return [...registry.matchAll(/path: '\/examples\/([^']+)'/g)].map(match => match[1]);
}

/**
 * Navigate to `url`, wait for the page to settle, then screenshot it.
 * Returns `{ errors, blank }`, where `errors` are console errors that are not
 * noise and `blank` is true when the page rendered nothing — a blank page on
 * both sides compares as a perfect match, so callers must treat it as failure.
 */
async function capture(browser, url, file) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

    // The pre-port 3D pages load `three` from unpkg through an import map, and
    // the sandbox has no external network. Serve the local copy instead so the
    // reference renders the same build of `three` the port is bundled against.
    await page.route('https://unpkg.com/three/**', route => {
        const file = path.join(root, 'node_modules', decodeURIComponent(new URL(route.request().url()).pathname));

        if (!fs.existsSync(file)) {
            route.abort();
            return;
        }

        route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) });
    });

    const errors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();

            if (!isNoise(text)) {
                errors.push(`console.error: ${text}`);
            }
        }
    });

    page.on('pageerror', error => {
        const text = error.message || String(error);

        if (!isNoise(text)) {
            errors.push(`uncaught: ${text}`);
        }
    });

    await page.goto(url, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(SETTLE);

    const blank = await page
        .evaluate(() => {
            const root = document.getElementById('root') || document.body;

            return !root || root.childElementCount === 0;
        })
        .catch(() => true);

    await page.screenshot({ path: file });
    await page.close();

    return { errors, blank };
}

function compare(reference, current, diff) {
    try {
        return Number(run('compare', ['-metric', 'AE', reference, current, diff]).trim());
    } catch (error) {
        // `compare` exits non-zero when the images differ, with the count on stderr
        const count = Number(error.stderr ? error.stderr.toString().trim() : '');

        return Number.isNaN(count) ? null : count;
    }
}

async function main() {
    if (!EXECUTABLE) {
        console.error('No Chromium executable found.');
        process.exit(1);
    }

    const { chromium } = await import('playwright-core');

    // Pre-port pages, from the revision before the React port
    if (!fs.existsSync(WORKTREE)) {
        run('git', ['worktree', 'add', '--detach', WORKTREE, REV]);
    }

    execFileSync('npx', ['vite', 'build', '--outDir', '/tmp/parity-dist', '--emptyOutDir'], { cwd: root, stdio: 'inherit' });

    const referenceServer = await serve(WORKTREE, REFERENCE_PORT);
    const currentServer = await serve('/tmp/parity-dist', CURRENT_PORT);

    const routes = process.argv.slice(2).length ? process.argv.slice(2) : listRoutes();

    fs.mkdirSync(OUT, { recursive: true });

    const browser = await chromium.launch({
        executablePath: EXECUTABLE,
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-device-scale-factor=1']
    });

    // Results collected for the summary table: { route, pixels, errors, pass }
    const results = [];

    for (const route of routes) {
        const name = route.replace(/\//g, '_');

        // Capture reference (original page) — we intentionally ignore its
        // console errors since the pre-port pages may use non-React patterns.
        const reference = await capture(
            browser,
            `http://127.0.0.1:${REFERENCE_PORT}/examples/${route}.html`,
            path.join(OUT, `${name}-reference.png`)
        );

        // Capture current React port — errors here count against the route.
        const current = await capture(
            browser,
            `http://127.0.0.1:${CURRENT_PORT}/examples/${route}`,
            path.join(OUT, `${name}-current.png`)
        );

        const consoleErrors = [...current.errors];

        // A blank page on either side makes the pixel count meaningless
        if (reference.blank) {
            consoleErrors.push('reference page rendered nothing');
        }

        if (current.blank) {
            consoleErrors.push('current page rendered nothing');
        }

        const pixels = compare(
            path.join(OUT, `${name}-reference.png`),
            path.join(OUT, `${name}-current.png`),
            path.join(OUT, `${name}-diff.png`)
        );

        const pass = pixels === 0 && consoleErrors.length === 0;

        results.push({ route, pixels, errors: consoleErrors, pass });

        // Per-route immediate output (backwards-compatible format)
        if (pixels === null) {
            console.log(`${route}: captured (install ImageMagick for a pixel count)`);
        } else {
            console.log(`${route}: ${pixels} differing pixels`);
        }

        for (const err of consoleErrors) {
            console.log(`  ✗ ${err}`);
        }
    }

    await browser.close();

    referenceServer.close();
    currentServer.close();

    // Summary table
    const colRoute = Math.max(5, ...results.map(r => r.route.length));
    const header = `${'route'.padEnd(colRoute)}  ${'pixels'.padStart(6)}  status`;
    const separator = '─'.repeat(header.length);

    console.log(`\n${separator}`);
    console.log(header);
    console.log(separator);

    for (const { route, pixels, errors, pass } of results) {
        const pixStr = pixels === null ? '    —' : String(pixels).padStart(6);
        const status = pass ? '✓ pass' : `✗ FAIL${errors.length ? ` (${errors.length} error${errors.length > 1 ? 's' : ''})` : ''}`;

        console.log(`${route.padEnd(colRoute)}  ${pixStr}  ${status}`);
    }

    console.log(separator);

    const failed = results.filter(r => !r.pass);

    if (failed.length) {
        console.log(`\n${failed.length} route(s) failed. Inspect diff images in ${OUT} and review console errors above.`);
        process.exit(1);
    }
}

main();
