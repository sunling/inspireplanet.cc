import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
} from '../utils/server';

export interface NotificationAction {
  action: 'get' | 'getAll' | 'update' | 'markAllRead';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as NotificationAction;

    switch (action) {
      case 'get':
        return await handleGet(event);
      case 'getAll':
        return await handleGetAll(event);
      case 'update':
        return await handleUpdate(event);
      case 'markAllRead':
        return await handleMarkAllRead(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Notifications handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const { id } = body;

  if (!id) {
    return createErrorResponse('缺少通知ID');
  }

  const uid = isNaN(Number(userId)) ? userId : Number(userId);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .eq('user_id', uid)
    .single();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  if (!data) {
    return createErrorResponse('通知不存在', 404);
  }

  return createSuccessResponse({ notification: data });
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const { status, limit = '50', offset = '0' } = body;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', isNaN(Number(userId)) ? userId : Number(userId));

  if (status) query = query.eq('status', status);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(
      parseInt(offset, 10),
      parseInt(offset, 10) + parseInt(limit, 10) - 1
    );

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createSuccessResponse({ notifications: data || [] });
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const { id } = body;

  if (!id) {
    return createErrorResponse('缺少通知ID');
  }

  const uid = isNaN(Number(userId)) ? userId : Number(userId);

  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read' })
    .eq('id', id)
    .eq('user_id', uid);

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createSuccessResponse({});
}

async function handleMarkAllRead(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) {
    return createErrorResponse('未授权', 401);
  }

  const uid = isNaN(Number(userId)) ? userId : Number(userId);

  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read' })
    .eq('user_id', uid)
    .eq('status', 'unread');

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createSuccessResponse({});
}

export async function createNotification(
  userId: string | number,
  title: string,
  content: string,
  path?: string
) {
  const uid = isNaN(Number(userId)) ? userId : Number(userId);
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: uid,
      title,
      content,
      status: 'unread',
      path: path || null,
    })
    .select();
  if (error) {
    console.error('[notifications] insert failed:', error.message);
    return;
  }
  console.log('[notifications] created successfully for user:', uid);
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email, name, username')
      .eq('id', uid)
      .single();
    const to = user?.email;
    if (!to) return;
    const subject = title;
    const base = process.env.PUBLIC_BASE_URL || '';
    const link = path ? (base ? `${base}${path}` : path) : '';
    const name = user?.name || (user?.username ? `@${user.username}` : '');
    const text = [
      name ? `${name}，您好！` : '您好！',
      '',
      content,
      link ? `前往：${link}` : '',
      '',
      '此邮件由系统发送，如有打扰请忽略。',
    ]
      .filter(Boolean)
      .join('\n');
    await sendEmail(to, subject, text);
  } catch {}
}

async function sendEmail(to: string, subject: string, text: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  try {
    if (resendKey) {
      const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      console.log('[notifications] sending via Resend to:', to, 'from:', from);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('Resend email failed:', res.status, body);
      }
      return;
    }
    if (sendgridKey) {
      const from = process.env.EMAIL_FROM || 'no-reply@inspireplanet.cc';
      console.log(
        '[notifications] sending via SendGrid to:',
        to,
        'from:',
        from
      );
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from },
          subject,
          content: [{ type: 'text/plain', value: text }],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('SendGrid email failed:', res.status, body);
      }
      return;
    }
    console.warn(
      '[notifications] no email provider configured: set RESEND_API_KEY or SENDGRID_API_KEY'
    );
  } catch (e) {
    console.error('sendEmail error:', e);
  }
}
