const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('https://www.quantumcomputers.guru/', { waitUntil: 'networkidle2' });

  const logoData = await page.evaluate(() => {
    const logoImg = document.querySelector('header img.aux-attachment') || document.querySelector('.aux-widget-logo img');
    if (!logoImg) return null;
    const rect = logoImg.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(logoImg);

    const container = logoImg.closest('.elementor-container') || logoImg.closest('header') || document.body;
    const containerRect = container.getBoundingClientRect();

    return {
      imgWidth: rect.width,
      imgHeight: rect.height,
      imgTop: rect.top,
      imgLeft: rect.left,
      containerTop: containerRect.top,
      containerLeft: containerRect.left,
      containerWidth: containerRect.width,
      headerStyle: {
        padding: computedStyle.padding,
        margin: computedStyle.margin,
        maxHeight: computedStyle.maxHeight
      }
    };
  });

  console.log(JSON.stringify(logoData, null, 2));
  await browser.close();
})();
