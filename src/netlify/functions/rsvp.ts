import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
} from '../utils/server';

export interface RsvpAction {
  action: 'create' | 'get' | 'getAll' | 'update' | 'delete';
}

export async function handler(event: NetlifyEvent, context: any) {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as RsvpAction;

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
    console.error('RSVP Handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent) {
  try {
    const rsvpData = JSON.parse(event.body || '{}');
    const meetupIdNum = Number(rsvpData.meetup_id);
    const wechatId = String(rsvpData.wechat_id || '').trim();
    const name = String(rsvpData.name || '').trim();
    const authUserId = getUserIdFromAuth(event);
    const providedUserId =
      rsvpData.user_id !== undefined ? rsvpData.user_id : null;
    const userId = authUserId ?? providedUserId ?? null;

    const requiredFields = ['meetup_id', 'name', 'wechat_id'];
    for (const field of requiredFields) {
      if (!rsvpData[field]) {
        return createErrorResponse(`缺少必填字段: ${field}`);
      }
    }

    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    if (!wechatId || !name) {
      return createErrorResponse('姓名或微信号不合法');
    }

    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .select('id, max_ppl, status')
      .eq('id', meetupIdNum)
      .single();

    if (meetupError || !meetup) {
      return createErrorResponse('活动不存在', 404);
    }

    if (meetup.status === 'cancelled') {
      return createErrorResponse('活动已取消');
    }

    let existingRSVP = null;

    if (userId) {
      const { data: byUser } = await supabase
        .from('meetup_rsvps')
        .select('id, status, wechat_id')
        .eq('meetup_id', meetupIdNum)
        .eq('user_id', userId)
        .limit(1);
      if (byUser && byUser.length > 0) {
        existingRSVP = byUser[0];
      }
    }

    if (!existingRSVP) {
      const { data: byWechat } = await supabase
        .from('meetup_rsvps')
        .select('id, status, user_id')
        .eq('meetup_id', meetupIdNum)
        .eq('wechat_id', wechatId)
        .limit(1);
      if (byWechat && byWechat.length > 0) {
        existingRSVP = byWechat[0];
      }
    }

    if (existingRSVP && existingRSVP.status === 'confirmed') {
      return createErrorResponse('您已经报名了这个活动');
    }

    const maxLimit = Number(meetup.max_ppl);
    const enforceLimit = Number.isFinite(maxLimit) && maxLimit > 0;
    if (enforceLimit) {
      const { count, error: countError } = await supabase
        .from('meetup_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('meetup_id', meetupIdNum)
        .eq('status', 'confirmed');

      if (countError) {
        console.error('Count error:', countError);
      } else if (count !== null && count >= maxLimit) {
        return createErrorResponse('活动人数已满');
      }
    }

    let result;
    if (existingRSVP) {
      // 更新现有RSVP（触发器限制只允许更新 status 字段）
      const { data, error } = await supabase
        .from('meetup_rsvps')
        .update({ status: 'confirmed' })

        .eq('id', existingRSVP.id)
        .select();

      result = { data, error };
    } else {
      const { data, error } = await supabase
        .from('meetup_rsvps')
        .insert([
          {
            meetup_id: meetupIdNum,
            name,
            wechat_id: wechatId,
            user_id: userId as any,
            status: 'confirmed',
          },
        ])
        .select();

      result = { data, error };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return createErrorResponse('报名失败', 500);
    }

    return createSuccessResponse({
      message: '报名成功',
      rsvp: result.data?.[0] || null,
    });
  } catch (error) {
    console.error('Create RSVP error:', error);
    return createErrorResponse('报名失败', 500);
  }
}

async function handleGet(event: NetlifyEvent) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { meetup_id, user_id, wechat_id, status } = body;
    const meetupIdNum = meetup_id !== undefined ? Number(meetup_id) : undefined;

    if (!meetup_id && !user_id && !wechat_id) {
      return createErrorResponse('缺少查询参数');
    }

    let query = supabase.from('meetup_rsvps').select('*');

    if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum)) {
      query = query.eq('meetup_id', meetupIdNum);
    }

    if (user_id) {
      query = query.eq(
        'user_id',
        isNaN(Number(user_id)) ? user_id : Number(user_id)
      );
    }

    if (wechat_id) {
      query = query.eq('wechat_id', wechat_id);
    }

    const statusTrimmed =
      status !== undefined ? String(status).trim() : undefined;
    if (!statusTrimmed || statusTrimmed === 'confirmed') {
      query = query.eq('status', 'confirmed');
    } else if (statusTrimmed === 'cancelled') {
      query = query.eq('status', 'cancelled');
    } else if (statusTrimmed === 'all') {
    } else {
      query = query.eq('status', statusTrimmed);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get RSVPs error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleGetAll(event: NetlifyEvent) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { meetup_id, user_id, wechat_id, status } = body;
    const meetupIdNum = meetup_id !== undefined ? Number(meetup_id) : undefined;

    let query = supabase.from('meetup_rsvps').select('*');

    if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum)) {
      query = query.eq('meetup_id', meetupIdNum);
    }

    if (user_id) {
      query = query.eq(
        'user_id',
        isNaN(Number(user_id)) ? user_id : Number(user_id)
      );
    }

    if (wechat_id) {
      query = query.eq('wechat_id', wechat_id);
    }

    const statusTrimmed =
      status !== undefined ? String(status).trim() : undefined;
    if (!statusTrimmed || statusTrimmed === 'confirmed') {
      query = query.eq('status', 'confirmed');
    } else if (statusTrimmed === 'cancelled') {
      query = query.eq('status', 'cancelled');
    } else if (statusTrimmed === 'all') {
    } else {
      query = query.eq('status', statusTrimmed);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get all RSVPs error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleUpdate(event: NetlifyEvent) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { id, ...updateData } = body;

    if (!id) {
      return createErrorResponse('缺少RSVP ID');
    }

    const idTrimmed = String(id).trim();
    const idNum = Number(idTrimmed);
    const hasNum = Number.isFinite(idNum);

    const allowedFields = ['status', 'name'];
    const updateRecord = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        (updateRecord as Record<string, any>)[field] = (
          updateData as Record<string, any>
        )[field];
      }
    });

    if (Object.keys(updateRecord).length === 0) {
      return createErrorResponse('无可更新字段');
    }

    let pre = await supabase
      .from('meetup_rsvps')
      .select('id')
      .eq('id', idTrimmed as any)
      .limit(1);
    let preData = pre.data || [];
    if ((!preData || preData.length === 0) && hasNum) {
      pre = await supabase
        .from('meetup_rsvps')
        .select('id')
        .eq('id', idNum as any)
        .limit(1);
      preData = pre.data || [];
    }

    if (!preData || preData.length === 0) {
      return createErrorResponse('RSVP不存在', 404);
    }

    let { data, error } = await supabase
      .from('meetup_rsvps')
      .update(updateRecord)
      .eq('id', idTrimmed as any)
      .select();

    if ((!data || data.length === 0) && hasNum && !error) {
      const second = await supabase
        .from('meetup_rsvps')
        .update(updateRecord)
        .eq('id', idNum as any)
        .select();
      data = second.data;
      error = second.error;
    }

    if (error) {
      console.error('Database update error:', error);
      return createErrorResponse('更新RSVP失败', 500);
    }

    return createSuccessResponse({
      message: 'RSVP更新成功',
      affected: Array.isArray(data) ? data.length : 0,
      rsvp: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });
  } catch (error) {
    console.error('Update RSVP error:', error);
    return createErrorResponse('更新RSVP失败', 500);
  }
}

