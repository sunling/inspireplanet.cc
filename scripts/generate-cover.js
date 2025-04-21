const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateCovers() {
  const data = JSON.parse(fs.readFileSync('data/cover-data.json', 'utf8'));
  const templatePath = path.resolve(__dirname, '../templates/cover.html');
  const outputDir = path.resolve(__dirname, '../docs/generated/covers');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const item of data) {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 383, deviceScaleFactor: 2 });
    const absBgPath = path.resolve(__dirname, item.bg);
    const bgUrl = `file://${absBgPath}`;
    const query = new URLSearchParams({
      k1: item.k1,
      k2: item.k2,
      k3: item.k3,
      q: item.question,
      bg: bgUrl,
    });

    const htmlPath = `file://${templatePath}?${query.toString()}`;
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.content');

    const outPath = path.join(outputDir, `${item.id}.png`);
    const card = await page.$('body');
    await card.screenshot({ path: outPath });
    await page.close();

    console.log(`✅ 封面图生成: ${item.id}.png`);
  }

  await browser.close();
  console.log('🎉 所有封面图已完成！');
}

generateCovers();
