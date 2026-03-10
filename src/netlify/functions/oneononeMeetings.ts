import { supabase } from '../../database/supabase';
import { createNotification } from './notifications';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
} from '../utils/server';

export interface OneOnOneMeetingAction {
  action: 'create' | 'getAll' | 'update';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as OneOnOneMeetingAction;

    switch (action) {
      case 'create':
        return await handleCreate(event);
      case 'getAll':
        return await handleGetAll(event);
      case 'update':
        return await handleUpdate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('OneononeMeetings handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('未授权', 401);

  if (!event.body) return createErrorResponse('请求体为空');

  const payload = JSON.parse(event.body);
  const {
    invite_id,
    final_datetime_iso,
    mode,
    location_text = null,
    meeting_url = null,
    notes = '',
  } = payload;

  if (!invite_id || !final_datetime_iso || !mode) {
    return createErrorResponse('缺少必填字段');
  }

  const t = new Date(final_datetime_iso).getTime();
  if (isNaN(t) || t <= Date.now()) {
    return createErrorResponse('无效的时间');
  }

  const m = mode === 'online' || mode === 'offline';
  if (!m) return createErrorResponse('无效的形式');

  const { data: invite, error: inviteError } = await supabase
    .from('one_on_one_invites')
    .select('id, inviter_id, invitee_id, status')
    .eq('id', invite_id)
    .single();

  if (inviteError || !invite) {
    return createErrorResponse('邀请不存在', 404);
  }

  if (invite.inviter_id !== userId && invite.invitee_id !== userId) {
    return createErrorResponse('无权访问', 403);
  }

  const { data: inserted, error } = await supabase
    .from('one_on_one_meetings')
    .insert({
      invite_id,
      final_datetime_iso,
      mode,
      location_text,
      meeting_url,
      notes,
      status: 'scheduled',
    })
    .select();

  if (error) return createErrorResponse(error.message, 500);

  await supabase
    .from('one_on_one_invites')
    .update({ status: 'accepted' })
    .eq('id', invite_id);

  const { data: inviterUser } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', invite.inviter_id)
    .single();
  const { data: inviteeUser } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', invite.invitee_id)
    .single();
  const inviterName =
    inviterUser?.name ||
    (inviterUser?.username
      ? `@${inviterUser.username}`
      : String(invite.inviter_id));
  const inviteeName =
    inviteeUser?.name ||
    (inviteeUser?.username
      ? `@${inviteeUser.username}`
      : String(invite.invitee_id));
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toISOString();
    } catch {
      return iso;
    }
  };
  const whereText =
    mode === 'online'
      ? meeting_url
        ? `线上会议（链接：${meeting_url}）`
        : '线上会议（链接未提供）'
      : location_text
        ? `线下地点：${location_text}`
        : '线下地点未提供';
  await createNotification(
    invite.inviter_id,
    '会面已安排',
    `与 ${inviteeName} 于 ${fmt(final_datetime_iso)} 会面（${whereText}）`,
    '/connections'
  );
  await createNotification(
    invite.invitee_id,
    '会面已安排',
    `与 ${inviterName} 于 ${fmt(final_datetime_iso)} 会面（${whereText}）`,
    '/connections'
  );

  return createSuccessResponse({ meeting: inserted?.[0] || null });
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('未授权', 401);

  const { data, error } = await supabase
    .from('one_on_one_meetings')
    .select('*, one_on_one_invites!inner(inviter_id, invitee_id)')
    .order('created_at', { ascending: false });

  if (error) return createErrorResponse(error.message, 500);

  const filtered = (data || []).filter((m: any) => {
    const inv = (m as any).one_on_one_invites;
    return inv && (inv.inviter_id === userId || inv.invitee_id === userId);
  });

  return createSuccessResponse({ meetings: filtered });
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('未授权', 401);

  const body = event.body ? JSON.parse(event.body) : {};
  const { id } = body;

  if (!id) return createErrorResponse('缺少会面ID');

  const { data: meeting, error: fetchError } = await supabase
    .from('one_on_one_meetings')
    .select(
      'id, invite_id, final_datetime_iso, mode, meeting_url, location_text, status'
    )
    .eq('id', id)
    .single();

  if (fetchError || !meeting) return createErrorResponse('会面不存在', 404);

  const { data: invite } = await supabase
    .from('one_on_one_invites')
    .select('inviter_id, invitee_id')
    .eq('id', meeting.invite_id)
    .single();

  if (
    !invite ||
    (invite.inviter_id !== userId && invite.invitee_id !== userId)
  ) {
    return createErrorResponse('无权访问', 403);
  }

