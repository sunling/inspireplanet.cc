import { createHash } from 'crypto';
import { Resend } from 'resend';

import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  createSuccessResponse,
  getAuthenticatedUser,
  getDataFromEvent,
  getFunctionNameFromEvent,
  handleOptionsRequest,
} from '../utils/server';
import {
  normalizeRoundtableSessionDate,
  RoundtableQuestionInput,
  validateRoundtableQuestionInput,
} from '../validation/roundtableQuestions';

const MAX_SUBMISSIONS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_SELECT =
  'id, name, question, context, status, scheduled_session, created_at';
const ADMIN_SELECT = `${PUBLIC_SELECT}, email, boundaries, available_dates, other_availability, updated_at`;
const ALLOWED_STATUSES = [
  'open',
  'contacted',
  'scheduled',
  'completed',
  'hidden',
] as const;

type RoundtableStatus = (typeof ALLOWED_STATUSES)[number];

const getClientFingerprint = (event: NetlifyEvent) => {
  const ip =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'];
  if (!ip) return null;

  const salt =
    process.env.ROUNDTABLE_RATE_LIMIT_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'inspire-planet-roundtable';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
};

const mapQuestion = (row: Record<string, any>) => ({
  id: String(row.id),
  name: row.name,
  question: row.question,
  context: row.context,
  status: row.status,
  scheduledSession: row.scheduled_session || null,
  createdAt: row.created_at,
  ...('email' in row
    ? {
        email: row.email || null,
        boundaries: row.boundaries || '',
        availableDates: row.available_dates || [],
        otherAvailability: row.other_availability || '',
        updatedAt: row.updated_at,
      }
    : {}),
});

export async function handler(
  event: NetlifyEvent,
  _context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    switch (getFunctionNameFromEvent(event)) {
      case 'listPublic':
        return await handleListPublic(event);
      case 'create':
        return await handleCreate(event);
      case 'support':
        return await handleSupport(event);
      case 'listAdmin':
        return await handleListAdmin(event);
      case 'update':
        return await handleUpdate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('[roundtableQuestions] Unexpected error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleListPublic(event: NetlifyEvent): Promise<NetlifyResponse> {
  const sessionDate = normalizeRoundtableSessionDate(
    event.queryStringParameters?.sessionDate
  );

  let query = supabase
    .from('roundtable_questions')
    .select(PUBLIC_SELECT)
    .neq('status', 'hidden')
    .order('created_at', { ascending: false });

  if (sessionDate) {
    query = query.contains('available_dates', [sessionDate]);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('[roundtableQuestions] Public list error:', error);
    return createErrorResponse('读取问题失败，请稍后再试', 500);
  }

  return createSuccessResponse({
    questions: await attachSupportCounts(data || []),
  });
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return createErrorResponse('请求方式不支持', 405);
  }

  const input = getDataFromEvent(event);
  if (String(input.website || '').trim()) {
    return createSuccessResponse({ question: null }, 201);
  }

  const validation = validateRoundtableQuestionInput(input);
  if (!validation.ok) return createErrorResponse(validation.error);
  const fingerprint = getClientFingerprint(event);
  if (fingerprint) {
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString();
    const { count, error: countError } = await supabase
      .from('roundtable_questions')
      .select('id', { count: 'exact', head: true })
      .eq('request_fingerprint', fingerprint)
      .gte('created_at', windowStart);

    if (countError) {
      console.error('[roundtableQuestions] Rate limit error:', countError);
      return createErrorResponse('暂时无法提交，请稍后再试', 500);
    }
    if ((count || 0) >= MAX_SUBMISSIONS_PER_WINDOW) {
      return createErrorResponse('提交得有点快，请稍后再试', 429);
    }
  }

  const value = validation.value;
  const { data: created, error } = await supabase
    .from('roundtable_questions')
    .insert({
      name: value.name,
      email: value.email,
      question: value.question,
      context: value.context,
      boundaries: value.boundaries,
      available_dates: value.availableDates,
      other_availability: value.otherAvailability,
      request_fingerprint: fingerprint,
    })
    .select(PUBLIC_SELECT)
    .single();

  if (error || !created) {
    console.error('[roundtableQuestions] Create error:', error);
    return createErrorResponse('提交失败，请稍后再试', 500);
  }

  await sendSubmissionNotification(value, String(created.id));
  return createSuccessResponse(
    { question: { ...mapQuestion(created), supportCount: 0 } },
    201
  );
}

async function handleSupport(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return createErrorResponse('请求方式不支持', 405);
  }

  const input = getDataFromEvent(event);
  const id = String(input.id || '');
  const supporterToken = String(input.supporterToken || '').trim();
  if (!/^\d+$/.test(id) || !/^[a-zA-Z0-9-]{16,128}$/.test(supporterToken)) {
    return createErrorResponse('支持参数无效');
  }

  const salt =
    process.env.ROUNDTABLE_RATE_LIMIT_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'inspire-planet-roundtable';
  const supporterFingerprint = createHash('sha256')
    .update(`${salt}:support:${supporterToken}`)
    .digest('hex');
  const { error } = await supabase.from('roundtable_question_supports').insert({
    question_id: id,
    supporter_fingerprint: supporterFingerprint,
  });

  const alreadySupported = error?.code === '23505';
  if (error && !alreadySupported) {
    console.error('[roundtableQuestions] Support error:', error);
    return createErrorResponse(
      error.code === '23503'
        ? '这个问题已经不存在了'
        : '暂时无法支持，请稍后再试',
      error.code === '23503' ? 404 : 500
    );
  }

  const { count, error: countError } = await supabase
    .from('roundtable_question_supports')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', id);
  if (countError) {
    console.error('[roundtableQuestions] Support count error:', countError);
    return createErrorResponse('暂时无法读取支持数，请稍后再试', 500);
  }

  return createSuccessResponse({
    supportCount: count || 0,
    alreadySupported,
  });
}

