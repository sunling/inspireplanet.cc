const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { fetchWeeklyAirtableData } = require('./utils');

// const targetEpisode = process.argv[2]; // 取第三个参数，例如 "EP15"

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
  const data = await fetchWeeklyAirtableData();
  const template = fs.readFileSync('templates/card-weekly.html', 'utf8');

  // let executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  // if (!fs.existsSync(executablePath)) {
  //   throw new Error('Chrome not found at expected path. Please edit generate.js to set correct path.');
  // }
  // const browser = await puppeteer.launch({
  //   executablePath,
  //   headless: true,
  //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
  // });

  const browser = await puppeteer.launch({
    headless: 'new', // 使用 Puppeteer 内置的 Chromium
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const screenshotTasks = [];
  const episodes = new Set();

  for (const item of data) {
    // 先确保和创建截图要保存的目录
    const screenshotsDir = path.resolve(__dirname, `../docs/generated/weekly-cards/2025/${item.Episode}`);
    ensureDirSync(screenshotsDir);

    // 如果已经生成过，就不生成了
    const outputPath = path.resolve(__dirname, `${screenshotsDir}/${item.Name}.png`);
    if (fs.existsSync(outputPath)) {
      console.log(`✅ 跳过已生成记录：${item.id}`);
      continue;
    }
    
    const date = getDateFromEpisode(item.Episode || 'EP14');
    const meetingTime = getDateFromEpisode(item.Episode, 'meeting');
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
      .replace('{{title}}', item.Title || '')
      .replace('{{quote}}', item.Quote || '')
      .replace('{{selectedFont}}', "'PingFang SC'") //  固定字体先
      .replace('{{background}}', themes[randomKey].background || '#ffffff')
      .replaceAll('{{color}}', themes[randomKey].color || '#333')
      .replace('{{quoteBg}}', themes[randomKey].quoteBg || '#f0f0f0')
      .replace('{{quoteColor}}', themes[randomKey].quoteColor || '#000')
      .replace('{{finalImage}}', imageFullPath)
      .replace('{{detail}}', item.Detail || '')
      .replace('{{episode}}', item.Episode)
      .replace('{{date}}', date)
      .replace('{{meetingTime}}', meetingTime);

    const tempPath = `temp-${item.Name}.html`;
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
    const screenshotPath = path.resolve(__dirname, screenshotsDir, `${item.Name}.png`);
    fs.mkdirSync(screenshotsDir, { recursive: true });
    await card.screenshot({ path: screenshotPath });

    await page.close();
    fs.unlinkSync(tempPath);
    episodes.add(item.Episode);
  }
  await Promise.all(screenshotTasks);
  await browser.close();

  // 图片生成好之后，生成展示页面，每一集是一个页面
  for (const ep of episodes) {
    generateIndexHtmlForEpisode(ep);
    updateWeeklyIndexHtml(ep);
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

function generateIndexHtmlForEpisode(episodeStr) {
  const generatedCardsDir = path.resolve(__dirname, `../docs/generated/weekly-cards/2025/${episodeStr}`);

  ensureDirSync(generatedCardsDir);

  const images = fs.readdirSync(generatedCardsDir).filter(file => file.endsWith("png"));
  const imgTags = images.map(file => `<img src="${file}" style="margin:10px;">`).join('\n\t\t');
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>启发星球金句卡片展示-EP13</title>
      <style>
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          padding: 40px;
          background: #f9f9f9;
        }

        .gallery img {
          width: 100%;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease;
        }

        .gallery img:hover {
          transform: scale(1.02);
        }
      </style>
    </head>
      <body style="font-family: sans-serif; padding: 20px;">
        <div class="gallery">
          ${imgTags}
      </body>
    </html>`;
  fs.writeFileSync(path.join(generatedCardsDir, `index.html`), html, 'utf8');
}

function updateWeeklyIndexHtml(ep) {
  const indexHtmlPath = path.resolve(__dirname, '../docs/generated/weekly-cards/index.html');

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const marker = '<!-- auto:ep-links -->';
  const markerIndex = indexHtml.indexOf(marker);

  if (markerIndex === -1) {
    return;
  }

  // 生成 HTML 列表项
  const epLinksHtml = `<li><a href="./2025/${ep}/">${ep}</a></li>`;

  // 插入更新内容
  const before = indexHtml.slice(0, markerIndex);
  const after = indexHtml.slice(markerIndex + marker.length);
  const newHtml = `${before}${epLinksHtml}\n\t\t<!-- auto:ep-links -->${after}`;

  fs.writeFileSync(indexHtmlPath, newHtml, 'utf-8');
}
