// Quota/delivery behavior is exercised by mailSecurity tests and SQL integration tests.
vi.mock('../netlify/utils/mailProtection', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  protectAction: vi.fn(async () => {}),
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; role: string },
  tables: {} as Record<string, any[]>,
  queries: [] as string[],
  writes: [] as Array<{ table: string; operation: string; value: any }>,
  sendConfirm: vi.fn(),
  sendReject: vi.fn(),
}));

vi.mock('../netlify/utils/server', () => ({
  getAuthenticatedUser: vi.fn(async () => mocks.user),
  getFunctionNameFromEvent: (event: any) =>
    event.httpMethod === 'GET'
      ? event.queryStringParameters.functionName
      : JSON.parse(event.body || '{}').functionName,
  getDataFromEvent: (event: any) =>
    event.httpMethod === 'GET'
      ? event.queryStringParameters
      : JSON.parse(event.body || '{}'),
  createSuccessResponse: (data: any, statusCode = 200) => ({
    statusCode,
    body: JSON.stringify({ success: true, data }),
  }),
  createErrorResponse: (error: string, statusCode = 400) => ({
    statusCode,
    body: JSON.stringify({ success: false, error }),
  }),
  handleOptionsRequest: () => ({ statusCode: 200, body: '' }),
}));

vi.mock('../netlify/utils/email', () => ({
  sendRSVPConfirmEmail: mocks.sendConfirm,
  sendRSVPRejectEmail: mocks.sendReject,
  sendCompletionCertificateEmail: vi.fn(),
}));

// Query fixtures apply the actual ownership filters, rather than always
// returning a row. No database or email provider is contacted.
vi.mock('../database/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mocks.queries.push(table);
      let rows = [...(mocks.tables[table] || [])];
      const query: any = {};
      query.select = () => query;
      query.eq = (column: string, value: any) => {
        rows = rows.filter((row) => String(row[column]) === String(value));
        return query;
      };
      query.in = (column: string, values: any[]) => {
        rows = rows.filter((row) =>
          values.some((value) => String(row[column]) === String(value))
        );
        return query;
      };
      query.order = () => query;
      query.range = (from: number, to: number) => {
        rows = rows.slice(from, to + 1);
        return query;
      };
      query.limit = (limit: number) => {
        rows = rows.slice(0, limit);
        return query;
      };
      for (const operation of ['insert', 'upsert', 'update', 'delete']) {
        query[operation] = (value: any) => {
          mocks.writes.push({ table, operation, value });
          return query;
        };
      }
      query.single = query.maybeSingle = async () => ({
        data: rows[0] || null,
        error: null,
      });
      query.then = (resolve: any, reject: any) =>
        Promise.resolve({ data: rows, count: rows.length, error: null }).then(
          resolve,
          reject
        );
      return query;
    },
  },
}));

import { handler as participants } from '../netlify/functions/participants';
import { handler as submissions } from '../netlify/functions/surveySubmission';

const member = { id: '42', name: 'Member', role: 'member' };
const organizer = { id: '7', name: 'Verified Organizer', role: 'organizer' };
const request = (action: string, input: any = {}, method = 'POST') =>
  ({
    httpMethod: method,
    headers: {},
    queryStringParameters: { functionName: action, ...input },
    body: JSON.stringify({ functionName: action, ...input }),
  }) as any;
const body = (response: any) => JSON.parse(response.body).data;

beforeEach(() => {
  mocks.user = null;
  mocks.queries.length = 0;
  mocks.writes.length = 0;
  mocks.sendConfirm.mockReset();
  mocks.sendReject.mockReset();
  mocks.tables = {
    surveys: [{ id: 'survey-a', created_by: '42', is_active: true }],
    survey_submissions: [
      {
        id: 'own',
        survey_id: 'survey-a',
        respondent_id: '42',
        respondent_email: 'self@example.test',
        submitted_at: '2026-10-22',
        surveys: { title: 'Own survey' },
      },
      { id: 'other', survey_id: 'survey-a', respondent_id: '43' },
    ],
    survey_questions: [
      { id: 'question-a', survey_id: 'survey-a', type: 'text', required: true },
      { id: 'question-b', survey_id: 'survey-b', type: 'text' },
    ],
    survey_answers: [
      { submission_id: 'own', question_id: 'question-a', value: 'Own answer' },
    ],
    meetups: [{ id: 1, title: 'Meetup' }],
    meetup_rsvps: [
      {
        id: 10,
        meetup_id: 1,
        user_id: 42,
        status: 'confirmed',
        survey_submission_id: 'own',
      },
    ],
    users: [{ id: 42, email: 'self@example.test' }],
  };
});

