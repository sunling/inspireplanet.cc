import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  post: vi.fn(),
  setUserAuth: vi.fn(),
}));
vi.mock('../database/supabaseAuth', () => ({ supabaseAuth: { auth: mocks } }));
vi.mock('../netlify/config/http', () => ({ http: { post: mocks.post } }));
vi.mock('../utils/user', () => ({ setUserAuth: mocks.setUserAuth }));
import { authApi } from '../netlify/services/auth';
const user = { id: 1, email: 'self@example.test', name: 'Self' };
const credentials = { email: user.email, name: 'Self', password: 'test-only' };
const config = { headers: { Authorization: 'Bearer fresh-session' } };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
  mocks.post.mockResolvedValue({ success: true, data: { user } });
});
describe('signup provisioning', () => {
  it('defers profile creation when email confirmation supplies no session', async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { ...user, identities: [{}] }, session: null },
      error: null,
    });
    const result = await authApi.register(credentials);
    expect(result.success).toBe(true);
    expect(result.data?.token).toBe('');
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.setUserAuth).not.toHaveBeenCalled();
  });
  it('passes an immediate signup session explicitly', async () => {
    mocks.signUp.mockResolvedValue({
      data: { user, session: { access_token: 'fresh-session' } },
      error: null,
    });
    expect((await authApi.register(credentials)).success).toBe(true);
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
      '/auth',
      'register',
      {},
      config
    );
    expect(mocks.setUserAuth).toHaveBeenCalledWith('fresh-session', user);
  });
  it('does not pretend signup succeeded if profile provisioning fails', async () => {
    mocks.signUp.mockResolvedValue({
      data: { user, session: { access_token: 'fresh-session' } },
      error: null,
    });
    mocks.post.mockResolvedValue({
      success: false,
      statusCode: 500,
      error: 'profile failure',
    });
    expect((await authApi.register(credentials)).success).toBe(false);
    expect(mocks.setUserAuth).not.toHaveBeenCalled();
  });
});
describe('login profile token', () => {
  it('does not authenticate a fabricated profile when the backend fails', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'fresh-session' }, user },
      error: null,
    });
    mocks.post.mockResolvedValue({ success: false, statusCode: 500 });
    expect(
      (await authApi.login(user.email, credentials.password)).success
    ).toBe(false);
    expect(mocks.setUserAuth).not.toHaveBeenCalled();
  });
  it('uses the newly returned session, before local auth exists', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'fresh-session' }, user },
      error: null,
    });
    expect(
      (await authApi.login(user.email, credentials.password)).success
    ).toBe(true);
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
      '/auth',
      'getProfile',
      {},
      config
    );
    expect(mocks.setUserAuth).toHaveBeenCalledWith('fresh-session', user);
  });
});
