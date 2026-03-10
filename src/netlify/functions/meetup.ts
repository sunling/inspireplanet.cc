import { supabase } from '../../database/supabase';
import {
  NetlifyContext,
  NetlifyEvent,
  NetlifyResponse,
  HttpHeaders,
} from '../types/http';
import { Meetup } from '../types';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
} from '../utils/server';

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
  action: 'create' | 'get' | 'getAll' | 'update' | 'delete';
}

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as MeetupAction;

    switch (action) {
      case 'create':
        return await handleCreate(event);
      case 'get':
        return await handleGet(event);
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
    const meetupData: MeetupRequest = JSON.parse(event.body || '{}');

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

    if (meetupDateTime < new Date()) {
      return createErrorResponse('活动时间不能是过去的时间');
    }

    const maxRaw = meetupData.max_ppl as any;
    const maxParsed = typeof maxRaw === 'number' ? maxRaw : Number(maxRaw);
    const sanitizedMax =
      Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : null;

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
        },
      ])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      return createErrorResponse('创建活动失败', 500);
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

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { id } = body;

    if (!id) {
      return createErrorResponse('缺少活动ID');
    }

    const { data, error } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database query error:', error);
      return createErrorResponse('获取活动失败', 500);
    }

    if (!data) {
      return createErrorResponse('活动不存在', 404);
    }

    const meetup: Meetup = {
      ...data,
      participantCount: 0,
    };

    return createSuccessResponse({ meetup });
  } catch (error) {
    console.error('Get meetup error:', error);
    return createErrorResponse('获取活动失败', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
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
          participantCount: countsByMeetupId[m.id || ''] || 0,
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
    const body = event.body ? JSON.parse(event.body) : {};
    const { id, ...updateData } = body;

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

    Object.keys(updateData).forEach((key) => {
      const value = (updateData as Record<string, any>)[key];
      if (value) {
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
      return createErrorResponse('更新活动失败', 500);
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
    const body = event.body ? JSON.parse(event.body) : {};
    const { id, createdBy } = body;

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
