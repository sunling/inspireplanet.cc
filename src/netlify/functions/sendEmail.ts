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
  if (event.httpMethod !== 'POST') return createErrorResponse('请求方式不支持', 405);

  const { name, email, message } = getDataFromEvent(event);
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return createErrorResponse('请完整填写报名信息');
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[sendEmail] RESEND_API_KEY is not configured');
    return createErrorResponse('邮件服务尚未配置', 500);
  }

  const to = process.env.CONTACT_EMAIL?.split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  if (!to?.length) {
    console.error('[sendEmail] CONTACT_EMAIL is not configured');
    return createErrorResponse('邮件收件人尚未配置', 500);
  }

  try {
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';

    const { error } = await resend.emails.send({
      from: `启发星球 <${from}>`,
      to,
      replyTo: email.trim(),
      subject: `对话主角报名｜${name.trim()}`,
      text: message.trim(),
    });

    if (error) {
      console.error('[sendEmail] Resend error:', error);
      return createErrorResponse('报名发送失败，请稍后再试', 500);
    }

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error('[sendEmail] Unexpected error:', error);
    return createErrorResponse('报名发送失败，请稍后再试', 500);
  }
}
