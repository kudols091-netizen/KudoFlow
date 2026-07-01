const puppeteer = require('puppeteer');
const path = require('path');

async function capture(file, width, height, output) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const url = 'file:///' + path.resolve(__dirname, file).replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: output, clip: { x: 0, y: 0, width, height } });
  await browser.close();
  console.log(`Saved: ${output}`);
}

(async () => {
  await capture('cws_small_tile_440x280.html', 440, 280, 'cws_small_tile_440x280.png');
  await capture('cws_marquee_1400x560.html', 1400, 560, 'cws_marquee_1400x560.png');
  await capture('cws_screenshot_1280x800.html', 1280, 800, 'cws_screenshot_1280x800.png');
})();
