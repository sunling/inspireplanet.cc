// 存储用户信息，确保登录状态
export const setUserAuth = (token: string, userInfo: any) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
};

export const getUserAuth = () => {
  return localStorage.getItem('authToken');
};

// 判断用户是否已经登录
export const isLogin = () => {
  const token = localStorage.getItem('authToken');
  return Boolean(token);
};

// 获取全局唯一的userId
export const getUserId = () => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const parsedUserInfo = JSON.parse(userInfo);
    return parsedUserInfo.id;
  }
  return null;
};

// 退出登录
export const loginOut = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
};