async function handleDelete(event: NetlifyEvent) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { id, meetup_id, wechat_id } = body;
    const idTrimmed = id !== undefined ? String(id).trim() : undefined;
    const meetupIdTrimmed =
      meetup_id !== undefined ? String(meetup_id).trim() : undefined;
    const wechatIdTrimmed =
      wechat_id !== undefined ? String(wechat_id).trim() : undefined;

    if (!idTrimmed && !(meetupIdTrimmed && wechatIdTrimmed)) {
      return createErrorResponse('缺少必要参数');
    }

    let data: any[] | null = null;
    let error: any = null;

    if (idTrimmed) {
      const idStr = idTrimmed;
      const idNum = Number(idTrimmed);
      const hasNum = Number.isFinite(idNum);

      let pre = await supabase
        .from('meetup_rsvps')
        .select('id')
        .eq('id', idStr as any)
        .limit(1);
      let preData = pre.data || [];
      if ((!preData || preData.length === 0) && hasNum) {
        pre = await supabase
          .from('meetup_rsvps')
          .select('id')
          .eq('id', idNum as any)
          .limit(1);
        preData = pre.data || [];
      }

      if (!preData || preData.length === 0) {
        return createErrorResponse('RSVP不存在', 404);
      }

      let res = await supabase
        .from('meetup_rsvps')
        .update({ status: 'cancelled' })
        .eq('id', idStr as any)
        .select();
      data = res.data;
      error = res.error;

      if ((!data || data.length === 0) && hasNum && !error) {
        const res2 = await supabase
          .from('meetup_rsvps')
          .update({ status: 'cancelled' })
          .eq('id', idNum as any)
          .select();
        data = res2.data;
        error = res2.error;
      }
    } else if (meetupIdTrimmed && wechatIdTrimmed) {
      const meetupIdNum = Number(meetupIdTrimmed);
      const hasMeetupNum = Number.isFinite(meetupIdNum);

      let preQuery = supabase
        .from('meetup_rsvps')
        .select('id')
        .eq('wechat_id', wechatIdTrimmed);
      preQuery = hasMeetupNum
        ? preQuery.eq('meetup_id', meetupIdNum)
        : preQuery.eq('meetup_id', meetupIdTrimmed as any);
      const pre = await preQuery.limit(1);
      const preData = pre.data || [];

      if (!preData || preData.length === 0) {
        return createErrorResponse('RSVP不存在', 404);
      }

      let query = supabase
        .from('meetup_rsvps')
        .update({ status: 'cancelled' })
        .eq('wechat_id', wechatIdTrimmed);
      query = hasMeetupNum
        ? query.eq('meetup_id', meetupIdNum)
        : query.eq('meetup_id', meetupIdTrimmed as any);
      const res = await query.select();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return createErrorResponse('取消报名失败', 500);
    }

    return createSuccessResponse({
      message: '取消报名成功',
      affected: Array.isArray(data) ? data.length : 0,
      rsvp: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });
  } catch (error) {
    console.error('Delete RSVP error:', error);
    return createErrorResponse('取消报名失败', 500);
  }
}
