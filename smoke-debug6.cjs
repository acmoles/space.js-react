const { chromium } = require('/home/runner/work/space.js-react/space.js-react/node_modules/playwright-core/index.js');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      const loc = msg.location();
      console.log('CON ERROR:', text, '| url:', loc?.url, 'line:', loc?.lineNumber);
    }
  });
  await page.goto('http://127.0.0.1:4721/examples/three/3d_lights');
  await page.waitForTimeout(3000);
  await page.close();
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
