import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5199/examples/audio_rhythm', { waitUntil: 'load' });
await p.waitForTimeout(4000);
const r = await p.evaluate(() => [...document.querySelectorAll('.slider')].slice(0,6).map(s => ({
  name: s.querySelector('.content')?.textContent,
  num: s.querySelector('.number')?.textContent,
  line: getComputedStyle(s.querySelector(':scope > .container > .line')).transform,
  panel: s.closest('.panel')?.querySelector('.panel-item .content')?.textContent
})));
console.log(JSON.stringify(r, null, 1));
await b.close();
