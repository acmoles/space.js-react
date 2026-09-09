import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('console', m => console.log('CONSOLE:', m.text()));
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5199/examples/panel', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

const dump = async tag => {
  const r = await p.evaluate(() => {
    const root = document.querySelectorAll('.panel')[0];
    const tog = root.querySelector('.toggle');
    const sli = root.querySelector('.slider');
    const g = el => { const x = el.querySelector(':scope > .group'); return x ? getComputedStyle(x).display : 'NO-GROUP'; };
    return {
      toggleCircleOpacity: getComputedStyle(tog.querySelector('.circle')).opacity,
      toggleGroup: g(tog),
      sliderNum: sli.querySelector('.number').textContent,
      sliderGroup: g(sli),
      sliderLine: getComputedStyle(sli.querySelector(':scope > .container > .line')).transform
    };
  });
  console.log(tag, JSON.stringify(r));
};

await dump('initial   ');
// click toggle on
await p.click('.panel .toggle .container');
await p.waitForTimeout(600);
await dump('toggle ON ');
// drag slider to the right
const box = await p.locator('.panel .slider .container').first().boundingBox();
await p.mouse.move(box.x + 5, box.y + box.height / 2);
await p.mouse.down();
await p.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 10 });
await p.mouse.up();
await p.waitForTimeout(600);
await dump('slider drag');
// click Reset link
await p.click('.panel .panel-link');
await p.waitForTimeout(800);
await dump('after reset');
await b.close();
