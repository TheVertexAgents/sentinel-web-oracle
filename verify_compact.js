const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3008');
    await page.waitForTimeout(1000);

    // Toggle Demo Mode
    await page.click('#demoToggle');
    await page.waitForTimeout(500);

    // Start scan
    await page.fill('#assetInput', 'BTC');
    await page.click('#analyzeBtn');

    // Wait for significant progress
    await page.waitForTimeout(4000);

    // Take screenshot of the compact layout
    await page.screenshot({ path: '/home/jules/verification/screenshots/compact_layout_active.png' });

    // Wait for verdict
    await page.waitForSelector('#verdictCard:not(.hidden)', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/home/jules/verification/screenshots/compact_layout_final.png' });

    // Check for scrollbars
    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight ||
             document.body.scrollHeight > document.body.clientHeight;
    });
    console.log('Has vertical scrollbar:', hasScrollbar);

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
