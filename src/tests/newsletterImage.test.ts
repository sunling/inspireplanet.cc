import { describe, expect, it } from 'vitest';
import { normalizeNewsletterImageUrl } from '../utils/newsletterImage';
import { buildEpisodeNewsletterPreview } from '../utils/episodeNewsletter';

const raw =
  'https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/user_uploads/example.jpg';
describe('newsletter GitHub image', () => {
  it('accepts direct images and converts GitHub blob pages to image URLs', () => {
    expect(normalizeNewsletterImageUrl(raw)).toBe(raw);
    expect(
      normalizeNewsletterImageUrl(
        'https://github.com/sunling/inspireplanet-assets/blob/main/user_uploads/example.jpg?raw=true'
      )
    ).toBe(raw);
  });
  it('rejects private tokens, non-image pages, scripts and unapproved hosts', () => {
    for (const url of [
      'javascript:alert(1)',
      'https://example.com/a.jpg',
      raw + '?token=private',
      raw.replace('.jpg', '.svg'),
      raw.replace(
        'raw.githubusercontent.com',
        'raw.githubusercontent.com.evil.test'
      ),
      'https://github.com/user/repo/tree/main/a.jpg',
    ])
      expect(normalizeNewsletterImageUrl(url)).toBeNull();
  });
  it('renders a responsive image and escaped description in HTML and a usable plain-text link', () => {
    const preview = buildEpisodeNewsletterPreview({
      year: 2026,
      episode: 42,
      summary: null,
      cards: [],
      image: { url: raw, alt: '现场照片 "说明" <script>' },
    });
    expect(preview.html).toContain(`<img src="${raw}"`);
    expect(preview.html).toContain('width:100%');
    expect(preview.html).toContain('&quot;说明&quot; &lt;script&gt;');
    expect(preview.text).toContain(raw);
    const invalid = buildEpisodeNewsletterPreview({
      year: 2026,
      episode: 42,
      summary: null,
      cards: [],
      image: { url: 'javascript:alert(1)', alt: '' },
    });
    expect(invalid.html).not.toContain('<img');
    expect(invalid.missing).toContain(
      '请使用公开 GitHub 图片链接（PNG、JPG、GIF 或 WebP）'
    );
  });
});
