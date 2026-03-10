// 导出统一的工具函数
import { dateTime, string, user, http, validation, react } from './helpers';

// 保持向后兼容性 - 日期时间
export const isUpcoming = dateTime.isUpcoming;
export const formatTime = dateTime.formatTime;
export const formatDate = dateTime.formatDate;
export const getTimeZone = dateTime.getTimeZone;
export const groupCardsByDate = dateTime.groupCardsByDate;

// 保持向后兼容性 - 字符串
export const escapeHtml = string.escapeHtml;
export const isSafeString = string.isSafeString;
export const hasDangerousContent = string.hasDangerousContent;
export const sanitizeInput = string.sanitizeInput;

// 保持向后兼容性 - 用户
export const getCurrentUser = user.getInfo;
export const setUserAuth = user.setAuth;
export const getUserAuth = user.getAuth;
export const isLogin = user.isLogin;
export const getUserId = user.getId;
export const getUserName = user.getName;
export const getUserInfo = user.getInfo;
export const loginOut = user.logout;

// 保持向后兼容性 - HTTP
export const getCommonHttpHeader = http.getCommonHeaders;
export const getBaseUrl = http.getBaseUrl;

// 保持向后兼容性 - React
export const handleApiResponse = react.handleApiResponse;
export const withLoading = react.withLoading;

// 导出所有工具模块
export { dateTime, string, user, http, validation, react };
