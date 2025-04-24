const DEFAULT_MEETING_ID = '818 7279 2687';
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const data = JSON.parse(fs.readFileSync('data/card_data.json', 'utf8'));
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
    const imageFullPath = 'file://' + path.resolve(__dirname, `../docs/images/${item.id}.png`);

    const date = getDateFromEpisode(item.episode || 'EP14');
    const meetingTime = getDateFromEpisode(item.episode, 'meeting');
    const meetingId = item.meeting_id || DEFAULT_MEETING_ID;

    const html = template
      .replace('{{title}}', item.title)
      .replace('{{quote}}', item.quote)
      .replace('{{detail}}', item.detail)
      .replace('{{episode}}', item.episode)
      .replace('{{date}}', date)
      .replace('{{meetingTime}}', meetingTime)
      .replace('{{imagePath}}', imageFullPath)
      .replace('{{meetingId}}', meetingId);

    const tempPath = `temp-${item.id}.html`;
    fs.writeFileSync(tempPath, html, 'utf8');

    const page = await browser.newPage();
    await page.goto(`file://${path.resolve(tempPath)}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card');

    await page.setViewport({
      width: 840,
      height: 1200,
      deviceScaleFactor: 2.5,
    });

    const card = await page.$('.card');
    const screenshotPath = path.resolve(__dirname, '../docs/generated/cards', `${item.episode}${item.id}.png`);
    await card.screenshot({ path: screenshotPath });  // 立即截图

    await page.close();
    fs.unlinkSync(tempPath);
  }

  await Promise.all(screenshotTasks);
  await browser.close();

  generateDisplayIndexHtml();
})();

function getDateFromEpisode(episodeStr, format = 'full') {
  const baseDate = new Date(Date.UTC(2025, 3, 12));
  const epNum = parseInt(episodeStr.replace('EP', ''), 10);
  const weeksSince13 = epNum - 13;

  const contentDate = new Date(baseDate.getTime() + weeksSince13 * 7 * 24 * 60 * 60 * 1000);
  const meetingDate = new Date(contentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const getDateParts = (d) => ({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });

  if (format === 'meeting') {
    const { month, day } = getDateParts(meetingDate);
    return `${month}月${day}日早8:00`;
  } else {
    const { year, month, day } = getDateParts(contentDate);
    return `${year}年${month}月${day}日`;
  }
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
}

function generateDisplayIndexHtml() {
  const docsDir = path.resolve(__dirname, '../docs');
  const docsGeneratedCardsDir = path.resolve(__dirname, '../docs/generated/cards');

  ensureDirSync(docsDir);
  ensureDirSync(docsGeneratedCardsDir);

  const images = fs.readdirSync(docsGeneratedCardsDir);
  const imgTags = images.map(file => `<img src="generated/cards/${file}" width="300" style="margin:10px;">`).join('\n');
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>启发星球金句卡片展示</title>
    </head>
    <body style="font-family: sans-serif; padding: 20px;">
      <h1>启发星球金句卡片</h1>
      <div style="display: flex; flex-wrap: wrap;">${imgTags}</div>
    </body>
    </html>`;

  fs.writeFileSync(path.join(docsDir, 'index.html'), html, 'utf8');
}
