import { ApiResponse } from '../types/http';
import { CardItem } from '../types';
import { http } from '../config/http';

export const cardsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ records: CardItem[]; total: number }>> => {
    return http.get<{ records: CardItem[]; total: number }>('/cards', params);
  },

  getById: async (
    id: string
  ): Promise<ApiResponse<{ records: CardItem[] }>> => {
    return http.get<{ records: CardItem[] }>('/cards', { id });
  },

  getUserCards: async (): Promise<ApiResponse<CardItem[]>> => {
    return http.get<CardItem[]>('/cards');
  },

  create: async (
    cardData: Partial<CardItem>
  ): Promise<ApiResponse<CardItem>> => {
    return http.post<CardItem>('/cards', cardData);
  },

  update: async (
    cardData: Partial<CardItem>
  ): Promise<ApiResponse<CardItem>> => {
    return http.put<CardItem>('/cards', cardData);
  },

  like: async (
    cardId: string
  ): Promise<ApiResponse<{ success: boolean; likesCount: number }>> => {
    return http.post<{ success: boolean; likesCount: number }>('/cards', {
      action: 'like',
      cardId,
    });
  },

  delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return http.delete<{ success: boolean }>('/cards', {
      id,
    });
  },
};

export default cardsApi;
