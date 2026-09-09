import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.addInitScript(() => {
  const orig = console.log.bind(console);
  console.log = (...a) => {
    if (typeof a[0] === 'string' && a[0].includes('callback')) {
      orig('TRACE>>', a[0], a[1], '\n' + new Error().stack.split('\n').slice(1,9).join('\n'));
      return;
    }
    orig(...a);
  };
});
p.on('console', m => console.log(m.text()));
await p.goto('http://127.0.0.1:5199/examples/panel', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
console.log('=========== CLICK RESET ===========');
await p.click('.panel .panel-link');
await p.waitForTimeout(800);
await b.close();
