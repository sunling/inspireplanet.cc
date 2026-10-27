import { ApiResponse } from '../types/http';
import { http } from '../config/http';
import type { EpisodePublication } from '../../utils/episodePublication';

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

export interface EpisodeTopic {
  speaker: string;
  title: string;
  context?: string;
  keyPoints?: string[];
  summary?: string;
  discussion?: string;
  quote?: string;
}

export interface EpisodeSummary {
  episode: string;
  date?: string;
  title: string;
  overview: string;
  topics: EpisodeTopic[];
  highlights?: string[];
}

// 周刊卡片响应接口
export interface WeeklyCardResponse {
  records: WeeklyCard[];
  summary?: EpisodeSummary | null;
  publication?: EpisodePublication | null;
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
    episode: string,
    year?: number | string
  ): Promise<ApiResponse<WeeklyCardResponse>> => {
    return http.get<WeeklyCardResponse>('/weeklyCards', 'getByEpisode', {
      episode,
      ...(year ? { year } : {}),
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
    return http.post<{ id: string; message: string }>('/uploadCard', 'create', {
      record: data,
    });
  },
};

export default weeklyCardsApi;
