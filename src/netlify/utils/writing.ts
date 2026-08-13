import {
  WritingPost,
  WritingTemplate,
  WritingTemplatePrompt,
  WritingTopic,
} from '../types';

export const WRITING_POST_SELECT = `
  id,
  user_id,
  title,
  body,
  image_urls,
  template_id,
  template_snapshot,
  group_id,
  is_anonymous,
  visibility,
  status,
  created_at,
  updated_at,
  author:users!writing_posts_user_id_fkey(id, name, username),
  group:writing_groups(id, name),
  topic_links:writing_post_topics(
    topic:writing_topics(id, name, slug, description, sort_order, is_user_created)
  )
`;

export function getWritingDateRangeError(
  dateFrom: string,
  dateTo: string
): string | null {
  if (!dateFrom || !dateTo) return null;
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '日期范围无效';
  }
  if (end < start) return '结束日期不能早于开始日期';
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    return '时间范围最多为一年';
  }
  return null;
}

export function mapWritingTopic(row: any): WritingTopic {
  return {
    id: String(row.id),
    name: row.name || '',
    slug: row.slug || '',
    description: row.description || null,
    sort_order: Number(row.sort_order) || 0,
    is_user_created: Boolean(row.is_user_created),
  };
}

export function mapWritingTemplate(row: any): WritingTemplate {
  const prompts = Array.isArray(row.prompts) ? row.prompts : [];
  return {
    id: String(row.id),
    name: row.name || '',
    slug: row.slug || '',
    description: row.description || null,
    prompts: prompts.map(
      (prompt: any): WritingTemplatePrompt => ({
        key: String(prompt.key || ''),
        prompt: String(prompt.prompt || ''),
        placeholder: prompt.placeholder
          ? String(prompt.placeholder)
          : undefined,
        required: Boolean(prompt.required),
      })
    ),
    version: Number(row.version) || 1,
    sort_order: Number(row.sort_order) || 0,
  };
}

export function normalizeTemplateSnapshot(value: any) {
  if (!value || !Array.isArray(value.items)) return null;
  return {
    template_name: value.template_name || value.templateName || '',
    version: Number(value.version) || 1,
    items: value.items.map((item: any) => ({
      key: String(item.key || ''),
      prompt: String(item.prompt || ''),
      answer: String(item.answer || ''),
    })),
  };
}

export function mapWritingPost(
  row: any,
  currentUserId?: string | null,
  anonymousAlias?: string | null
): WritingPost {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  const topicLinks = Array.isArray(row.topic_links) ? row.topic_links : [];
  const isOwner =
    Boolean(currentUserId) && String(row.user_id) === String(currentUserId);
  const isAnonymous = Boolean(row.is_anonymous);

  return {
    id: String(row.id),
    user_id: isAnonymous && !isOwner ? '' : String(row.user_id || ''),
    title: row.title || null,
    body: row.body || '',
    image_urls: Array.isArray(row.image_urls)
      ? row.image_urls.filter((url: unknown) => typeof url === 'string')
      : [],
    template_id: row.template_id ? String(row.template_id) : null,
    template_snapshot: normalizeTemplateSnapshot(row.template_snapshot),
    group_id: row.group_id ? String(row.group_id) : null,
    group: row.group
      ? {
          id: String(
            Array.isArray(row.group) ? row.group[0]?.id : row.group.id
          ),
          name: Array.isArray(row.group)
            ? row.group[0]?.name || ''
            : row.group.name || '',
        }
      : null,
    topics: topicLinks
      .map((link: any) => link?.topic)
      .filter(Boolean)
      .map(mapWritingTopic)
      .sort((a: WritingTopic, b: WritingTopic) => a.sort_order - b.sort_order),
    author: {
      id:
        isAnonymous && !isOwner
          ? ''
          : author?.id
            ? String(author.id)
            : String(row.user_id || ''),
      name: isAnonymous
        ? anonymousAlias
          ? `佚名 · ${anonymousAlias}`
          : '佚名'
        : author?.name || author?.username || '匿名用户',
      username: isAnonymous ? null : author?.username || null,
    },
    is_anonymous: isAnonymous,
    visibility:
      row.visibility === 'public'
        ? 'public'
        : row.visibility === 'group'
          ? 'group'
          : 'private',
    status: row.status === 'hidden' ? 'hidden' : 'published',
    created_at: row.created_at,
    updated_at: row.updated_at,
    can_edit: isOwner,
    resonance_count: Number(row.resonance_count) || 0,
    has_resonated: Boolean(row.has_resonated),
    comment_count: Number(row.comment_count) || 0,
  };
}
