import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  post: vi.fn(),
  setUserAuth: vi.fn(),
  stateIndex: 0,
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useState: () => [
    ['otp', 'self@example.test', '123456', '', '', false, '', ''][
      mocks.stateIndex++
    ],
    vi.fn(),
  ],
}));
vi.mock('@mui/material', () =>
  Object.fromEntries(
    [
      'Box',
      'Container',
      'Typography',
      'TextField',
      'Button',
      'Alert',
      'Paper',
      'CircularProgress',
    ].map((name) => [name, name])
  )
);
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../database/supabaseAuth', () => ({ supabaseAuth: { auth: mocks } }));
vi.mock('../netlify/config/http', () => ({ http: { post: mocks.post } }));
vi.mock('../utils/user', () => ({ setUserAuth: mocks.setUserAuth }));
import ForgotPassword from '../pages/auth/ForgotPassword';
it('passes the fresh OTP session token to getProfile', async () => {
  const user = { id: 1, email: 'self@example.test', name: 'Self' };
  mocks.verifyOtp.mockResolvedValue({
    data: { session: { access_token: 'otp-token', user } },
    error: null,
  });
  mocks.post.mockResolvedValue({ success: true, data: { user } });
  const tree = ForgotPassword({});
  function flatten(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    return [node, ...flatten(node.props?.children)];
  }
  const button = flatten(tree).find(
    (node) => node.type === 'Button' && node.props.children === '验证'
  );
  expect(button).toBeDefined();
  await button.props.onClick();
  expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
    '/auth',
    'getProfile',
    {},
    { headers: { Authorization: 'Bearer otp-token' } }
  );
  expect(mocks.setUserAuth).toHaveBeenCalledWith('otp-token', user);
});
