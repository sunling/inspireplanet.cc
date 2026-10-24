import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; role: string },
  tables: {} as Record<string, any[]>,
  queries: [] as string[],
  writes: [] as Array<{
    table: string;
    operation: string;
    value: any;
    filters: any[];
  }>,
  sendConfirm: vi.fn(),
  sendReject: vi.fn(),
}));

vi.mock('../netlify/utils/server', () => ({
  getAuthenticatedUser: async () => db.user,
  getUserIdFromAuth: async () => db.user?.id || null,
  getFunctionNameFromEvent: (e: any) =>
    ['GET', 'DELETE'].includes(e.httpMethod)
      ? e.queryStringParameters.functionName
      : JSON.parse(e.body || '{}').functionName,
  getDataFromEvent: (e: any) =>
    ['GET', 'DELETE'].includes(e.httpMethod)
      ? e.queryStringParameters
      : JSON.parse(e.body || '{}'),
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
  sendRSVPConfirmEmail: db.sendConfirm,
  sendRSVPRejectEmail: db.sendReject,
  sendSpeakerConfirmEmail: vi.fn(),
}));
vi.mock('../netlify/utils/githubWeeklyCards', () => ({
  getAllWeeklyCards: async () => [],
  getEpisodeSummary: async () => null,
  getWeeklyCardsByEpisode: async () => [],
}));
vi.mock('../netlify/utils/imageSearch', () => ({ searchImageByText: vi.fn() }));
vi.mock('../database/supabase', () => ({
  supabase: {
    from: (table: string) => {
      db.queries.push(table);
      let rows = [...(db.tables[table] || [])];
      const filters: any[] = [];
      const q: any = {};
      q.select = () => q;
      q.eq = (column: string, value: any) => {
        filters.push([column, value]);
        rows = rows.filter((row) => String(row[column]) === String(value));
        return q;
      };
      q.neq = (column: string, value: any) => {
        rows = rows.filter((row) => String(row[column]) !== String(value));
        return q;
      };
      q.in = (column: string, values: any[]) => {
        filters.push([column, values]);
        rows = rows.filter((row) =>
          values.some((value) => String(value) === String(row[column]))
        );
        return q;
      };
      q.order = () => q;
      q.range = (a: number, b: number) => {
        rows = rows.slice(a, b + 1);
        return q;
      };
      q.limit = (n: number) => {
        rows = rows.slice(0, n);
        return q;
      };
      for (const operation of ['insert', 'upsert', 'update', 'delete']) {
        q[operation] = (value: any) => {
          db.writes.push({ table, operation, value, filters });
          if (operation === 'insert' || operation === 'upsert') {
            rows = (Array.isArray(value) ? value : [value]).map((row) => ({
              id: 100,
              ...row,
            }));
          }
          return q;
        };
      }
      q.single = q.maybeSingle = async () => ({
        data: rows[0] || null,
        error: null,
      });
      q.then = (resolve: any, reject: any) =>
        Promise.resolve({ data: rows, error: null, count: rows.length }).then(
          resolve,
          reject
        );
      return q;
    },
  },
}));

import { handler as meetup } from '../netlify/functions/meetup';
import { handler as survey } from '../netlify/functions/survey';
import { handler as rsvp } from '../netlify/functions/rsvp';
import { handler as speaker } from '../netlify/functions/speakerSignups';
import { handler as weekly } from '../netlify/functions/weeklyCards';
import { handler as upload } from '../netlify/functions/uploadCard';
import { handler as workshop } from '../netlify/functions/workshop';

const owner = { id: '42', name: 'Owner', role: 'member' };
const other = { ...owner, id: '43', name: 'Other' };
const organizer = { id: '7', name: 'Organizer', role: 'organizer' };
const request = (action: string, data: any = {}, method = 'POST') =>
  ({
    httpMethod: method,
    headers: {},
    queryStringParameters: { functionName: action, ...data },
    body: JSON.stringify({ functionName: action, ...data }),
  }) as any;
