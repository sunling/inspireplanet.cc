// Quota/delivery behavior is exercised by mailSecurity tests and SQL integration tests.
vi.mock('../netlify/utils/mailProtection', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  protectAction: vi.fn(async () => {}),
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  user: null as any,
  tables: {} as Record<string, any[]>,
  calls: [] as any[],
  writes: [] as any[],
  fail: '' as string,
  throwWrite: '' as string,
  counter: 100,
}));
vi.mock('../netlify/utils/server', () => ({
  getAuthenticatedUser: async () => db.user,
  getUserIdFromAuth: async () => db.user?.id || null,
  getFunctionNameFromEvent: (e: any) =>
    e.queryStringParameters?.functionName ||
    JSON.parse(e.body || '{}').functionName,
  getDataFromEvent: (e: any) =>
    ['GET', 'DELETE'].includes(e.httpMethod)
      ? e.queryStringParameters
      : JSON.parse(e.body || '{}'),
  createSuccessResponse: (data: any) => ({
    statusCode: 200,
    body: JSON.stringify({ success: true, data }),
  }),
  createErrorResponse: (error: string, statusCode = 400) => ({
    statusCode,
    body: JSON.stringify({ success: false, error }),
  }),
  handleOptionsRequest: () => ({ statusCode: 200, body: '' }),
}));
vi.mock('../netlify/utils/email', () => ({
  sendRSVPConfirmEmail: vi.fn(),
  sendRSVPRejectEmail: vi.fn(),
}));
vi.mock('../database/supabase', () => ({
  supabase: {
    from: (table: string) => {
      let operation = 'select',
        value: any,
        options: any,
        count = false,
        limit = Infinity;
      const filters: any[] = [];
      const q: any = {};
      q.select = (_?: any, opts?: any) => {
        count = !!opts?.count;
        return q;
      };
      q.eq = (key: string, v: any) => {
        filters.push((r: any) => String(r[key]) === String(v));
        return q;
      };
      q.is = (key: string, v: any) => {
        filters.push((r: any) => r[key] === v);
        return q;
      };
      q.in = (key: string, v: any[]) => {
        filters.push((r: any) => v.some((x) => String(x) === String(r[key])));
        return q;
      };
      q.limit = (n: number) => {
        limit = n;
        return q;
      };
      q.order = () => q;
      for (const op of ['insert', 'upsert', 'update', 'delete'])
        q[op] = (v: any, o: any) => {
          operation = op;
          value = v;
          options = o;
          return q;
        };
      async function execute(single = false) {
        db.calls.push({ table, operation });
        if (db.throwWrite === table + ':' + operation)
          throw new Error('Network failure');
        if (db.fail === table + ':' + operation)
          return {
            data: null,
            error: { message: 'simulated failure' },
            count: null,
          };
        const all = (db.tables[table] ||= []);
        let rows = all
          .filter((r) => filters.every((f) => f(r)))
          .slice(0, limit);
        if (operation !== 'select') {
          db.writes.push({ table, operation, value: structuredClone(value) });
          if (operation === 'insert' || operation === 'upsert') {
            rows = [];
            for (const v of Array.isArray(value) ? value : [value]) {
              let existing =
                operation === 'upsert' && options?.onConflict
                  ? all.find((r) =>
                      options.onConflict
                        .split(',')
                        .every((k: string) => String(r[k]) === String(v[k]))
                    )
                  : null;
              if (existing) {
                if (!options?.ignoreDuplicates) Object.assign(existing, v);
                rows.push(existing);
              } else {
                const row = { id: String(++db.counter), ...v };
                all.push(row);
                rows.push(row);
              }
            }
          } else if (operation === 'update')
            rows.forEach((r) => Object.assign(r, value));
          else if (operation === 'delete')
            db.tables[table] = all.filter((r) => !rows.includes(r));
        }
        return {
          data: single ? rows[0] || null : rows,
          error: null,
          count: count ? rows.length : undefined,
        };
      }
      q.single = q.maybeSingle = () => execute(true);
      q.then = (resolve: any, reject: any) => execute().then(resolve, reject);
      return q;
    },
  },
}));
import { handler as survey } from '../netlify/functions/survey';
import { handler as submissions } from '../netlify/functions/surveySubmission';
import { handler as rsvp } from '../netlify/functions/rsvp';
import {
  guestCancellationToken,
  verifyGuestCancellationToken,
} from '../netlify/utils/guestRsvp';
import { validateSurveyAnswers } from '../netlify/validation/surveyAnswers';
import { nextUTCOccurrenceDateStr, getEpisodeNumber } from '../utils/recurring';
const user = { id: '42', name: 'Member', role: 'member' };
const invoke = (
  handler: any,
  action: string,
  input: any = {},
  method = 'POST'
) =>
  handler(
    {
      httpMethod: method,
      headers: { 'user-agent': 'real-agent' },
      queryStringParameters: { functionName: action, ...input },
      body: JSON.stringify({ functionName: action, ...input }),
    },
    {}
  );