async function handleListAdmin(event: NetlifyEvent): Promise<NetlifyResponse> {
  const user = await getAuthenticatedUser(event);
  if (!user) return createErrorResponse('未授权', 401);
  if (user.role !== 'organizer') {
    return createErrorResponse('需要管理员权限', 403);
  }

  const { data, error } = await supabase
    .from('roundtable_questions')
    .select(ADMIN_SELECT)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    console.error('[roundtableQuestions] Admin list error:', error);
    return createErrorResponse('读取问题管理列表失败', 500);
  }

  return createSuccessResponse({
    questions: await attachSupportCounts(data || []),
  });
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'PUT') {
    return createErrorResponse('请求方式不支持', 405);
  }
  const user = await getAuthenticatedUser(event);
  if (!user) return createErrorResponse('未授权', 401);
  if (user.role !== 'organizer') {
    return createErrorResponse('需要管理员权限', 403);
  }

  const input = getDataFromEvent(event);
  const id = String(input.id || '');
  const status = String(input.status || '') as RoundtableStatus;
  const scheduledSession = String(input.scheduledSession || '').trim();
  if (!/^\d+$/.test(id) || !ALLOWED_STATUSES.includes(status)) {
    return createErrorResponse('更新参数无效');
  }
  if (scheduledSession.length > 120) {
    return createErrorResponse('场次说明请控制在 120 字以内。');
  }

  const { data, error } = await supabase
    .from('roundtable_questions')
    .update({
      status,
      scheduled_session: scheduledSession || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(ADMIN_SELECT)
    .single();

  if (error || !data) {
    console.error('[roundtableQuestions] Update error:', error);
    return createErrorResponse('更新失败，请稍后再试', 500);
  }

  const [question] = await attachSupportCounts([data]);
  return createSuccessResponse({ question });
}

async function attachSupportCounts(rows: Array<Record<string, any>>) {
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const { data, error } = await supabase
    .from('roundtable_question_supports')
    .select('question_id')
    .in('question_id', ids);
  if (error) {
    console.error('[roundtableQuestions] Support counts error:', error);
    return rows.map((row) => ({ ...mapQuestion(row), supportCount: 0 }));
  }

  const counts = new Map<string, number>();
  (data || []).forEach((support) => {
    const id = String(support.question_id);
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  return rows.map((row) => ({
    ...mapQuestion(row),
    supportCount: counts.get(String(row.id)) || 0,
  }));
}

async function sendSubmissionNotification(
  input: RoundtableQuestionInput,
  id: string
) {
  const resendKey = process.env.RESEND_API_KEY;
  const recipients = process.env.CONTACT_EMAIL?.split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  if (!resendKey || !recipients?.length) {
    console.warn(
      '[roundtableQuestions] Email notification skipped: RESEND_API_KEY or CONTACT_EMAIL missing'
    );
    return;
  }

  try {
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';
    const { error } = await resend.emails.send({
      from: `启发星球 <${from}>`,
      to: recipients,
      ...(input.email ? { replyTo: input.email } : {}),
      subject: `问题圆桌新提交｜${input.name}`,
      text: [
        `问题编号：${id}`,
        `称呼：${input.name}`,
        `联系邮箱：${input.email || '未填写'}`,
        `问题：\n${input.question}`,
        `背景：\n${input.context}`,
        `不希望被触碰的内容：\n${input.boundaries || '未填写'}`,
        `可参加日期：${input.availableDates.join('、') || '未选择'}`,
        `其他方便时间：${input.otherAvailability || '未填写'}`,
        '管理地址：https://inspireplanet.cc/admin/question-roundtable',
      ].join('\n\n'),
    });
    if (error) console.error('[roundtableQuestions] Resend error:', error);
  } catch (error) {
    console.error('[roundtableQuestions] Email notification error:', error);
  }
}
