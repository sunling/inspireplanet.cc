import { supabase } from '../../database/supabase';
import {
  NetlifyContext,
  NetlifyEvent,
  NetlifyResponse,
  HttpHeaders,
} from '../types/http';

import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

// 问卷问题类型
export type QuestionType = 'single' | 'multiple' | 'text' | 'rating' | 'date';

// 问题选项
export interface QuestionOption {
  id: string;
  text: string;
  label: string;
  value: string;
}

// 问卷问题
export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  maxRating?: number;
  placeholder?: string;
  sortOrder?: number;
}

// 定义接口
export interface Meetup {
  id?: string;
  title: string;
  description: string;
  location?: string;
  datetime: string;
  wechat_id: string;
  created_at?: string;
  qrcode?: string;
  status?: string;
  duration?: string;
  max_ppl?: number | null;
  mode: string;
  cover: string;
  user_id?: string;
  creator: string;
  participant_count?: number;
  is_recurring?: boolean;
  recurrence_day?: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  episode_start_date?: string; // YYYY-MM-DD, date of EP1
  default_theme?: string; // fallback when no episode theme is set
  // 关联问卷ID
  survey_id?: string;

  // 是否跳过登录报名
  skip_login?: boolean;
}

export interface MeetupRequest extends Omit<Meetup, 'id'> {}

export interface MeetupResponse {
  success: boolean;
  meetups?: Meetup[];
  meetup?: Meetup;
  error?: string;
  message?: string;
  details?: string;
}

export enum MeetupMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  HYBRID = 'hybrid',
  CULTURE = 'culture',
  OUTDOOR = 'outdoor',
}

export const MeetupLabelMap: Record<string, string> = {
  [MeetupMode.ONLINE]: '线上活动',
  [MeetupMode.OFFLINE]: '线下活动',
  [MeetupMode.HYBRID]: '线上线下结合',
  [MeetupMode.CULTURE]: '文化活动',
  [MeetupMode.OUTDOOR]: '户外活动',
};

export const MeetupList = [
  { label: MeetupLabelMap[MeetupMode.ONLINE], value: MeetupMode.ONLINE },
  { label: MeetupLabelMap[MeetupMode.OFFLINE], value: MeetupMode.OFFLINE },
  { label: MeetupLabelMap[MeetupMode.HYBRID], value: MeetupMode.HYBRID },
  { label: MeetupLabelMap[MeetupMode.CULTURE], value: MeetupMode.CULTURE },
  { label: MeetupLabelMap[MeetupMode.OUTDOOR], value: MeetupMode.OUTDOOR },
];

