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

import fs from 'node:fs';
import path from 'node:path';

import { EXECUTABLE, WORKTREE, build, ensureReference, launch, listRoutes, openPage, run, serve } from './harness.mjs';
import { advance, installDeterministicClock } from './deterministic.mjs';

const SETTLE = Number(process.env.PARITY_SETTLE || 3500);

// With the deterministic clock installed the page does not animate on its own,
// so a real-time settle only needs to cover module loading, texture decoding
// and font loading; the animation itself is stepped explicitly.
const LOAD_SETTLE = Number(process.env.PARITY_LOAD_SETTLE || 1500);

// Virtual frames to step before capturing.  Any fixed number works — it just
// has to be the same for both sides.  120 frames is two seconds of animation,
// enough for intro transitions to have finished.
const FRAMES = Number(process.env.PARITY_FRAMES || 120);

// Frames to step after moving the pointer, to let hover transitions finish.
const HOVER_FRAMES = Number(process.env.PARITY_HOVER_FRAMES || 60);

// The deterministic clock can be disabled to compare against the old
// behaviour, or to check whether it is itself causing a difference.
const DETERMINISTIC = process.env.PARITY_DETERMINISTIC !== '0';

// Captures the reference page a second time and diffs it against itself.  That
// self-diff is the measurement noise floor: no comparison against the port can
// be more precise than it, so it is used as the per-route tolerance.  With the
// deterministic clock the floor should be 0 on every route, which is what makes
// a strict "0 differing pixels" claim meaningful in the first place.
const MEASURE_NOISE = process.env.PARITY_NOISE === '1';

// Flat fallback tolerance, for the rare route that cannot be made
// deterministic.  Defaults to 0 — strict.
const TOLERANCE = Number(process.env.PARITY_TOLERANCE || 0);

// Extra settle after moving the pointer, to let hover transitions finish.
const HOVER_SETTLE = Number(process.env.PARITY_HOVER_SETTLE || 1500);

// Centre of the harness viewport (see `openPage` in harness.mjs).  The 3D
// examples place their interactive points around the middle of the screen,
// so hovering here is what reveals their panels and graphs.
const VIEWPORT_CENTRE = { x: 640, y: 400 };
const OUT = process.env.PARITY_OUT || '/tmp/parity';
// Overridable so two harness runs (or two agents) can work concurrently
// without fighting over ports or the build directory.
const DIST = process.env.PARITY_DIST || '/tmp/parity-dist';
const REFERENCE_PORT = Number(process.env.PARITY_REFERENCE_PORT || 8099);
const CURRENT_PORT = Number(process.env.PARITY_CURRENT_PORT || 4199);

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

// `about` and `mars` are not single-file `examples/<route>.html` pages: they
// are standalone Rollup apps under `examples/<route>/`, whose reference build
// is produced by their own toolchain rather than checked in.  There is nothing
// to screenshot them against, so they are skipped rather than reported as a
// failure.  They are covered by `npm run smoke` instead.
const APP_EXAMPLES = new Set(['about', 'mars']);

/** Reference (pre-port) URL for a route on the reference server. */
function referenceUrl(route) {
    return `http://127.0.0.1:${REFERENCE_PORT}/examples/${route}.html`;
}

function isNoise(text) {
    return NOISE_PATTERNS.some(re => re.test(text));
}

/**
 * Navigate to `url`, wait for the page to settle, then screenshot it.
 * Returns `{ errors, blank }`, where `errors` are console errors that are not
 * noise and `blank` is true when the page rendered nothing — a blank page on
 * both sides compares as a perfect match, so callers must treat it as failure.
 *
 * When `hover` is set the pointer is moved to the centre of the viewport
 * before the screenshot, so that hover-activated UI (3D point panels, radial
 * graphs, trackers) is actually exercised.  Without this pass the comparison
 * is blind to every example whose panel or graph only appears on hover.
 */
