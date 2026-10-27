import { http } from '../config/http';
import type { NewsletterDocument } from '../../utils/newsletterDocument';

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

export interface EditableNewsletterTestDraft {
  year: number;
  episode: number;
  requestId: string;
  subject: string;
  document: NewsletterDocument;
}

export const newsletterPreviewApi = {
  sendTest: (draft: NewsletterTestDraft | EditableNewsletterTestDraft) =>
    http.post<{ recipient: string; messageId: string }>(
      '/newsletterPreview',
      'sendTest',
      draft
    ),
};
