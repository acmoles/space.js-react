#!/usr/bin/env node

/**
 * Runtime smoke test.
 *
 * Builds the app, serves it, then opens every route in headless Chromium and
 * reports any uncaught error or unhandled rejection logged by the page. It is
 * the cheapest way to catch lifecycle regressions — a route that renders but
 * throws while animating still counts as broken.
 *
 * Errors that the sandbox cannot avoid (blocked Google Fonts and other
 * external requests, failed WebSocket connections, the missing favicon) are
 * ignored.
 *
 * Usage:
 *   node scripts/smoke.mjs                    Check every route
 *   node scripts/smoke.mjs ui panel details   Check specific routes
 *   npm run smoke                             Same
 *
 * Options (environment variables):
 *   SMOKE_SETTLE   Milliseconds to run each route for (default 3000)
 *
 * Requires `playwright-core` and a local Chromium:
 *   npm install --no-save playwright-core
 */

import { build, launch, listRoutes, openPage, serve } from './harness.mjs';

const SETTLE = Number(process.env.SMOKE_SETTLE || 3000);
const DIST = '/tmp/smoke-dist';
const PORT = 4711;

/** Errors that come from the sandbox having no external network. */
const IGNORED = [
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /cyberspace\.app/,
    /space\.js\.org/,
    /unpkg\.com/,
    /favicon/,
    /net::ERR_/,
    /WebSocket/i,
    /status of 404/
];

const requested = process.argv.slice(2);
const routes = ['', ...(requested.length ? requested : listRoutes()).map(route => `examples/${route}`)];

build(DIST);

const server = await serve(DIST, PORT);
const browser = await launch();

let failed = 0;

for (const route of routes) {
    const url = `http://127.0.0.1:${PORT}/${route}`;
    const page = await openPage(browser);
    const errors = [];

    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });

    await page.goto(url, { waitUntil: 'load' }).catch(error => errors.push(String(error)));
    await page.waitForTimeout(SETTLE);
    await page.close();

    const unexpected = errors.filter(error => !IGNORED.some(pattern => pattern.test(error)));
    const name = route || '(index)';

    if (unexpected.length) {
        failed++;
        console.log(`fail  ${name}`);
        unexpected.forEach(error => console.log(`        ${error.split('\n')[0]}`));
    } else {
        console.log(`ok    ${name}`);
    }
}

await browser.close();
server.close();

console.log(failed ? `\n${failed} of ${routes.length} routes failed` : `\nAll ${routes.length} routes are free of errors`);

process.exitCode = failed ? 1 : 0;
