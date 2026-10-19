import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  post: vi.fn(),
}));
vi.mock('../database/supabaseAuth', () => ({ supabaseAuth: { auth: mocks } }));
vi.mock('../netlify/config/http', () => ({ http: { post: mocks.post } }));
import { syncUserAuthFromSession } from '../utils/user';
it('passes the validated session token during background profile sync', async () => {
  const user = { id: 1, email: 'self@example.test' };
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: 'sync-token', user } },
  });
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.post.mockResolvedValue({ success: true, data: { user } });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  expect(await syncUserAuthFromSession()).toEqual(user);
  expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
    '/auth',
    'getProfile',
    {},
    { headers: { Authorization: 'Bearer sync-token' } }
  );
});
