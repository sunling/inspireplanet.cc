import { ApiResponse } from '../types/http';
import { http } from '../config/http';

export type TreeholeQuestion = {
  id: number;
  content: string;
  createdAt: string;
  responseCount: number;
};

export type TreeholeResponse = {
  id: number;
  questionId: number;
  content: string;
  nickname: string;
  createdAt: string;
};

export const treeholeApi = {
  list: async (
    limit = 20
  ): Promise<ApiResponse<{ questions: TreeholeQuestion[] }>> =>
    http.get('/treehole', 'list', { limit }),

  detail: async (
    id: number
  ): Promise<
    ApiResponse<{ question: TreeholeQuestion; responses: TreeholeResponse[] }>
  > => http.get('/treehole', 'detail', { id }),

  createQuestion: async (data: {
    content: string;
    email?: string;
  }): Promise<ApiResponse<{ question: TreeholeQuestion }>> =>
    http.post('/treehole', 'createQuestion', data),

  createResponse: async (data: {
    questionId: number;
    content: string;
    nickname?: string;
  }): Promise<ApiResponse<{ response: TreeholeResponse }>> =>
    http.post('/treehole', 'createResponse', data),

  deleteQuestion: async (
    id: number
  ): Promise<ApiResponse<{ success: boolean }>> =>
    http.delete('/treehole', 'deleteQuestion', { id }),

  deleteResponse: async (
    id: number
  ): Promise<ApiResponse<{ success: boolean }>> =>
    http.delete('/treehole', 'deleteResponse', { id }),
};

export default treeholeApi;
