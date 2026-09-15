import { chromium } from 'playwright-core';
import { serve, EXECUTABLE } from './scripts/harness.mjs';
serve('./dist', 4321);
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:4321/examples/about', { waitUntil: 'load' });
await page.waitForTimeout(7000);
console.log(JSON.stringify(await page.evaluate(() => {
  const c = document.querySelector('canvas:not(.preloader canvas)');
  const keys = Object.keys(c).concat(Object.getOwnPropertyNames(c)).filter(k => k.includes('r3f') || k.startsWith('__'));
  const r3f = c.__r3f;
  let scene = null;
  try { scene = r3f?.root?.getState?.().scene; } catch (e) { /* */ }
  if (!scene) return { keys, r3f: r3f && Object.keys(r3f) };
  const out = [];
  scene.traverse(o => { if (o.isMesh && o.material && o.material.name) out.push({ name: o.material.name, map: o.material.map ? (o.material.map.source?.data?.src || 'texture') : null, pos: o.getWorldPosition(new (o.position.constructor)()).toArray().map(n => +n.toFixed(2)) }); });
  return out;
}), null, 1));
await browser.close();
process.exit(0);