async function capture(browser, url, file, { hover = false } = {}) {
    const page = await openPage(browser);

    if (DETERMINISTIC) {
        await installDeterministicClock(page);
    }

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

    if (DETERMINISTIC) {
        // Real time only to finish loading; the animation is stepped by hand so
        // that the capture lands on an exact frame.
        //
        // Two passes: some intros are kicked off by a real timer that has not
        // fired by the end of the first pass, leaving their reveal tween parked
        // at frame zero (the `close` and `progress` examples capture as an empty
        // background that way).  A second settle lets those timers land, and the
        // second pass runs their animation to completion.  Animations that
        // already finished are unaffected, so the frame count stays fixed and
        // the result stays deterministic.
        await page.waitForTimeout(LOAD_SETTLE);
        await advance(page, FRAMES);
        await page.waitForTimeout(LOAD_SETTLE);
        await advance(page, FRAMES);
    } else {
        await page.waitForTimeout(SETTLE);
    }

    if (hover) {
        await page.mouse.move(VIEWPORT_CENTRE.x, VIEWPORT_CENTRE.y);

        if (DETERMINISTIC) {
            await advance(page, HOVER_FRAMES);
        } else {
            await page.waitForTimeout(HOVER_SETTLE);
        }
    }

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
        // `compare` exits non-zero when the images differ, with the count on
        // stderr.  An empty/absent stderr means it never ran (ImageMagick is
        // not installed), which must not be mistaken for "0 differing pixels" —
        // `Number('')` is 0, which would turn every route into a false pass.
        const stderr = error.stderr ? error.stderr.toString().trim() : '';

        if (!stderr) return null;

        const count = Number(stderr.split(/\s+/)[0]);

        return Number.isNaN(count) ? null : count;
    }
}