describe('participant management permissions', () => {
  const actions = ['getParticipants', 'batchConfirm', 'batchReject'];
  it.each(actions)(
    '%s rejects visitors before any query or side effect',
    async (action) => {
      const response = await participants(
        request(action, { meetup_id: 1, rsvp_ids: [10], send_email: true }),
        {}
      );
      expect(response.statusCode).toBe(401);
      expect(mocks.queries).toEqual([]);
      expect(mocks.writes).toEqual([]);
      expect(mocks.sendConfirm).not.toHaveBeenCalled();
      expect(mocks.sendReject).not.toHaveBeenCalled();
    }
  );
  it.each(actions)('%s rejects ordinary members', async (action) => {
    mocks.user = member;
    const response = await participants(
      request(action, { meetup_id: 1, rsvp_ids: [10] }),
      {}
    );
    expect(response.statusCode).toBe(403);
    expect(mocks.queries).toEqual([]);
  });
  it('keeps the organizer participant list, email and answers working', async () => {
    mocks.user = organizer;
    const response = await participants(
      request('getParticipants', { meetup_id: 1 }),
      {}
    );
    expect(response.statusCode).toBe(200);
    expect(body(response).participants[0].email).toBe('self@example.test');
    expect(body(response).participants[0].survey_answers).toContain(
      'Own answer'
    );
  });
  it.each(['batchConfirm', 'batchReject'])(
    '%s uses the verified approver and retains email notifications',
    async (action) => {
      mocks.user = organizer;
      const response = await participants(
        request(action, {
          meetup_id: 1,
          rsvp_ids: [10],
          approved_by: 'Spoofed',
          send_email: true,
        }),
        {}
      );
      expect(response.statusCode).toBe(200);
      expect(mocks.writes[0].value.approved_by).toBe(organizer.name);
      const send =
        action === 'batchConfirm' ? mocks.sendConfirm : mocks.sendReject;
      expect(send).toHaveBeenCalledOnce();
    }
  );
  it.each(['batchConfirm', 'batchReject'])(
    '%s cannot write through GET',
    async (action) => {
      mocks.user = organizer;
      expect(
        (await participants(request(action, {}, 'GET'), {})).statusCode
      ).toBe(405);
      expect(mocks.queries).toEqual([]);
    }
  );
});

describe('survey submission permissions', () => {
  it.each(['getBySurveyId', 'getMySubmissions', 'checkSubmission', 'update'])(
    '%s requires authentication before querying data',
    async (action) => {
      expect((await submissions(request(action))).statusCode).toBe(401);
      expect(mocks.queries).toEqual([]);
    }
  );
  it.each([member, organizer])(
    'retains result access for creator or organizer: $role',
    async (user) => {
      mocks.user = user;
      const response = await submissions(
        request('getBySurveyId', { survey_id: 'survey-a' }, 'GET')
      );
      expect(response.statusCode).toBe(200);
      expect(body(response).records[0].answers[0].value).toBe('Own answer');
    }
  );
  it('denies unrelated members before reading submissions or answers', async () => {
    mocks.user = { ...member, id: '43' };
    const response = await submissions(
      request('getBySurveyId', { survey_id: 'survey-a' })
    );
    expect(response.statusCode).toBe(403);
    expect(mocks.queries).toEqual(['surveys']);
  });
  it.each([{ respondent_id: '43' }, { respondentId: '43' }, {}])(
    'my submissions use authenticated identity regardless of supplied aliases: %j',
    async (input) => {
      mocks.user = member;
      const response = await submissions(
        request('getMySubmissions', input, 'GET')
      );
      expect(response.statusCode).toBe(200);
      expect(body(response).records.map((row: any) => row.id)).toEqual(['own']);
    }
  );
  it('checks only the caller submission even when given another respondent', async () => {
    mocks.user = member;
    const response = await submissions(
      request(
        'checkSubmission',
        { survey_id: 'survey-a', respondent_id: '43' },
        'GET'
      )
    );
    expect(response.statusCode).toBe(200);
    expect(body(response).id).toBe('own');
    expect(body(response).answers[0].value).toBe('Own answer');
  });
  it('returns an empty successful check for a first-time respondent', async () => {
    mocks.user = { ...member, id: '99' };
    const response = await submissions(
      request('checkSubmission', { survey_id: 'survey-a' })
    );
    expect(response.statusCode).toBe(200);
    expect(body(response)).toBeNull();
  });
  it('allows the respondent to update their own answers', async () => {
    mocks.user = member;
    const response = await submissions(
      request(
        'update',
        { id: 'own', answers: [{ questionId: 'question-a', value: 'Edited' }] },
        'PUT'
      )
    );
    expect(response.statusCode).toBe(200);
    expect(mocks.writes).toEqual([
      {
        table: 'survey_answers',
        operation: 'upsert',
        value: [
          {
            submission_id: 'own',
            question_id: 'question-a',
            value: 'Edited',
          },
        ],
      },
    ]);
  });
  it.each([member, organizer])(
    'denies edits to other respondents, including organizers: $role',
    async (user) => {
      mocks.user = user;
      const response = await submissions(
        request(
          'update',
          {
            id: 'other',
            answers: [{ questionId: 'question-a', value: 'Edited' }],
          },
          'PUT'
        )
      );
      expect(response.statusCode).toBe(404);
      expect(mocks.writes).toEqual([]);
    }
  );
  it('rejects a cross-survey question before any write', async () => {
    mocks.user = member;
    const response = await submissions(
      request(
        'update',
        { id: 'own', answers: [{ questionId: 'question-b', value: 'Edited' }] },
        'PUT'
      )
    );
    expect(response.statusCode).toBe(400);
    expect(mocks.writes).toEqual([]);
  });
  it('rejects duplicate question IDs without writing', async () => {
    mocks.user = member;
    const response = await submissions(
      request(
        'update',
        {
          id: 'own',
          answers: [
            { questionId: 'question-a', value: 'one' },
            { questionId: 'question-a', value: 'two' },
          ],
        },
        'PUT'
      )
    );
    expect(response.statusCode).toBe(400);
    expect(mocks.writes).toEqual([]);
  });
  it('does not permit answer updates through GET', async () => {
    mocks.user = member;
    expect((await submissions(request('update', {}, 'GET'))).statusCode).toBe(
      405
    );
    expect(mocks.writes).toEqual([]);
  });
  it('keeps OPTIONS public without accessing data', async () => {
    expect((await submissions(request('', {}, 'OPTIONS'))).statusCode).toBe(
      200
    );
    expect(mocks.queries).toEqual([]);
  });
});
