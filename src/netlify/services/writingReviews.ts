import { http } from '../config/http';
import { WritingReviewNote, WritingWeeklyReview } from '../types/writing';
export const writingReviewsApi = {
  weekly: (week: string, page = 1) =>
    http.get<WritingWeeklyReview>('/writingReviews', 'weekly', { week, page }),
  save: (post_id: string, discovery: string) =>
    http.post<{ note: WritingReviewNote }>('/writingReviews', 'save', {
      post_id,
      discovery,
    }),
  delete: (post_id: string) =>
    http.delete('/writingReviews', 'delete', { post_id }),
};
