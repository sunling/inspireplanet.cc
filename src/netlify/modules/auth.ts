import { ApiResponse } from '../types/http';
import { AuthResponse } from '../types';
import { http } from '../config/http';

export const authApi = {
  login: async (
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> => {
    return http.post<AuthResponse>('/auth', {
      action: 'login',
      email,
      password,
    });
  },

  register: async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    wechat?: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    return http.post<AuthResponse>('/auth', {
      action: 'register',
      ...data,
    });
  },

  verifyToken: async (): Promise<ApiResponse<AuthResponse>> => {
    return http.post<AuthResponse>('/auth', {
      action: 'verify',
    });
  },

  changePassword: async (data: {
    email: string;
    oldPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return http.post<{ success: boolean }>('/auth', data);
  },
};

export default authApi;
