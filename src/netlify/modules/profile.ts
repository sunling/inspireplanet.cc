import { ApiResponse } from '../types/http';
import { http } from '../config/http';

export const profileApi = {
  getMy: async (): Promise<
    ApiResponse<{ profile: import('../types').UserProfile | null }>
  > => {
    return http.get<{ profile: import('../types').UserProfile | null }>(
      '/userProfile'
    );
  },
  upsert: async (
    data: Partial<import('../types').UserProfile>
  ): Promise<ApiResponse<{ profile: import('../types').UserProfile }>> => {
    return http.post<{ profile: import('../types').UserProfile }>(
      '/userProfile',
      data
    );
  },
};

export default profileApi;
