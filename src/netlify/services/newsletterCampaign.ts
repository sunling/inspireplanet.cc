import { http } from '../config/http';
import type { NewsletterDocument } from '../../utils/newsletterDocument';
import type { NewsletterCampaignStatus } from '../../utils/newsletterCampaign';
export interface CampaignDraft {
  year: number;
  episode: number;
  subject: string;
  document: NewsletterDocument;
}
export const newsletterCampaignApi = {
  status: (year: number, episode: number) =>
    http.get<NewsletterCampaignStatus>('/newsletterCampaign', 'status', {
      year,
      episode,
    }),
  prepare: (draft: CampaignDraft) =>
    http.post<NewsletterCampaignStatus>(
      '/newsletterCampaign',
      'prepare',
      draft
    ),
  start: (year: number, episode: number, hash: string) =>
    http.post<NewsletterCampaignStatus>('/newsletterCampaign', 'start', {
      year,
      episode,
      hash,
    }),
  process: (year: number, episode: number, retry: boolean) =>
    http.post<NewsletterCampaignStatus>(
      '/newsletterCampaign',
      'process',
      { year, episode, retry },
      { timeout: 55000 }
    ),
};
