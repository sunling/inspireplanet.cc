import { UserInfo } from '../netlify/types';

/**
 * 存储用户信息，确保登录状态
 * @param token 认证令牌
 * @param userInfo 用户信息
 */
export const setUserAuth = (token: string, userInfo: any) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
};

/**
 * 获取认证令牌
 * @returns string | null 认证令牌
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * 判断用户是否已经登录
 * @returns boolean 是否已登录
 */
export const isUserLoggedIn = (): boolean => {
  const token = localStorage.getItem('authToken');
  return Boolean(token);
};

/**
 * 获取全局唯一的userId
 * @returns string | null 用户ID
 */
export const getUserId = (): string | null => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsedUserInfo = JSON.parse(userInfo);
      return parsedUserInfo.id;
    } catch (e) {
      console.error('解析用户信息失败:', e);
      return null;
    }
  }
  return null;
};

/**
 * 获取用户名
 * @returns string | null 用户名
 */
export const getUserName = (): string | null => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsedUserInfo = JSON.parse(userInfo);
      return parsedUserInfo.name;
    } catch (e) {
      console.error('解析用户信息失败:', e);
      return null;
    }
  }
  return null;
};

/**
 * 获取用户信息
 * @returns any | null 用户信息
 */
export const getUserInfo = (): UserInfo | null => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      return JSON.parse(userInfo);
    } catch (e) {
      console.error('解析用户信息失败:', e);
      return null;
    }
  }
  return null;
};

/**
 * 退出登录
 */
export const logoutUser = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
};
