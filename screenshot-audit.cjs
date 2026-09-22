const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = 'F:/projects/santosh-choubey-birthday-site/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    { name: 'desktop-1920', w: 1920, h: 1080 },
    { name: 'desktop-1440', w: 1440, h: 900 },
    { name: 'tablet-768', w: 768, h: 1024 },
    { name: 'mobile-390', w: 390, h: 844 },
  ];

  for (const s of sizes) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2500);
    // skip intro if present
    const skip = await page.$('button[aria-label="Skip intro animation"]');
    if (skip) await skip.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `cover-${s.name}.png`), fullPage: false });
    console.log(`cover-${s.name}.png`);
    await page.close();
  }

  // Full page at 1440
  const fp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fp.goto('http://localhost:3456/', { waitUntil: 'networkidle', timeout: 15000 });
  await fp.waitForTimeout(2500);
  const skip2 = await fp.$('button[aria-label="Skip intro animation"]');
  if (skip2) await skip2.click();
  await fp.waitForTimeout(800);
  await fp.screenshot({ path: path.join(OUT, 'full-1440.png'), fullPage: true });
  console.log('full-1440.png');
  await fp.close();

  // /display page
  const dp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await dp.goto('http://localhost:3456/display/', { waitUntil: 'networkidle', timeout: 15000 });
  await dp.waitForTimeout(2000);
  await dp.screenshot({ path: path.join(OUT, 'display-1440.png'), fullPage: false });
  console.log('display-1440.png');
  await dp.close();

  await browser.close();
})();
