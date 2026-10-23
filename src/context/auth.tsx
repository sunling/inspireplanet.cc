import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabaseAuth } from '../database/supabaseAuth';
import { UserInfo } from '../netlify/types';
import {
  logoutUser,
  markUserSessionInvalid,
  syncUserAuthFromSession,
} from '../utils/user';

interface AuthContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<UserInfo | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const validatedUser = await syncUserAuthFromSession();
      setUser(validatedUser);
      return validatedUser;
    } catch (error) {
      console.error('验证认证状态失败:', error);
      setUser(null);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    refreshAuth();

    const { data } = supabaseAuth.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        markUserSessionInvalid();
        setUser(null);
        setIsAuthLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // 认证事件回调内部不能再次直接调用 Supabase Auth 方法，延后到下一轮任务。
        setTimeout(() => {
          if (active) refreshAuth();
        }, 0);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      logout,
      refreshAuth,
    }),
    [isAuthLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return context;
};
