import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const msgs = [];
p.on('console', m => { const t = m.text(); if (/key|Warning|Each child|error/i.test(t)) msgs.push(t.slice(0,250)); });
p.on('pageerror', e => msgs.push('PAGEERROR: ' + e.message.slice(0,250)));
await p.goto('http://127.0.0.1:5199/examples/three/3d_lights', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(6000);
const dump = async tag => {
  const r = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.panel .panel-item')];
    return items.map(i => (i.textContent||'').trim().slice(0,28)).join(' | ');
  });
  console.log(tag, '->', r);
};
await dump('before');
await p.click('.header-info').catch(e=>console.log('click fail', e.message));
await p.waitForTimeout(2000);
await dump('opened');
// cycle the light list (ListSelect) if present
const sel = await p.$('.panel .list .select, .panel .list-select, .panel .list .container');
if (sel) { await sel.click(); await p.waitForTimeout(1500); await dump('after list click'); }
console.log('MSGS:', msgs.join('\n'));
await b.close();
