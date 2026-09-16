import { chromium } from 'playwright-core';

const base = 'http://localhost:4173/examples/mars?debug';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type()==='error' && !/net::ERR_|Failed to load resource|gstatic|googleapis/.test(m.text())) errs.push('CONSOLE: '+m.text()); });

const txt = sel => page.evaluate(s => { const el=document.querySelector(s); return el ? el.innerText.replace(/\s+/g,' ').trim() : null; }, sel);

await page.goto(base, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.innerText.includes('CLICK TO VISIT TARGET'), null, { timeout: 40000 });
await page.waitForTimeout(500);

await page.click('.mars-preloader-bg').catch(e => errs.push('click bg failed '+e.message));
await page.waitForTimeout(2500);

console.log('header:', await txt('.header'));
console.log('footer:', await txt('.footer'));
console.log('detailsButton:', await txt('.ui-details-button'));
console.log('detailsInfo:', await txt('[class*="details-info" i]'));

await page.click('.footer .info').catch(async () => { await page.click('.footer').catch(()=>{}); });
await page.waitForTimeout(800);
console.log('header after Next view:', await txt('.header'));

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(800);
console.log('header after ArrowRight:', await txt('.header'));

await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(800);
console.log('header after ArrowLeft:', await txt('.header'));

await page.click('.ui-details-button').catch(e=>errs.push('db click '+e.message));
await page.waitForTimeout(1500);
const det = await page.evaluate(() => { const d=document.querySelector('.details'); return d?{vis:getComputedStyle(d).visibility,op:getComputedStyle(d).opacity,text:d.innerText.replace(/\s+/g,' ').trim().slice(0,240)}:null; });
console.log('details after open:', JSON.stringify(det));

const links = await page.evaluate(() => Array.from(document.querySelectorAll('.details a')).map(a=>({t:a.innerText.trim(),href:a.getAttribute('href')})));
console.log('details links:', JSON.stringify(links));

console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
await browser.close();
