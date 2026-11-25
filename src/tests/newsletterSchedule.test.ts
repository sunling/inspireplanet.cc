import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), entries: vi.fn(), cards: vi.fn(), publication: vi.fn(),
}));
vi.mock('../database/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('../netlify/utils/githubWeeklyCards', () => ({
  getGitHubEpisodeEntries: mocks.entries, fetchEpisodeCardsFromGitHub: mocks.cards,
  getEpisodePublication: mocks.publication,
}));
vi.mock('../netlify/generated/newsletterDeployment.json', () => ({ default: { production: true } }));
import { nextSendSlot, handler, organizerRecipients } from '../netlify/functions/newsletterSchedule';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('newsletter schedule', () => {
  it('allows authenticated dry run with sending disabled, without writes or mail calls', async () => {
    vi.stubEnv('CONTACT_EMAIL', '');
    vi.stubEnv('NEWSLETTER_AUTOMATION_SECRET', 'x'.repeat(64));
    vi.stubEnv('NEWSLETTER_AUTOMATION_ENABLED', 'false');
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('NEWSLETTER_UNSUBSCRIBE_SECRET', 'y'.repeat(64));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    mocks.entries.mockResolvedValue([]);
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ count: 12, error: null }),
      is: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });
    const r = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer ' + 'x'.repeat(64) }, body: JSON.stringify({action:'dryRun'}) });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toMatchObject({ dryRun: true, automationEnabled: false,
      confirmedSubscribers: 12, queuedCampaigns: 0, emailsSent: 0, writesPerformed: 0 });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    const live = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer ' + 'x'.repeat(64) }, body: JSON.stringify({action:'discover'}) });
    expect(live.statusCode).toBe(503);
  });
  it('normalizes, deduplicates and sorts contact emails', () => {
    expect(organizerRecipients(' sunling621@gmail.com, ECHOLEE4420@gmail.com, sunling621@gmail.com, ')).toEqual(['echolee4420@gmail.com', 'sunling621@gmail.com']);
  });
  it('allows Monday morning after a Sunday reminder', () => {
    expect(nextSendSlot(new Date('2026-11-29T00:03:00Z')).toISOString()).toBe('2026-11-30T00:03:00.000Z');
  });
  it('defers Sunday evening notices to Tuesday', () => {
    expect(nextSendSlot(new Date('2026-11-29T12:00:00Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
  it('preserves the full 24 hours and skips weekend send slots', () => {
    expect(nextSendSlot(new Date('2026-12-04T00:00:00Z')).toISOString()).toBe('2026-12-07T00:00:00.000Z');
  });
  it('rejects unauthenticated automation', async () => {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    expect(r.statusCode).toBe(403);
  });
});
