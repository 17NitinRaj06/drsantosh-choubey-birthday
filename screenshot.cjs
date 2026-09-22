const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const screenshots = [
    { name: 'cover-1440', width: 1440, height: 900, url: 'http://localhost:3456/' },
    { name: 'cover-390', width: 390, height: 844, url: 'http://localhost:3456/' },
    { name: 'cover-1920', width: 1920, height: 1080, url: 'http://localhost:3456/' },
    { name: 'cover-768', width: 768, height: 1024, url: 'http://localhost:3456/' },
  ];

  for (const s of screenshots) {
    const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
    await page.goto(s.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `F:/projects/santosh-choubey-birthday-site/screenshots/${s.name}.png`, fullPage: false });
    console.log(`Captured ${s.name}`);
    await page.close();
  }

  // Full page screenshot at 1440
  const fullPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fullPage.goto('http://localhost:3456/', { waitUntil: 'networkidle' });
  await fullPage.waitForTimeout(2000);
  await fullPage.screenshot({ path: 'F:/projects/santosh-choubey-birthday-site/screenshots/full-page-1440.png', fullPage: true });
  console.log('Captured full page');

  await browser.close();
})();
