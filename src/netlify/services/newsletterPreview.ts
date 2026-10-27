import { http } from '../config/http';

export interface NewsletterTestDraft {
  year: number;
  episode: number;
  intro: string;
  quotes: { index: number; quote: string; name: string }[];
  podcastUrl: string;
  podcastTitle: string;
  skipPodcast: boolean;
  expectedTitle: string;
  requestId: string;
  imageUrl?: string;
  imageAlt?: string;
}

export const newsletterPreviewApi = {
  sendTest: (draft: NewsletterTestDraft) =>
    http.post<{ recipient: string; messageId: string }>(
      '/newsletterPreview',
      'sendTest',
      draft
    ),
};
