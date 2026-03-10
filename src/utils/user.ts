// 导出用户相关工具函数
import { user } from './helpers';

// 保持向后兼容性
export const setUserAuth = user.setAuth;
export const getUserAuth = user.getAuth;
export const isLogin = user.isLogin;
export const getUserId = user.getId;
export const getUserName = user.getName;
export const getUserInfo = user.getInfo;
export const loginOut = user.logout;

export { user };
