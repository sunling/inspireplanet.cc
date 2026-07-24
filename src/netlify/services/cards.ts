import { ApiResponse } from '../types/http';
import { CardItem } from '../types';
import { http } from '../config/http';

export const cardsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ records: CardItem[]; total: number }>> => {
    return http.get<{ records: CardItem[]; total: number }>(
      '/cards',
      'getAll',
      params
    );
  },

  getById: async (
    id: string
  ): Promise<ApiResponse<{ records: CardItem[] }>> => {
    return http.get<{ records: CardItem[] }>('/cards', 'getById', { id });
  },

  getUserCards: async (): Promise<ApiResponse<CardItem[]>> => {
    return http.get<CardItem[]>('/cards', 'getUserCards');
  },

  create: async (
    cardData: Partial<CardItem>
  ): Promise<ApiResponse<CardItem>> => {
    return http.post<CardItem>('/cards', 'create', cardData);
  },

  update: async (
    cardData: Partial<CardItem>
  ): Promise<ApiResponse<CardItem>> => {
    return http.put<CardItem>('/cards', 'update', cardData);
  },

  like: async (
    card_id: string
  ): Promise<ApiResponse<{ success: boolean; likes_count: number }>> => {
    return http.post<{ success: boolean; likes_count: number }>(
      '/cards',
      'like',
      {
        card_id,
      }
    );
  },

  delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return http.delete<{ success: boolean }>('/cards', 'delete', {
      id,
    });
  },
};

export default cardsApi;
