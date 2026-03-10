import { supabase } from '../../database/supabase';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  HttpHeaders,
  NetlifyContext,
  NetlifyEvent,
  NetlifyResponse,
} from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  hashPassword,
  verifyPassword,
  generateJwtToken,
  verifyJwtToken,
} from '../utils/server';
// 注意：Netlify函数会自动加载.env文件，不需要手动配置dotenv

// 定义用户接口
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  password?: string;
  wechat?: string;
}

// 定义注册请求接口
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  wechat?: string;
}

// 定义登录请求接口
export interface LoginRequest {
  email: string;
  password: string;
}

// 定义JWT有效载荷接口
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// 定义认证操作接口
export interface AuthAction {
  action: 'register' | 'login' | 'verify';
}

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

// 验证必要的环境变量
if (!JWT_SECRET) {
  throw new Error('环境变量 JWT_SECRET 未配置');
}

/**
 * 认证处理器函数
 * @param event 事件对象
 * @param context 上下文对象
 * @returns 响应对象
 */
export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as AuthAction;

    switch (action) {
      case 'register':
        return await handleRegister(event);
      case 'login':
        return await handleLogin(event);
      case 'verify':
        return await handleVerifyToken(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

/**
 * 处理用户注册
 * @param event 事件对象
 * @returns 响应对象
 */
async function handleRegister(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const registerData: RegisterRequest = JSON.parse(event.body || '{}');
    const { username, email, password, name, wechat } = registerData;

    // 验证输入
    if (!username || !email || !password || !name) {
      return createErrorResponse('姓名、用户名、邮箱和密码都是必填项');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse('邮箱格式不正确');
    }

    // 验证密码长度
    if (password.length < 6) {
      return createErrorResponse('密码至少需要6个字符');
    }

    // 验证用户名长度
    if (username.length < 2) {
      return createErrorResponse('用户名至少需要2个字符');
    }

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return createErrorResponse('该邮箱已被注册', 409);
    }

    // 检查用户名是否已存在
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return createErrorResponse('该用户名已被使用', 409);
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password: hashedPassword,
        name,
        wechat,
      })
      .select('id, username, email')
      .single();

    if (insertError || !newUser) {
      console.error('Insert error:', insertError);
      return createErrorResponse('注册失败，请稍后重试', 500);
    }

    // 生成JWT token
    const token = generateJwtToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name,
    } as JwtPayload);

    return createSuccessResponse(
      {
        message: '注册成功',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name,
        },
        token,
      },
      201
    );
  } catch (error: any) {
    console.error('Register error:', error);
    return createErrorResponse('注册过程中发生错误', 500);
  }
}

/**
 * 处理用户登录
 * @param event 事件对象
 * @returns 响应对象
 */
async function handleLogin(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const loginData: LoginRequest = JSON.parse(event.body || '{}');
    const { email, password } = loginData;

    // 验证输入
    if (!email || !password) {
      return createErrorResponse('邮箱和密码都是必填项');
    }

    // 查找用户
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, password, name')
      .eq('email', email)
      .single();

    if (!user) {
      return createErrorResponse('邮箱或密码错误', 401);
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password!);
    if (!isPasswordValid) {
      return createErrorResponse('邮箱或密码错误', 401);
    }

    // 生成JWT token
    const token = generateJwtToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    } as JwtPayload);

    return createSuccessResponse({
      message: '登录成功',
      user: {
        id: user.id,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return createErrorResponse('登录过程中发生错误', 500);
  }
}

/**
 * 验证JWT token
 * @param event 事件对象
 * @returns 响应对象
 */
async function handleVerifyToken(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const authHeader =
      event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('未提供有效的认证令牌', 401);
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    const decoded: JwtPayload = verifyJwtToken(token);

    if (!decoded) {
      return createErrorResponse('令牌无效或已过期', 401);
    }

    // 验证用户是否仍然存在
    const {
        data: user,
      }: {
        data: {
          id: string;
          username: string;
          email: string;
          name: string;
        } | null;
      } = await supabase
        .from('users')
        .select('id, username, email, name')
        .eq('id', decoded.userId)
        .single();

      if (!user) {
        return createErrorResponse('用户不存在', 401);
      }

      return createSuccessResponse({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error: any) {
      console.error('Token verification error:', error);
      return createErrorResponse('令牌验证过程中发生错误', 500);
    }
  }
}
