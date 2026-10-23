import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }));
vi.mock('../database/supabase', () => ({
  supabase: { auth: { getUser: db.getUser }, from: db.from },
}));
import { handler } from '../netlify/functions/auth';
const request = (action: string, authorization?: string, extra = {}) =>
  handler(
    {
      httpMethod: 'POST',
      headers: authorization ? { authorization } : {},
      body: JSON.stringify({
        functionName: action,
        email: 'victim@example.test',
        name: 'Attacker',
        ...extra,
      }),
    } as any,
    {} as any
  );

const verified = {
  id: 'auth-uuid',
  email: 'self@example.test',
  email_confirmed_at: '2026-01-01',
  user_metadata: { name: 'Verified name', role: 'admin', id: 999 },
};
function query(results: any[]) {
  const q: any = {};
  for (const method of ['select', 'eq', 'insert']) q[method] = vi.fn(() => q);
  q.single = vi.fn(async () => results.shift());
  q.maybeSingle = vi.fn(async () => results.shift());
  db.from.mockReturnValue(q);
  return q;
}

describe('auth identity boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it.each(['register', 'getProfile'])(
    '%s ignores submitted email and returns only verified identity profile',
    async (action) => {
      db.getUser.mockResolvedValue({ data: { user: verified }, error: null });
      const self = {
        id: 12,
        email: verified.email,
        name: 'Self',
        role: 'member',
      };
      const q = query([
        { data: self, error: null },
        { data: self, error: null },
      ]);
      const res = await request(action, 'Bearer fresh-token');
      expect(res.statusCode).toBe(200);
      expect(db.getUser).toHaveBeenCalledWith('fresh-token');
      expect(
        q.eq.mock.calls.every(
          ([column, value]: any[]) =>
            column === 'email' && value === verified.email
        )
      ).toBe(true);
      expect(JSON.parse(res.body).data.user).toEqual(self);
      expect(q.insert).not.toHaveBeenCalled();
    }
  );
  it.each(['register', 'getProfile'])(
    '%s provisions from verified metadata without privileged fields',
    async (action) => {
      db.getUser.mockResolvedValue({ data: { user: verified }, error: null });
      const created = {
        id: 13,
        email: verified.email,
        name: 'Verified name',
        role: null,
      };
      const q = query([
        { data: null, error: null },
        { data: created, error: null },
      ]);
      const res = await request(action, 'Bearer fresh', {
        role: 'admin',
        id: 999,
      });
      expect(res.statusCode).toBe(action === 'register' ? 201 : 200);
      expect(q.insert).toHaveBeenCalledExactlyOnceWith({
        email: verified.email,
        name: 'Verified name',
      });
      expect(JSON.parse(res.body).data.user).toEqual(created);
    }
  );
  it.each(['register', 'getProfile'])(
    '%s reports provisioning failure without an invented profile',
    async (action) => {
      db.getUser.mockResolvedValue({ data: { user: verified }, error: null });
      const q = query([
        { data: null, error: null },
        { data: null, error: { code: '42501' } },
      ]);
      const res = await request(action, 'Bearer fresh');
      expect(res.statusCode).toBe(500);
      expect(q.insert).toHaveBeenCalledOnce();
      expect(JSON.parse(res.body).data).toBeUndefined();
    }
  );
  it('recovers concurrent first-login provisioning using only verified email', async () => {
    db.getUser.mockResolvedValue({ data: { user: verified }, error: null });
    const self = { id: 13, email: verified.email, name: 'Self', role: null };
    const q = query([
      { data: null, error: null },
      { data: null, error: { code: '23505' } },
      { data: self, error: null },
    ]);
    const res = await request('getProfile', 'Bearer fresh');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.user).toEqual(self);
    expect(q.eq).toHaveBeenLastCalledWith('email', verified.email);
  });
  it.each([
    { ...verified, email: undefined },
    { ...verified, id: undefined },
    { ...verified, email_confirmed_at: undefined },
  ])(
    'rejects incomplete/unconfirmed verified identities before database access',
    async (identity) => {
      db.getUser.mockResolvedValue({ data: { user: identity }, error: null });
      expect((await request('getProfile', 'Bearer token')).statusCode).toBe(
        401
      );
      expect(db.from).not.toHaveBeenCalled();
    }
  );
  it('fails closed if token verification throws, without a legacy-token fallback', async () => {
    db.getUser.mockRejectedValue(new Error('auth unavailable'));
    expect((await request('register', 'Bearer legacy-jwt')).statusCode).toBe(
      401
    );
    expect(db.from).not.toHaveBeenCalled();
  });
  it('does not provision when lookup fails (including ambiguous duplicate emails)', async () => {
    db.getUser.mockResolvedValue({ data: { user: verified }, error: null });
    const q = query([{ data: null, error: { code: 'PGRST116' } }]);
    expect((await request('getProfile', 'Bearer token')).statusCode).toBe(500);
    expect(q.insert).not.toHaveBeenCalled();
  });
  it.each(['register', 'getProfile'])(
    '%s requires a verified bearer before any data query',
    async (action) => {
      for (const token of [undefined, 'Basic x', 'Bearer ', 'Bearer invalid']) {
        db.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('invalid'),
        });
        expect((await request(action, token)).statusCode).toBe(401);
        expect(db.from).not.toHaveBeenCalled();
      }
    }
  );
});
