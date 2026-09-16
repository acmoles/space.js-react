import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:4173/examples/mars';
const out = process.argv[3] || '/tmp/mars.png';
const settle = Number(process.argv[4] || 20000);

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

const failed = [];
page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '')));
page.on('response', r => { if (r.status() >= 400) failed.push('HTTP ' + r.status() + ' ' + r.url()); });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(settle);

const info = await page.evaluate(() => {
  const q = s => document.querySelector(s);
  const txt = el => el ? el.innerText.trim().replace(/\s+/g,' ').slice(0,120) : null;
  return {
    hasUI: !!q('.ui'),
    header: txt(q('.header')),
    footer: txt(q('.footer')),
    hasDetailsButton: !!q('.ui-details-button'),
    preloader: txt(q('[class*="preloader" i]')) ,
    progressText: txt(q('[class*="Number" i], [class*="progress" i]')),
    bodyText: document.body.innerText.replace(/\s+/g,' ').slice(0, 200)
  };
});

console.log('DOM INFO:', JSON.stringify(info, null, 2));
console.log('FAILED REQUESTS:', failed.length ? '\n  ' + failed.join('\n  ') : 'none');
console.log('PAGE ERRORS:', errors.length ? errors.join('\n') : 'none');

await page.screenshot({ path: out });
await browser.close();
