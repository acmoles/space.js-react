#!/usr/bin/env node

/**
 * Visual parity harness.
 *
 * Renders a route from the current app and the equivalent page from the
 * pre-port revision side by side in headless Chromium and reports the number
 * of differing pixels, so a port can be checked against the original it
 * replaces.
 *
 * The pre-port pages live in the last revision before the React port, which is
 * checked out into a git worktree and served statically.
 *
 * Usage:
 *   node scripts/parity.mjs                       Compare every known route
 *   node scripts/parity.mjs ui panel details      Compare specific routes
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

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
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

function run(command, args, options = {}) {
    return execFileSync(command, args, { cwd: root, stdio: 'pipe', ...options }).toString();
}

function serve(directory, port) {
    return spawn('npx', ['--yes', 'sirv-cli', directory, '--port', String(port), '--single', '--quiet'], {
        cwd: root,
        stdio: 'ignore'
    });
}

function listRoutes() {
    const registry = fs.readFileSync(path.join(root, 'src/examples/registry.js'), 'utf8');

    return [...registry.matchAll(/path: '\/examples\/([^']+)'/g)].map(match => match[1]);
}

async function capture(browser, url, file) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

    await page.goto(url, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(SETTLE);
    await page.screenshot({ path: file });
    await page.close();
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

    run('npx', ['vite', 'build', '--outDir', '/tmp/parity-dist', '--emptyOutDir'], { stdio: 'inherit' });

    const referenceServer = serve(WORKTREE, REFERENCE_PORT);
    const currentServer = serve('/tmp/parity-dist', CURRENT_PORT);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const routes = process.argv.slice(2).length ? process.argv.slice(2) : listRoutes();

    fs.mkdirSync(OUT, { recursive: true });

    const browser = await chromium.launch({
        executablePath: EXECUTABLE,
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-device-scale-factor=1']
    });

    let differing = 0;

    for (const route of routes) {
        const name = route.replace(/\//g, '_');

        await capture(browser, `http://127.0.0.1:${REFERENCE_PORT}/examples/${route}.html`, path.join(OUT, `${name}-reference.png`));
        await capture(browser, `http://127.0.0.1:${CURRENT_PORT}/examples/${route}`, path.join(OUT, `${name}-current.png`));

        const difference = compare(
            path.join(OUT, `${name}-reference.png`),
            path.join(OUT, `${name}-current.png`),
            path.join(OUT, `${name}-diff.png`)
        );

        if (difference === null) {
            console.log(`${route}: captured (install ImageMagick for a pixel count)`);
        } else {
            console.log(`${route}: ${difference} differing pixels`);

            if (difference > 0) {
                differing++;
            }
        }
    }

    await browser.close();

    referenceServer.kill();
    currentServer.kill();

    if (differing) {
        console.log(`\n${differing} route(s) differ. Animated and randomised examples differ by phase; inspect the diff images in ${OUT}.`);
    }
}

main();
