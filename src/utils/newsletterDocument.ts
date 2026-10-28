import type {
  EpisodeSummary,
  WeeklyCard,
} from '../netlify/services/weeklyCards';
import type { EpisodePublication } from './episodePublication';
import {
  getDefaultNewsletterIntro,
  selectDefaultQuoteIndices,
} from './episodeNewsletter';
import { normalizeNewsletterImageUrl } from './newsletterImage';

export interface NewsletterNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: NewsletterNode[];
}
export interface NewsletterDocument extends NewsletterNode {
  type: 'doc';
  content: NewsletterNode[];
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!
  );
const text = (value: string): NewsletterNode => ({ type: 'text', text: value });
const paragraph = (value: string): NewsletterNode => ({
  type: 'paragraph',
  content: value
    .split('\n')
    .flatMap((line, i) => [
      ...(i ? [{ type: 'hardBreak' }] : []),
      ...(line ? [text(line)] : []),
    ]),
});
const link = (label: string, href: string): NewsletterNode => ({
  type: 'paragraph',
  content: [
    { type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] },
  ],
});

export function createDefaultNewsletterDocument(
  year: number,
  episode: number,
  summary: EpisodeSummary | null,
  cards: WeeklyCard[],
  publication: EpisodePublication | null
) {
  const title = summary?.title || `启发星球 EP${episode}`;
  const indices =
    publication?.newsletter?.featuredQuoteIndices ??
    (publication?.newsletter?.featuredQuoteIndex !== undefined
      ? [publication.newsletter.featuredQuoteIndex]
      : selectDefaultQuoteIndices(cards));
  const doc: NewsletterDocument = {
    type: 'doc',
    content: [
      paragraph('启发星球 · 每期分享'),
      { type: 'heading', attrs: { level: 1 }, content: [text(title)] },
      paragraph(
        `${year} · EP${episode}${summary?.date ? ` · ${summary.date}` : ''}`
      ),
      ...getDefaultNewsletterIntro(summary, publication)
        .split(/\n{2,}/)
        .filter(Boolean)
        .map(paragraph),
      link(
        '阅读本期总结与回应 ↗',
        `https://inspireplanet.cc/episodes/${year}/${episode}`
      ),
      ...indices
        .filter((i) => Boolean(cards[i]))
        .map((i): NewsletterNode => ({
          type: 'blockquote',
          content: [
            paragraph(cards[i].quote),
            paragraph(`—— ${cards[i].name}`),
          ],
        })),
      link(
        '查看本期全部金句卡片 ↗',
        `https://inspireplanet.cc/weekly-cards/${episode}?year=${year}`
      ),
      ...(publication?.podcast
        ? [
            link(
              `${publication.podcast.title} · 小宇宙收听 ↗`,
              publication.podcast.url
            ),
          ]
        : []),
      { type: 'horizontalRule' },
      paragraph('更多文章，欢迎关注微信公众号「启发星球笔记」。'),
      {
        type: 'image',
        attrs: {
          src: 'https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/user_uploads/qrcode_for_gh_e0969fd9d88b_344.jpg',
          alt: '启发星球笔记微信公众号二维码',
          width: 200,
        },
      },
    ],
  };
  return {
    subject: `启发星球 ${year} · EP${episode}｜${title}`,
    document: doc,
  };
}

