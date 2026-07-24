import { ApiResponse } from '../types/http';
import { Comment } from '../types';
import { http } from '../config/http';

export const commentsApi = {
  getByCardId: async (
    card_id: string
  ): Promise<ApiResponse<{ comments: Comment[] }>> => {
    return http.get<{ comments: Comment[] }>('/comments', 'getByCardId', {
      card_id,
    });
  },

  create: async (data: {
    card_id: string;
    comment: string;
    name?: string;
  }): Promise<ApiResponse<Comment>> => {
    return http.post<Comment>('/comments', 'create', {
      card_id: data.card_id,
      comment: data.comment,
      name: data.name,
    });
  },
};

export default commentsApi;
