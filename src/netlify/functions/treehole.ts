import { Resend } from 'resend';
import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  createSuccessResponse,
  getUserIdFromAuth,
  handleOptionsRequest,
} from '../utils/server';

type TreeholeRequest = {
  functionName?: string;
  id?: string | number;
  questionId?: string | number;
  content?: string;
  email?: string;
  nickname?: string;
  limit?: string | number;
};

const DEFAULT_NICKNAME = '一位路过的人';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readRequest(event: NetlifyEvent): TreeholeRequest {
  if (event.httpMethod === 'GET' || event.httpMethod === 'DELETE') {
    return { ...event.queryStringParameters };
  }

  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function mapQuestion(question: any, responseCount = 0) {
  return {
    id: Number(question.id),
    content: question.content,
    createdAt: question.created_at,
    responseCount,
  };
}

function mapResponse(response: any) {
  return {
    id: Number(response.id),
    questionId: Number(response.question_id),
    content: response.content,
    nickname: response.nickname,
    createdAt: response.created_at,
  };
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    const request = readRequest(event);

    switch (request.functionName) {
      case 'list':
        return await handleList(request);
      case 'detail':
        return await handleDetail(request);
      case 'createQuestion':
        return await handleCreateQuestion(request);
      case 'createResponse':
        return await handleCreateResponse(request);
      case 'deleteQuestion':
        return await handleDeleteQuestion(event, request);
      case 'deleteResponse':
        return await handleDeleteResponse(event, request);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Treehole handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleList(request: TreeholeRequest): Promise<NetlifyResponse> {
  const limit = Math.min(Math.max(Number(request.limit) || 20, 1), 50);
  const { data: questions, error } = await supabase
    .from('treehole_questions')
    .select('id, content, created_at')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('List treehole questions error:', error);
    return createErrorResponse('暂时无法读取树洞', 500);
  }

  const ids = (questions || []).map((question) => question.id);
  const counts = new Map<number, number>();

  if (ids.length) {
    const { data: responses, error: responseError } = await supabase
      .from('treehole_responses')
      .select('question_id')
      .in('question_id', ids)
      .eq('is_visible', true);

    if (responseError) {
      console.error('Count treehole responses error:', responseError);
      return createErrorResponse('暂时无法读取树洞', 500);
    }

    for (const response of responses || []) {
      const questionId = Number(response.question_id);
      counts.set(questionId, (counts.get(questionId) || 0) + 1);
    }
  }

  return createSuccessResponse({
    questions: (questions || []).map((question) =>
      mapQuestion(question, counts.get(Number(question.id)) || 0)
    ),
  });
}

async function handleDetail(
  request: TreeholeRequest
): Promise<NetlifyResponse> {
  const id = Number(request.id);
  if (!Number.isInteger(id) || id <= 0) {
    return createErrorResponse('问题不存在', 404);
  }

  const { data: question, error } = await supabase
    .from('treehole_questions')
    .select('id, content, created_at')
    .eq('id', id)
    .eq('is_visible', true)
    .single();

  if (error || !question) return createErrorResponse('问题不存在', 404);

  const { data: responses, error: responseError } = await supabase
    .from('treehole_responses')
    .select('id, question_id, content, nickname, created_at')
    .eq('question_id', id)
    .eq('is_visible', true)
    .order('created_at', { ascending: true });

  if (responseError) {
    console.error('Get treehole responses error:', responseError);
    return createErrorResponse('暂时无法读取回应', 500);
  }

  return createSuccessResponse({
    question: mapQuestion(question, responses?.length || 0),
    responses: (responses || []).map(mapResponse),
  });
}

async function handleCreateQuestion(
  request: TreeholeRequest
): Promise<NetlifyResponse> {
  const content = request.content?.trim() || '';
  const email = request.email?.trim().toLowerCase() || '';

  if (content.length < 10 || content.length > 2000) {
    return createErrorResponse('请写下 10–2000 字的问题');
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return createErrorResponse('请填写有效的邮箱地址');
  }

  const { data: question, error } = await supabase
    .from('treehole_questions')
    .insert({ content })
    .select('id, content, created_at')
    .single();

  if (error || !question) {
    console.error('Create treehole question error:', error);
    return createErrorResponse('问题发布失败，请稍后再试', 500);
  }

  if (email) {
    const { error: contactError } = await supabase
      .from('treehole_question_contacts')
      .insert({ question_id: question.id, email });

    if (contactError) {
      console.error('Save treehole contact error:', contactError);
      await supabase.from('treehole_questions').delete().eq('id', question.id);
      return createErrorResponse('问题发布失败，请稍后再试', 500);
    }
  }

  return createSuccessResponse({ question: mapQuestion(question) }, 201);
}

async function handleCreateResponse(
  request: TreeholeRequest
): Promise<NetlifyResponse> {
  const questionId = Number(request.questionId);
  const content = request.content?.trim() || '';
  const nickname = request.nickname?.trim() || DEFAULT_NICKNAME;

  if (!Number.isInteger(questionId) || questionId <= 0) {
    return createErrorResponse('问题不存在', 404);
  }
  if (content.length < 2 || content.length > 2000) {
    return createErrorResponse('请写下 2–2000 字的回应');
  }
  if (nickname.length > 40) return createErrorResponse('昵称不能超过 40 个字');

  const { data: question, error: questionError } = await supabase
    .from('treehole_questions')
    .select('id')
    .eq('id', questionId)
    .eq('is_visible', true)
    .single();

  if (questionError || !question) return createErrorResponse('问题不存在', 404);

  const { data: response, error } = await supabase
    .from('treehole_responses')
    .insert({ question_id: questionId, content, nickname })
    .select('id, question_id, content, nickname, created_at')
    .single();

  if (error || !response) {
    console.error('Create treehole response error:', error);
    return createErrorResponse('回应送出失败，请稍后再试', 500);
  }

  await sendResponseNotification(questionId);
  return createSuccessResponse({ response: mapResponse(response) }, 201);
}

async function requireOrganizer(event: NetlifyEvent): Promise<boolean> {
  const userId = await getUserIdFromAuth(event);
  if (!userId) return false;

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'organizer';
}

async function handleDeleteQuestion(
  event: NetlifyEvent,
  request: TreeholeRequest
): Promise<NetlifyResponse> {
  if (!(await requireOrganizer(event)))
    return createErrorResponse('没有权限', 403);
  const id = Number(request.id);
  if (!Number.isInteger(id) || id <= 0)
    return createErrorResponse('缺少问题 ID');

  const { error } = await supabase
    .from('treehole_questions')
    .update({ is_visible: false })
    .eq('id', id);
  if (error) return createErrorResponse('隐藏失败', 500);
  return createSuccessResponse({ success: true });
}

async function handleDeleteResponse(
  event: NetlifyEvent,
  request: TreeholeRequest
): Promise<NetlifyResponse> {
  if (!(await requireOrganizer(event)))
    return createErrorResponse('没有权限', 403);
  const id = Number(request.id);
  if (!Number.isInteger(id) || id <= 0)
    return createErrorResponse('缺少回应 ID');

  const { error } = await supabase
    .from('treehole_responses')
    .update({ is_visible: false })
    .eq('id', id);
  if (error) return createErrorResponse('隐藏失败', 500);
  return createSuccessResponse({ success: true });
}

async function sendResponseNotification(questionId: number): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const { data: contact } = await supabase
    .from('treehole_question_contacts')
    .select('email')
    .eq('question_id', questionId)
    .eq('notifications_enabled', true)
    .maybeSingle();

  if (!contact?.email) return;

  const siteUrl = process.env.URL || 'https://inspireplanet.cc';
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';

  try {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: `启发星球 <${from}>`,
      to: contact.email,
      subject: '你在启发星球写下的问题收到了新回应',
      text: `你在树洞中写下的问题收到了一段新回应。\n\n前往查看：${siteUrl}/treehole/${questionId}\n\n谢谢你愿意把此刻的问题说出来。`,
    });
    if (error) console.error('Send treehole notification error:', error);
  } catch (error) {
    console.error('Send treehole notification error:', error);
  }
}
