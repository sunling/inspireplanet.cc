
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { fetchAirtableData } = require('./utils');

(async () => {
  const data = await fetchAirtableData();
  const template = fs.readFileSync('templates/card.html', 'utf8');

  // let executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  //   if (!fs.existsSync(executablePath)) {
  //     throw new Error('Chrome not found at expected path. Please edit generate.js to set correct path.');
  //   }
  //   const browser = await puppeteer.launch({
  //     executablePath,
  //     headless: true,
  //     args: ['--no-sandbox', '--disable-setuid-sandbox'],
  //   });

  const browser = await puppeteer.launch({
    headless: 'new', // 使用 Puppeteer 内置的 Chromium
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const screenshotTasks = [];

  for (const item of data) {
    // 如果已经生成过，就不生成了
    const outputPath = path.resolve(__dirname, `../docs/generated/inspiration-cards/${item.id}.png`);
    if (fs.existsSync(outputPath)) {
      console.log(`✅ 跳过已生成记录：${item.id}`);
      continue;
    }

    // 如果用户没有选择内置图或者自定义，随机选择一张插图
    let imagePath = item.ImagePath;
    if (item.Upload !== 'No file chosen') {
      const imagesDir = path.resolve(__dirname, '../docs/images');
      const imageFiles = fs.readdirSync(imagesDir);
      const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
      imagePath = `images/${randomFile}`;
    }
    const imageFullPath = path.resolve(__dirname, `../docs/${imagePath}`);
    const style = JSON.parse(item.Theme || '{}');
    const pt = new Date(item.Created);
    // 转换成北京时间
    const bjTime = new Date(pt.getTime() + 15 * 60 * 60 * 1000);
    const formatted = `${bjTime.getFullYear()}年${bjTime.getMonth() + 1}月${bjTime.getDate()}日 ${bjTime.getHours()}:${String(bjTime.getMinutes()).padStart(2, '0')}`;

    const html = template
      .replace('{{title}}', item.Title || '这一刻，我想说')
      .replace('{{quote}}', item.Quote || '')
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
    const dimensions = await page.evaluate(() => {
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      };
    });
    await page.setViewport({
      scale: 3, // 高清导出
      logging: true,
      useCORS: true,
      backgroundColor: null,
      width: dimensions.width,
      height: dimensions.height,
    });

    const card = await page.$('.card');
    const screenshotPath = path.resolve(__dirname, '../docs/generated/inspiration-cards', `${item.id}.png`);
    await card.screenshot({ path: screenshotPath, omitBackground: true });

    await page.close();
    fs.unlinkSync(tempPath);

    updateIndexHtml(`${item.id}.png`);
  }

  await Promise.all(screenshotTasks);
  await browser.close();
})();


function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
}

function updateIndexHtml(imagePath) {
  const indexHtmlPath = path.resolve(__dirname, '../docs/generated/inspiration-cards/index.html');

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const marker = '<!-- auto:ep-links -->';
  const markerIndex = indexHtml.indexOf(marker);

  if (markerIndex === -1) {
    return;
  }

  // 生成 HTML 列表项
  const newImgTag = `<img src="${imagePath}" style="margin:10px;">`;

  // 插入更新内容
  const before = indexHtml.slice(0, markerIndex);
  const after = indexHtml.slice(markerIndex + marker.length);
  const newHtml = `${before}\t\t${newImgTag}\n<!-- auto:ep-links -->${after}`;

  fs.writeFileSync(indexHtmlPath, newHtml, 'utf-8');
}

