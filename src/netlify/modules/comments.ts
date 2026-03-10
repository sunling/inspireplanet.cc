import { ApiResponse } from '../types/http';
import { Comment } from '../types';
import { http } from '../config/http';

export const commentsApi = {
  getByCardId: async (
    cardId: string
  ): Promise<ApiResponse<{ comments: Comment[] }>> => {
    return http.get<{ comments: Comment[] }>('/comments', {
      cardId,
    });
  },

  create: async (data: {
    cardId: string;
    comment: string;
    name?: string;
  }): Promise<ApiResponse<Comment>> => {
    return http.post<Comment>('/comments', data);
  },
};

export default commentsApi;