const invoke = (
  handler: any,
  action: string,
  data: any = {},
  method = 'POST'
) => handler(request(action, data, method), {});
const payload = (response: any) => JSON.parse(response.body).data;
const question = { id: 'question', type: 'text', title: 'Question' };
const meetupInput = {
  id: 1,
  title: 'Updated',
  description: 'Description',
  mode: 'online',
  datetime: '2099-01-01',
  creator: 'Display',
  wechat_id: 'contact',
  user_id: '42',
};
const surveyInput = {
  id: 'survey',
  title: 'Updated',
  questions: [question],
  createdBy: '42',
};
const cardInput = {
  name: 'Name',
  title: 'Title',
  quote: 'Quote',
  detail: 'Detail',
  episode: 'EP1',
};

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'test-only-guest-capability-key');
  db.user = null;
  db.queries.length = 0;
  db.writes.length = 0;
  db.sendConfirm.mockReset();
  db.sendReject.mockReset();
  db.tables = {
    meetups: [
      {
        id: 1,
        user_id: 42,
        title: 'Meetup',
        status: 'active',
        survey_id: null,
        skip_login: true,
      },
    ],
    surveys: [{ id: 'survey', created_by: '42', is_active: true }],
    survey_questions: [{ id: 'question', survey_id: 'survey' }],
    meetup_rsvps: [
      {
        id: 10,
        meetup_id: 1,
        user_id: 42,
        wechat_id: 'same',
        status: 'confirmed',
      },
      {
        id: 11,
        meetup_id: 1,
        user_id: 43,
        wechat_id: 'same',
        status: 'confirmed',
      },
      {
        id: 12,
        meetup_id: 1,
        user_id: null,
        wechat_id: 'guest',
        status: 'confirmed',
      },
    ],
    speaker_signups: [
      { id: 1, meetup_id: 1, episode_number: 1, status: 'pending' },
    ],
    users: [],
    meetup_episodes: [],
  };
});

describe('F02 unauthenticated management actions', () => {
  it.each([
    ['meetup.create', meetup, 'create', meetupInput],
    ['meetup.update', meetup, 'update', meetupInput],
    ['meetup.delete', meetup, 'delete', { id: 1 }],
    ['survey.create', survey, 'create', surveyInput],
    ['survey.update', survey, 'update', surveyInput],
    ['survey.delete', survey, 'delete', { id: 'survey' }],
    ['survey.toggleActive', survey, 'toggleActive', { id: 'survey' }],
    [
      'rsvp.update',
      rsvp,
      'update',
      { id: 10, application_status: 'approved', send_email: true },
    ],
    ['rsvp.delete', rsvp, 'delete', { id: 10 }],
    ['rsvp.cancel', rsvp, 'cancel', { id: 10 }],
    [
      'rsvp.cancelByMeetupWechat',
      rsvp,
      'cancelByMeetupWechat',
      { meetup_id: 1, wechat_id: 'same' },
    ],
    [
      'speaker.updateStatus',
      speaker,
      'updateStatus',
      { id: 1, status: 'confirmed' },
    ],
    ['weekly.create', weekly, 'create', cardInput],
    ['upload.create', upload, 'create', { record: cardInput }],
    ['workshop.getAll', workshop, 'getAll', {}],
  ])(
    '%s rejects before any data query or side effect',
    async (_name, handler, action, data) => {
      const response = await invoke(handler, action, data);
      expect(response.statusCode).toBe(401);
      expect(db.queries).toEqual([]);
      expect(db.writes).toEqual([]);
      expect(db.sendConfirm).not.toHaveBeenCalled();
      expect(db.sendReject).not.toHaveBeenCalled();
    }
  );
});

