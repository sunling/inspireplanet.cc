import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  post: vi.fn(),
  setUserAuth: vi.fn(),
  navigate: vi.fn(),
  setError: vi.fn(),
  effect: null as null | (() => void),
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useEffect: (fn: () => void) => {
    mocks.effect = fn;
  },
  useState: () => ['', mocks.setError],
}));
vi.mock('@mui/material', () => ({
  Box: 'div',
  CircularProgress: 'span',
  Typography: 'span',
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../database/supabaseAuth', () => ({ supabaseAuth: { auth: mocks } }));
vi.mock('../netlify/config/http', () => ({ http: { post: mocks.post } }));
vi.mock('../utils/user', () => ({ setUserAuth: mocks.setUserAuth }));
import AuthCallback from '../pages/auth/AuthCallback';
const user = { id: 1, email: 'self@example.test', name: 'Self' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', { location: { search: '?code=oauth-code' } });
  vi.stubGlobal('localStorage', { getItem: () => null, removeItem: vi.fn() });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: 'callback-token', user } },
    error: null,
  });
});
it('passes the verified callback session explicitly to provisioning', async () => {
  mocks.post.mockResolvedValue({ success: true, data: { user } });
  AuthCallback({});
  mocks.effect!();
  await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
  expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
    '/auth',
    'getProfile',
    {},
    { headers: { Authorization: 'Bearer callback-token' } }
  );
  expect(mocks.setUserAuth).toHaveBeenCalledWith('callback-token', user);
});
it('does not fall back to register or authenticate a fake profile on backend failure', async () => {
  mocks.post.mockResolvedValue({ success: false, statusCode: 500 });
  AuthCallback({});
  mocks.effect!();
  await vi.waitFor(() => expect(mocks.setError).toHaveBeenCalled());
  expect(mocks.post).toHaveBeenCalledOnce();
  expect(mocks.setUserAuth).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
