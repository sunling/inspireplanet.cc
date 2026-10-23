import { expect, it, vi } from 'vitest';
vi.mock('../database/supabaseAuth', () => ({
  supabaseAuth: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'stale-session' } },
      })),
    },
  },
}));
import { http } from '../netlify/config/http';
it('preserves an explicit fresh bearer rather than replacing it with a cached session', async () => {
  vi.stubGlobal('localStorage', { setItem: vi.fn() });
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, data: {} }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  await http.post(
    '/auth',
    'getProfile',
    {},
    { headers: { Authorization: 'Bearer fresh-session' } }
  );
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer fresh-session'
  );
});
