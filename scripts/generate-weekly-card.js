const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const themes = {
  darkblue: {
    background: "#2f2f46",
    color: "#ffffff",
    quoteBg: "#fef6ec",
    quoteColor: "#ff7f2a",
  },
  green: {
    background: "#2e4a3f",
    color: "#f5f5dc",
    quoteBg: "#edf5ef",
    quoteColor: "#45715a",
  },
  brown: {
    background: "#4b3832",
    color: "#f5f5dc",
    quoteBg: "#f5e9dc",
    quoteColor: "#a0522d",
  },
  purple: {
    background: "#3e2f5b",
    color: "#f8e1f4",
    quoteBg: "#f9e7fd",
    quoteColor: "#9147b6",
  },
  grayblue: {
    background: "#2f3e46",
    color: "#ffffff",
    quoteBg: "#e0e0e0",
    quoteColor: "#1f2937",
  },
  morning: {
    background: "#fefaf3",
    color: "#5e4b2b",
    quoteBg: "#fff2da",
    quoteColor: "#d26a00",
  },
  mistyblue: {
    background: "#eef2f3",
    color: "#3c4a54",
    quoteBg: "#dceaf3",
    quoteColor: "#336699",
  },
  roseclay: {
    background: "#f8e8e0",
    color: "#5f3d42",
    quoteBg: "#ffece7",
    quoteColor: "#c06060",
  },
  creamMatcha: {
    background: "#f3f6ef",
    color: "#4a5a3c",
    quoteBg: "#e8f4df",
    quoteColor: "#5d7b4c",
  },
  lavenderMist: {
    background: "#f4f0f8",
    color: "#5a4c68",
    quoteBg: "#f2e8ff",
    quoteColor: "#9b5fb8",
  },
};

(async () => {
  const data = JSON.parse(fs.readFileSync('data/card_data.json', 'utf8'));
  const template = fs.readFileSync('templates/card-weekly.html', 'utf8');

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
  const episodes = new Set();

  for (const item of data) {
    // 先确保和创建截图要保存的目录
    const screenshotsDir = path.resolve(__dirname, `../docs/generated/weekly-cards/2025/${item.episode}`);
    ensureDirSync(screenshotsDir);

    const date = getDateFromEpisode(item.episode || 'EP14');
    const meetingTime = getDateFromEpisode(item.episode, 'meeting');
    // 随机选取一个themme
    const keys = Object.keys(themes);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    // 随机选取一个插图
    const imagesDir = path.resolve(__dirname, '../docs/images');
    const imageFiles = fs.readdirSync(imagesDir);
    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)]; // 随机选择
    const imagePath = `images/${randomFile}`;
    const imageFullPath = path.resolve(__dirname, `../docs/${imagePath}`);

    const html = template
      .replace('{{title}}', item.title || '')
      .replace('{{quote}}', item.quote || '')
      .replace('{{selectedFont}}', "'PingFang SC'") //  固定字体先
      .replace('{{background}}', themes[randomKey].background || '#ffffff')
      .replaceAll('{{color}}', themes[randomKey].color || '#333')
      .replace('{{quoteBg}}', themes[randomKey].quoteBg || '#f0f0f0')
      .replace('{{quoteColor}}', themes[randomKey].quoteColor || '#000')
      .replace('{{finalImage}}', imageFullPath)
      .replace('{{detail}}', item.detail || '')
      .replace('{{episode}}', item.episode)
      .replace('{{date}}', date)
      .replace('{{meetingTime}}', meetingTime);

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
    const screenshotPath = path.resolve(__dirname, screenshotsDir, `${item.name}.png`);
    fs.mkdirSync(screenshotsDir, { recursive: true });
    await card.screenshot({ path: screenshotPath });  // 立即截图保存到目录

    await page.close();
    fs.unlinkSync(tempPath);
    episodes.add(item.episode);
  }
  await Promise.all(screenshotTasks);
  await browser.close();

  // 图片生成好之后，生成展示页面，每一集是一个页面
  for (const ep of episodes) {
    generateDisplayIndexHtml(ep);
  }
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
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function generateDisplayIndexHtml(episodeStr) {
  const generatedCardsDir = path.resolve(__dirname, `../docs/generated/weekly-cards/2025/${episodeStr}`);

  ensureDirSync(generatedCardsDir);

  const images = fs.readdirSync(generatedCardsDir);
  const imgTags = images.map(file => `<img src="${file}" width="300" style="margin:10px;">`).join('\n');
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>启发星球金句卡片展示-${episodeStr}</title>
    </head>
    <body style="font-family: sans-serif; padding: 20px;">
      <div style="display: flex; flex-wrap: wrap;">${imgTags}</div>
    </body>
    </html>`;
  fs.writeFileSync(path.join(generatedCardsDir, `${episodeStr}.html`), html, 'utf8');
}
