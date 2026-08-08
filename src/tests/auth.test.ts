import { describe, expect, it } from 'vitest';
import { getSignUpErrorResponse } from '../netlify/services/auth';

describe('signup error messages', () => {
  it('turns the Supabase project email quota error into actionable Chinese', () => {
    expect(
      getSignUpErrorResponse({
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
        status: 429,
      })
    ).toEqual({
      statusCode: 429,
      error: '注册邮件发送过于频繁，请稍后再试；你也可以使用 Google 账号登录',
    });
  });

  it('handles the per-address cooldown variant', () => {
    expect(
      getSignUpErrorResponse({
        message: 'For security purposes, you can only request this after 53 seconds.',
        status: 429,
      }).statusCode
    ).toBe(429);
  });
});
