// src/netlify/functions/meetupHandler.ts
import { supabase } from '../../database/supabase';
import { getCommonHttpHeader } from '../../utils/http';
import { NetlifyContext, NetlifyEvent } from '../types/http';

// 定义接口
export interface Meetup {
  id?: string;
  title: string;
  description: string;
  type?: string;
  mode?: string;
  datetime: string | Date;
  location?: string | null;
  duration?: number | null;
  max_participants?: number | null;
  max_ppl?: number | null;
  organizer?: string;
  creator?: string;
  contact?: string;
  wechat_id?: string;
  qr_image_url?: string | null;
  cover?: string | null;
  status: string;
  user_id?: string | null;
  created_by?: string | null;
  participant_count?: number;
  category?: string;
  fee?: string | null;
  notes?: string | null;
}

export interface MeetupRequest {
  title: string;
  description: string;
  type: string;
  datetime: string;
  organizer: string;
  contact: string;
  location?: string;
  duration?: number;
  maxParticipants?: number;
  qrImageUrl?: string;
  createdBy?: string;
}

export interface MeetupResponse {
  success: boolean;
  meetups?: Meetup[];
  meetup?: Meetup;
  error?: string;
  message?: string;
  details?: string;
}

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  // 设置CORS头
  const headers = getCommonHttpHeader();

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    switch (event.httpMethod) {
      case 'POST':
        return await createMeetup(event, headers);
      case 'GET':
        return await getMeetups(event, headers);
      case 'PUT':
        return await updateMeetup(event, headers);
      case 'DELETE':
        return await deleteMeetup(event, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Method Not Allowed',
          } as MeetupResponse),
        };
    }
  } catch (error) {
    console.error('Meetup handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error),
      } as MeetupResponse),
    };
  }
}

// 创建活动
async function createMeetup(
  event: NetlifyEvent,
  headers: Record<string, string>
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '请求体不能为空',
        } as MeetupResponse),
      };
    }
    const meetupData: MeetupRequest = JSON.parse(event.body);

    // 验证必填字段
    const { title, description, type, datetime, organizer, contact } =
      meetupData;
    if (
      !title ||
      !description ||
      !type ||
      !datetime ||
      !organizer ||
      !contact
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少必填字段',
        } as MeetupResponse),
      };
    }

    // 验证日期格式
    const meetupDateTime = new Date(meetupData.datetime);
    if (isNaN(meetupDateTime.getTime())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '日期时间格式无效',
        } as MeetupResponse),
      };
    }

    if (meetupDateTime < new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动时间不能是过去的时间',
        } as MeetupResponse),
      };
    }

    // 插入到数据库
    const maxRaw = meetupData.maxParticipants as any;
    const maxParsed =
      typeof maxRaw === 'number' ? maxRaw : Number(maxRaw);
    const sanitizedMax =
      Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : null;

    const { data, error } = await supabase
      .from('meetups')
      .insert([
        {
          title,
          description,
          mode: type,
          datetime: meetupDateTime.toISOString(),
          location: meetupData.location?.trim() || null,
          duration: meetupData.duration || null,
          max_ppl: sanitizedMax,
          creator: organizer,
          wechat_id: contact,
          cover: meetupData.qrImageUrl || null,
          status: 'active',
          user_id: meetupData.createdBy || null,
        },
      ])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '创建活动失败',
          details: error.message,
        } as MeetupResponse),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '活动创建成功',
        meetup: data?.[0] as Meetup,
      } as MeetupResponse),
    };
  } catch (error) {
    console.error('Create meetup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '创建活动失败',
        details: error instanceof Error ? error.message : String(error),
      } as MeetupResponse),
    };
  }
}