export interface MeetupAction {
  functionName: 'create' | 'getById' | 'getAll' | 'update' | 'delete';
}

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFunctionNameFromEvent(event);

    switch (functionName) {
      case 'create':
        return await handleCreate(event);
      case 'getById':
        return await handleGetById(event);
      case 'getAll':
        return await handleGetAll(event);
      case 'update':
        return await handleUpdate(event);
      case 'delete':
        return await handleDelete(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Meetup handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const meetupData = getDataFromEvent(event) as MeetupRequest;

    const { title, description, mode, datetime, creator, wechat_id } =
      meetupData;
    if (
      !title ||
      !description ||
      !mode ||
      !datetime ||
      !creator ||
      !wechat_id
    ) {
      return createErrorResponse('缺少必填字段');
    }

    const meetupDateTime = new Date(meetupData.datetime);
    if (isNaN(meetupDateTime.getTime())) {
      return createErrorResponse('日期时间格式无效');
    }

    if (!meetupData.is_recurring && meetupDateTime < new Date()) {
      return createErrorResponse('活动时间不能是过去的时间');
    }

    const maxRaw = meetupData.max_ppl as any;
    const maxParsed = typeof maxRaw === 'number' ? maxRaw : Number(maxRaw);
    const sanitizedMax =
      Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : null;

    let surveyId: string | null = meetupData.survey_id || null;

    // 如果有问卷问题数据，自动创建活动专用问卷
    if (meetupData.survey_questions && meetupData.survey_questions.length > 0) {
      const surveyTitle = `${title} - 报名问卷`;

      // 创建问卷
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: surveyTitle,
          description: `活动「${title}」的报名问卷`,
          created_by: meetupData.user_id || creator,
          is_active: true,
          allow_multiple_submissions: false,
          is_for_meetup: true,
        })
        .select('id')
        .single();

      if (surveyError) {
        console.error('Error creating survey:', surveyError);
        return createErrorResponse('创建问卷失败', 500);
      }

      surveyId = survey.id;

      // 创建问卷问题
      const questionPromises = meetupData.survey_questions!.map(
        (question, index) => {
          return supabase.from('survey_questions').insert({
            survey_id: survey.id,
            type: question.type,
            title: question.title,
            description: question.description,
            required: question.required,
            options: question.options,
            max_rating: question.maxRating,
            placeholder: question.placeholder,
            sort_order: question.sortOrder || index,
          });
        }
      );

      const questionResults = await Promise.all(questionPromises);
      const questionErrors = questionResults.filter((r) => r.error);

      if (questionErrors.length > 0) {
        console.error('Error creating questions:', questionErrors);
        // 回滚：删除已创建的问卷
        await supabase.from('surveys').delete().eq('id', survey.id);
        return createErrorResponse('创建问卷问题失败', 500);
      }
    }

    const { data, error } = await supabase
      .from('meetups')
      .insert([
        {
          title,
          description,
          mode: mode,
          datetime: meetupDateTime.toISOString(),
          location: meetupData.location?.trim() || null,
          duration: meetupData.duration || null,
          max_ppl: sanitizedMax,
          creator: creator,
          wechat_id: wechat_id,
          cover: meetupData.cover || null,
          status: 'active',
          user_id: meetupData.user_id || null,
          is_recurring: meetupData.is_recurring || false,
          recurrence_day: meetupData.is_recurring
            ? (meetupData.recurrence_day ?? null)
            : null,
          // 关联问卷ID
          survey_id: surveyId,
        },
      ])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      // 回滚：如果创建了问卷，删除它
      if (surveyId && !meetupData.survey_id) {
        await supabase.from('surveys').delete().eq('id', surveyId);
      }
      return createErrorResponse('创建活动失败', 500);
    }

    // 如果创建了问卷，更新问卷的 meetup_id
    if (surveyId && !meetupData.survey_id) {
      const meetupId = data?.[0]?.id;
      if (meetupId) {
        await supabase
          .from('surveys')
          .update({ meetup_id: Number(meetupId) })
          .eq('id', surveyId);
      }
    }

    return createSuccessResponse({
      message: '活动创建成功',
      meetup: data?.[0] as Meetup,
    });
  } catch (error) {
    console.error('Create meetup error:', error);
    return createErrorResponse('创建活动失败', 500);
  }
}

