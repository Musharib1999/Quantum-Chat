const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[CONSOLE ERROR]', msg.text());
    }
  });

  try {
    const res = await page.goto('http://localhost:3000/industry', { waitUntil: 'networkidle0' });
    console.log("Status Code:", res.status());
  } catch (e) {
    console.error("Navigation failed:", e);
  }

  await browser.close();
})();
