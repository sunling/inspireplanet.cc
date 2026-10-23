import { expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../database/supabase', () => ({ supabase: db }));
import { handler } from '../netlify/functions/users';
it('keeps the anonymous public directory on its existing safe backend projection', async () => {
  const users: any = {
    select: vi.fn(() => users),
    order: vi.fn(() => users),
    range: vi.fn(async () => ({
      data: [{ id: 1, name: 'Public', username: 'public' }],
      error: null,
    })),
  };
  const profiles: any = {
    select: vi.fn(() => profiles),
    in: vi.fn(async () => ({ data: [], error: null })),
  };
  db.from.mockImplementation((table) => (table === 'users' ? users : profiles));
  const response = await handler(
    {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ functionName: 'getAll' }),
    } as any,
    {}
  );
  expect(response.statusCode).toBe(200);
  expect(users.select).toHaveBeenCalledExactlyOnceWith('id, name, username');
  expect(JSON.parse(response.body).data.users).toEqual([
    { id: 1, name: 'Public', username: 'public', profile: null },
  ]);
});
