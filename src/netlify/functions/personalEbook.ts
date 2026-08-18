import { supabase } from '../../database/supabase';
import { EbookChapter } from '../types/ebook';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  createSuccessResponse,
  getAuthenticatedUser,
  getFunctionNameFromEvent,
  handleOptionsRequest,
} from '../utils/server';
import { normalizeTemplateSnapshot } from '../utils/writing';

const asText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('、');
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const hasAnswer = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasAnswer);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasAnswer);
  }
  return true;
};

const excerpt = (value: string, length = 100): string => {
  const plain = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
};

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();
  if (getFunctionNameFromEvent(event) !== 'getMine') {
    return createErrorResponse('无效的操作类型');
  }

  const user = await getAuthenticatedUser(event);
  if (!user) return createErrorResponse('未授权', 401);

  try {
    const [cardsResult, writingsResult, submissionsResult] = await Promise.all([
      supabase
        .from('cards')
        .select('id, title, quote, detail, image_path, created')
        .eq('user_id', user.id)
        .order('created', { ascending: false })
        .limit(500),
      supabase
        .from('writing_posts')
        .select(
          `
          id, title, body, editor_mode, body_rich, image_urls, template_snapshot, created_at,
          topic_links:writing_post_topics(topic:writing_topics(id, name))
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('survey_submissions')
        .select(
          `
          id, submitted_at,
          survey:surveys(id, title, description, meetup_id),
          answers:survey_answers(question_id, value)
        `
        )
        .eq('respondent_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(500),
    ]);

    const databaseError =
      cardsResult.error || writingsResult.error || submissionsResult.error;
    if (databaseError) {
      console.error('[personalEbook] query failed:', databaseError.message);
      return createErrorResponse('获取个人电子书内容失败', 500);
    }

    const submissions = submissionsResult.data || [];
    const questionIds = Array.from(
      new Set(
        submissions.flatMap((submission: any) =>
          (submission.answers || []).map((answer: any) => answer.question_id)
        )
      )
    ).filter(Boolean);
    const meetupIds = Array.from(
      new Set(
        submissions
          .map((submission: any) => {
            const survey = Array.isArray(submission.survey)
              ? submission.survey[0]
              : submission.survey;
            return survey?.meetup_id;
          })
          .filter(Boolean)
      )
    );

    const [questionsResult, meetupsResult] = await Promise.all([
      questionIds.length
        ? supabase
            .from('survey_questions')
            .select('id, title')
            .in('id', questionIds)
        : Promise.resolve({ data: [], error: null }),
      meetupIds.length
        ? supabase.from('meetups').select('id, title').in('id', meetupIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (questionsResult.error || meetupsResult.error) {
      return createErrorResponse('获取活动回应详情失败', 500);
    }

    const questionMap = new Map(
      (questionsResult.data || []).map((row: any) => [
        String(row.id),
        row.title,
      ])
    );
    const meetupMap = new Map(
      (meetupsResult.data || []).map((row: any) => [String(row.id), row.title])
    );

    const cardChapters: EbookChapter[] = (cardsResult.data || []).map(
      (card: any) => ({
        id: `card-${card.id}`,
        source: 'card',
        title: card.title || '未命名金句',
        summary: excerpt(card.quote || card.detail || ''),
        content: [card.quote, card.detail].filter(Boolean).join('\n\n'),
        created_at: card.created,
        topics: [{ id: 'source-card', name: '金句卡片' }],
        image_urls: card.image_path ? [card.image_path] : [],
        detail_url: `/card-detail?id=${card.id}`,
      })
    );

    const writingChapters: EbookChapter[] = (writingsResult.data || []).map(
      (post: any) => {
        const hasRichContent =
          post.editor_mode === 'rich' &&
          post.body_rich &&
          typeof post.body_rich === 'object' &&
          post.body_rich.type === 'doc';
        const template_snapshot = normalizeTemplateSnapshot(
          post.template_snapshot
        );
        const templateAnswers = (template_snapshot?.items || [])
          .filter((item: { key: string; prompt: string; answer: string }) =>
            item.answer.trim()
          )
          .map(
            (item: { key: string; prompt: string; answer: string }) =>
              item.answer
          )
          .join(' ');
        return {
          id: `writing-${post.id}`,
          source: 'writing' as const,
          title: post.title || template_snapshot?.template_name || '一则书写',
          summary: excerpt(templateAnswers || post.body || ''),
          content: post.body || '',
          editor_mode: hasRichContent ? 'rich' : 'basic',
          rich_content: hasRichContent ? post.body_rich : null,
          template_snapshot,
          created_at: post.created_at,
          topics: (post.topic_links || [])
            .map((link: any) => link?.topic)
            .filter(Boolean)
            .map((topic: any) => ({ id: String(topic.id), name: topic.name })),
          image_urls: Array.isArray(post.image_urls) ? post.image_urls : [],
          detail_url: `/writing-circle/${post.id}`,
        };
      }
    );

    const responseChapters: EbookChapter[] = submissions
      .map((submission: any): EbookChapter | null => {
        const survey = Array.isArray(submission.survey)
          ? submission.survey[0]
          : submission.survey;
        const responseItems = (submission.answers || [])
          .filter((answer: any) => hasAnswer(answer.value))
          .map((answer: any) => ({
            question: questionMap.get(String(answer.question_id)) || '活动问题',
            answer: asText(answer.value).trim(),
          }));
        if (responseItems.length === 0) return null;

        const meetupTitle = survey?.meetup_id
          ? meetupMap.get(String(survey.meetup_id))
          : '';
        const title = meetupTitle || survey?.title || '一次活动回应';
        return {
          id: `response-${submission.id}`,
          source: 'response' as const,
          title,
          summary: excerpt(
            responseItems.map((item: any) => item.answer).join(' ')
          ),
          content: responseItems
            .map((item: any) => `${item.question}\n${item.answer}`)
            .join('\n\n'),
          created_at: submission.submitted_at,
          topics: [{ id: `response-${survey?.id || 'activity'}`, name: title }],
          image_urls: [],
          response_items: responseItems,
        };
      })
      .filter((chapter): chapter is EbookChapter => chapter !== null);

    return createSuccessResponse({
      owner: { id: user.id, name: user.name },
      generated_at: new Date().toISOString(),
      chapters: [...cardChapters, ...writingChapters, ...responseChapters].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    });
  } catch (error) {
    console.error('[personalEbook] request failed:', error);
    return createErrorResponse('获取个人电子书内容失败', 500);
  }
}
