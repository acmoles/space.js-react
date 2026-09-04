const { chromium } = require('/home/runner/work/space.js-react/space.js-react/node_modules/playwright-core/index.js');

const PORT = 4721;
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES = [
  '/examples/three/3d_lights',
  '/examples/three/3d_materials',
  '/examples/three/3d_materials_instancing',
  '/examples/three/3d_materials_instancing_modified',
  '/examples/three/3d_materials_spherical_cube',
  '/examples/three/3d_radial_graph',
  '/examples/three/3d_server_status',
  '/examples/three/3d_server_status_thread',
];

const IGNORE = [/fonts\.googleapis/,/cyberspace\.app/,/space\.js\.org/,/ERR_/,/net::/,/favicon/,/WebSocket/,/ws:/];

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']
  });

  let allClean = true;
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => {
      const msg = e.message;
      if (!IGNORE.some(r => r.test(msg))) errors.push('PAGE: ' + msg + '\n     stack: ' + (e.stack||'').split('\n').slice(1,4).join('\n     '));
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!IGNORE.some(r => r.test(text))) errors.push('CON: ' + text);
      }
    });
    await page.goto(BASE + route);
    await page.waitForTimeout(4000);
    await page.close();
    if (errors.length) {
      allClean = false;
      console.log(`FAIL ${route}:`);
      errors.forEach(e => console.log('  ' + e));
    } else {
      console.log(`OK   ${route}`);
    }
  }

  await browser.close();
  process.exit(allClean ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
