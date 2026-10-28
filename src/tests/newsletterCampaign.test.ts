import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  single: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('../database/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));
import { handler } from '../netlify/functions/newsletterCampaign';
import {
  deliveryUnsubscribeToken,
  renderDeliveryEmail,
} from '../netlify/utils/newsletterBroadcast';
import { renderNewsletterDocument } from '../utils/newsletterDocument';
const document = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '编辑后的导语与金句' }],
    },
  ],
};
const draft = { year: 2026, episode: 42, subject: '本期精华', document };
const delivery = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'verified@example.invalid',
  subject: '已锁定主题',
  from_email: '启发星球 <noreply@inspireplanet.cc>',
  site_url: 'https://inspireplanet.cc',
  body_html: renderNewsletterDocument(document).html,
  body_text: renderNewsletterDocument(document).text,
};
const state = {
  campaign: { id: 'campaign', status: 'sending' },
  counts: { sent: 1, failed: 0, pending: 0 },
  total: 1,
  available: 1,
};
const request = (
  action: string,
  extra: Record<string, unknown> = {},
  method = 'POST',
  auth = 'Bearer token'
) =>
  handler({
    httpMethod: method,
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ functionName: action, ...draft, ...extra }),
    queryStringParameters: {
      functionName: action,
      year: '2026',
      episode: '42',
    },
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CONTEXT', 'production');
  vi.stubEnv('RESEND_API_KEY', 'mock-provider-key');
  vi.stubEnv('NEWSLETTER_UNSUBSCRIBE_SECRET', 'x'.repeat(64));
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-id',
        email: 'owner@example.invalid',
        email_confirmed_at: '2026-01-01',
      },
    },
    error: null,
  });
  mocks.single.mockResolvedValue({ data: { role: 'organizer' }, error: null });
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: mocks.single,
  });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data:
      name === 'newsletter_campaign_status'
        ? state
        : name === 'newsletter_claim_deliveries'
          ? [delivery]
          : true,
    error: null,
  }));
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'provider-id' }),
  });
  vi.stubGlobal('fetch', mocks.fetch);
});
describe('formal newsletter campaigns', () => {
  it('requires a verified organizer for every operation', async () => {
    expect((await request('process', {}, 'POST', '')).statusCode).toBe(401);
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { email: 'unverified@example.invalid' } },
      error: null,
    });
    expect((await request('process')).statusCode).toBe(401);
    mocks.single.mockResolvedValueOnce({ data: { role: 'user' }, error: null });
    expect((await request('process')).statusCode).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preview environments can view status but never prepare, start or send real mail', async () => {
    vi.stubEnv('CONTEXT', 'deploy-preview');
    expect((await request('status', {}, 'GET')).body).toContain(
      '"canSend":false'
    );
    for (const action of ['prepare', 'start', 'process'])
      expect((await request(action)).statusCode).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('GET does not start sending and invalid documents cannot prepare', async () => {
    expect((await request('start', {}, 'GET')).statusCode).toBe(405);
    expect(
      (await request('prepare', { subject: 'bad\nsubject' })).statusCode
    ).toBe(400);
    expect(
      (
        await request('prepare', {
          document: { type: 'script', text: 'attack' },
        })
      ).statusCode
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('prepares the edited subject/body server-side and ignores forged HTML and recipients', async () => {
    expect(
      (
        await request('prepare', {
          html: '<script>attack</script>',
          to: 'stranger@example.invalid',
        })
      ).statusCode
    ).toBe(200);
    const call = mocks.rpc.mock.calls.find(
      ([name]) => name === 'newsletter_prepare_campaign'
    )![1];
    expect(call.p_html).toContain('编辑后的导语与金句');
    expect(call.p_html).not.toContain('<script>');
    expect(call.p_subject).toBe('本期精华');
    expect(call).not.toHaveProperty('to');
    expect(call.p_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('starts only a reviewed revision and never sends during the start request', async () => {
    const revision = '00000000-0000-4000-8000-000000000002';
    expect((await request('start', { hash: revision })).statusCode).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('newsletter_start_campaign', {
      p_year: 2026,
      p_episode: 42,
      p_revision: revision,
    });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await request('start', { hash: revision })).statusCode).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('sends only server-claimed recipients, frozen content and a unique usable unsubscribe URL', async () => {
    expect(
      (
        await request('process', {
          to: 'forged@example.invalid',
          subject: 'forged',
          html: 'forged',
        })
      ).statusCode
    ).toBe(200);
    const [url, init] = mocks.fetch.mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(url).toBe('https://api.resend.com/emails');
    expect(sent.to).toBe(delivery.email);
    expect(sent.subject).toBe('已锁定主题');
    expect(sent.html).toContain(
      '/newsletter/unsubscribe#' + deliveryUnsubscribeToken(delivery.id)
    );
    expect(sent.text).toContain('退订每周分享');
    expect(sent.html).not.toContain('邮件预览 · 正式邮件将包含退订入口');
    expect(init.headers['Idempotency-Key']).toBe(
      'episode-newsletter-' + delivery.id
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      'newsletter_finish_delivery',
      expect.objectContaining({
        p_id: delivery.id,
        p_message_id: 'provider-id',
      })
    );
  });
  it('retries use exactly the same payload and idempotency key', async () => {
    await request('process');
    await request('process', { retry: true });
    expect(mocks.fetch.mock.calls[0][1].body).toBe(
      mocks.fetch.mock.calls[1][1].body
    );
    expect(mocks.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(
      mocks.fetch.mock.calls[1][1].headers['Idempotency-Key']
    );
  });
  it('skips recipients no longer authorized and empty claimed batches', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({
      data:
        name === 'newsletter_claim_deliveries'
          ? [delivery]
          : name === 'newsletter_authorize_delivery'
            ? false
            : state,
      error: null,
    }));
    await request('process');
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'newsletter_claim_deliveries' ? [] : state,
      error: null,
    }));
    await request('process');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('records provider failures/timeouts without claiming inbox delivery', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('network timeout'));
    expect((await request('process')).statusCode).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'newsletter_finish_delivery',
      expect.objectContaining({ p_message_id: null })
    );
  });
  it('fails closed when lease/DB/config is unavailable', async () => {
    vi.stubEnv('NEWSLETTER_UNSUBSCRIBE_SECRET', '');
    expect((await request('process')).statusCode).toBe(503);
    vi.stubEnv('NEWSLETTER_UNSUBSCRIBE_SECRET', 'x'.repeat(64));
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'private data' },
    });
    const r = await request('process');
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('private data');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('preserves user-written text that resembles the system footer, and tokens are stable and recipient-specific', () => {
    const phrase = '邮件预览 · 正式邮件将包含退订入口';
    const rendered = renderNewsletterDocument({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: phrase }] },
      ],
    });
    const token = deliveryUnsubscribeToken(delivery.id);
    expect(token).toBe(deliveryUnsubscribeToken(delivery.id));
    expect(token).not.toBe(deliveryUnsubscribeToken('other-id'));
    const result = renderDeliveryEmail(
      { ...delivery, body_html: rendered.html, body_text: rendered.text },
      token
    );
    expect(result.html.split(phrase)).toHaveLength(2);
    expect(result.text.split(phrase)).toHaveLength(2);
  });
});
