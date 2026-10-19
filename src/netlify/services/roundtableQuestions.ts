import { http } from '../config/http';
import { ApiResponse } from '../types/http';

export type RoundtableQuestionStatus =
  'open' | 'contacted' | 'scheduled' | 'completed' | 'hidden';

export interface PublicRoundtableQuestion {
  id: string;
  name: string;
  question: string;
  context: string;
  status: RoundtableQuestionStatus;
  scheduledSession: string | null;
  sessionDate: string | null;
  episodeNumber: number | null;
  createdAt: string;
  supportCount: number;
}

export interface AdminRoundtableQuestion extends PublicRoundtableQuestion {
  email: string | null;
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

  listByEpisode: (
    episodeNumber: number,
    year: number
  ): Promise<ApiResponse<{ questions: PublicRoundtableQuestion[] }>> =>
    http.get('/roundtableQuestions', 'listPublic', { episodeNumber, year }),

  create: (
    input: CreateRoundtableQuestionInput
  ): Promise<ApiResponse<{ question: PublicRoundtableQuestion | null }>> =>
    http.post('/roundtableQuestions', 'create', input),

  support: (
    id: string,
    supporterToken: string
  ): Promise<
    ApiResponse<{ supportCount: number; alreadySupported: boolean }>
  > => http.post('/roundtableQuestions', 'support', { id, supporterToken }),

  listAdmin: (): Promise<
    ApiResponse<{ questions: AdminRoundtableQuestion[] }>
  > => http.get('/roundtableQuestions', 'listAdmin'),

  update: (
    id: string,
    status: RoundtableQuestionStatus,
    scheduledSession: string,
    sessionDate: string | null,
    episodeNumber: number | null
  ): Promise<ApiResponse<{ question: AdminRoundtableQuestion }>> =>
    http.put('/roundtableQuestions', 'update', {
      id,
      status,
      scheduledSession,
      sessionDate,
      episodeNumber,
    }),
};

export default roundtableQuestionsApi;
