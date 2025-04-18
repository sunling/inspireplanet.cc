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

  for (const item of data) {
    const imageFullPath = 'file://' + path.resolve(__dirname, `images/${item.id}.png`);

    const date = getDateFromEpisode(item.episode || 'EP14');        // 例：2025年4月19日
    const meetingTime = getDateFromEpisode(item.episode, 'meeting'); // 例：4月19日早8:00
    const meetingId = item.meeting_id || DEFAULT_MEETING_ID;
    // 替换模板变量
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
      width: 840, // 原始宽度 * 2
      height: 1200, // 适配你的卡片高度，可动态算也行
      deviceScaleFactor: 2.5, // 2倍高清
    });

    // 只截图卡片区域，避免白边
    const card = await page.$('.card');
    await card.screenshot({ path: `screenshots/${item.id}.png` });

    await page.close();
    fs.unlinkSync(tempPath);
  }

  await browser.close();
})();

function getDateFromEpisode(episodeStr, format = 'full') {
  const baseDate = new Date(Date.UTC(2025, 3, 12)); // 2025-04-12 是 EP13（UTC 时间）
  const epNum = parseInt(episodeStr.replace('EP', ''), 10);
  const weeksSince13 = epNum - 13;

  const contentDate = new Date(baseDate.getTime() + weeksSince13 * 7 * 24 * 60 * 60 * 1000);
  const meetingDate = new Date(contentDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 下一周

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


