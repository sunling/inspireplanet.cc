import { ApiResponse } from '../types/http';
import { http } from '../config/http';

export const notificationsApi = {
  list: async (params?: {
    status?: 'unread' | 'read';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ notifications: any[] }>> => {
    return http.get<{ notifications: any[] }>(
      '/notifications',
      'getAll',
      params as any
    );
  },
  markRead: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return http.put<{ success: boolean }>('/notifications', 'update', { id });
  },
  markAllRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
    return http.put<{ success: boolean }>('/notifications', 'markAllRead', {
      all: true,
    });
  },
};

export default notificationsApi;
