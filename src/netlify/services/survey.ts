import { ApiResponse } from '../types/http';
import { http } from '../config/http';
import {
  Survey,
  SurveyListResponse,
  CreateSurveyRequest,
  UpdateSurveyRequest,
  SubmitSurveyRequest,
  SurveySubmission,
  SurveyResults,
  QuestionAnswer,
} from '../types/survey';

const surveyApi = {
  // 获取问卷列表
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<SurveyListResponse>> => {
    return http.get<SurveyListResponse>('/survey', 'getAll', params);
  },

  // 获取问卷详情
  getById: async (id: string): Promise<ApiResponse<Survey>> => {
    return http.get<Survey>('/survey', 'getById', { id });
  },

  // 创建问卷
  create: async (
    data: CreateSurveyRequest & { createdBy: string }
  ): Promise<ApiResponse<{ id: string; message: string }>> => {
    return http.post<{ id: string; message: string }>(
      '/survey',
      'create',
      data
    );
  },

  // 更新问卷
  update: async (
    id: string,
    data: UpdateSurveyRequest
  ): Promise<ApiResponse<{ id: string; message: string }>> => {
    return http.put<{ id: string; message: string }>('/survey', 'update', {
      id,
      ...data,
    });
  },

  // 删除问卷
  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return http.delete<{ message: string }>('/survey', 'delete', { id });
  },

  // 切换问卷激活状态
  toggleActive: async (
    id: string
  ): Promise<
    ApiResponse<{ id: string; isActive: boolean; message: string }>
  > => {
    return http.put<{ id: string; isActive: boolean; message: string }>(
      '/survey',
      'toggleActive',
      { id }
    );
  },

  // 提交问卷
  submit: async (
    data: SubmitSurveyRequest & { respondentId: string }
  ): Promise<ApiResponse<{ id: string; message: string }>> => {
    return http.post<{ id: string; message: string }>(
      '/surveySubmission',
      'submit',
      data
    );
  },

  // 获取问卷提交记录
  getSubmissions: async (params: {
    surveyId: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    ApiResponse<{
      records: SurveySubmission[];
      total: number;
      page: number;
      pageSize: number;
    }>
  > => {
    return http.get<{
      records: SurveySubmission[];
      total: number;
      page: number;
      pageSize: number;
    }>('/surveySubmission', 'getBySurveyId', params);
  },

  // 获取我的提交记录
  getMySubmissions: async (params: {
    respondentId: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    ApiResponse<{
      records: Array<{
        id: string;
        surveyId: string;
        surveyTitle: string;
        submittedAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
    }>
  > => {
    return http.get<{
      records: Array<{
        id: string;
        surveyId: string;
        surveyTitle: string;
        submittedAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
    }>('/surveySubmission', 'getMySubmissions', params);
  },

  // 检查用户是否已提交过问卷
  checkSubmission: async (params: {
    surveyId: string;
    respondentId: string;
  }): Promise<ApiResponse<SurveySubmission | null>> => {
    return http.get<SurveySubmission | null>(
      '/surveySubmission',
      'checkSubmission',
      params
    );
  },

  // 更新问卷提交
  updateSubmission: async (
    id: string,
    data: { answers: QuestionAnswer[] }
  ): Promise<ApiResponse<{ id: string; message: string }>> => {
    return http.put<{ id: string; message: string }>(
      '/surveySubmission',
      'update',
      {
        id,
        ...data,
      }
    );
  },
};

export default surveyApi;
