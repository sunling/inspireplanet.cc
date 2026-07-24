import { Resend } from 'resend';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  handleOptionsRequest,
} from '../utils/server';

export async function handler(
  event: NetlifyEvent,
  _context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();
  if (event.httpMethod !== 'POST')
    return createErrorResponse('请求方式不支持', 405);

  const { name, email, content, website } = getDataFromEvent(event);

  // This field is hidden from people. Bots commonly fill it in.
  if (website) return createSuccessResponse({ success: true });

  if (!name?.trim() || !email?.trim() || !content?.trim()) {
    return createErrorResponse('请完整填写投稿信息');
  }

  if (content.trim().length > 20000) {
    return createErrorResponse('投稿内容请控制在 20000 字以内');
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[sendSubmission] RESEND_API_KEY is not configured');
    return createErrorResponse('邮件服务尚未配置', 500);
  }

  const to = process.env.CONTACT_EMAIL?.split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  const cc = process.env.SUBMISSION_CC_EMAILS?.split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  if (!to?.length || !cc?.length) {
    console.error(
      '[sendSubmission] CONTACT_EMAIL or SUBMISSION_CC_EMAILS is not configured'
    );
    return createErrorResponse('投稿邮件收件人尚未配置', 500);
  }

  try {
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';
    const author = name.trim().slice(0, 80);

    const { error } = await resend.emails.send({
      from: `启发星球 <${from}>`,
      to,
      cc,
      replyTo: email.trim(),
      subject: `启发星球新投稿｜${author}`,
      text: [
        '【启发星球投稿】',
        `投稿人：${author}`,
        `联系邮箱：${email.trim()}`,
        `投稿内容：\n${content.trim()}`,
      ].join('\n\n'),
    });

    if (error) {
      console.error('[sendSubmission] Resend error:', error);
      return createErrorResponse('投稿发送失败，请稍后再试', 500);
    }

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error('[sendSubmission] Unexpected error:', error);
    return createErrorResponse('投稿发送失败，请稍后再试', 500);
  }
}