  const updateRecord: Record<string, any> = {};
  if (body.final_datetime_iso) {
    const t = new Date(body.final_datetime_iso).getTime();
    if (isNaN(t) || t <= Date.now()) {
      return createErrorResponse('无效的时间');
    }
    updateRecord.final_datetime_iso = new Date(
      body.final_datetime_iso
    ).toISOString();
  }
  if (body.mode) {
    if (!(body.mode === 'online' || body.mode === 'offline')) {
      return createErrorResponse('无效的形式');
    }
    updateRecord.mode = body.mode;
  }
  if (body.meeting_url !== undefined)
    updateRecord.meeting_url = body.meeting_url || null;
  if (body.location_text !== undefined)
    updateRecord.location_text = body.location_text || null;
  if (body.notes !== undefined) updateRecord.notes = body.notes || null;
  if (body.status) {
    const allowed = ['scheduled', 'completed', 'cancelled'];
    if (!allowed.includes(body.status)) {
      return createErrorResponse('无效的状态');
    }
    updateRecord.status = body.status;
  }

  const { data: updated, error } = await supabase
    .from('one_on_one_meetings')
    .update(updateRecord)
    .eq('id', id)
    .select();

  if (error) return createErrorResponse(error.message, 500);

  if (updateRecord.status === 'cancelled') {
    await supabase
      .from('one_on_one_invites')
      .update({ status: 'cancelled' })
      .eq('id', meeting.invite_id);
    const { data: inviterUser } = await supabase
      .from('users')
      .select('name, username')
      .eq('id', invite.inviter_id)
      .single();
    const { data: inviteeUser } = await supabase
      .from('users')
      .select('name, username')
      .eq('id', invite.invitee_id)
      .single();
    const inviterName =
      inviterUser?.name ||
      (inviterUser?.username
        ? `@${inviterUser.username}`
        : String(invite.inviter_id));
    const inviteeName =
      inviteeUser?.name ||
      (inviteeUser?.username
        ? `@${inviteeUser.username}`
        : String(invite.invitee_id));
    const fmt = (iso: string) => {
      try {
        return new Date(iso).toISOString();
      } catch {
        return iso;
      }
    };
    await createNotification(
      invite.inviter_id,
      '会面已取消',
      `与 ${inviteeName} 的会面已取消（原定 ${fmt(meeting.final_datetime_iso)}）`,
      '/connections'
    );
    await createNotification(
      invite.invitee_id,
      '会面已取消',
      `与 ${inviterName} 的会面已取消（原定 ${fmt(meeting.final_datetime_iso)}）`,
      '/connections'
    );
  } else {
    if (
      updateRecord.final_datetime_iso ||
      updateRecord.mode ||
      updateRecord.meeting_url ||
      updateRecord.location_text
    ) {
      const { data: inviterUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', invite.inviter_id)
        .single();
      const { data: inviteeUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', invite.invitee_id)
        .single();
      const inviterName =
        inviterUser?.name ||
        (inviterUser?.username
          ? `@${inviterUser.username}`
          : String(invite.inviter_id));
      const inviteeName =
        inviteeUser?.name ||
        (inviteeUser?.username
          ? `@${inviteeUser.username}`
          : String(invite.invitee_id));
      const fmt = (iso: string) => {
        try {
          return new Date(iso).toISOString();
        } catch {
          return iso;
        }
      };
      const timeText = updateRecord.final_datetime_iso
        ? `时间更新为 ${fmt(updateRecord.final_datetime_iso)}`
        : '';
      const modeText = updateRecord.mode
        ? `形式 ${updateRecord.mode === 'online' ? '线上' : '线下'}`
        : '';
      const whereText =
        updateRecord.mode === 'online'
          ? updateRecord.meeting_url !== undefined
            ? `链接 ${updateRecord.meeting_url || '未提供'}`
            : ''
          : updateRecord.location_text !== undefined
            ? `地点 ${updateRecord.location_text || '未提供'}`
            : '';
      const merged =
        [timeText, modeText, whereText].filter(Boolean).join('，') ||
        '会面信息已更新';
      await createNotification(
        invite.inviter_id,
        '会面信息更新',
        `与 ${inviteeName} 的会面：${merged}`,
        '/connections'
      );
      await createNotification(
        invite.invitee_id,
        '会面信息更新',
        `与 ${inviterName} 的会面：${merged}`,
        '/connections'
      );
    }
    if (updateRecord.status === 'completed') {
      const { data: inviterUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', invite.inviter_id)
        .single();
      const { data: inviteeUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', invite.invitee_id)
        .single();
      const inviterName =
        inviterUser?.name ||
        (inviterUser?.username
          ? `@${inviterUser.username}`
          : String(invite.inviter_id));
      const inviteeName =
        inviteeUser?.name ||
        (inviteeUser?.username
          ? `@${inviteeUser.username}`
          : String(invite.invitee_id));
      await createNotification(
        invite.inviter_id,
        '会面已完成',
        `与 ${inviteeName} 的会面已标记完成`,
        '/connections'
      );
      await createNotification(
        invite.invitee_id,
        '会面已完成',
        `与 ${inviterName} 的会面已标记完成`,
        '/connections'
      );
    }
  }

  return createSuccessResponse({ meeting: updated?.[0] || null });
}
