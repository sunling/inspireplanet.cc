import { UserInfo } from '../netlify/types';
import { http } from '../netlify/config/http';
import { supabaseAuth } from '../database/supabaseAuth';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
let hasValidatedSession = false;

export const markUserSessionInvalid = () => {
  hasValidatedSession = false;
};

export const setUserAuth = (token: string, userInfo: UserInfo) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
  localStorage.setItem('loginTime', String(Date.now()));
  hasValidatedSession = true;
};

const isSessionExpired = (): boolean => {
  const loginTime = localStorage.getItem('loginTime');
  if (!loginTime) return false;
  const elapsed = Date.now() - Number(loginTime);
  return elapsed > TWO_WEEKS_MS;
};

export const checkAndClearExpiredSession = (): boolean => {
  if (isSessionExpired()) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('loginTime');
    markUserSessionInvalid();
    return true;
  }
  return false;
};

export const isUserLoggedIn = (): boolean => {
  checkAndClearExpiredSession();
  return hasValidatedSession;
};

export const getUserId = (): string | null => {
  checkAndClearExpiredSession();
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    return JSON.parse(userInfo).id;
  } catch {
    return null;
  }
};

export const getUserName = (): string | null => {
  checkAndClearExpiredSession();
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    const parsed = JSON.parse(userInfo);
    return parsed.name || parsed.username;
  } catch {
    return null;
  }
};

export const getUserInfo = (): UserInfo | null => {
  checkAndClearExpiredSession();
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    return JSON.parse(userInfo);
  } catch {
    return null;
  }
};

export const syncUserAuthFromSession = async (): Promise<UserInfo | null> => {
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session?.access_token || !session.user.email) {
    markUserSessionInvalid();
    return null;
  }

  const { data: validatedData, error: validationError } =
    await supabaseAuth.auth.getUser(session.access_token);
  if (validationError || !validatedData.user) {
    markUserSessionInvalid();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('loginTime');
    await supabaseAuth.auth.signOut({ scope: 'local' });
    return null;
  }

  hasValidatedSession = true;
  const currentUser = getUserInfo();
  try {
    const res = await http.post<{ user: UserInfo }>('/auth', 'getProfile', {
      email: session.user.email,
    });
    const user = res.success ? res.data?.user : null;
    if (!user && res.statusCode === 401) {
      markUserSessionInvalid();
      return null;
    }
    if (!user) return currentUser;
    setUserAuth(session.access_token, user);
    return user;
  } catch {
    return currentUser;
  }
};

export const logoutUser = async () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('loginTime');
  markUserSessionInvalid();
  await supabaseAuth.auth.signOut();
};

export const isOrganizer = (): boolean => {
  return getUserInfo()?.role === 'organizer';
};

export const isMeetupOwner = (meetup: {
  creator?: string;
  user_id?: string;
}): boolean => {
  const curUser = getUserInfo();
  if (!curUser) return false;
  return (
    meetup.creator === curUser?.username ||
    meetup.creator == curUser?.id ||
    meetup.user_id === curUser?.username ||
    meetup.user_id == curUser?.id
  );
};
