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
  const content = shortText(input.content, 20000);
  if (!name || !email || !content)
    return createErrorResponse('请填写有效的称呼、邮箱和投稿内容');
  try {
    await protectAction(event, 'sendSubmission');
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '暂时无法处理',
      error instanceof MailProtectionError ? error.status : 503
    );
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
    const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';
    const author = name.trim().slice(0, 80);

    await sendProtectedEmail({
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

    return createSuccessResponse({ success: true });
  } catch (error) {
    if (error instanceof MailProtectionError)
      return createErrorResponse(error.message, error.status);
    console.error('[sendSubmission] Email operation failed');
    return createErrorResponse('投稿发送失败，请稍后再试', 500);
  }
}
