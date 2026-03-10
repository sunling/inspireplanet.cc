import { ApiResponse } from '../types/http';
import { WeeklyCard, WeeklyCardResponse } from '../types';
import { http } from '../config/http';

export const weeklyCardsApi = {
  getAll: async (): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>('/weeklyCards');
  },

  getLatest: async (): Promise<ApiResponse<WeeklyCardResponse>> => {
    return http.get<WeeklyCardResponse>('/weeklyCardLatest');
  },

  getByEpisode: async (
    episode: string
  ): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>('/weeklyCards', {
      episode,
    });
  },

  getAllLimited: async (
    limit: number
  ): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>('/weeklyCards', {
      limit,
    });
  },
};

export default weeklyCardsApi;
