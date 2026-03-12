import { ApiResponse } from '../types/http';
import { http } from '../config/http';

// 周刊卡片接口
export interface WeeklyCard {
  id: string;
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
  image_path?: string;
  created: string;
}

// 周刊卡片响应接口
export interface WeeklyCardResponse {
  records: WeeklyCard[];
}

export const weeklyCardsApi = {
  getAll: async (): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>('/weeklyCards', 'getAll');
  },

  getLatest: async (): Promise<ApiResponse<WeeklyCardResponse>> => {
    return http.get<WeeklyCardResponse>(
      '/weeklyCardLatest',
      'getLatestWeeklyCards'
    );
  },

  getByEpisode: async (
    episode: string
  ): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>('/weeklyCards', 'getByEpisode', {
      episode,
    });
  },

  getAllLimited: async (
    limit: number
  ): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>(
      '/weeklyCards',
      'getAllLimited',
      {
        limit,
      }
    );
  },

  create: async (data: {
    name: string;
    title: string;
    quote: string;
    detail: string;
    episode: string;
  }): Promise<ApiResponse<{ id: string; message: string }>> => {
    return http.post<{ id: string; message: string }>(
      '/weeklyCards',
      'create',
      data
    );
  },
};

export default weeklyCardsApi;
