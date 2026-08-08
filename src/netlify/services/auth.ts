import { ApiResponse } from '../types/http';
import { http } from '../config/http';
import { supabaseAuth } from '../../database/supabaseAuth';
import { setUserAuth } from '../../utils/user';
import { UserInfo } from '../types';

function isEmailNotConfirmed(message?: string): boolean {
  return Boolean(message?.toLowerCase().includes('email not confirmed'));
}

export function getSignUpErrorResponse(error: {
  code?: string;
  message?: string;
  status?: number;
}): Pick<ApiResponse<never>, 'statusCode' | 'error'> {
  const message = error.message?.toLowerCase() || '';

  if (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    message.includes('email rate limit') ||
    message.includes('only request this after')
  ) {
    return {
      statusCode: 429,
      error: '注册邮件发送过于频繁，请稍后再试；你也可以使用 Google 账号登录',
    };
  }

  if (message.includes('already registered')) {
    return { statusCode: 409, error: '该邮箱已被注册' };
  }

  return {
    statusCode: error.status || 400,
    error: error.message || '注册失败，请稍后重试',
  };
}

async function getProfile(email: string): Promise<UserInfo | null> {
  const res = await http.post<{ user: UserInfo }>('/auth', 'getProfile', {
    email,
  });
  return res.success ? (res.data?.user ?? null) : null;
}

export const authApi = {
  login: async (
    email: string,
    password: string
  ): Promise<ApiResponse<{ user: UserInfo; token: string }>> => {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      const message = isEmailNotConfirmed(error?.message)
        ? '邮箱还未验证，请先打开注册邮件完成确认后再登录'
        : '邮箱或密码错误';
      return { success: false, statusCode: 401, error: message };
    }

    const token = data.session.access_token;
    const profile = await getProfile(email);
    const user: UserInfo = profile || {
      email,
      name: data.user.user_metadata?.name || '',
    };

    setUserAuth(token, user);
    return { success: true, statusCode: 200, data: { user, token } };
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: UserInfo; token: string }>> => {
    const email = data.email.trim().toLowerCase();
    const { error: signUpError, data: authData } =
      await supabaseAuth.auth.signUp({
        email,
        password: data.password,
        options: {
          data: { name: data.name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (signUpError) {
      return { success: false, ...getSignUpErrorResponse(signUpError) };
    }

    if (authData.user && authData.user.identities?.length === 0) {
      return {
        success: false,
        statusCode: 409,
        error: '该邮箱已注册，请直接登录；如果忘记密码，请使用找回密码',
      };
    }

    // Create profile in users table
    const profileRes = await http.post<{ user: UserInfo }>(
      '/auth',
      'register',
      {
        email,
        name: data.name,
      }
    );

    const token = authData.session?.access_token || '';
    const user: UserInfo = profileRes.data?.user || {
      email,
      name: data.name,
    };

    if (token) setUserAuth(token, user);
    return {
      success: true,
      statusCode: 201,
      data: { user, token },
      message: token ? '注册成功' : '注册成功，请先到邮箱点击确认邮件后再登录',
    };
  },

  changePassword: async (newPassword: string): Promise<ApiResponse<{}>> => {
    const { error } = await supabaseAuth.auth.updateUser({
      password: newPassword,
    });
    if (error) return { success: false, statusCode: 400, error: error.message };
    return { success: true, statusCode: 200, data: {} };
  },

  logout: async () => {
    await supabaseAuth.auth.signOut();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
  },
};

export default authApi;