describe('resource managers', () => {
  it.each([
    [meetup, 'update', meetupInput],
    [meetup, 'delete', { id: 1 }],
    [survey, 'update', surveyInput],
    [survey, 'delete', { id: 'survey' }],
    [survey, 'toggleActive', { id: 'survey' }],
  ])(
    'rejects forged owner IDs and display names',
    async (handler, action, data) => {
      db.user = other;
      expect((await invoke(handler, action, data)).statusCode).toBe(403);
      expect(db.writes).toEqual([]);
    }
  );
  it.each([owner, organizer])(
    'retains owner/organizer meetup and survey management: $role',
    async (user) => {
      db.user = user;
      for (const [handler, action, data] of [
        [meetup, 'update', meetupInput],
        [meetup, 'delete', { id: 1 }],
        [survey, 'update', surveyInput],
        [survey, 'toggleActive', { id: 'survey' }],
        [survey, 'delete', { id: 'survey' }],
      ] as const)
        expect((await invoke(handler, action, data)).statusCode).toBe(200);
    }
  );
  it('records the verified creator on new activities and surveys', async () => {
    db.user = owner;
    expect(
      (await invoke(meetup, 'create', { ...meetupInput, user_id: '43' }))
        .statusCode
    ).toBe(200);
    expect(db.writes.find((x) => x.table === 'meetups')?.value[0].user_id).toBe(
      owner.id
    );
    expect(
      (await invoke(survey, 'create', { ...surveyInput, createdBy: '43' }))
        .statusCode
    ).toBe(200);
    expect(db.writes.find((x) => x.table === 'surveys')?.value.created_by).toBe(
      owner.id
    );
  });
  it('does not allow a member to attach or edit someone else’s survey through meetup editing', async () => {
    db.user = owner;
    db.tables.surveys[0].created_by = '43';
    expect(
      (await invoke(meetup, 'update', { ...meetupInput, survey_id: 'survey' }))
        .statusCode
    ).toBe(403);
    db.tables.meetups[0].survey_id = 'survey';
    expect(
      (
        await invoke(meetup, 'update', {
          ...meetupInput,
          survey_questions: [question],
        })
      ).statusCode
    ).toBe(403);
    expect(db.writes).toEqual([]);
  });
  it('does not link a survey into another member’s activity', async () => {
    db.user = owner;
    db.tables.meetups[0].user_id = 43;
    expect(
      (await invoke(survey, 'create', { ...surveyInput, meetup_id: 1 }))
        .statusCode
    ).toBe(403);
    expect(
      (await invoke(survey, 'update', { ...surveyInput, meetup_id: 1 }))
        .statusCode
    ).toBe(403);
    expect(db.writes).toEqual([]);
  });
});

describe('registration cancellation', () => {
  it.each(['cancel', 'delete', 'cancelByMeetupWechat'])(
    '%s only cancels the caller’s rows',
    async (action) => {
      db.user = owner;
      const input =
        action === 'cancelByMeetupWechat'
          ? { meetup_id: 1, wechat_id: 'same' }
          : { id: 10 };
      const response = await invoke(rsvp, action, input, 'DELETE');
      expect(response.statusCode).toBe(200);
      expect(payload(response).affected).toBe(1);
      expect(db.writes[0].filters).toContainEqual(['id', [10]]);
      expect(db.writes[0].filters).toContainEqual(['user_id', owner.id]);
    }
  );
  it.each([11, 12])(
    'denies another member or unbound guest record: %s',
    async (id) => {
      db.user = owner;
      expect((await invoke(rsvp, 'cancel', { id }, 'DELETE')).statusCode).toBe(
        404
      );
      expect(db.writes).toEqual([]);
    }
  );
  it('does not treat a matching WeChat ID as proof of guest ownership', async () => {
    db.user = owner;
    expect(
      (
        await invoke(
          rsvp,
          'cancelByMeetupWechat',
          { meetup_id: 1, wechat_id: 'guest' },
          'DELETE'
        )
      ).statusCode
    ).toBe(404);
    expect(db.writes).toEqual([]);
  });
  it('allows organizers to cancel a guest registration', async () => {
    db.user = organizer;
    expect(
      (await invoke(rsvp, 'cancel', { id: 12 }, 'DELETE')).statusCode
    ).toBe(200);
  });
});

