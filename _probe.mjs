import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4173/examples/mars?debug', { waitUntil:'load', timeout:60000 });
await page.waitForFunction(()=>document.body.innerText.includes('CLICK TO VISIT TARGET'),null,{timeout:40000});
await page.waitForTimeout(400);
await page.click('.mars-preloader-bg').catch(()=>{});
await page.waitForTimeout(6000); // let preloader fully animate out/unmount
const probe = await page.evaluate(() => {
  const out = {};
  out.numCanvases = document.querySelectorAll('canvas').length;
  out.preloaderPresent = !!document.querySelector('.mars-preloader');
  const three = document.querySelector('canvas[data-engine]');
  out.threeCanvas = three ? { pos:getComputedStyle(three).position, z:getComputedStyle(three).zIndex, parentClass: three.parentElement.className, parentStyle: three.parentElement.getAttribute('style')||'' } : null;
  const ui = document.querySelector('.ui');
  out.ui = { pos:getComputedStyle(ui).position, z:getComputedStyle(ui).zIndex, pe:getComputedStyle(ui).pointerEvents };
  const db = document.querySelector('.ui-details-button');
  const rectDb = db.getBoundingClientRect();
  const elDb = document.elementFromPoint(rectDb.x+rectDb.width/2, rectDb.y+rectDb.height/2);
  out.atDetailsButton = elDb.tagName + (elDb.getAttribute('data-engine')?'[three]':'') + '.' + (typeof elDb.className==='string'?elDb.className:'');
  const footerInfo = document.querySelector('.footer .info') || document.querySelector('.footer');
  const rf = footerInfo.getBoundingClientRect();
  const elF = document.elementFromPoint(rf.x+8, rf.y+rf.height/2);
  out.atFooter = elF.tagName + (elF.getAttribute && elF.getAttribute('data-engine')?'[three]':'') + '.' + (typeof elF.className==='string'?elF.className:'');
  // DOM sibling order of .ui vs three canvas wrapper under .example
  const ex = document.querySelector('.example') || ui.parentElement;
  out.exampleChildren = Array.from(ex.children).map(c=>c.tagName+'.'+(typeof c.className==='string'?c.className:''));
  return out;
});
console.log(JSON.stringify(probe,null,2));
await browser.close();
