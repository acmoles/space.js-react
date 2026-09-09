import { chromium } from 'playwright-core';
const routes = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
for (const r of routes) {
  const p = await b.newPage();
  const msgs = new Set();
  p.on('console', m => { const t = m.text(); if (/key|Warning|Each child/i.test(t)) msgs.add(t.slice(0,300)); });
  p.on('pageerror', e => msgs.add('PAGEERROR: ' + e.message.slice(0,300)));
  try {
    await p.goto('http://127.0.0.1:5199' + r, { waitUntil: 'load', timeout: 30000 });
    await p.waitForTimeout(5000);
    // open the fps panel if present
    const info = await p.$('.header-info');
    if (info) { await info.click().catch(()=>{}); await p.waitForTimeout(1500); }
    await p.waitForTimeout(2000);
  } catch (e) { msgs.add('NAV: ' + e.message.slice(0,150)); }
  console.log('==', r, '==');
  console.log([...msgs].join('\n') || '(clean)');
  await p.close();
}
await b.close();
