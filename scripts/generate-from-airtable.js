
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { fetchAirtableData } = require('./utils');

(async () => {
  const data = await fetchAirtableData();
  const template = fs.readFileSync('templates/card.html', 'utf8');

  let executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(executablePath)) {
    throw new Error('Chrome not found at expected path. Please edit generate.js to set correct path.');
  }
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const screenshotTasks = [];

  for (const item of data) {
    // 如果已经生成过，就不生成了
    const outputPath = path.resolve(__dirname, `../docs/generated/inspiration-cards/${item.id}.png`);
    if (fs.existsSync(outputPath)) {
      console.log(`✅ 跳过已生成记录：${item.id}`);
      continue; // 👈 直接跳过
    }

    // 如果用户没有选择内置图或者自定义，随机选择一张插图
    let imagePath = item.ImagePath;
    if (item.Upload !== 'No file chosen') {
      const imagesDir = path.resolve(__dirname, '../docs/images');
      const imageFiles = fs.readdirSync(imagesDir);
      const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)]; // 随机选择
      imagePath = `images/${randomFile}`;
    }
    const imageFullPath = path.resolve(__dirname, `../docs/${imagePath}`);
    const style = JSON.parse(item.Theme || '{}');
    const dateObj = new Date(item.Created);
    const formatted = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    const html = template
      .replace('{{title}}', item.Title || '')
      .replace('{{quote}}', item.Quote || '')
      .replace('{{selectedFont}}', item.Font || '')
      .replace('{{selectedFont}}', item.font || "'PingFang SC'")
      .replace('{{background}}', style.background || '#ffffff')
      .replaceAll('{{color}}', style.color || '#333')
      .replace('{{quoteBg}}', style.quoteBg || '#f0f0f0')
      .replace('{{quoteColor}}', style.quoteColor || '#000')
      .replace('{{finalImage}}', imageFullPath)
      .replace('{{creator}}', item.Creator)
      .replace('{{created}}', formatted)
      .replace('{{detail}}', item.Detail || '')

    const tempPath = `temp-${item.id}.html`;
    fs.writeFileSync(tempPath, html, 'utf8');

    const page = await browser.newPage();
    await page.goto(`file://${path.resolve(tempPath)}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card');

    await page.setViewport({
      width: 840,
      height: 1200,
      deviceScaleFactor: 3,
      backgroundColor: null,
    });

    const card = await page.$('.card');
    const screenshotPath = path.resolve(__dirname, '../docs/generated/inspiration-cards', `${item.id}.png`);
    await card.screenshot({ path: screenshotPath, omitBackground: true });

    await page.close();
    fs.unlinkSync(tempPath);
  }

  await Promise.all(screenshotTasks);
  await browser.close();

  generateDisplayIndexHtml();
})();


function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
}

function generateDisplayIndexHtml() {
  const generatedCardsDir = path.resolve(__dirname, `../docs/generated/inspiration-cards`);

  ensureDirSync(generatedCardsDir);

  const images = fs.readdirSync(generatedCardsDir);
  const imgTags = images.map(file => `<img src="${file}" width="300" style="margin:10px;">`).join('\n');
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>启发时刻卡片展示</title>
    </head>
    <body style="font-family: sans-serif; padding: 20px;">
      <div style="display: flex; flex-wrap: wrap;">${imgTags}</div>
    </body>
    </html>`;

  fs.writeFileSync(path.join(generatedCardsDir, `inspirations.html`), html, 'utf8');
}
