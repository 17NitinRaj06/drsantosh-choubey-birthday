const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  const img = page.locator('img[alt="Santosh Choubey"]');
  await img.waitFor({ state: "visible" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshots/hero-fix-check.png", fullPage: false });
  console.log("Screenshot saved");
  await browser.close();
})();
