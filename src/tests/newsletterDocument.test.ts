import { describe, expect, it } from 'vitest';
import {
  createDefaultNewsletterDocument,
  renderNewsletterDocument,
  validateNewsletterSubject,
  NewsletterDocument,
} from '../utils/newsletterDocument';

const image = {
  type: 'image',
  attrs: {
    src: 'https://github.com/sunling/inspireplanet-assets/blob/main/test.jpg',
    alt: '会议照片',
  },
};
const paragraph = (value: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text: value }],
});

describe('editable newsletter document', () => {
  it('includes the official WeChat QR image at a compact width and preserves its size on rendering', () => {
    const generated = createDefaultNewsletterDocument(2026, 42, null, [], null);
    const qr = generated.document.content.find((n) => n.type === 'image');
    expect(qr?.attrs?.src).toBe(
      'https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/user_uploads/qrcode_for_gh_e0969fd9d88b_344.jpg'
    );
    expect(qr?.attrs?.width).toBe(200);
    const rendered = renderNewsletterDocument(generated.document);
    expect(rendered.html).toContain('width="200"');
    expect(rendered.html).toContain('max-width:200px');
    expect(rendered.text).toContain('微信公众号二维码');
  });
  it('rejects unsafe image widths', () => {
    expect(() =>
      renderNewsletterDocument({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: {
              src: 'https://raw.githubusercontent.com/sunling/assets/main/image.jpg',
              width: '200px;display:none',
            },
          },
        ],
      })
    ).toThrow('图片宽度');
  });

  it('starts from real episode content but permits subsequent edits throughout', () => {
    const generated = createDefaultNewsletterDocument(
      2026,
      42,
      {
        episode: 'EP42',
        title: '本期标题',
        overview: '本期精华。接着提出问题？',
        topics: [],
      },
      [
        {
          id: 'q',
          episode: 'EP42',
          name: '分享者',
          title: '标题',
          quote: '原始句子',
          detail: '',
          created: '',
        },
      ],
      {
        podcast: {
          url: 'https://www.xiaoyuzhoufm.com/episode/0123456789abcdef01234567',
          title: '本期播客',
        },
      }
    );
    const before = renderNewsletterDocument(generated.document);
    expect(before.text).toContain('本期精华。接着提出问题？');
    expect(before.text).toContain('原始句子');
    expect(before.text).toContain('本期播客');
    const quote = generated.document.content.find(
      (node) => node.type === 'blockquote'
    )!;
    quote.content = [paragraph('我润色后的句子'), paragraph('—— 调整后的署名')];
    expect(renderNewsletterDocument(generated.document).text).toContain(
      '我润色后的句子'
    );
  });
  it('preserves image placement in the edited document, including several images', () => {
    const document: NewsletterDocument = {
      type: 'doc',
      content: [paragraph('图片之前'), image, paragraph('图片之后')],
    };
    const rendered = renderNewsletterDocument(document);
    expect(rendered.html.indexOf('图片之前')).toBeLessThan(
      rendered.html.indexOf('<img')
    );
    expect(rendered.html.indexOf('<img')).toBeLessThan(
      rendered.html.indexOf('图片之后')
    );
    expect(rendered.html).toContain(
      'https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/test.jpg'
    );
    document.content = [
      image,
      paragraph('图片之前'),
      paragraph('图片之后'),
      image,
    ];
    expect(
      renderNewsletterDocument(document).html.match(/<img /g)
    ).toHaveLength(2);
  });
  it('renders only safe supported content and rejects unsafe links and images', () => {
    const safe = renderNewsletterDocument({
      type: 'doc',
      content: [paragraph('<script>alert(1)</script>')],
    });
    expect(safe.html).toContain('&lt;script&gt;');
    expect(safe.html).not.toContain('<script>');
    for (const node of [
      { type: 'html', text: '<script>alert(1)</script>' },
      { type: 'image', attrs: { src: 'https://evil.test/tracker.jpg' } },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '危险',
            marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '危险', marks: [{ type: '__proto__' }] },
        ],
      },
    ])
      expect(() =>
        renderNewsletterDocument({ type: 'doc', content: [node] })
      ).toThrow();
  });
  it('bounds content and subject while allowing a custom subject', () => {
    expect(validateNewsletterSubject('我的自定义邮件主题')).toBe(true);
    expect(validateNewsletterSubject('主题\r\nBcc: someone@example.com')).toBe(
      false
    );
    expect(() =>
      renderNewsletterDocument({ type: 'doc', content: [] })
    ).toThrow();
    expect(() =>
      renderNewsletterDocument({
        type: 'doc',
        content: [paragraph('a'.repeat(60001))],
      })
    ).toThrow();
  });
});
