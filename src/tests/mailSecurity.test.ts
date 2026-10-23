import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  user: null as any,
  rpc: vi.fn(),
  send: vi.fn(),
  tables: {} as Record<string, any[]>,
  writes: [] as any[],
  image: vi.fn(),
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: m.send };
  },
}));
vi.mock('../netlify/utils/server', () => ({
  getAuthenticatedUser: async () => m.user,
  getUserIdFromAuth: async () => m.user?.id || null,
  getFunctionNameFromEvent: (e: any) =>
    e.httpMethod === 'GET'
      ? e.queryStringParameters?.functionName
      : JSON.parse(e.body || '{}').functionName,
  getDataFromEvent: (e: any) =>
    e.httpMethod === 'GET'
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
vi.mock('../netlify/utils/imageSearch', () => ({ searchImageByText: m.image }));
vi.mock('../database/supabase', () => ({
  supabase: {
    rpc: m.rpc,
    from: (table: string) => {
      let rows = [...(m.tables[table] || [])];
      let operation = 'select',
        value: any;
      const q: any = {};
      q.select = () => q;
      q.eq = (key: string, v: any) => {
        rows = rows.filter((r) => String(r[key]) === String(v));
        return q;
      };
      q.in = (key: string, values: any[]) => {
        rows = rows.filter((r) =>
          values.some((v) => String(v) === String(r[key]))
        );
        return q;
      };
      q.limit = () => q;
      q.order = () => q;
      q.range = () => q;
      q.insert = (v: any) => {
        operation = 'insert';
        value = v;
        rows = (Array.isArray(v) ? v : [v]).map((r) => ({ id: 9, ...r }));
        m.writes.push({ table, operation, value });
        return q;
      };
      q.update = (v: any) => {
        operation = 'update';
        value = v;
        m.writes.push({ table, operation, value });
        return q;
      };
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
import {
  sendProtectedEmail,
  protectAction,
  emailAddress,
  shortText,
  headerText,
} from '../netlify/utils/mailProtection';
import {
  sendRSVPConfirmEmail,
  sendSpeakerConfirmEmail,
  sendRSVPRejectEmail,
} from '../netlify/utils/email';
import { handler as contact } from '../netlify/functions/sendEmail';
import { handler as submission } from '../netlify/functions/sendSubmission';
import { handler as speaker } from '../netlify/functions/speakerSignups';
import { handler as participants } from '../netlify/functions/participants';
import { handler as searchImage } from '../netlify/functions/searchImage';
const req = (action: string, input: any = {}, method = 'POST') =>
  ({
    httpMethod: method,
    headers: { 'x-nf-client-connection-ip': '192.0.2.1' },
    queryStringParameters: { functionName: action, ...input },
    body: JSON.stringify({ functionName: action, ...input }),
  }) as any;
const invoke = (fn: any, action: string, input: any = {}, method = 'POST') =>
  fn(req(action, input, method), {});
const mail = {
  from: 'Site <noreply@example.test>',
  to: 'member@example.test',
  subject: 'Confirmation',
  html: '<p>Hello</p>',
};
const event = {
  to: 'member@example.test',
  name: 'Name',
  meetupTitle: 'Meetup',
  meetupId: 1,
  eventDatetime: '2026-10-23T12:00:00Z',
};
beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'test-only-mail-protection-key');
  vi.stubEnv('RESEND_API_KEY', 'test-only-provider-key');
  vi.stubEnv('CONTACT_EMAIL', 'fixed@example.test');
  vi.stubEnv('SUBMISSION_CC_EMAILS', 'cc@example.test');
  m.user = null;
  m.rpc.mockReset();
  m.send.mockReset();
  m.image.mockReset();
  m.writes = [];
  m.send.mockResolvedValue({ data: { id: 'provider-mail' }, error: null });
  m.rpc.mockImplementation(async (name: string) => ({
    data:
      name === 'consume_security_limits'
        ? true
        : name === 'claim_security_mail'
          ? { status: 'claimed', lease: 'test-lease' }
          : true,
    error: null,
  }));
  m.tables = {
    users: [{ id: 42, email: 'member@example.test' }],
    meetups: [
      {
        id: 1,
        title: 'Meetup',
        datetime: '2026-10-23T12:00:00Z',
        mode: 'online',
      },
    ],
    meetup_rsvps: [
      {
        id: 10,
        meetup_id: 1,
        user_id: 42,
        name: 'Member',
        status: 'confirmed',
      },
    ],
  };
});

describe('shared delivery controls', () => {
  it('claims shared state and supplies the provider idempotency key', async () => {
    await sendProtectedEmail(mail);
    expect(m.send).toHaveBeenCalledOnce();
    expect(m.send.mock.calls[0][1].idempotencyKey).toMatch(
      /^inspireplanet\/[a-f0-9]{64}$/
    );
    expect(m.rpc.mock.calls.map((c) => c[0])).toEqual([
      'claim_security_mail',
      'finish_security_mail',
    ]);
    expect(
      m.rpc.mock.calls[0][1].p_limits.every((q: any) =>
        /^[a-f0-9]{64}$/.test(q.key)
      )
    ).toBe(true);
    expect(JSON.stringify(m.rpc.mock.calls)).not.toContain(
      'member@example.test'
    );
  });
  it.each(['duplicate', 'busy', 'limited'])(
    'never sends for a %s claim',
    async (status) => {
      m.rpc.mockResolvedValue({ data: { status }, error: null });
      if (status === 'duplicate')
        expect(await sendProtectedEmail(mail)).toMatchObject({
          duplicate: true,
        });
      else
        await expect(sendProtectedEmail(mail)).rejects.toMatchObject({
          status: 429,
        });
      expect(m.send).not.toHaveBeenCalled();
    }
  );
  it('fails closed when the migration/claim service is unavailable', async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { message: 'missing function' },
    });
    await expect(sendProtectedEmail(mail)).rejects.toMatchObject({
      status: 503,
    });
    expect(m.send).not.toHaveBeenCalled();
  });
  it.each(['provider error', 'network error'])(
    'releases its lease without marking sent after %s',
    async (mode) => {
      if (mode === 'provider error')
        m.send.mockResolvedValue({ data: null, error: { message: 'failed' } });
      else m.send.mockRejectedValue(new Error('disconnected'));
      await expect(sendProtectedEmail(mail)).rejects.toBeTruthy();
      expect(m.rpc.mock.calls.at(-1)?.[1].p_sent).toBe(false);
    }
  );
  it('retains an accepted delivery when finalization fails for safe provider-key retries', async () => {
    m.rpc.mockImplementation(async (name) => ({
      data:
        name === 'claim_security_mail'
          ? { status: 'claimed', lease: 'lease' }
          : null,
      error: name === 'finish_security_mail' ? {} : null,
    }));
    await expect(sendProtectedEmail(mail)).rejects.toBeTruthy();
    expect(
      m.rpc.mock.calls.filter((c) => c[0] === 'finish_security_mail')
    ).toHaveLength(1);
    expect(m.rpc.mock.calls.at(-1)?.[1].p_sent).toBe(true);
  });
  it('sanitizes subject/attachment headers and normalizes addresses', async () => {
    await sendProtectedEmail({
      ...mail,
      to: ' member@example.test ',
      subject: 'Hello\r\nBcc: attacker',
      attachments: [{ filename: 'x\r\nname/evil.ics', content: 'test' }],
    });
    const payload = m.send.mock.calls[0][0];
    expect(payload.subject).not.toMatch(/[\r\n]/);
    expect(payload.attachments[0].filename).not.toMatch(/[\r\n/]/);
    expect(payload.to).toBe('member@example.test');
  });
  it.each([
    'bad',
    'x@@example.test',
    'x@example.test\r\nBcc: evil@example.test',
  ])('rejects invalid recipient %s', async (to) => {
    await expect(sendProtectedEmail({ ...mail, to })).rejects.toMatchObject({
      status: 400,
    });
    expect(m.send).not.toHaveBeenCalled();
  });
  it('keeps identical delivery keys stable across retries', async () => {
    await sendProtectedEmail(mail);
    await sendProtectedEmail(mail);
    expect(m.send.mock.calls[0][1]).toEqual(m.send.mock.calls[1][1]);
  });
});

describe('distributed request limits', () => {
  it('uses platform IP and does not let forwarded-for rotate a bucket', async () => {
    const e = req('x');
    await protectAction(e, 'contact');
    const first = m.rpc.mock.calls[0][1];
    e.headers['x-forwarded-for'] = '203.0.113.99';
    await protectAction(e, 'contact');
    expect(m.rpc.mock.calls[1][1]).toEqual(first);
  });
  it('retains a global and a shared unknown-IP bucket if the platform header is absent', async () => {
    const e = req('x');
    e.headers = {};
    await protectAction(e, 'contact');
    expect(m.rpc.mock.calls[0][1].p_limits).toHaveLength(2);
  });
  it.each([false, null])(
    'does not proceed when limits return %s',
    async (data) => {
      m.rpc.mockResolvedValue({ data, error: null });
      await expect(protectAction(req('x'), 'contact')).rejects.toBeTruthy();
    }
  );
  it('uses a practical separate budget for organizer batches', async () => {
    await protectAction(req('x'), 'approval-mail', '42');
    const limits = m.rpc.mock.calls[0][1].p_limits;
    expect(limits[0]).toMatchObject({ limit: 60, window: 60 });
    expect(limits).toHaveLength(3);
  });
});

describe('mail HTML and calendar encodings', () => {
  const attack = '<a href="https://attacker.test">click</a> & "name"';
  it.each(['confirm', 'speaker', 'reject'])(
    'escapes injected HTML in the %s template',
    async (kind) => {
      const params = {
        ...event,
        name: attack,
        meetupTitle: attack,
        mode: 'offline',
        location: attack,
        topic: attack,
        duration: attack,
      };
      if (kind === 'confirm') await sendRSVPConfirmEmail(params);
      else if (kind === 'speaker') await sendSpeakerConfirmEmail(params);
      else await sendRSVPRejectEmail(params);
      const payload = m.send.mock.calls[0][0];
      expect(payload.html).not.toContain('<a href="https://attacker.test">');
      expect(payload.html).toContain('&lt;a href=');
      expect(payload.html).not.toContain('&amp;lt;a');
      expect(payload.html).toContain('https://inspireplanet.cc/');
    }
  );
  it('escapes CRLF property injection in ICS and keeps a working calendar attachment', async () => {
    await sendRSVPConfirmEmail({
      ...event,
      meetupTitle: 'Title\r\nATTENDEE:evil@example.test',
      location: 'Room\r\nBEGIN:VEVENT',
    });
    const payload = m.send.mock.calls[0][0];
    const ics = Buffer.from(
      payload.attachments[0].content,
      'base64'
    ).toString();
    expect(ics.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).not.toContain('\r\nATTENDEE:');
    expect(ics).toContain('SUMMARY:Title\\nATTENDEE:');
    expect(ics).toContain('DTSTART:20261023T120000Z');
  });
  it('propagates provider error instead of pretending delivery succeeded', async () => {
    m.send.mockResolvedValue({ data: null, error: { message: 'rejected' } });
    await expect(sendRSVPConfirmEmail(event)).rejects.toBeTruthy();
  });
});

describe.each([
  ['contact', contact, 'message'],
  ['submission', submission, 'content'],
])('%s public form', (_name, handler, field) => {
  const valid = () => ({
    name: 'Author',
    email: 'author@example.test',
    [field]: 'Text',
  });
  it('keeps recipients fixed and sends plain text with a validated reply address', async () => {
    expect(
      (
        await invoke(handler, 'send', {
          ...valid(),
          to: 'victim@example.test',
          cc: ['victim@example.test'],
        })
      ).statusCode
    ).toBe(200);
    const p = m.send.mock.calls[0][0];
    expect(p.to).toEqual(['fixed@example.test']);
    expect(p.replyTo).toBe('author@example.test');
    expect(p.html).toBeUndefined();
  });
  it.each([
    { name: {} },
    { email: 'bad' },
    { email: 'x@example.test\r\nBcc: evil' },
    { name: 'x'.repeat(81) },
  ])('rejects invalid fields without sending: %j', async (bad) => {
    expect(
      (await invoke(handler, 'send', { ...valid(), ...bad })).statusCode
    ).toBe(400);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('accepts honeypot submissions silently without sending', async () => {
    expect(
      (await invoke(handler, 'send', { ...valid(), website: 'bot' })).statusCode
    ).toBe(200);
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });
  it('returns 429 without sending after distributed throttling', async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect((await invoke(handler, 'send', valid())).statusCode).toBe(429);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('rejects GET and retains OPTIONS', async () => {
    expect((await invoke(handler, 'send', {}, 'GET')).statusCode).toBe(405);
    expect((await invoke(handler, 'send', {}, 'OPTIONS')).statusCode).toBe(200);
    expect(m.send).not.toHaveBeenCalled();
  });
});

describe('speaker confirmation boundary', () => {
  const input = {
    meetup_id: 1,
    episode_number: 43,
    name: 'Speaker',
    topic: 'Topic',
    email: 'victim@example.test',
  };
  it('keeps guest registration without mailing the supplied third party', async () => {
    expect((await invoke(speaker, 'create', input)).statusCode).toBe(200);
    expect(m.writes).toHaveLength(1);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('only sends to the signed-in profile, ignoring a supplied different address', async () => {
    m.user = { id: '42', name: 'Member', role: 'member' };
    expect((await invoke(speaker, 'create', input)).statusCode).toBe(200);
    expect(m.send.mock.calls[0][0].to).toBe('member@example.test');
  });
  it.each([
    { name: {} },
    { topic: 'x'.repeat(301) },
    { duration: 'x'.repeat(81) },
    { timezone: 'invalid-zone' },
    { episode_number: -1 },
  ])('rejects malformed signup %j', async (bad) => {
    expect(
      (await invoke(speaker, 'create', { ...input, ...bad })).statusCode
    ).toBe(400);
    expect(m.writes).toEqual([]);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('preserves a successful signup but reports a failed confirmation', async () => {
    m.user = { id: '42', name: 'Member', role: 'member' };
    m.send.mockResolvedValue({ data: null, error: { message: 'failed' } });
    const res = await invoke(speaker, 'create', input);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.confirmation_email).toBe('failed');
    expect(m.writes.some((w) => w.table === 'speaker_signups')).toBe(true);
  });
  it('limits before any signup write', async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect((await invoke(speaker, 'create', input)).statusCode).toBe(429);
    expect(m.writes).toEqual([]);
  });
});

describe('organizer mail actions', () => {
  it('blocks visitors before any mail or status mutation', async () => {
    expect(
      (
        await invoke(participants, 'batchConfirm', {
          meetup_id: 1,
          rsvp_ids: [10],
          send_email: true,
        })
      ).statusCode
    ).toBe(401);
    expect(m.writes).toEqual([]);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('does not mark failed provider deliveries as sent', async () => {
    m.user = { id: '7', name: 'Organizer', role: 'organizer' };
    m.send.mockResolvedValue({ data: null, error: { message: 'failed' } });
    const res = await invoke(participants, 'batchReject', {
      meetup_id: 1,
      rsvp_ids: [10],
      send_email: true,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.email_failed_count).toBe(1);
    expect(m.writes.some((w) => w.value?.email_sent === true)).toBe(false);
  });
  it('rejects oversized batches before changing records', async () => {
    m.user = { id: '7', role: 'organizer', name: 'Organizer' };
    expect(
      (
        await invoke(participants, 'batchConfirm', {
          meetup_id: 1,
          rsvp_ids: Array.from({ length: 26 }, (_, i) => i),
          send_email: true,
        })
      ).statusCode
    ).toBe(400);
    expect(m.writes).toEqual([]);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('limits batches before status writes', async () => {
    m.user = { id: '7', name: 'Organizer', role: 'organizer' };
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect(
      (
        await invoke(participants, 'batchConfirm', {
          meetup_id: 1,
          rsvp_ids: [10],
          send_email: true,
        })
      ).statusCode
    ).toBe(429);
    expect(m.writes).toEqual([]);
  });
});

describe('image-search quota boundary', () => {
  it('requires authentication', async () => {
    expect(
      (await invoke(searchImage, 'search', { text: 'photo' })).statusCode
    ).toBe(401);
    expect(m.image).not.toHaveBeenCalled();
  });
  it('preserves valid authenticated image search after the quota check', async () => {
    m.user = { id: '42', role: 'member' };
    m.image.mockResolvedValue({ url: 'https://example.test/image.png' });
    expect(
      (await invoke(searchImage, 'search', { text: 'photo' })).statusCode
    ).toBe(200);
    expect(m.image).toHaveBeenCalledWith('photo', 'landscape');
  });
  it('checks query size/orientation before the paid provider', async () => {
    m.user = { id: '42', role: 'member' };
    expect(
      (await invoke(searchImage, 'search', { text: 'x'.repeat(501) }))
        .statusCode
    ).toBe(400);
    expect(
      (
        await invoke(searchImage, 'search', {
          text: 'photo',
          orientation: 'bad',
        })
      ).statusCode
    ).toBe(400);
    expect(m.image).not.toHaveBeenCalled();
  });
});

describe('input helpers', () => {
  it('rejects control characters and non-string input', () => {
    expect(shortText({}, 80)).toBeNull();
    expect(shortText('x\0y', 80)).toBeNull();
    expect(emailAddress('invalid')).toBeNull();
    expect(headerText('name\r\nx')).not.toContain('\n');
  });
});
