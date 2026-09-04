import { chromium } from 'playwright-core';

const BASE = 'http://127.0.0.1:4701';
const ROUTES = [
    '/examples/radial_graph',
    '/examples/audio_radial_graph',
    '/examples/fps_graph',
    '/examples/graph',
    '/examples/graph_markers',
    '/examples/meter',
    '/examples/test_graph',
    '/examples/test_graph_segments',
    '/examples/test_radial_graph',
    '/examples/test_radial_graph_segments',
    '/examples/fps',
    '/examples/test_fps',
];

const IGNORE = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/, /net::ERR_/, /WebSocket/i];

async function testRoute(page, route) {
    const errors = [];
    const handler = err => {
        const msg = err.message;
        if (!IGNORE.some(r => r.test(msg))) errors.push(msg);
    };
    page.on('pageerror', handler);
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    page.off('pageerror', handler);
    return errors;
}

const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

let totalErrors = 0;
for (const route of ROUTES) {
    const errors = await testRoute(page, route);
    if (errors.length) {
        console.log(`❌ ${route}: ${errors.length} error(s)`);
        errors.slice(0, 3).forEach(e => console.log('   ', e.slice(0, 120)));
        totalErrors += errors.length;
    } else {
        console.log(`✅ ${route}`);
    }
}

console.log(`\nTotal errors: ${totalErrors}`);
await browser.close();
process.exit(totalErrors > 0 ? 1 : 0);
