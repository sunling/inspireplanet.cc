import { describe, expect, it } from 'vitest';
import {
  buildEpisodeNewsletterPreview,
  selectDefaultQuoteIndices,
} from '../utils/episodeNewsletter';
import { parseEpisodePublication } from '../utils/episodePublication';
import type {
  EpisodeSummary,
  WeeklyCard,
} from '../netlify/services/weeklyCards';

const podcastUrl =
  'https://www.xiaoyuzhoufm.com/episode/0123456789abcdef01234567';
const summary: EpisodeSummary = {
  episode: 'EP42',
  title: '稳定生活里的新尝试',
  overview: '原有导语',
  topics: [{ speaker: '李影', title: '生活里的尝试' }],
};
const cards: WeeklyCard[] = [
  {
    id: 'one',
    episode: 'EP42',
    name: '抹茶',
    title: '新尝试',
    quote: '在稳定的生活里加入新的尝试。',
    detail: '',
    created: '2026-10-24',
  },
  {
    id: 'two',
    episode: 'EP42',
    name: '李影',
    title: '出现',
    quote: '持续做一件事，不要求每次都到场。',
    detail: '',
    created: '2026-10-24',
  },
];
const input = { year: 2026, episode: 42, summary, cards };

describe('publication metadata', () => {
  it('supports historical episodes without metadata', () => {
    expect(parseEpisodePublication(null)).toBeNull();
    expect(parseEpisodePublication({})).toEqual({});
  });
  it('rejects unsafe URLs, wrong platforms, homepage links and malformed fields', () => {
    for (const url of [
      'javascript:alert(1)',
      podcastUrl.replace('www.xiaoyuzhoufm.com', 'xiaoyuzhoufm.com.evil.test'),
      podcastUrl.replace('/episode/', '/podcast/'),
      podcastUrl.replace('https://', 'https://user@'),
    ]) {
      expect(
        parseEpisodePublication({ podcast: { url, title: '标题' } })
      ).toBeNull();
    }
    expect(
      parseEpisodePublication({
        podcast: { url: podcastUrl, title: '标题', publishedAt: '2026-02-30' },
      })
    ).toBeNull();
    expect(
      parseEpisodePublication({
        podcast: { url: podcastUrl, title: '标题', durationSeconds: 0 },
      })
    ).toBeNull();
    expect(
      parseEpisodePublication({ newsletter: { featuredQuoteIndex: -1 } })
    ).toBeNull();
    expect(
      parseEpisodePublication({ email: 'private@example.com' })
    ).toBeNull();
  });
});

describe('newsletter preview', () => {
  it('reuses summary and quotes, with year-qualified links', () => {
    const preview = buildEpisodeNewsletterPreview(input);
    expect(preview.text).toContain(summary.overview);
    expect(preview.text).toContain(cards[0].quote);
    expect(preview.html).toContain('/episodes/2026/42');
    expect(preview.html).toContain('/weekly-cards/42?year=2026');
    expect(preview.missing).toEqual(['尚未补入已发布的小宇宙单集链接']);
    expect(preview.html).not.toContain('小宇宙收听');
    expect(preview.html).toContain('正式邮件将包含退订入口');
  });
  it('uses explicit introduction and selected quote without losing attribution', () => {
    const preview = buildEpisodeNewsletterPreview({
      ...input,
      publication: {
        podcast: { url: podcastUrl, title: '本期节目', durationSeconds: 125 },
        newsletter: { intro: '另一种开场', featuredQuoteIndex: 1 },
      },
    });
    expect(preview.text).toContain('另一种开场');
    expect(preview.text).toContain(cards[1].quote);
    expect(preview.text).toContain('—— 李影');
    expect(preview.html).toContain('约 3 分钟');
    expect(preview.missing).toEqual([]);
  });
  it('escapes content before HTML rendering and keeps plain text readable', () => {
    const preview = buildEpisodeNewsletterPreview({
      ...input,
      summary: { ...summary, title: '<script>alert(1)</script>' },
      intro: '<img src=x onerror=alert(1)>',
      cards: [
        { ...cards[0], quote: '<svg onload=alert(1)>', name: '<b>抹茶</b>' },
      ],
    });
    expect(preview.html).not.toContain('<script>');
    expect(preview.html).not.toContain('<img src=x');
    expect(preview.html).not.toContain('<svg onload');
    expect(preview.html).toContain('&lt;svg');
    expect(preview.text).toContain('<svg onload=alert(1)>');
  });
  it('reports missing data and out-of-range selections rather than inventing content', () => {
    expect(
      buildEpisodeNewsletterPreview({ ...input, featuredQuoteIndex: 99 })
        .missing
    ).toContain('请选择 1–3 条有内容和署名的原话');
    const empty = buildEpisodeNewsletterPreview({
      ...input,
      cards: [],
      summary: null,
    });
    expect(empty.missing).toHaveLength(4);
    expect(empty.html).not.toContain('小宇宙收听');
    expect(() =>
      buildEpisodeNewsletterPreview({ ...input, year: NaN })
    ).toThrow();
  });
});

describe('three original quotes', () => {
  it('prefers three distinct speakers without inventing or rewriting quotes', () => {
    const all = [
      cards[0],
      { ...cards[0], id: 'same-speaker', quote: '同一人的另一句' },
      cards[1],
      { ...cards[0], id: 'third', name: 'Wendy', quote: '先照顾自己。' },
    ];
    expect(selectDefaultQuoteIndices(all)).toEqual([0, 2, 3]);
    const preview = buildEpisodeNewsletterPreview({ ...input, cards: all });
    for (const i of [0, 2, 3]) expect(preview.text).toContain(all[i].quote);
    expect(preview.text).not.toContain('同一人的另一句');
  });
  it('supports 1–3 explicit choices, rejects duplicate indices and more than three', () => {
    expect(
      parseEpisodePublication({ newsletter: { featuredQuoteIndices: [0, 1] } })
    ).toEqual({ newsletter: { featuredQuoteIndices: [0, 1] } });
    for (const list of [[], [0, 0], [0, 1, 2, 3], [-1]])
      expect(
        parseEpisodePublication({ newsletter: { featuredQuoteIndices: list } })
      ).toBeNull();
    expect(
      buildEpisodeNewsletterPreview({ ...input, featuredQuoteIndices: [1] })
        .text
    ).not.toContain(cards[0].quote);
    expect(
      buildEpisodeNewsletterPreview({ ...input, featuredQuoteIndices: [0, 0] })
        .missing
    ).toContain('请选择 1–3 条有内容和署名的原话');
  });
});
