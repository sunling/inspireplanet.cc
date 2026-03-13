import { ApiResponse } from '../types/http';
import { AuthResponse } from '../types';
import { http } from '../config/http';

export const authApi = {
  login: async (
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> => {
    return http.post<AuthResponse>('/auth', 'login', {
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
    return http.post<AuthResponse>('/auth', 'register', data);
  },

  verifyToken: async (): Promise<ApiResponse<AuthResponse>> => {
    return http.post<AuthResponse>('/auth', 'verify');
  },

  changePassword: async (data: {
    email: string;
    oldPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return http.post<{ success: boolean }>('/auth', 'changePassword', data);
  },
};

export default authApi;