export function safeNewsletterLink(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\s\x00-\x1f]/.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** One shared, bounded renderer for the editor preview and actual test email. */
export function renderNewsletterDocument(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as NewsletterNode).type !== 'doc' ||
    JSON.stringify(value).length > 200000
  )
    throw new Error('邮件正文格式不正确或过长');
  let count = 0;
  let textLength = 0;
  function render(input: unknown, depth = 0): { html: string; text: string } {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      depth > 12 ||
      ++count > 2000
    )
      throw new Error('邮件正文结构过长或过深');
    const node = input as NewsletterNode;
    if (node.type === 'text') {
      if (
        typeof node.text !== 'string' ||
        (textLength += node.text.length) > 60000 ||
        (node.marks !== undefined && !Array.isArray(node.marks))
      )
        throw new Error('邮件文字格式不正确或过长');
      let html = escape(node.text),
        plain = node.text;
      for (const mark of node.marks || []) {
        if (!mark || typeof mark !== 'object')
          throw new Error('文字格式不正确');
        const tags: Record<string, string> = {
          bold: 'strong',
          italic: 'em',
          strike: 's',
          underline: 'u',
          code: 'code',
        };
        if (Object.prototype.hasOwnProperty.call(tags, mark.type))
          html = `<${tags[mark.type]}>${html}</${tags[mark.type]}>`;
        else if (mark.type === 'link') {
          const href = safeNewsletterLink(mark.attrs?.href);
          if (!href)
            throw new Error(
              '邮件中包含无效链接，请使用完整的 HTTP 或 HTTPS 地址'
            );
          html = `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer" style="color:#b44a2d">${html}</a>`;
          plain += ` (${href})`;
        } else throw new Error('邮件包含不支持的文字格式');
      }
      return { html, text: plain };
    }
    if (node.type === 'image') {
      const src = normalizeNewsletterImageUrl(node.attrs?.src);
      const alt =
        typeof node.attrs?.alt === 'string' ? node.attrs.alt : '启发星球配图';
      if (!src || alt.length > 200)
        throw new Error('图片请使用公开 GitHub 图片链接，说明不超过 200 字符');
      const width = node.attrs?.width == null ? 552 : node.attrs.width;
      if (!Number.isInteger(width) || Number(width) < 80 || Number(width) > 552)
        throw new Error('图片宽度须为 80 至 552 像素');
      return {
        html: `<p style="margin:22px 0"><img src="${escape(src)}" alt="${escape(alt)}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;border-radius:8px;margin:0 auto" /></p>`,
        text: `\n图片：${alt}\n${src}\n`,
      };
    }
    if (node.type === 'hardBreak') return { html: '<br />', text: '\n' };
    if (node.type === 'horizontalRule')
      return {
        html: '<hr style="border:0;border-top:1px solid #eadfd4;margin:24px 0" />',
        text: '\n\n',
      };
    if (
      ![
        'doc',
        'paragraph',
        'heading',
        'blockquote',
        'bulletList',
        'orderedList',
        'listItem',
        'codeBlock',
      ].includes(node.type) ||
      (node.type === 'doc' && depth > 0) ||
      (node.content !== undefined && !Array.isArray(node.content))
    )
      throw new Error('邮件包含不支持的正文格式');
    const children = (node.content || []).map((child) =>
      render(child, depth + 1)
    );
    const html = children.map((child) => child.html).join('');
    const plain = children.map((child) => child.text).join('');
    switch (node.type) {
      case 'doc':
        return { html, text: plain };
      case 'paragraph':
        return {
          html: `<p style="margin:0 0 18px;line-height:1.9;overflow-wrap:anywhere">${html || '<br />'}</p>`,
          text: `${plain}\n\n`,
        };
      case 'heading': {
        const level = Number(node.attrs?.level);
        if (![1, 2, 3].includes(Number(level)))
          throw new Error('邮件标题级别不正确');
        return {
          html: `<h${level} style="font-size:${level === 1 ? 25 : 20}px;line-height:1.6;margin:24px 0 16px">${html}</h${level}>`,
          text: `${plain}\n\n`,
        };
      }
      case 'blockquote':
        return {
          html: `<blockquote style="margin:24px 0;padding:20px;background:#fff5ec;border-left:3px solid #d65b35;color:#48362c">${html}</blockquote>`,
          text: `${plain}\n`,
        };
      case 'bulletList':
        return {
          html: `<ul style="padding-left:24px;line-height:1.9">${html}</ul>`,
          text: `${plain}\n`,
        };
      case 'orderedList':
        return {
          html: `<ol style="padding-left:24px;line-height:1.9">${html}</ol>`,
          text: `${plain}\n`,
        };
      case 'listItem':
        return { html: `<li>${html}</li>`, text: `• ${plain}` };
      default:
        return {
          html: `<pre style="white-space:pre-wrap">${html}</pre>`,
          text: `${plain}\n\n`,
        };
    }
  }
  const result = render(value);
  if (!result.text.trim()) throw new Error('请填写邮件正文');
  const footer = '邮件预览 · 正式邮件将包含退订入口';
  return {
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f2ed;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;color:#352f2b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" style="width:100%;max-width:600px;background:#fffdf9;border:1px solid #eadfd4;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:24px;font-size:16px">${result.html}<p style="margin-top:28px;padding-top:18px;border-top:1px solid #eadfd4;font-size:12px;color:#8c7869">${footer}</p></td></tr></table></td></tr></table></body></html>`,
    text: `${result.text.trim()}\n\n${footer}`,
  };
}

export function validateNewsletterSubject(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Boolean(value.trim()) &&
    value.length <= 200 &&
    !/[\r\n\x00-\x1f]/.test(value)
  );
}
