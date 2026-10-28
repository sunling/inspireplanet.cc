import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  send: vi.fn(),
  query: {} as any,
}));
vi.mock('../database/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
    auth: { getUser: mocks.getUser },
  },
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
import {
  handler,
  subscriptionSiteUrl,
} from '../netlify/functions/newsletterSubscriptions';
import {
  normalizeSubscriptionEmail,
  SUBSCRIPTION_MESSAGE,
} from '../utils/newsletterSubscription';
const request = (
  functionName = 'subscribe',
  data: Record<string, unknown> = {},
  httpMethod = 'POST',
  headers: Record<string, string> = {}
) =>
  handler({
    httpMethod,
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      functionName,
      email: 'Test@example.com',
      consent: true,
      ...data,
    }),
    queryStringParameters: { functionName, ...data } as Record<string, string>,
  });
const body = (r: { body: string }) => JSON.parse(r.body);
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('RESEND_API_KEY', 'mock-key');
  vi.stubEnv('CONTEXT', 'production');
  vi.stubEnv('URL', 'https://inspireplanet.cc');
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.send.mockResolvedValue({ data: { id: 'mock-id' }, error: null });
  mocks.getUser.mockResolvedValue({
    data: {
      user: { email: 'owner@example.com', email_confirmed_at: '2026-10-27' },
    },
    error: null,
  });
  mocks.query = Object.fromEntries(
    ['select', 'eq', 'ilike', 'order', 'range', 'update'].map((key) => [
      key,
      vi.fn().mockReturnThis(),
    ])
  );
  mocks.query.single = vi
    .fn()
    .mockResolvedValue({ data: { role: 'organizer' }, error: null });
  mocks.query.maybeSingle = vi
    .fn()
    .mockResolvedValue({
      data: { id: '00000000-0000-4000-8000-000000000000' },
      error: null,
    });
  mocks.query.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], count: 0, error: null }).then(resolve);
  mocks.from.mockReturnValue(mocks.query);
});
describe('newsletter subscriptions API', () => {
  it('normalizes valid mailboxes and rejects control characters, display names and oversize values', () => {
    expect(normalizeSubscriptionEmail(' Test+weekly@EXAMPLE.com ')).toBe(
      'test+weekly@example.com'
    );
    for (const bad of [
      'A <a@b.com>',
      'a@b.com\r\nBcc:evil@b.com',
      'no-email',
      'a@localhost',
      'x'.repeat(65) + '@example.com',
      null,
    ])
      expect(normalizeSubscriptionEmail(bad)).toBeNull();
  });
  it('requires explicit consent, valid email, JSON and trusted origin; GET never sends', async () => {
    expect((await request('subscribe', { consent: false })).statusCode).toBe(
      400
    );
    expect(
      (await request('subscribe', { email: 'not-an-email' })).statusCode
    ).toBe(400);
    expect(
      (await request('subscribe', {}, 'POST', { origin: 'https://evil.com' }))
        .statusCode
    ).toBe(403);
    expect(
      (await request('subscribe', {}, 'POST', { 'content-type': 'text/plain' }))
        .statusCode
    ).toBe(415);
    expect((await request('subscribe', {}, 'GET')).statusCode).toBe(405);
    expect(
      (await request('confirm', { token: 'a'.repeat(64) }, 'GET')).statusCode
    ).toBe(405);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('sends a single confirmation only after the atomic DB claim; never trusts custom recipient or redirect', async () => {
    const r = await request('subscribe', {
      source: '/episodes/2026/42',
      to: 'evil@example.com',
      redirect: 'https://evil.com',
      status: 'subscribed',
    });
    expect(body(r).data.message).toBe(SUBSCRIPTION_MESSAGE);
    const [message] = mocks.send.mock.calls[0];
    expect(message.to).toBe('test@example.com');
    expect(message.html).not.toContain('evil');
    const token = message.text.match(/\/confirm#([a-f0-9]{64})/)[1];
    const unsub = message.text.match(/\/unsubscribe#([a-f0-9]{64})/)[1];
    expect(token).not.toBe(unsub);
    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe('newsletter_request_subscription');
    expect(args.p_confirmation_hash).toBe(hash(token));
    expect(args.p_unsubscribe_hash).toBe(hash(unsub));
    expect(args.p_email).toBe('test@example.com');
    expect(args.p_source).toBe('/episodes/2026/42');
    expect(JSON.stringify(args)).not.toContain(token);
    expect(r.body).not.toContain(token);
    expect(r.headers?.['Cache-Control']).toBe('no-store');
  });
  it('does not send to active, cooldown or rate limited addresses; response does not disclose which', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const r = await request();
    expect(body(r).data.message).toBe(SUBSCRIPTION_MESSAGE);
    expect(mocks.send).not.toHaveBeenCalled();
    await request('subscribe', { website: 'bot' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('fails closed on DB errors and missing provider configuration', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'private data' },
    });
    const r = await request();
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('private data');
    expect(mocks.send).not.toHaveBeenCalled();
    vi.stubEnv('RESEND_API_KEY', '');
    expect((await request()).statusCode).toBe(503);
  });
  it('clears only its own failed send claim so a subsequent attempt can retry', async () => {
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { message: 'provider error' },
    });
    expect((await request()).statusCode).toBe(502);
    expect(mocks.query.update).toHaveBeenCalledWith({
      confirmation_token_hash: null,
      confirmation_expires_at: null,
      requested_at: null,
    });
    expect(mocks.query.eq).toHaveBeenCalledWith(
      'confirmation_token_hash',
      expect.stringMatching(/^[a-f0-9]{64}$/)
    );
  });
  it('accepts only valid action tokens; expired confirms fail and unsubscribe remains idempotent', async () => {
    expect((await request('confirm', { token: 'bad' })).statusCode).toBe(400);
    const token = 'a'.repeat(64);
    expect((await request('confirm', { token })).statusCode).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'newsletter_confirm_subscription',
      { p_token_hash: hash(token) }
    );
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await request('confirm', { token })).statusCode).toBe(400);
    expect((await request('unsubscribe', { token })).statusCode).toBe(200);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('never lists subscribers or accepts removals without a verified organizer', async () => {
    expect((await request('list', {}, 'GET')).statusCode).toBe(403);
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { email: 'owner@example.com' } },
      error: null,
    });
    expect(
      (await request('list', {}, 'GET', { authorization: 'Bearer test' }))
        .statusCode
    ).toBe(403);
    mocks.query.single.mockResolvedValueOnce({
      data: { role: 'user' },
      error: null,
    });
    expect(
      (
        await request(
          'remove',
          { id: '00000000-0000-4000-8000-000000000000' },
          'POST',
          { authorization: 'Bearer test' }
        )
      ).statusCode
    ).toBe(403);
    expect(mocks.query.update).not.toHaveBeenCalled();
  });
  it('returns paginated safe fields and counts to organizers, validates filters and never returns tokens', async () => {
    const headers = { authorization: 'Bearer test' };
    expect(
      (
        await request(
          'list',
          { page: '2', status: 'subscribed', search: 'person_' },
          'GET',
          headers
        )
      ).statusCode
    ).toBe(200);
    expect(mocks.query.range).toHaveBeenCalledWith(25, 49);
    expect(mocks.query.ilike).toHaveBeenCalledWith('email', '%person\\_%');
    expect(mocks.query.select).toHaveBeenCalledWith(
      'id,email,status,source,created_at,confirmed_at,unsubscribed_at',
      { count: 'exact' }
    );
    expect(
      (
        await request(
          'list',
          { search: 'foo%,status.eq.subscribed' },
          'GET',
          headers
        )
      ).statusCode
    ).toBe(400);
    expect(
      (await request('list', { page: '-1' }, 'GET', headers)).statusCode
    ).toBe(400);
  });
  it('admin removal invalidates all pending and unsubscribe tokens', async () => {
    expect(
      (
        await request(
          'remove',
          { id: '00000000-0000-4000-8000-000000000000' },
          'POST',
          { authorization: 'Bearer test' }
        )
      ).statusCode
    ).toBe(200);
    expect(mocks.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unsubscribed',
        confirmation_token_hash: null,
        unsubscribe_token_hash: null,
      })
    );
  });
  it('uses a configured preview origin and rejects arbitrary hosts for email links', () => {
    vi.stubEnv('CONTEXT', 'deploy-preview');
    vi.stubEnv(
      'DEPLOY_PRIME_URL',
      'https://deploy-preview-99--inspiration-planet.netlify.app'
    );
    expect(subscriptionSiteUrl()).toBe(
      'https://deploy-preview-99--inspiration-planet.netlify.app'
    );
    vi.stubEnv('DEPLOY_PRIME_URL', 'https://evil.com');
    expect(subscriptionSiteUrl()).toBe('https://inspireplanet.cc');
  });
});
