import { http } from '../config/http';
import { ApiResponse } from '../types/http';

export type RoundtableQuestionStatus =
  | 'open'
  | 'contacted'
  | 'scheduled'
  | 'completed'
  | 'hidden';

export interface PublicRoundtableQuestion {
  id: string;
  name: string;
  question: string;
  context: string;
  status: RoundtableQuestionStatus;
  scheduledSession: string | null;
  createdAt: string;
}

export interface AdminRoundtableQuestion extends PublicRoundtableQuestion {
  email: string;
  boundaries: string;
  availableDates: string[];
  otherAvailability: string;
  updatedAt: string;
}

export interface CreateRoundtableQuestionInput {
  name: string;
  email: string;
  question: string;
  context: string;
  boundaries: string;
  availableDates: string[];
  otherAvailability: string;
  publicConsent: boolean;
  website?: string;
}

export const roundtableQuestionsApi = {
  listPublic: (
    sessionDate?: string
  ): Promise<ApiResponse<{ questions: PublicRoundtableQuestion[] }>> =>
    http.get(
      '/roundtableQuestions',
      'listPublic',
      sessionDate ? { sessionDate } : undefined
    ),

  create: (
    input: CreateRoundtableQuestionInput
  ): Promise<ApiResponse<{ question: PublicRoundtableQuestion | null }>> =>
    http.post('/roundtableQuestions', 'create', input),

  listAdmin: (): Promise<
    ApiResponse<{ questions: AdminRoundtableQuestion[] }>
  > => http.get('/roundtableQuestions', 'listAdmin'),

  update: (
    id: string,
    status: RoundtableQuestionStatus,
    scheduledSession: string
  ): Promise<ApiResponse<{ question: AdminRoundtableQuestion }>> =>
    http.put('/roundtableQuestions', 'update', {
      id,
      status,
      scheduledSession,
    }),
};

export default roundtableQuestionsApi;