describe('organizer-only writes', () => {
  const cases = [
    [rsvp, 'update', { id: 10, application_status: 'approved' }],
    [speaker, 'updateStatus', { id: 1, status: 'confirmed' }],
    [weekly, 'create', cardInput],
    [upload, 'create', { record: cardInput }],
  ] as const;
  it.each(cases)('denies ordinary members', async (handler, action, data) => {
    db.user = owner;
    expect((await invoke(handler, action, data)).statusCode).toBe(403);
    expect(db.writes).toEqual([]);
  });
  it.each(cases)('allows organizers', async (handler, action, data) => {
    db.user = organizer;
    expect((await invoke(handler, action, data)).statusCode).toBe(200);
    expect(db.writes.length).toBeGreaterThan(0);
  });
  it('ignores a spoofed approval actor', async () => {
    db.user = organizer;
    await invoke(rsvp, 'update', {
      id: 10,
      approved_by: 'Spoofed',
      application_status: 'approved',
    });
    expect(db.writes[0].value.approved_by).toBe(organizer.name);
  });
  it('validates speaker status', async () => {
    db.user = organizer;
    expect(
      (await invoke(speaker, 'updateStatus', { id: 1, status: 'invalid' }))
        .statusCode
    ).toBe(400);
    expect(db.writes).toEqual([]);
  });
});

describe('HTTP methods and public compatibility', () => {
  it.each([
    [meetup, 'create'],
    [meetup, 'update'],
    [meetup, 'delete'],
    [survey, 'create'],
    [survey, 'update'],
    [survey, 'delete'],
    [survey, 'toggleActive'],
    [rsvp, 'update'],
    [rsvp, 'cancel'],
    [rsvp, 'delete'],
    [rsvp, 'cancelByMeetupWechat'],
    [speaker, 'updateStatus'],
    [weekly, 'create'],
    [upload, 'create'],
  ])(
    'does not run management mutations through GET',
    async (handler, action) => {
      db.user = organizer;
      expect((await invoke(handler, action, {}, 'GET')).statusCode).toBe(405);
      expect(db.queries).toEqual([]);
      expect(db.writes).toEqual([]);
    }
  );
  it('retains public survey details', async () => {
    expect(
      (await invoke(survey, 'getById', { id: 'survey' }, 'GET')).statusCode
    ).toBe(200);
    expect(db.writes).toEqual([]);
  });
  it('retains public speaker signups and public listing', async () => {
    expect(
      (
        await invoke(speaker, 'create', {
          meetup_id: 1,
          episode_number: 1,
          name: 'Guest',
          topic: 'Topic',
        })
      ).statusCode
    ).toBe(200);
    expect(
      (
        await invoke(
          speaker,
          'getByEpisode',
          { meetup_id: 1, episode_number: 1 },
          'GET'
        )
      ).statusCode
    ).toBe(200);
  });
  it('retains guest RSVP only when the activity allows it and never accepts a supplied user ID', async () => {
    const response = await invoke(rsvp, 'create', {
      meetup_id: 1,
      name: 'Guest',
      user_id: '43',
    });
    expect(response.statusCode).toBe(200);
    expect(
      db.writes.find((x) => x.table === 'meetup_rsvps')?.value[0].user_id
    ).toBeNull();
  });
  it('requires login for an activity that disallows guests', async () => {
    db.tables.meetups[0].skip_login = false;
    expect(
      (
        await invoke(rsvp, 'create', {
          meetup_id: 1,
          name: 'Guest',
          user_id: '43',
        })
      ).statusCode
    ).toBe(401);
    expect(db.writes).toEqual([]);
  });
  it('does not trust a public workshop client’s paid flag', async () => {
    expect(
      (
        await invoke(workshop, 'create', {
          name: 'Guest',
          wechat: 'contact',
          paid: true,
        })
      ).statusCode
    ).toBe(200);
    expect(db.writes[0].value[0].paid).toBe(false);
  });
});