// 获取活动列表
async function getMeetups(
  event: NetlifyEvent,
  headers: Record<string, string>
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  try {
    const params = event.queryStringParameters || {};
    const { id, status = 'active', limit = '50', offset = '0' } = params;

    let query = supabase.from('meetups').select('*');

    // 如果指定了ID，获取单个活动
    if (id) {
      query = query.eq('id', id);
    } else {
      // 获取活动列表
      if (String(status).toLowerCase() !== 'all') {
        query = query.eq('status', status);
      }
      query = query
        .order('datetime', { ascending: true })
        .range(
          parseInt(offset, 10),
          parseInt(offset, 10) + parseInt(limit, 10) - 1
        );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '获取活动失败',
          details: error.message,
        } as MeetupResponse),
      };
    }

    // 如果没有活动数据，直接返回
    if (!data || data.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetups: [],
        } as MeetupResponse),
      };
    }

    // 计算报名人数，统一前端预期的字段命名
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

      // 规范化返回：兼容前端期望字段
      const normalized: Meetup[] = data.map((m: Meetup) => {
        const meetup: Meetup = {
          ...m,
          // 前端 meetups.html 期望的字段
          type: m.type || m.mode || undefined,
          organizer: m.organizer || m.creator || undefined,
          contact: m.contact || m.wechat_id || undefined,
          qr_image_url: m.qr_image_url || m.cover || undefined,
          max_participants: m.max_participants || m.max_ppl || undefined,
          participant_count: countsByMeetupId[m.id || ''] || 0,
        };
        return meetup;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetups: normalized,
        } as MeetupResponse),
      };
    } catch (aggError) {
      console.error('Aggregate meetups error:', aggError);
      // 发生聚合错误时，仍然返回原始数据，避免接口不可用
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetups: data as Meetup[],
        } as MeetupResponse),
      };
    }
  } catch (error) {
    console.error('Get meetups error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '获取活动失败',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

// 更新活动
async function updateMeetup(
  event: NetlifyEvent,
  headers: Record<string, string>
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  try {
    const params = event.queryStringParameters || {};
    const { id } = params;
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '请求体不能为空',
        } as MeetupResponse),
      };
    }
    const updateData: Partial<Meetup> = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少活动ID',
        } as MeetupResponse),
      };
    }

    // 检查活动是否存在
    const { data: existingMeetup, error: fetchError } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeetup) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动不存在',
        } as MeetupResponse),
      };
    }

    // 验证权限（只有创建者可以修改）
    if (
      updateData.created_by &&
      existingMeetup.created_by &&
      updateData.created_by !== existingMeetup.created_by
    ) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '没有权限修改此活动',
        } as MeetupResponse),
      };
    }

    // 准备更新数据（兼容前端字段，映射到数据库实际列名）
    const updateRecord: Record<string, any> = {};

    if (updateData.title !== undefined) updateRecord.title = updateData.title;
    if (updateData.description !== undefined)
      updateRecord.description = updateData.description;
    if (updateData.datetime !== undefined) updateRecord.datetime = updateData.datetime;
    if (updateData.location !== undefined) updateRecord.location = updateData.location || null;
    if (updateData.duration !== undefined) updateRecord.duration = updateData.duration;
    // 前端可能传 type，数据库列为 mode
    if (updateData.type !== undefined) updateRecord.mode = updateData.type;
    if (updateData.mode !== undefined) updateRecord.mode = updateData.mode;
    // 人数上限：前端可能传 max_participants，数据库列为 max_ppl
    if (updateData.max_participants !== undefined) {
      const mp = Number(updateData.max_participants as any);
      updateRecord.max_ppl = Number.isFinite(mp) && mp > 0 ? mp : null;
    }
    if (updateData.max_ppl !== undefined) updateRecord.max_ppl = updateData.max_ppl;
    // 组织者：前端传 organizer，数据库列为 creator
    if (updateData.organizer !== undefined) updateRecord.creator = updateData.organizer;
    if (updateData.creator !== undefined) updateRecord.creator = updateData.creator;
    // 联系方式：前端传 contact，数据库列为 wechat_id
    if (updateData.contact !== undefined) updateRecord.wechat_id = updateData.contact;
    if (updateData.wechat_id !== undefined) updateRecord.wechat_id = updateData.wechat_id;
    // 群二维码：前端传 qr_image_url，数据库列为 cover
    if (updateData.qr_image_url !== undefined) updateRecord.cover = updateData.qr_image_url || null;
    if (updateData.cover !== undefined) updateRecord.cover = updateData.cover || null;
    // 状态与其他可选字段
    if (updateData.status !== undefined) updateRecord.status = updateData.status;
    if ((updateData as any).notes !== undefined) updateRecord.notes = (updateData as any).notes;

    // 更新数据库
    const { data, error } = await supabase
      .from('meetups')
      .update(updateRecord)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '更新活动失败',
          details: error.message,
        } as MeetupResponse),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '活动更新成功',
        meetup: data?.[0] as Meetup,
      } as MeetupResponse),
    };
  } catch (error) {
    console.error('Update meetup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '更新活动失败',
        details: error instanceof Error ? error.message : String(error),
      } as MeetupResponse),
    };
  }
}

// 删除活动
async function deleteMeetup(
  event: NetlifyEvent,
  headers: Record<string, string>
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  try {
    const params = event.queryStringParameters || {};
    const { id, createdBy } = params;

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少活动ID',
        } as MeetupResponse),
      };
    }

    // 检查活动是否存在
    const { data: existingMeetup, error: fetchError } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeetup) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动不存在',
        } as MeetupResponse),
      };
    }

    // 验证权限（只有创建者可以删除）
    if (
      createdBy &&
      existingMeetup.created_by &&
      createdBy !== existingMeetup.created_by
    ) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '没有权限删除此活动',
        } as MeetupResponse),
      };
    }

    // 软删除（更新状态为cancelled）
    const { error } = await supabase
      .from('meetups')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      console.error('Database delete error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '删除活动失败',
          details: error.message,
        } as MeetupResponse),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '活动删除成功',
      } as MeetupResponse),
    };
  } catch (error) {
    console.error('Delete meetup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '删除活动失败',
        details: error instanceof Error ? error.message : String(error),
      } as MeetupResponse),
    };
  }
}
