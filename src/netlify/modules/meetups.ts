import { ApiResponse } from '../types/http';
import { http } from '../config/http';
import { Meetup } from '../functions/meetup';

export const meetupsApi = {
  getAll: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ meetups: Meetup[] }>> => {
    return http.get<{ meetups: Meetup[] }>('/meetup', 'getAll', params as any);
  },

  getById: async (id: string): Promise<ApiResponse<{ meetups: Meetup[] }>> => {
    return http.get<{ meetups: Meetup[] }>('/meetup', 'getById', { id });
  },

  create: async (meetupData: Partial<Meetup>): Promise<ApiResponse<Meetup>> => {
    return http.post<Meetup>('/meetup', 'create', meetupData);
  },

  update: async (
    id: string,
    meetupData: Partial<Meetup>
  ): Promise<ApiResponse<Meetup>> => {
    return http.put<Meetup>('/meetup', 'update', meetupData, {
      params: { id },
    });
  },

  delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return http.delete<{ success: boolean }>('/meetup', 'delete', {
      id,
    });
  },
};

export default meetupsApi;
