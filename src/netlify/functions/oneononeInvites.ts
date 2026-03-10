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

export interface OneOnOneInviteAction {
  action: 'create' | 'get' | 'getAll' | 'update';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as OneOnOneInviteAction;

    switch (action) {
      case 'create':
        return await handleCreate(event);
      case 'get':
        return await handleGet(event);
      case 'getAll':
        return await handleGetAll(event);
      case 'update':
        return await handleUpdate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('OneononeInvites handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  if (!event.body) {
    return createErrorResponse('请求体为空');
  }

  const data = JSON.parse(event.body);
  const invitee_id = data.invitee_id;
  const message = data.message || '';
  const proposed_slots = Array.isArray(data.proposed_slots)
    ? data.proposed_slots
    : [];

  if (!invitee_id || proposed_slots.length === 0) {
    return createErrorResponse('缺少必填字段');
  }

  const now = Date.now();
  const validSlots = proposed_slots.filter((s: any) => {
    const t = new Date(s.datetime_iso).getTime();
    const m = s.mode === 'online' || s.mode === 'offline';
    return !isNaN(t) && t > now && m;
  });

  if (validSlots.length === 0) {
    return createErrorResponse('无效的时间段');
  }

  const { data: inserted, error } = await supabase
    .from('one_on_one_invites')
    .insert({
      inviter_id: userId,
      invitee_id,
      message,
      proposed_slots,
      status: 'pending',
    })
    .select();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  const inv = inserted?.[0];
  if (inv) {
    const { data: inviterUser } = await supabase
      .from('users')
      .select('name, username')
      .eq('id', userId)
      .single();
    const inviterName =
      inviterUser?.name ||
      (inviterUser?.username ? `@${inviterUser.username}` : '对方');
    const fmt = (iso: string) => {
      try {
        return new Date(iso).toISOString();
      } catch {
        return iso;
      }
    };
    const slotsText =
      validSlots
        .slice(0, 3)
        .map(
          (s: any) =>
            `${fmt(s.datetime_iso)} · ${s.mode === 'online' ? '线上' : '线下'}`
        )
        .join('、') + (validSlots.length > 3 ? '…' : '');
    const msg = `来自 ${inviterName} 的邀请：${message || '（无邀请语）'}；候选时间：${slotsText}`;
    await createNotification(invitee_id, '收到邀请', msg, '/connections');
  }

  return createSuccessResponse({ invite: inserted?.[0] || null });
}

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const { id } = body;

  if (!id) {
    return createErrorResponse('缺少邀请ID');
  }

  const { data, error } = await supabase
    .from('one_on_one_invites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  if (!data) {
    return createErrorResponse('邀请不存在', 404);
  }

  const isInvitee = data.invitee_id === userId;
  const isInviter = data.inviter_id === userId;

  if (!isInvitee && !isInviter) {
    return createErrorResponse('无权访问', 403);
  }

  return createSuccessResponse({ invite: data });
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const role = body.role || 'invitee';
  const status = body.status || '';

  let query = supabase.from('one_on_one_invites').select('*');
  if (role === 'inviter') query = query.eq('inviter_id', userId);
  else query = query.eq('invitee_id', userId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createSuccessResponse({ invites: data || [] });
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const { id, status: nextStatus, selected_slot } = body;

  if (!id || !event.body) {
    return createErrorResponse('缺少参数');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('one_on_one_invites')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return createErrorResponse('邀请不存在', 404);
  }

  const isInvitee = existing.invitee_id === userId;
  const isInviter = existing.inviter_id === userId;

  if (!isInvitee && !isInviter) {
    return createErrorResponse('无权访问', 403);
  }

  const allowed = ['pending', 'accepted', 'declined', 'cancelled'];
  if (!allowed.includes(nextStatus)) {
    return createErrorResponse('无效的状态');
  }

  const updateRecord: Record<string, any> = { status: nextStatus };
  if (nextStatus === 'accepted' && selected_slot)
    updateRecord.selected_slot = selected_slot;

  const { data, error } = await supabase
    .from('one_on_one_invites')
    .update(updateRecord)
    .eq('id', id)
    .select();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  const updated = data?.[0];
  if (updated) {
    if (nextStatus === 'accepted') {
      const { data: inviterUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', updated.inviter_id)
        .single();
      const { data: inviteeUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', updated.invitee_id)
        .single();
      const inviterName =
        inviterUser?.name ||
        (inviterUser?.username
          ? `@${inviterUser.username}`
          : String(updated.inviter_id));
      const inviteeName =
        inviteeUser?.name ||
        (inviteeUser?.username
          ? `@${inviteeUser.username}`
          : String(updated.invitee_id));
      await createNotification(
        updated.inviter_id,
        '邀请已接受',
        `${inviteeName} 已接受你的邀请，系统已生成会面记录`,
        '/connections'
      );
      await createNotification(
        updated.invitee_id,
        '你已接受邀请',
        `已接受来自 ${inviterName} 的邀请，系统已生成会面记录`,
        '/connections'
      );
    } else if (nextStatus === 'declined') {
      const { data: inviteeUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', updated.invitee_id)
        .single();
      const inviteeName =
        inviteeUser?.name ||
        (inviteeUser?.username
          ? `@${inviteeUser.username}`
          : String(updated.invitee_id));
      await createNotification(
        updated.inviter_id,
        '邀请被拒绝',
        `${inviteeName} 拒绝了你的邀请`,
        '/connections'
      );
    } else if (nextStatus === 'cancelled') {
      const targetId = isInvitee ? updated.inviter_id : updated.invitee_id;
      const { data: canceller } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', userId)
        .single();
      const cancellerName =
        canceller?.name ||
        (canceller?.username ? `@${canceller.username}` : '对方');
      await createNotification(
        targetId,
        '邀请已取消',
        `${cancellerName} 取消了邀请`,
        '/connections'
      );
    }
  }

  return createSuccessResponse({ invite: data?.[0] || null });
}
