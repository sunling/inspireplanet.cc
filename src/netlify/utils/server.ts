import { HttpHeaders } from '../types/http';
import { getCommonHeaders } from '../../utils/http';
import { getActionFromEvent, getDataFromEvent } from './action';

export { getActionFromEvent, getDataFromEvent };

/**
 * 从请求头中获取用户ID
 * @param event Netlify事件对象
 * @returns string | null 用户ID
 */
export function getUserIdFromAuth(event: any): string | null {
  const auth =
    (event.headers as any)?.authorization ||
    (event.headers as any)?.Authorization;
  if (!auth || !String(auth).startsWith('Bearer ')) return null;

  const token = String(auth).substring(7);
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    return decoded.userId || decoded.user_id || null;
  } catch {
    return null;
  }
}

/**
 * 验证JWT令牌
 * @param token JWT令牌
 * @returns any 解码后的令牌数据
 */
export function verifyJwtToken(token: string): any {
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return null;
  }
}

/**
 * 生成JWT令牌
 * @param payload 令牌载荷
 * @param expiresIn 过期时间
 * @returns string JWT令牌
 */
export function generateJwtToken(
  payload: any,
  expiresIn: string = '7d'
): string {
  try {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
  } catch {
    throw new Error('生成令牌失败');
  }
}

/**
 * 获取通用的HTTP响应头
 * @returns HttpHeaders HTTP响应头
 */
export function getCommonHttpHeader(): HttpHeaders {
  return getCommonHeaders();
}

/**
 * 创建成功的响应
 * @param data 响应数据
 * @param statusCode HTTP状态码
 * @returns NetlifyResponse 响应对象
 */
export function createSuccessResponse(data: any, statusCode: number = 200) {
  return {
    statusCode,
    headers: getCommonHttpHeader(),
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

/**
 * 创建错误的响应
 * @param error 错误信息
 * @param statusCode HTTP状态码
 * @returns NetlifyResponse 响应对象
 */
export function createErrorResponse(
  error: string | any,
  statusCode: number = 400
) {
  return {
    statusCode,
    headers: getCommonHttpHeader(),
    body: JSON.stringify({
      success: false,
      error,
    }),
  };
}

/**
 * 处理OPTIONS预检请求
 * @returns NetlifyResponse 响应对象
 */
export function handleOptionsRequest() {
  return {
    statusCode: 200,
    headers: getCommonHttpHeader(),
    body: '',
  };
}

/**
 * 密码哈希
 * @param password 密码
 * @returns Promise<string> 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(password, 10);
  } catch {
    throw new Error('密码哈希失败');
  }
}

/**
 * 验证密码
 * @param password 密码
 * @param hash 哈希值
 * @returns Promise<boolean> 是否匹配
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
