import {
  WritingEditorMode,
  WritingRichContent,
  WritingTemplateSnapshot,
} from './writing';

export type EbookSource = 'card' | 'writing' | 'response';

export interface EbookTopic {
  id: string;
  name: string;
}

export interface EbookChapter {
  id: string;
  source: EbookSource;
  title: string;
  summary: string;
  content: string;
  editor_mode?: WritingEditorMode;
  rich_content?: WritingRichContent | null;
  template_snapshot?: WritingTemplateSnapshot | null;
  created_at: string;
  topics: EbookTopic[];
  image_urls: string[];
  detail_url?: string;
  response_items?: Array<{ question: string; answer: string }>;
}

export interface PersonalEbook {
  owner: { id: string; name: string };
  generated_at: string;
  chapters: EbookChapter[];
}
