const { chromium } = require('/home/runner/work/space.js-react/space.js-react/node_modules/playwright-core/index.js');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']
  });

  const page = await browser.newPage();
  // Intercept all fetch/xhr requests
  await page.route('**/*', async route => {
    const req = route.request();
    try {
      const resp = await route.fetch();
      if (resp.status() >= 400) {
        console.log('HTTP ' + resp.status() + ': ' + req.url());
      }
      await route.fulfill({ response: resp });
    } catch(e) {
      console.log('FAILED: ' + req.url() + ' ' + e.message);
      await route.abort();
    }
  });
  await page.goto('http://127.0.0.1:4721/examples/three/3d_lights');
  await page.waitForTimeout(3000);
  await page.close();
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