const body = (r: any) => JSON.parse(r.body).data;
const answers = [{ questionId: 'question', value: 'Answer' }];
beforeEach(() => {
  vi.useRealTimers();
  vi.stubEnv('JWT_SECRET', 'test-only-guest-capability-secret');
  db.user = user;
  db.fail = '';
  db.throwWrite = '';
  db.calls = [];
  db.writes = [];
  db.counter = 100;
  db.tables = {
    users: [{ id: '42', email: 'verified@example.test' }],
    surveys: [
      {
        id: 'survey',
        is_active: true,
        allow_multiple_submissions: false,
        meetup_id: null,
        is_for_meetup: false,
      },
    ],
    survey_questions: [
      { id: 'question', survey_id: 'survey', type: 'text', required: true },
    ],
    survey_submissions: [],
    survey_answers: [],
    meetups: [
      {
        id: 1,
        survey_id: 'survey',
        skip_login: true,
        is_recurring: false,
        status: 'upcoming',
      },
    ],
    meetup_episodes: [],
    meetup_rsvps: [],
  };
});

describe.each([
  ['legacy', survey],
  ['new', submissions],
])('%s survey submission boundary', (_name, handler) => {
  it('uses verified account/email and request metadata, ignoring forged identity', async () => {
    const res = await invoke(handler, 'submit', {
      survey_id: 'survey',
      answers,
      respondent_id: 'victim',
      email: 'victim@example.test',
      respondent_email: 'victim@example.test',
      ip_address: 'forged',
      user_agent: 'forged',
    });
    expect(res.statusCode).toBe(200);
    expect(db.tables.survey_submissions[0]).toMatchObject({
      respondent_id: '42',
      respondent_email: 'verified@example.test',
      user_agent: 'real-agent',
      ip_address: 'unknown',
    });
  });
  it('rejects unauthenticated impersonation with no writes', async () => {
    db.user = null;
    expect(
      (
        await invoke(handler, 'submit', {
          survey_id: 'survey',
          answers,
          respondent_id: '42',
        })
      ).statusCode
    ).toBe(401);
    expect(db.writes).toEqual([]);
  });
  it.each(['GET', 'PUT', 'DELETE'])(
    'rejects %s submissions',
    async (method) => {
      expect(
        (
          await invoke(
            handler,
            'submit',
            { survey_id: 'survey', answers },
            method
          )
        ).statusCode
      ).toBe(405);
      expect(db.writes).toEqual([]);
    }
  );
  it.each([
    'closed',
    'future',
    'expired',
    'duplicate',
    'lookup failure',
    'question failure',
  ])('enforces %s before writing', async (mode) => {
    if (mode === 'closed') db.tables.surveys[0].is_active = false;
    if (mode === 'future') db.tables.surveys[0].start_date = '2099-01-01';
    if (mode === 'expired') db.tables.surveys[0].end_date = '2000-01-01';
    if (mode === 'duplicate')
      db.tables.survey_submissions.push({
        id: 'old',
        survey_id: 'survey',
        respondent_id: '42',
      });
    if (mode === 'lookup failure') db.fail = 'survey_submissions:select';
    if (mode === 'question failure') db.fail = 'survey_questions:select';
    expect(
      (await invoke(handler, 'submit', { survey_id: 'survey', answers }))
        .statusCode
    ).toBe(mode.includes('failure') ? 500 : 400);
    expect(db.writes).toEqual([]);
  });
  it.each([
    [{ questionId: 'foreign', value: 'x' }],
    [
      { questionId: 'question', value: 'x' },
      { questionId: 'question', value: 'y' },
    ],
    [],
    [{ questionId: 'question', value: { attack: true } }],
  ])('rejects invalid answers: %j', async (...input) => {
    // it.each spreads each answer-list row as arguments.
    const list = Array.isArray(input[0]) ? input[0] : input;
    expect(
      (await invoke(handler, 'submit', { survey_id: 'survey', answers: list }))
        .statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
  });
  it('allows configured multiple submissions', async () => {
    db.tables.surveys[0].allow_multiple_submissions = true;
    expect(
      (await invoke(handler, 'submit', { survey_id: 'survey', answers }))
        .statusCode
    ).toBe(200);
    expect(
      (await invoke(handler, 'submit', { survey_id: 'survey', answers }))
        .statusCode
    ).toBe(200);
    expect(db.tables.survey_submissions).toHaveLength(2);
  });
});

describe('new-answer cleanup and stored answer formats', () => {
  it.each(['database error', 'network exception'])(
    'cleans only its new sheet after answer %s',
    async (mode) => {
      db.tables.survey_submissions = [
        { id: 'untouched', survey_id: 'else', respondent_id: '43' },
      ];
      if (mode === 'database error') db.fail = 'survey_answers:insert';
      else db.throwWrite = 'survey_answers:insert';
      expect(
        (await invoke(submissions, 'submit', { survey_id: 'survey', answers }))
          .statusCode
      ).toBe(500);
      expect(db.tables.survey_submissions).toEqual([
        { id: 'untouched', survey_id: 'else', respondent_id: '43' },
      ]);
    }
  );
  it('serializes choice arrays and returns them as arrays without coercing text answers', async () => {
    db.tables.survey_questions = [
      {
        id: 'question',
        survey_id: 'survey',
        type: 'multiple',
        options: [{ value: 'a' }, { value: 'b' }],
        required: true,
      },
    ];
    const res = await invoke(submissions, 'submit', {
      survey_id: 'survey',
      answers: [{ questionId: 'question', value: ['a', 'b'] }],
    });
    expect(res.statusCode).toBe(200);
    expect(db.tables.survey_answers[0].value).toBe('["a","b"]');
    db.tables.survey_answers[0].survey_questions = { type: 'multiple' };
    expect(
      body(
        await invoke(submissions, 'checkSubmission', { survey_id: 'survey' })
      ).answers[0].value
    ).toEqual(['a', 'b']);
    db.tables.survey_answers[0].survey_questions = { type: 'text' };
    db.tables.survey_answers[0].value = '123';
    expect(
      body(
        await invoke(submissions, 'checkSubmission', { survey_id: 'survey' })
      ).answers[0].value
    ).toBe('123');
  });
});

describe('registration and answer-sheet linkage', () => {
  it('creates and links the signed-in caller’s answers in one server flow', async () => {
    const res = await invoke(rsvp, 'create', {
      meetup_id: 1,
      name: 'Name',
      answers,
      user_id: 'victim',
    });
    expect(res.statusCode).toBe(200);
    expect(db.tables.meetup_rsvps[0].user_id).toBe('42');
    expect(db.tables.meetup_rsvps[0].survey_submission_id).toBe(
      db.tables.survey_submissions[0].id
    );
  });
  it('creates an isolated guest and a scoped cancel receipt', async () => {
    db.user = null;
    const res = await invoke(rsvp, 'create', {
      meetup_id: 1,
      name: 'Guest',
      answers,
      user_id: '42',
      respondent_id: '42',
    });
    expect(res.statusCode).toBe(200);
    expect(db.tables.survey_submissions[0].respondent_id).toMatch(
      /^guest_[0-9a-f-]{36}$/
    );
    expect(db.tables.meetup_rsvps[0].user_id).toBeNull();
    expect(body(res).guest_cancel_token).toBeTruthy();
  });
  it.each(['other owner', 'other survey', 'guest', 'unrelated activity'])(
    'rejects %s supplied answer sheets and never deletes them',
    async (mode) => {
      db.tables.survey_submissions = [
        {
          id: 'provided',
          survey_id: mode === 'other survey' ? 'else' : 'survey',
          respondent_id: mode === 'other owner' ? '43' : '42',
        },
      ];
      if (mode === 'guest') db.user = null;
      if (mode === 'unrelated activity') db.tables.surveys[0].meetup_id = 2;
      const res = await invoke(rsvp, 'create', {
        meetup_id: 1,
        name: 'Name',
        survey_submission_id: 'provided',
      });
      expect([400, 403]).toContain(res.statusCode);
      expect(db.writes).toEqual([]);
      expect(db.tables.survey_submissions).toHaveLength(1);
    }
  );
  it('keeps an existing owned answer sheet even when RSVP persistence fails', async () => {
    db.tables.survey_submissions = [
      { id: 'provided', survey_id: 'survey', respondent_id: '42' },
    ];
    db.fail = 'meetup_rsvps:insert';
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Name',
          survey_submission_id: 'provided',
        })
      ).statusCode
    ).toBe(500);
    expect(db.tables.survey_submissions).toHaveLength(1);
    expect(
      db.writes.some(
        (w) => w.table === 'survey_submissions' && w.operation === 'delete'
      )
    ).toBe(false);
  });
  it.each(['database error', 'network exception'])(
    'cleans up only a newly created answer sheet on %s',
    async (mode) => {
      db.tables.survey_submissions.push({
        id: 'untouched',
        survey_id: 'else',
        respondent_id: '43',
      });
      if (mode === 'database error') db.fail = 'meetup_rsvps:insert';
      else db.throwWrite = 'meetup_rsvps:insert';
      expect(
        (await invoke(rsvp, 'create', { meetup_id: 1, name: 'Name', answers }))
          .statusCode
      ).toBe(500);
      expect(db.tables.survey_submissions).toEqual([
        { id: 'untouched', survey_id: 'else', respondent_id: '43' },
      ]);
    }
  );
  it('reuses its own sheet for a new activity registration without duplicating it', async () => {
    db.tables.survey_submissions = [
      { id: 'own', survey_id: 'survey', respondent_id: '42' },
    ];
    expect(
      (await invoke(rsvp, 'create', { meetup_id: 1, name: 'Name', answers }))
        .statusCode
    ).toBe(200);
    expect(db.tables.survey_submissions).toHaveLength(1);
    expect(db.tables.meetup_rsvps[0].survey_submission_id).toBe('own');
  });
  it('never compensates by deleting a reused own sheet when signup fails', async () => {
    db.tables.survey_submissions = [
      { id: 'own', survey_id: 'survey', respondent_id: '42' },
    ];
    db.fail = 'meetup_rsvps:insert';
    expect(
      (await invoke(rsvp, 'create', { meetup_id: 1, name: 'Name', answers }))
        .statusCode
    ).toBe(500);
    expect(db.tables.survey_submissions).toHaveLength(1);
    expect(
      db.writes.some(
        (w) => w.table === 'survey_submissions' && w.operation === 'delete'
      )
    ).toBe(false);
  });
  it('does not accept questionless signup when a required questionnaire exists', async () => {
    expect(
      (await invoke(rsvp, 'create', { meetup_id: 1, name: 'Name' })).statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
  });
  it('does not allow guests when login is required', async () => {
    db.user = null;
    db.tables.meetups[0].skip_login = false;
    expect(
      (await invoke(rsvp, 'create', { meetup_id: 1, name: 'Guest', answers }))
        .statusCode
    ).toBe(401);
    expect(db.writes).toEqual([]);
  });
  it('fails before writes if guest signing is unavailable', async () => {
    db.user = null;
    vi.stubEnv('JWT_SECRET', '');
    expect(
      (await invoke(rsvp, 'create', { meetup_id: 1, name: 'Guest', answers }))
        .statusCode
    ).toBe(500);
    expect(db.writes).toEqual([]);
  });
});

