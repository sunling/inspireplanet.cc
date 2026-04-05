// 调查问卷相关类型定义

// 问题类型
export type QuestionType = 'single' | 'multiple' | 'text' | 'rating' | 'date';

// 问题选项
export interface QuestionOption {
  id: string;
  text: string;
  label: string;
  value: string;
}

// 问题
export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  maxRating?: number;
  placeholder?: string;
  sortOrder?: number;
}

// 调查问卷
export interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  allowMultipleSubmissions: boolean;
  createdBy: string;
}

// 问卷列表响应
export interface SurveyListResponse {
  records: Survey[];
  total: number;
  page: number;
  pageSize: number;
}

// 创建问卷请求
export interface CreateSurveyRequest {
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  allowMultipleSubmissions: boolean;
}

// 更新问卷请求
export interface UpdateSurveyRequest {
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  allowMultipleSubmissions: boolean;
}

// 问题答案
export interface QuestionAnswer {
  questionId: string;
  value: any;
}

// 提交问卷请求
export interface SubmitSurveyRequest {
  surveyId: string;
  answers: QuestionAnswer[];
  email?: string;
}

// 问卷提交
export interface SurveySubmission {
  id: string;
  surveyId: string;
  respondentId: string;
  respondentEmail?: string;
  submittedAt: string;
  answers: QuestionAnswer[];
}

// 问卷统计
export interface SurveyStatistics {
  surveyId: string;
  title: string;
  totalSubmissions: number;
  totalQuestions: number;
  createdAt: string;
  isActive: boolean;
}

// 问题统计
export interface QuestionStatistics {
  questionId: string;
  title: string;
  type: QuestionType;
  totalResponses: number;
  averageRating?: number;
  optionDistribution?: Record<string, number>;
}

// 问卷结果
export interface SurveyResults {
  survey: Survey;
  statistics: SurveyStatistics;
  questionStatistics: QuestionStatistics[];
}

// 动作类型
export interface SurveyAction {
  action: 'getAll' | 'getById' | 'create' | 'update' | 'delete' | 'toggleActive';
}

export interface SurveySubmissionAction {
  action: 'submit' | 'getBySurveyId' | 'getMySubmissions';
}
