import type { NewsletterDocument } from './newsletterDocument';
export interface NewsletterCampaignStatus {
  campaign: null | {
    id: string;
    year: number;
    episode: number;
    subject: string;
    content_hash: string;
    revision: string;
    status: 'draft' | 'sending' | 'completed';
    created_at: string;
    started_at: string | null;
    document: NewsletterDocument;
    body_html: string;
    body_text: string;
  };
  counts: {
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    skipped: number;
    uncertain: number;
  };
  total: number;
  available: number;
  canSend: boolean;
  sendUnavailableReason?: string | null;
}