describe('answer update validation', () => {
  beforeEach(() => {
    db.tables.survey_submissions = [
      { id: 'own', survey_id: 'survey', respondent_id: '42' },
    ];
  });
  it.each([
    ['foreign question', [{ questionId: 'foreign', value: 'x' }]],
    ['missing required', []],
    ['invalid type', [{ questionId: 'question', value: 3 }]],
  ])('rejects %s before writing', async (_name, a) => {
    expect(
      (await invoke(submissions, 'update', { id: 'own', answers: a }, 'PUT'))
        .statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
  });
  it('rejects changes to a closed questionnaire', async () => {
    db.tables.surveys[0].is_active = false;
    expect(
      (await invoke(submissions, 'update', { id: 'own', answers }, 'PUT'))
        .statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
  });
  it('keeps valid owned edits working', async () => {
    expect(
      (await invoke(submissions, 'update', { id: 'own', answers }, 'PUT'))
        .statusCode
    ).toBe(200);
  });
});

describe('guest cancel capabilities', () => {
  it('can only cancel its bound guest record even with forged IDs', async () => {
    db.tables.meetup_rsvps = [
      { id: 'a', meetup_id: 1, user_id: null, status: 'confirmed' },
      { id: 'b', meetup_id: 1, user_id: null, status: 'confirmed' },
    ];
    const token = guestCancellationToken('a', 1);
    db.user = null;
    expect(
      (
        await invoke(rsvp, 'cancelGuest', {
          guest_cancel_token: token,
          id: 'b',
          meetup_id: 2,
        })
      ).statusCode
    ).toBe(200);
    expect(db.tables.meetup_rsvps.map((r) => r.status)).toEqual([
      'cancelled',
      'confirmed',
    ]);
  });
  it('cannot cancel an account-owned record', async () => {
    db.tables.meetup_rsvps = [
      { id: 'a', meetup_id: 1, user_id: '42', status: 'confirmed' },
    ];
    expect(
      (
        await invoke(rsvp, 'cancelGuest', {
          guest_cancel_token: guestCancellationToken('a', 1),
        })
      ).statusCode
    ).toBe(404);
    expect(db.tables.meetup_rsvps[0].status).toBe('confirmed');
  });
  it('rejects tampering, expiry, missing token and GET without queries', async () => {
    const token = guestCancellationToken('a', 1);
    for (const invalid of [
      undefined,
      '',
      token + 'x',
      token.replace(token[0], token[0] === 'a' ? 'b' : 'a'),
    ])
      expect(
        (await invoke(rsvp, 'cancelGuest', { guest_cancel_token: invalid }))
          .statusCode
      ).toBe(403);
    expect(
      (await invoke(rsvp, 'cancelGuest', { guest_cancel_token: token }, 'GET'))
        .statusCode
    ).toBe(405);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 86400000);
    expect(verifyGuestCancellationToken(token)).toBeNull();
    expect(db.calls).toEqual([]);
  });
});

describe('server-controlled episodes', () => {
  beforeEach(() => {
    db.tables.meetups[0] = {
      ...db.tables.meetups[0],
      survey_id: null,
      is_recurring: true,
      datetime: '2026-01-02T12:00:00Z',
      episode_start_date: '2026-01-02',
    };
  });
  it('does not overwrite an organizer-edited episode from a signup request', async () => {
    db.tables.meetup_episodes = [
      {
        id: 9,
        meetup_id: 1,
        date: '2026-10-23',
        episode_number: 43,
        theme: 'Organizer title',
      },
    ];
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Name',
          episode_date: '2026-10-23',
          episode_number: 99,
        })
      ).statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
    expect(db.tables.meetup_episodes[0].theme).toBe('Organizer title');
  });
  it('accepts a stored matching occurrence without episode writes', async () => {
    db.tables.meetup_episodes = [
      { id: 9, meetup_id: 1, date: '2026-10-23', episode_number: 43 },
    ];
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Name',
          episode_date: '2026-10-23',
          episode_number: 43,
        })
      ).statusCode
    ).toBe(200);
    expect(db.writes.some((w) => w.table === 'meetup_episodes')).toBe(false);
  });
  it('persists only the server-derived virtual next occurrence', async () => {
    const m = db.tables.meetups[0];
    const date = nextUTCOccurrenceDateStr(m.datetime);
    const number = getEpisodeNumber(m.episode_start_date, date);
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Name',
          episode_date: date,
          episode_number: number,
        })
      ).statusCode
    ).toBe(200);
    expect(db.tables.meetup_episodes[0]).toMatchObject({
      date,
      episode_number: number,
    });
  });
  it('never overwrites an older date on an episode-number conflict', async () => {
    const m = db.tables.meetups[0];
    const date = nextUTCOccurrenceDateStr(m.datetime);
    const number = getEpisodeNumber(m.episode_start_date, date);
    db.tables.meetup_episodes = [
      {
        id: 9,
        meetup_id: 1,
        date: '2025-01-03',
        episode_number: number,
        theme: 'Keep',
      },
    ];
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Name',
          episode_date: date,
          episode_number: number,
        })
      ).statusCode
    ).toBe(409);
    expect(db.tables.meetup_episodes[0]).toMatchObject({
      date: '2025-01-03',
      theme: 'Keep',
    });
    expect(db.tables.meetup_rsvps).toEqual([]);
  });
  it('rejects arbitrary new occurrences', async () => {
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Name',
          episode_date: '2099-01-01',
          episode_number: 1,
        })
      ).statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
  });
});

describe('typed and required answers', () => {
  const q = (type: string, extra: any = {}) => [
    { id: 'q', type, required: true, ...extra },
  ];
  it.each([
    ['single', 'invalid', { options: [{ value: 'a' }] }],
    ['multiple', ['a', 'a'], { options: [{ value: 'a' }] }],
    ['multiple', ['unknown'], { options: [{ value: 'a' }] }],
    ['rating', 0, {}],
    ['rating', 6, {}],
    ['rating', '3', {}],
    ['date', '2026-02-30', {}],
    ['text', {}, {}],
    ['text', ' ', {}],
  ])('rejects invalid %s', (type, value, extra) => {
    expect(
      validateSurveyAnswers(q(type as string, extra), [
        { questionId: 'q', value },
      ])
    ).toBeTruthy();
  });
  it.each([
    ['single', 'a', { options: [{ value: 'a' }] }],
    ['multiple', ['a'], { options: [{ value: 'a' }] }],
    ['rating', 3, {}],
    ['date', '2026-10-23', {}],
    ['text', 'text', {}],
  ])('accepts valid %s', (type, value, extra) => {
    expect(
      validateSurveyAnswers(q(type as string, extra), [
        { questionId: 'q', value },
      ])
    ).toBeNull();
  });
});