async function handleGetById(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const body = getDataFromEvent(event);
    const { id } = body;

    if (!id) {
      return createErrorResponse('缺少活动ID');
    }

    const { data, error } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id);

    if (error) {
      console.error('Database query error:', error);
      return createErrorResponse('获取活动失败', 500);
    }

    if (!data || data.length === 0) {
      return createErrorResponse('活动不存在', 404);
    }

    const meetupData = data[0];

    const { data: rsvps, error: rsvpsError } = await supabase
      .from('meetup_rsvps')
      .select('meetup_id')
      .eq('meetup_id', id)
      .eq('status', 'confirmed');

    let participantCount = 0;
    if (!rsvpsError && rsvps && Array.isArray(rsvps)) {
      participantCount = rsvps.length;
    }

    const meetup: Meetup = {
      ...meetupData,
      participant_count: participantCount,
    };

    return createSuccessResponse({ meetups: [meetup] });
  } catch (error) {
    console.error('Get meetup error:', error);
    return createErrorResponse('获取活动失败', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const body = getDataFromEvent(event);
    const { status = 'active', limit = '50', offset = '0' } = body;

    let query = supabase.from('meetups').select('*');

    if (String(status).toLowerCase() !== 'all') {
      query = query.eq('status', status);
    }

    query = query
      .order('datetime', { ascending: true })
      .range(
        parseInt(offset, 10),
        parseInt(offset, 10) + parseInt(limit, 10) - 1
      );

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return createErrorResponse('获取活动失败', 500);
    }

    if (!data || data.length === 0) {
      return createSuccessResponse({ meetups: [] });
    }

    try {
      const meetupIds = data
        .map((m: Meetup) => m.id)
        .filter((id): id is string => id !== undefined && id !== null);

      const countsByMeetupId: Record<string, number> = {};
      if (meetupIds.length > 0) {
        const { data: rsvps, error: rsvpsError } = await supabase
          .from('meetup_rsvps')
          .select('meetup_id')
          .in('meetup_id', meetupIds)
          .eq('status', 'confirmed');

        if (rsvpsError) {
          console.error('RSVP query error:', rsvpsError);
        } else if (rsvps && Array.isArray(rsvps)) {
          rsvps.forEach((r: { meetup_id: string }) => {
            const key = r.meetup_id;
            countsByMeetupId[key] = (countsByMeetupId[key] || 0) + 1;
          });
        }
      }

      const normalized: Meetup[] = data.map((m: Meetup) => {
        const meetup: Meetup = {
          ...m,
          participant_count: countsByMeetupId[m.id || ''] || 0,
        };
        return meetup;
      });

      return createSuccessResponse({ meetups: normalized });
    } catch (aggError) {
      console.error('Aggregate meetups error:', aggError);
      return createSuccessResponse({ meetups: data as Meetup[] });
    }
  } catch (error) {
    console.error('Get meetups error:', error);
    return createErrorResponse('获取活动失败', 500);
  }
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { id, survey_questions, ...updateData } = requestData;

    if (!id) {
      return createErrorResponse('缺少活动ID');
    }

    const { data: existingMeetup, error: fetchError } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeetup) {
      return createErrorResponse('活动不存在', 404);
    }

    if (updateData.user_id != existingMeetup.user_id) {
      return createErrorResponse('没有权限修改此活动', 403);
    }

    const updateRecord: Record<string, any> = {};
    // 明确列出允许更新的字段，避免发送不存在的字段（如 participant_count）
    const allowedFields = [
      'title',
      'description',
      'location',
      'datetime',
      'wechat_id',
      'qrcode',
      'status',
      'duration',
      'creator',
      'max_ppl',
      'mode',
      'cover',
      'is_recurring',
      'recurrence_day',
      'episode_start_date',
      'default_theme',
      'survey_id',
      'skip_login',
    ];

    allowedFields.forEach((key) => {
      const value = (updateData as Record<string, any>)[key];
      if (value !== undefined && value !== null) {
        updateRecord[key] = value;
      }
    });

    const { data, error } = await supabase
      .from('meetups')
      .update(updateRecord)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return createErrorResponse('更新活动数据库失败', 500);
    }

    if (
      survey_questions &&
      Array.isArray(survey_questions) &&
      existingMeetup.survey_id
    ) {
      await supabase
        .from('survey_questions')
        .delete()
        .eq('survey_id', existingMeetup.survey_id);

      if (survey_questions.length > 0) {
        const questionPromises = survey_questions.map(
          (question: any, index: number) => {
            return supabase.from('survey_questions').insert({
              survey_id: existingMeetup.survey_id,
              type: question.type,
              title: question.title,
              description: question.description,
              required: question.required,
              options: question.options,
              max_rating: question.maxRating,
              placeholder: question.placeholder,
              sort_order: question.sortOrder ?? index,
            });
          }
        );
        await Promise.all(questionPromises);
      }
    }

    return createSuccessResponse({
      message: '活动更新成功',
      meetup: data?.[0] as Meetup,
    });
  } catch (error) {
    console.error('Update meetup error:', error);
    return createErrorResponse('更新活动失败', 500);
  }
}

async function handleDelete(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { id, createdBy } = requestData;

    if (!id) {
      return createErrorResponse('缺少活动ID');
    }

    const { data: existingMeetup, error: fetchError } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeetup) {
      return createErrorResponse('活动不存在', 404);
    }

    if (
      createdBy &&
      existingMeetup.created_by &&
      createdBy !== existingMeetup.created_by
    ) {
      return createErrorResponse('没有权限删除此活动', 403);
    }

    const { error } = await supabase
      .from('meetups')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      console.error('Database delete error:', error);
      return createErrorResponse('删除活动失败', 500);
    }

    return createSuccessResponse({
      message: '活动删除成功',
    });
  } catch (error) {
    console.error('Delete meetup error:', error);
    return createErrorResponse('删除活动失败', 500);
  }
}
