import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  single: vi.fn(),
  send: vi.fn(),
  summary: vi.fn(),
  cards: vi.fn(),
  publication: vi.fn(),
}));
vi.mock('../database/supabase', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock('../netlify/utils/githubWeeklyCards', () => ({
  getEpisodeSummary: mocks.summary,
  getWeeklyCardsByEpisode: mocks.cards,
  getEpisodePublication: mocks.publication,
}));
import { handler } from '../netlify/functions/newsletterPreview';
const quote = {
  name: '孙玲',
  quote: '我说过的原话。',
  id: '0',
  title: '原话',
  episode: 'EP42',
  detail: '',
  created: '',
};
const draft = {
  year: 2026,
  episode: 42,
  intro: '本期导语',
  quotes: [{ index: 0, quote: quote.quote, name: quote.name }],
  podcastUrl: 'https://www.xiaoyuzhoufm.com/episode/0123456789abcdef01234567',
  podcastTitle: '本期播客',
  skipPodcast: false,
  requestId: 'e7088470-f97a-48d5-a91a-bca495e9c2a1',
  expectedTitle: '本期标题',
};
const request = (
  body = {},
  headers = { authorization: 'Bearer verified-token' },
  httpMethod = 'POST'
) =>
  handler({ httpMethod, headers, body: JSON.stringify({ ...draft, ...body }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_API_KEY', 'test-key');
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-id',
        email: 'organizer@example.com',
        email_confirmed_at: '2026-10-01',
      },
    },
    error: null,
  });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: mocks.single,
  };
  mocks.from.mockReturnValue(query);
  mocks.single.mockResolvedValue({
    data: { id: 1, role: 'organizer' },
    error: null,
  });
  mocks.summary.mockResolvedValue({
    title: '本期标题',
    overview: '原有导语',
    topics: [{ title: '讨论' }],
  });
  mocks.cards.mockResolvedValue([quote]);
  mocks.publication.mockResolvedValue(null);
  mocks.send.mockResolvedValue({ data: { id: 'message-id' }, error: null });
});

describe('send test newsletter', () => {
  it('requires a verified organizer and POST', async () => {
    expect((await request({}, undefined, 'GET')).statusCode).toBe(405);
    expect((await request({}, { authorization: '' })).statusCode).toBe(401);
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { email: 'unverified@example.com' } },
      error: null,
    });
    expect((await request()).statusCode).toBe(401);
    mocks.single.mockResolvedValueOnce({ data: { role: 'user' }, error: null });
    expect((await request()).statusCode).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('only sends to the authenticated verified mailbox and renders canonical quotes', async () => {
    const result = await request({
      to: 'stranger@example.com',
      html: '<script>bad</script>',
      subject: 'forged',
    });
    expect(result.statusCode).toBe(200);
    const [message, options] = mocks.send.mock.calls[0];
    expect(message.to).toBe('organizer@example.com');
    expect(message.subject).toBe('[测试] 启发星球 2026 · EP42｜本期标题');
    expect(message.text).toContain(quote.quote);
    expect(message.html).not.toContain('<script>');
    expect(message.text).toContain(draft.podcastUrl);
    expect(message.text).toContain('仅发送给当前组织者');
    expect(options.idempotencyKey).toMatch(/^episode-newsletter-test-/);
  });
  it('rejects fabricated quotes and changed source content', async () => {
    expect(
      (
        await request({
          quotes: [{ index: 0, name: quote.name, quote: '没有说过的话' }],
        })
      ).statusCode
    ).toBe(409);
    expect((await request({ expectedTitle: '过期标题' })).statusCode).toBe(409);
    expect(
      (
        await request({
          quotes: [{ index: 10, name: quote.name, quote: quote.quote }],
        })
      ).statusCode
    ).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('validates podcast links, selection counts and explicit omission', async () => {
    expect(
      (await request({ podcastUrl: 'javascript:alert(1)' })).statusCode
    ).toBe(400);
    expect((await request({ quotes: [] })).statusCode).toBe(400);
    expect(
      (await request({ quotes: [...draft.quotes, ...draft.quotes] })).statusCode
    ).toBe(400);
    expect(
      (await request({ skipPodcast: true, podcastUrl: '' })).statusCode
    ).toBe(200);
    expect(mocks.send.mock.calls[0][0].html).not.toContain('小宇宙收听');
  });
  it('allows a test without a podcast and includes normalized GitHub images', async () => {
    const result = await request({
      podcastUrl: '',
      imageUrl:
        'https://github.com/sunling/inspireplanet-assets/blob/main/example.jpg',
      imageAlt: '会议照片',
    });
    expect(result.statusCode).toBe(200);
    const message = mocks.send.mock.calls[0][0];
    expect(message.html).not.toContain('小宇宙收听');
    expect(message.html).toContain(
      '<img src="https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/example.jpg"'
    );
    expect(message.html).toContain('会议照片');
    expect(
      (await request({ imageUrl: 'https://example.com/a.jpg' })).statusCode
    ).toBe(400);
  });
  it('sends the complete edited document and custom subject, not the old generated text', async () => {
    const document = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '编辑后的导语' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '简单编辑后的金句 —— 分享者' }],
            },
          ],
        },
      ],
    };
    const result = await request({
      document,
      subject: '修改后的主题',
      to: 'stranger@example.com',
      html: '<script>bad</script>',
    });
    expect(result.statusCode).toBe(200);
    const message = mocks.send.mock.calls[0][0];
    expect(message.to).toBe('organizer@example.com');
    expect(message.subject).toBe('[测试] 修改后的主题');
    expect(message.text).toContain('编辑后的导语');
    expect(message.text).toContain('简单编辑后的金句');
    expect(message.html).not.toContain('<script>');
    expect(
      (await request({ document, subject: '主题\r\nBcc: bad@example.com' }))
        .statusCode
    ).toBe(400);
    expect(
      (
        await request({
          document: {
            type: 'doc',
            content: [{ type: 'html', text: '<script>bad</script>' }],
          },
          subject: '主题',
        })
      ).statusCode
    ).toBe(400);
  });
  it('uses a stable idempotency key when retrying an identical draft', async () => {
    await request();
    await request();
    expect(mocks.send.mock.calls[0][1]).toEqual(mocks.send.mock.calls[1][1]);
    await request({ intro: '另一份导语' });
    expect(mocks.send.mock.calls[0][1]).not.toEqual(
      mocks.send.mock.calls[2][1]
    );
  });
  it('reports missing configuration and provider failures without claiming delivery', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect((await request()).statusCode).toBe(503);
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    mocks.send.mockResolvedValueOnce({ error: { message: 'not accepted' } });
    expect((await request()).statusCode).toBe(502);
  });
});
