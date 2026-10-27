import type {
  EpisodeSummary,
  WeeklyCard,
} from '../netlify/services/weeklyCards';
import {
  EpisodePublication,
  parseEpisodePublication,
} from './episodePublication';

const SITE_URL = 'https://inspireplanet.cc';
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!
  );

interface PreviewInput {
  year: number;
  episode: number;
  summary: EpisodeSummary | null;
  cards: WeeklyCard[];
  publication?: EpisodePublication | null;
  intro?: string;
  featuredQuoteIndex?: number;
  featuredQuoteIndices?: number[];
}

/** Prefer three distinct speakers, then fill from remaining original quotes. */
export function selectDefaultQuoteIndices(cards: WeeklyCard[]): number[] {
  const selected: number[] = [];
  const speakers = new Set<string>();
  const quotes = new Set<string>();
  const add = (index: number) => {
    const card = cards[index];
    if (
      !card.name.trim() ||
      !card.quote.trim() ||
      quotes.has(card.quote.trim())
    )
      return;
    selected.push(index);
    speakers.add(card.name.trim().toLowerCase());
    quotes.add(card.quote.trim());
  };
  cards.forEach((card, index) => {
    if (selected.length < 3 && !speakers.has(card.name.trim().toLowerCase()))
      add(index);
  });
  cards.forEach((_, index) => {
    if (selected.length < 3 && !selected.includes(index)) add(index);
  });
  return selected;
}

/** Reuse the edited episode questions; never invent questions or generic hooks. */
export function getDefaultNewsletterIntro(
  summary: EpisodeSummary | null,
  publication?: EpisodePublication | null
): string {
  if (publication?.newsletter?.intro?.trim())
    return publication.newsletter.intro;
  const questions = (summary?.topics || [])
    .flatMap((topic) => topic.title.match(/[^。！？!?\n]+[？?]/g) || [])
    .map((question) => question.trim());
  const selected = [...new Set(questions)].slice(0, 2);
  return selected.length ? selected.join('\n') : summary?.overview || '';
}

/** Preview only. Sending must later supply recipient-specific unsubscribe links. */
export function buildEpisodeNewsletterPreview(input: PreviewInput) {
  if (
    !Number.isInteger(input.year) ||
    input.year < 2000 ||
    input.year > 9999 ||
    !Number.isInteger(input.episode) ||
    input.episode < 1
  ) {
    throw new Error('请选择有效的年份和期数');
  }
  const publication = parseEpisodePublication(input.publication) || null;
  const { summary, cards, year, episode } = input;
  const indices =
    input.featuredQuoteIndices ??
    (input.featuredQuoteIndex !== undefined
      ? [input.featuredQuoteIndex]
      : undefined) ??
    publication?.newsletter?.featuredQuoteIndices ??
    (publication?.newsletter?.featuredQuoteIndex !== undefined
      ? [publication.newsletter.featuredQuoteIndex]
      : undefined) ??
    selectDefaultQuoteIndices(cards);
  const selectedCards = indices
    .filter((index) => Number.isInteger(index) && index >= 0)
    .map((index) => cards[index])
    .filter(Boolean);
  const podcast = publication?.podcast;
  const intro = input.intro ?? getDefaultNewsletterIntro(summary, publication);
  const title = summary?.title || `本期分享回顾`;
  const subject = `启发星球 ${year} · EP${episode}｜${title}`;
  const episodeUrl = `${SITE_URL}/episodes/${year}/${episode}`;
  const cardsUrl = `${SITE_URL}/weekly-cards/${episode}?year=${year}`;
  const missing: string[] = [];
  if (!summary?.title || !summary.overview || !summary.topics?.length)
    missing.push('会议总结尚未准备好');
  if (!intro.trim()) missing.push('邮件导语为空');
  if (
    !indices.length ||
    indices.length > 3 ||
    new Set(indices).size !== indices.length ||
    selectedCards.length !== indices.length ||
    new Set(selectedCards.map((card) => card.quote.trim())).size !==
      selectedCards.length ||
    selectedCards.some((card) => !card.quote?.trim() || !card.name?.trim())
  )
    missing.push('请选择 1–3 条有内容和署名的原话');
  if (!podcast) missing.push('尚未补入已发布的小宇宙单集链接');

  const quoteHtml = selectedCards
    .map(
      (card) =>
        `<div style="margin:24px 0;padding:24px;background:#fff5ec;border-left:3px solid #d65b35;border-radius:4px"><p style="margin:0 0 12px;font-size:19px;line-height:1.9;color:#48362c;white-space:pre-line">${escapeHtml(card.quote)}</p><p style="margin:0;font-size:13px;color:#806b60">—— ${escapeHtml(card.name)}</p></div>`
    )
    .join('');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f2ed;color:#352f2b;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fffdf9;border:1px solid #eadfd4;border-radius:12px">
<tr><td style="padding:32px 24px 20px;border-bottom:1px solid #eadfd4"><p style="margin:0 0 12px;font-size:13px;letter-spacing:2px;color:#b44a2d">启发星球 · 每期分享</p><p style="margin:0 0 12px;color:#8c7869;font-size:12px">${year} · EP${episode}${summary?.date ? ` · ${escapeHtml(summary.date)}` : ''}</p><h1 style="margin:0;font-size:25px;line-height:1.6">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:24px"><p style="margin:0 0 24px;line-height:1.9;font-size:16px;white-space:pre-line">${escapeHtml(intro)}</p>
<a href="${episodeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 22px;background:#b44a2d;color:#fff;text-decoration:none;border-radius:6px;font-size:15px">阅读本期总结与回应 ↗</a>
${quoteHtml}
${selectedCards.length ? `<p style="font-size:14px"><a href="${cardsUrl}" target="_blank" rel="noopener noreferrer" style="color:#b44a2d">查看本期全部金句卡片 ↗</a></p>` : ''}
${podcast ? `<div style="margin-top:28px;padding-top:24px;border-top:1px solid #eadfd4"><p style="margin:0 0 10px;font-size:13px;color:#8c7869">也可以听这一期${podcast.durationSeconds ? ` · 约 ${Math.ceil(podcast.durationSeconds / 60)} 分钟` : ''}</p><a href="${escapeHtml(podcast.url)}" target="_blank" rel="noopener noreferrer" style="font-size:16px;line-height:1.8;color:#b44a2d">${escapeHtml(podcast.title)} · 小宇宙收听 ↗</a></div>` : ''}
</td></tr><tr><td style="padding:22px 24px;border-top:1px solid #eadfd4;font-size:12px;color:#8c7869;line-height:1.9"><p style="margin:0 0 8px">更多文章，欢迎关注微信公众号「启发星球笔记」。</p><p style="margin:0">邮件预览 · 正式邮件将包含退订入口</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    subject,
    intro,
    `阅读本期总结与回应：${episodeUrl}`,
    ...selectedCards.flatMap((card) => [card.quote, `—— ${card.name}`]),
    ...(selectedCards.length ? [`本期金句卡片：${cardsUrl}`] : []),
    ...(podcast ? [`小宇宙：${podcast.title}`, podcast.url] : []),
    '更多文章，欢迎关注微信公众号「启发星球笔记」。',
    '邮件预览 · 正式邮件将包含退订入口',
  ].join('\n\n');
  return { subject, html, text, missing, episodeUrl };
}
