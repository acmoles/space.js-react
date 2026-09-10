#!/usr/bin/env node

/**
 * Layout parity harness.
 *
 * Screenshots only tell you *that* two pages differ. This walks the rendered
 * tree of both the ported route and the pre-port page it replaces and prints a
 * unified diff of tag names, class names, bounding boxes, typography, colour
 * and opacity, which tells you *what* differs and where.
 *
 * The ported app renders inside React's `#root` and wraps each example in an
 * `<Example>` container, so extra wrapper elements are expected. Compare the
 * shape of the tree and the geometry of the leaves rather than the nesting
 * depth.
 *
 * Usage:
 *   node scripts/domparity.mjs                     Dump every known route
 *   node scripts/domparity.mjs ui details_info      Dump specific routes
 *   npm run domparity -- logo                       Same
 *
 * Options (environment variables):
 *   PARITY_REV      Revision holding the pre-port pages (default 5d780b9)
 *   PARITY_SETTLE   Milliseconds to wait before dumping (default 6000)
 *   PARITY_OUT      Directory for the dumps (default /tmp/domparity)
 *
 * Requires `playwright-core` and a local Chromium:
 *   npm install --no-save playwright-core
 */

import fs from 'node:fs';
import path from 'node:path';

import { EXECUTABLE, WORKTREE, build, ensureReference, launch, listRoutes, openPage, serve } from './harness.mjs';

const SETTLE = Number(process.env.PARITY_SETTLE || 6000);
const OUT = process.env.PARITY_OUT || '/tmp/domparity';
const DIST = '/tmp/domparity-dist';
const REFERENCE_PORT = 8098;
const CURRENT_PORT = 4198;

/**
 * Serialises the rendered tree of the current document.
 *
 * This runs inside the page, not in Node, so `document` and `getComputedStyle`
 * are the browser globals.
 */
function dumpTree() {
    const lines = [];

    const walk = (element, depth) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const className = typeof element.className === 'string' && element.className.trim()
            ? `.${element.className.trim().split(/\s+/).join('.')}`
            : '';
        const isTextLeaf = element.childNodes.length === 1 && element.firstChild.nodeType === 3;

        lines.push([
            `${'  '.repeat(depth)}${element.tagName.toLowerCase()}${className}`,
            `rect=${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`,
            `font=${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${style.letterSpacing}|${style.lineHeight}`,
            `color=${style.color}|${style.backgroundColor}`,
            `opacity=${Number(style.opacity).toFixed(2)}`,
            `text=${(isTextLeaf ? element.textContent.trim() : '').slice(0, 40)}`
        ].join(' '));

        for (const child of element.children) {
            walk(child, depth + 1);
        }
    };

    for (const child of document.body.children) {
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') {
            continue;
        }

        walk(child, 0);
    }

    return lines.join('\n');
}

async function dump(browser, url) {
    const page = await openPage(browser);

    await page.goto(url, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(SETTLE);

    const tree = await page.evaluate(dumpTree).catch(error => `ERROR ${error.message}`);

    await page.close();

    return tree;
}

async function main() {
    if (!EXECUTABLE) {
        console.error('No Chromium executable found.');
        process.exit(1);
    }

    ensureReference();
    build(DIST);

    const referenceServer = await serve(WORKTREE, REFERENCE_PORT);
    const currentServer = await serve(DIST, CURRENT_PORT);

    const routes = process.argv.slice(2).length ? process.argv.slice(2) : listRoutes();

    fs.mkdirSync(OUT, { recursive: true });

    const browser = await launch();

    for (const route of routes) {
        const name = route.replace(/\//g, '_');

        const reference = await dump(browser, `http://127.0.0.1:${REFERENCE_PORT}/examples/${route}.html`);
        const current = await dump(browser, `http://127.0.0.1:${CURRENT_PORT}/examples/${route}`);

        fs.writeFileSync(path.join(OUT, `${name}-reference.txt`), `${reference}\n`);
        fs.writeFileSync(path.join(OUT, `${name}-current.txt`), `${current}\n`);

        console.log(`${route}: ${reference.split('\n').length} reference nodes, ${current.split('\n').length} current nodes`);
        console.log(`  diff ${path.join(OUT, `${name}-reference.txt`)} ${path.join(OUT, `${name}-current.txt`)}`);
    }

    await browser.close();

    referenceServer.close();
    currentServer.close();
}

main();
