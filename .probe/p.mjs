import { chromium } from 'playwright-core';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0,200)); });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const info = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.panel').forEach((panel, pi) => {
    out.push(`PANEL ${pi} display=${getComputedStyle(panel).display}`);
    panel.querySelectorAll(':scope > .panel-item').forEach((it, i) => {
      const c = it.querySelector(':scope > .container');
      const label = (c?.textContent || '').trim().slice(0, 40);
      out.push(`  item${i} op=${getComputedStyle(it).opacity} tf=${getComputedStyle(it).transform} "${label}"`);
    });
    panel.querySelectorAll('.slider').forEach(s => {
      const line = s.querySelector(':scope > .container > .line');
      const num = s.querySelector('.number');
      const grp = s.querySelector(':scope > .group');
      out.push(`  SLIDER "${s.querySelector('.content')?.textContent}" num=${num?.textContent} lineTf=${line ? getComputedStyle(line).transform : 'n/a'} group=${grp ? getComputedStyle(grp).display : 'none-el'}`);
    });
    panel.querySelectorAll('.toggle').forEach(t => {
      const grp = t.querySelector(':scope > .group');
      out.push(`  TOGGLE "${t.querySelector('.content')?.textContent}" group=${grp ? getComputedStyle(grp).display : 'none-el'}`);
    });
  });
  return out.join('\n');
});
console.log(info);
console.log('--- console ---');
console.log(errs.join('\n'));
await b.close();
