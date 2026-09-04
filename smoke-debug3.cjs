const { chromium } = require('/home/runner/work/space.js-react/space.js-react/node_modules/playwright-core/index.js');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']
  });

  const page = await browser.newPage();
  // Show all console errors with detail
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CON ERROR:', msg.text());
      try {
        const args = msg.args();
        if (args.length > 0) console.log('  args0:', args[0]);
      } catch(e) {}
    }
  });
  page.on('requestfailed', req => {
    console.log('FAILED REQ:', req.url(), req.failure()?.errorText);
  });
  page.on('response', r => {
    if (r.status() >= 400) console.log('HTTP ' + r.status() + ': ' + r.url());
  });
  await page.goto('http://127.0.0.1:4721/examples/three/3d_lights');
  await page.waitForTimeout(3000);
  await page.close();
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
