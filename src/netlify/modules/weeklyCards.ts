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

// 周刊卡片记录接口（数据库用）
export interface WeeklyCardRecord {
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
}

// 周刊卡片请求接口
export interface WeeklyCardRequest {
  record: WeeklyCardRecord;
}

// 周刊卡片响应接口
export interface WeeklyCardResponse {
  success: boolean;
  error?: string;
  message?: string;
  id?: number;
  missingFields?: string[];
  details?: string;
  records: WeeklyCard[];
}

export const weeklyCardsApi = {
  getAll: async (): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
    return http.get<{ records: WeeklyCard[] }>('/weeklyCards', 'getAll');
  },

  getLatest: async (): Promise<ApiResponse<WeeklyCardResponse>> => {
    return http.get<WeeklyCardResponse>('/weeklyCardLatest', 'get');
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
};

export default weeklyCardsApi;
