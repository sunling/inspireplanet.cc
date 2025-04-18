const DEFAULT_MEETING_ID = '818 7279 2687';
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
  const template = fs.readFileSync('./template.html', 'utf8');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const screenshotTasks = [];

  for (const item of data) {
    const imageFullPath = 'file://' + path.resolve(__dirname, `docs/images/${item.id}.png`);

    const date = getDateFromEpisode(item.episode || 'EP14');
    const meetingTime = getDateFromEpisode(item.episode, 'meeting');
    const meetingId = item.meeting_id || DEFAULT_MEETING_ID;

    const html = template
      .replaceAll('{{title}}', item.title)
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
    const screenshotPath = `screenshots/${item.episode}${item.id}.png`;
    await card.screenshot({ path: screenshotPath });  // 立即截图

    await page.close();     // ✅ 然后再关闭页面
    fs.unlinkSync(tempPath); // ✅ 然后再删 html
  }

  await Promise.all(screenshotTasks);
  await browser.close();

  copyScreenshotsToDocsAndGenerateHTML();
  generateImagesJson();
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

function copyScreenshotsToDocsAndGenerateHTML() {
  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  const docsDir = path.resolve(__dirname, 'docs');
  const docsGeneratedCardsDir = path.resolve(__dirname, 'docs/generated_cards');

  ensureDirSync(docsDir);
  ensureDirSync(docsGeneratedCardsDir);

  const images = fs.readdirSync(screenshotsDir).filter(file => file.endsWith('.png') && !file.startsWith('demo'));
  const imgTags = images.map(file => `<img src="generated_cards/${file}" width="300" style="margin:10px;">`).join('\n');

  for (const img of images) {
    const src = path.join(screenshotsDir, img);
    const dest = path.join(docsGeneratedCardsDir, img);

    const srcStat = fs.statSync(src);
    let shouldCopy = false;

    if (!fs.existsSync(dest)) {
      shouldCopy = true;
    } else {
      try {
        const destStat = fs.statSync(dest);
        shouldCopy = !destStat.isFile() || srcStat.mtimeMs > destStat.mtimeMs;
      } catch (e) {
        shouldCopy = true;
      }
    }

    if (shouldCopy) {
      fs.copyFileSync(src, dest);
      console.log(`✅ copied/updated: ${img}`);
    } else {
      console.log(`⏭  skipped (up to date): ${img}`);
    }
  }

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

function generateImagesJson() {
  const imagesDir = path.resolve(__dirname, 'docs/images');
  const docsDir = path.resolve(__dirname, 'docs');
  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

  const outputPath = path.join(docsDir, 'images.json');
  fs.writeFileSync(outputPath, JSON.stringify(files, null, 2), 'utf8');
}