import {
  sendProtectedEmail,
  protectAction,
  emailAddress,
  shortText,
  MailProtectionError,
} from '../utils/mailProtection';
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

  const input = getDataFromEvent(event);
  if (input.website) return createSuccessResponse({ success: true });
  const name = shortText(input.name, 80);
  const email = emailAddress(input.email);
  const message = shortText(input.message, 5000);
  if (!name || !email || !message)
    return createErrorResponse('请填写有效的称呼、邮箱和报名内容');
  try {
    await protectAction(event, 'sendEmail');
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '暂时无法处理',
      error instanceof MailProtectionError ? error.status : 503
    );
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
    const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';

    await sendProtectedEmail({
      from: `启发星球 <${from}>`,
      to,
      replyTo: email.trim(),
      subject: `对话主角报名｜${name.trim()}`,
      text: message.trim(),
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    if (error instanceof MailProtectionError)
      return createErrorResponse(error.message, error.status);
    console.error('[sendEmail] Email operation failed');
    return createErrorResponse('报名发送失败，请稍后再试', 500);
  }
}
