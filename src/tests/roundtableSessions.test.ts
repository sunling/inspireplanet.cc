import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeRoundtableSessionDate,
  validateRoundtableSession,
} from '../netlify/validation/roundtableQuestions';
import { roundtableEpisodeHref } from '../utils/roundtableSession';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));
vi.mock('../database/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('../netlify/utils/server', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, getAuthenticatedUser: mocks.getAuthenticatedUser };
});
import { handler } from '../netlify/functions/roundtableQuestions';

const request = (action: string, data = {}, method = 'GET') =>
  handler(
    {
      httpMethod: method,
      headers: {},
      queryStringParameters: { functionName: action, ...data },
      body: JSON.stringify({ functionName: action, ...data }),
    } as any,
    {} as any
  );

function chain(result: any) {
  const q: any = {};
  for (const method of [
    'select',
    'neq',
    'order',
    'or',
    'eq',
    'gte',
    'lt',
    'in',
    'update',
  ])
    q[method] = vi.fn(() => q);
  q.limit = q.single = q.maybeSingle = vi.fn(async () => result);
  // Supports support-count queries, which await a filter directly.
  q.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

const session = {
  status: 'completed',
  sessionDate: '2026-09-26',
  episodeNumber: 38,
};

describe('roundtable session validation', () => {
  it('links the recorded session year, not the current year', () => {
    expect(roundtableEpisodeHref(session)).toBe('/episodes/2026/38#roundtable');
    expect(roundtableEpisodeHref({ ...session, status: 'open' })).toBeNull();
  });
  it.each(['2026-02-30', '2026-13-01', '2026/09/26'])(
    'rejects impossible dates: %s',
    (date) => {
      expect(normalizeRoundtableSessionDate(date)).toBeNull();
    }
  );
  it('requires both actual date and episode to arrange or complete', () => {
    expect(validateRoundtableSession({ status: 'completed' }).ok).toBe(false);
    expect(
      validateRoundtableSession({ ...session, episodeNumber: null }).ok
    ).toBe(false);
    expect(validateRoundtableSession(session).ok).toBe(true);
  });
  it('keeps future sessions scheduled until explicitly completed', () => {
    expect(
      validateRoundtableSession({ ...session, sessionDate: '2099-01-01' }).ok
    ).toBe(false);
    expect(
      validateRoundtableSession({
        ...session,
        status: 'scheduled',
        sessionDate: '2099-01-01',
      }).ok
    ).toBe(true);
  });
});

describe('roundtable session API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it('filters episode links by year and scheduled/completed status; exposes no private columns', async () => {
    const q = chain({ data: [], error: null });
    mocks.from.mockReturnValue(q);
    expect(
      (await request('listPublic', { episodeNumber: '38', year: '2026' }))
        .statusCode
    ).toBe(200);
    expect(q.eq).toHaveBeenCalledWith('episode_number', 38);
    expect(q.gte).toHaveBeenCalledWith('session_date', '2026-01-01');
    expect(q.lt).toHaveBeenCalledWith('session_date', '2027-01-01');
    expect(q.in).toHaveBeenCalledWith('status', ['scheduled', 'completed']);
    expect(q.neq).toHaveBeenCalledWith('status', 'hidden');
    expect(q.select.mock.calls[0][0]).not.toMatch(
      /email|boundaries|available_dates|fingerprint/
    );
  });
  it('includes actual session assignments independently of participant availability', async () => {
    const q = chain({ data: [], error: null });
    mocks.from.mockReturnValue(q);
    await request('listPublic', { sessionDate: '2026-09-26' });
    expect(q.or).toHaveBeenCalledWith(
      'session_date.eq.2026-09-26,available_dates.cs.{2026-09-26}'
    );
  });
  it('rejects incomplete or injected episode filters', async () => {
    mocks.from.mockReturnValue(chain({ data: [] }));
    expect(
      (await request('listPublic', { episodeNumber: '38' })).statusCode
    ).toBe(400);
    expect(
      (
        await request('listPublic', {
          episodeNumber: '38,hidden',
          year: '2026',
        })
      ).statusCode
    ).toBe(400);
  });
  it.each([null, { role: 'member' }])(
    'blocks session updates without organizer access',
    async (user) => {
      mocks.getAuthenticatedUser.mockResolvedValue(user);
      const res = await request('update', { id: '4', ...session }, 'PUT');
      expect(res.statusCode).toBe(user ? 403 : 401);
      expect(mocks.from).not.toHaveBeenCalled();
    }
  );
  it('saves completion date and episode together', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ role: 'organizer' });
    const question = chain({
      data: {
        id: 4,
        status: 'completed',
        session_date: '2026-09-26',
        episode_number: 38,
      },
      error: null,
    });
    mocks.from.mockImplementation((table) =>
      table === 'roundtable_questions'
        ? question
        : chain({
            data: table === 'meetup_episodes' ? { date: '2026-09-26' } : [],
            error: null,
          })
    );
    const res = await request('update', { id: '4', ...session }, 'PUT');
    expect(res.statusCode).toBe(200);
    expect(question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        session_date: '2026-09-26',
        episode_number: 38,
      })
    );
    expect(JSON.parse(res.body).data.question).toMatchObject({
      sessionDate: '2026-09-26',
      episodeNumber: 38,
    });
  });
  it('rejects a date that conflicts with an existing episode', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ role: 'organizer' });
    const q = chain({ data: { date: '2026-09-26' }, error: null });
    mocks.from.mockReturnValue(q);
    expect(
      (
        await request(
          'update',
          { id: '4', ...session, sessionDate: '2026-09-25' },
          'PUT'
        )
      ).statusCode
    ).toBe(400);
    expect(q.update).not.toHaveBeenCalled();
  });
});