async function main() {
    if (!EXECUTABLE) {
        console.error('No Chromium executable found.');
        process.exit(1);
    }

    // Fail fast rather than spend ~15 minutes capturing screenshots that cannot
    // be compared.
    try {
        run('compare', ['-version']);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('ImageMagick `compare` not found — install it, otherwise pixel parity cannot be measured.');
            process.exit(1);
        }
    }

    // Pre-port pages, from the revision before the React port
    ensureReference();
    build(DIST);

    const referenceServer = await serve(WORKTREE, REFERENCE_PORT);
    const currentServer = await serve(DIST, CURRENT_PORT);

    const routes = process.argv.slice(2).length ? process.argv.slice(2) : listRoutes();

    fs.mkdirSync(OUT, { recursive: true });

    const browser = await launch();

    // Results collected for the summary table: { route, pixels, errors, pass }
    const results = [];

    for (const route of routes) {
        const name = route.replace(/\//g, '_');

        if (APP_EXAMPLES.has(route)) {
            results.push({
                route,
                pixels: null,
                hoverPixels: null,
                noise: 0,
                hoverNoise: 0,
                errors: [],
                pass: true,
                skipped: true
            });

            continue;
        }

        // Capture reference (original page) — we intentionally ignore its
        // console errors since the pre-port pages may use non-React patterns.
        const reference = await capture(
            browser,
            referenceUrl(route),
            path.join(OUT, `${name}-reference.png`)
        );

        // Capture current React port — errors here count against the route.
        const current = await capture(
            browser,
            `http://127.0.0.1:${CURRENT_PORT}/examples/${route}`,
            path.join(OUT, `${name}-current.png`)
        );

        const consoleErrors = [...current.errors];

        // Second pass with the pointer over the centre of the page.  Static
        // screenshots alone pass even when hover-activated UI is broken, so
        // this is where panel and graph regressions actually surface.
        const referenceHover = await capture(
            browser,
            referenceUrl(route),
            path.join(OUT, `${name}-reference-hover.png`),
            { hover: true }
        );

        const currentHover = await capture(
            browser,
            `http://127.0.0.1:${CURRENT_PORT}/examples/${route}`,
            path.join(OUT, `${name}-current-hover.png`),
            { hover: true }
        );

        consoleErrors.push(...currentHover.errors.filter(e => !consoleErrors.includes(e)));

        if (referenceHover.blank !== currentHover.blank) {
            consoleErrors.push(referenceHover.blank ? 'reference page rendered nothing on hover' : 'current page rendered nothing on hover');
        }

        // A blank page on one side only makes the pixel count meaningless.
        // Some pages legitimately render nothing (console-only test pages), so
        // blank on both sides is not a failure.
        if (reference.blank !== current.blank) {
            consoleErrors.push(reference.blank ? 'reference page rendered nothing' : 'current page rendered nothing');
        }

        const pixels = compare(
            path.join(OUT, `${name}-reference.png`),
            path.join(OUT, `${name}-current.png`),
            path.join(OUT, `${name}-diff.png`)
        );

        const hoverPixels = compare(
            path.join(OUT, `${name}-reference-hover.png`),
            path.join(OUT, `${name}-current-hover.png`),
            path.join(OUT, `${name}-hover-diff.png`)
        );

        // Noise floor: the same reference page, captured again and diffed
        // against itself.  Anything at or below this is indistinguishable from
        // run-to-run variation.
        let noise = TOLERANCE;
        let hoverNoise = TOLERANCE;

        if (MEASURE_NOISE) {
            await capture(
                browser,
                referenceUrl(route),
                path.join(OUT, `${name}-reference-2.png`)
            );

            await capture(
                browser,
                referenceUrl(route),
                path.join(OUT, `${name}-reference-2-hover.png`),
                { hover: true }
            );

            noise = Math.max(TOLERANCE, compare(
                path.join(OUT, `${name}-reference.png`),
                path.join(OUT, `${name}-reference-2.png`),
                path.join(OUT, `${name}-noise-diff.png`)
            ) ?? TOLERANCE);

            hoverNoise = Math.max(TOLERANCE, compare(
                path.join(OUT, `${name}-reference-hover.png`),
                path.join(OUT, `${name}-reference-2-hover.png`),
                path.join(OUT, `${name}-noise-hover-diff.png`)
            ) ?? TOLERANCE);
        }

        // `null` means the comparison could not be made, which is not a pass.
        const pass = pixels !== null
            && hoverPixels !== null
            && pixels <= noise
            && hoverPixels <= hoverNoise
            && consoleErrors.length === 0;

        results.push({ route, pixels, hoverPixels, noise, hoverNoise, errors: consoleErrors, pass });

        // Per-route immediate output (backwards-compatible format)
        if (pixels === null || hoverPixels === null) {
            console.log(`${route}: ✗ NOT COMPARED — install ImageMagick (\`compare\`) to measure pixel parity`);
        } else {
            const floor = MEASURE_NOISE ? ` (noise floor ${noise}/${hoverNoise})` : '';

            console.log(`${route}: ${pixels} differing pixels, ${hoverPixels} on hover${floor}`);
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
    const noiseHeader = MEASURE_NOISE ? `  ${'noise'.padStart(6)}  ${'nhover'.padStart(6)}` : '';
    const header = `${'route'.padEnd(colRoute)}  ${'pixels'.padStart(6)}  ${'hover'.padStart(6)}${noiseHeader}  status`;
    const separator = '─'.repeat(header.length);

    console.log(`\n${separator}`);
    console.log(header);
    console.log(separator);

    for (const { route, pixels, hoverPixels, noise, hoverNoise, errors, pass, skipped } of results) {
        const pixStr = pixels === null ? '     —' : String(pixels).padStart(6);
        const hoverStr = hoverPixels === null ? '     —' : String(hoverPixels).padStart(6);
        const status = skipped
            ? '— skipped (no reference build)'
            : pass ? '✓ pass' : `✗ FAIL${errors.length ? ` (${errors.length} error${errors.length > 1 ? 's' : ''})` : ''}`;
        const noiseStr = MEASURE_NOISE ? `  ${String(noise).padStart(6)}  ${String(hoverNoise).padStart(6)}` : '';

        console.log(`${route.padEnd(colRoute)}  ${pixStr}  ${hoverStr}${noiseStr}  ${status}`);
    }

    console.log(separator);

    const failed = results.filter(r => !r.pass);

    if (failed.length) {
        console.log(`\n${failed.length} route(s) failed. Inspect diff images in ${OUT} and review console errors above.`);
        process.exit(1);
    }
}

main();
