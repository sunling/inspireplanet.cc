import { UserInfo } from '../netlify/types';
import { http } from '../netlify/config/http';
import { supabaseAuth } from '../database/supabaseAuth';

export const setUserAuth = (token: string, userInfo: UserInfo) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const isUserLoggedIn = (): boolean => {
  return Boolean(localStorage.getItem('authToken'));
};

export const getUserId = (): string | null => {
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    return JSON.parse(userInfo).id;
  } catch {
    return null;
  }
};

export const getUserName = (): string | null => {
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

  if (!session?.access_token || !session.user.email) return null;

  const currentUser = getUserInfo();
  if (currentUser?.name || currentUser?.username) {
    setUserAuth(session.access_token, currentUser);
    return currentUser;
  }

  try {
    const res = await http.post<{ user: UserInfo }>('/auth', 'getProfile', {
      email: session.user.email,
    });
    const user =
      res.data?.user ||
      ({
        email: session.user.email,
        name: session.user.user_metadata?.name || '',
      } as UserInfo);
    setUserAuth(session.access_token, user);
    return user;
  } catch {
    const user = {
      email: session.user.email,
      name: session.user.user_metadata?.name || '',
    } as UserInfo;
    setUserAuth(session.access_token, user);
    return user;
  }
};

export const logoutUser = async () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
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
