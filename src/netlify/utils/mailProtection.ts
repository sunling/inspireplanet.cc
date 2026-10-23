import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { Resend } from 'resend';
import { supabase } from '../../database/supabase';
import type { NetlifyEvent } from '../types/http';

export class MailProtectionError extends Error {
  constructor(
    message: string,
    public status = 503
  ) {
    super(message);
  }
}
export const emailAddress = (input: unknown): string | null => {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value.length <= 254 &&
    /^[^\s<>@,;\x00-\x1f\x7f]+@[^\s<>@,;\x00-\x1f\x7f]+\.[^\s<>@,;\x00-\x1f\x7f]+$/.test(
      value
    )
    ? value
    : null;
};
export const headerText = (value: unknown) =>
  String(value ?? '')
    .replace(/[\r\n\x00-\x1f\x7f]/g, ' ')
    .slice(0, 200);
export const shortText = (value: unknown, max: number): string | null =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
    ? value.trim()
    : null;
export function protectionHash(value: unknown): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new MailProtectionError('邮件防护尚未配置');
  return createHmac('sha256', secret)
    .update('inspireplanet:mail:v1:')
    .update(JSON.stringify(value))
    .digest('hex');
}
function quota(name: unknown, limit: number, window: number) {
  return { key: protectionHash(name), limit, window };
}
export async function protectAction(
  event: NetlifyEvent,
  scope: string,
  userId?: string
) {
  // Never rotate buckets using untrusted X-Forwarded-For. A missing platform IP
  // shares an unknown bucket; the global quota still applies independently.
  const raw = event.headers['x-nf-client-connection-ip'] || '';
  const ip = isIP(raw) ? raw : 'unknown';
  const admin = scope === 'approval-mail' || scope === 'certificate-mail';
  const window = admin ? 60 : 900;
  const limit = admin ? 60 : scope === 'image-search' ? 15 : 3;
  const limits = [
    quota(['request-ip', scope, ip], limit, window),
    quota(
      ['request-global', scope],
      admin ? 500 : scope === 'image-search' ? 200 : 100,
      3600
    ),
  ];
  if (userId)
    limits.push(
      quota(['request-user', scope, userId], admin ? 60 : 15, window)
    );
  const { data, error } = await supabase.rpc('consume_security_limits', {
    p_limits: limits,
  });
  if (error || typeof data !== 'boolean')
    throw new MailProtectionError('暂时无法处理，请稍后再试');
  if (!data) throw new MailProtectionError('操作过于频繁，请稍后再试', 429);
}

interface ProtectedMail {
  from: string;
  to: string | string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}
export async function sendProtectedEmail(input: ProtectedMail) {
  if (!process.env.RESEND_API_KEY)
    throw new MailProtectionError('邮件服务尚未配置');
  const recipients = [
    ...new Set([
      ...(Array.isArray(input.to) ? input.to : [input.to]),
      ...(input.cc || []),
    ]),
  ];
  if (
    !recipients.length ||
    recipients.length > 20 ||
    recipients.some((to) => !emailAddress(to)) ||
    (input.replyTo && !emailAddress(input.replyTo))
  )
    throw new MailProtectionError('邮件地址格式无效', 400);
  const payload = {
    ...input,
    to: Array.isArray(input.to)
      ? input.to.map((to) => emailAddress(to)!)
      : emailAddress(input.to)!,
    ...(input.cc ? { cc: input.cc.map((to) => emailAddress(to)!) } : {}),
    ...(input.replyTo ? { replyTo: emailAddress(input.replyTo)! } : {}),
    subject: headerText(input.subject),
    ...(input.attachments
      ? {
          attachments: input.attachments.map((a) => ({
            ...a,
            filename: headerText(a.filename).replace(/[\\/:*?"<>|]/g, '-'),
          })),
        }
      : {}),
  };
  const key = protectionHash(['delivery', payload]);
  const limits = [
    quota(['mail-global'], 500, 86400),
    ...recipients.map((to) =>
      quota(['mail-recipient', to.toLowerCase()], 20, 3600)
    ),
  ];
  const { data: claim, error } = await supabase.rpc('claim_security_mail', {
    p_key: key,
    p_limits: limits,
  });
  if (error || !claim?.status)
    throw new MailProtectionError('邮件防护暂时不可用');
  if (claim.status === 'duplicate') return { id: null, duplicate: true };
  if (claim.status !== 'claimed' || !claim.lease)
    throw new MailProtectionError('邮件发送过于频繁或正在处理中', 429);
  let accepted = false;
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
      payload,
      { idempotencyKey: `inspireplanet/${key}` }
    );
    if (result.error || !result.data?.id)
      throw new MailProtectionError('邮件发送失败，请稍后重试');
    accepted = true;
    const { data: done, error: finishError } = await supabase.rpc(
      'finish_security_mail',
      { p_key: key, p_lease: claim.lease, p_sent: true }
    );
    if (finishError || !done)
      throw new MailProtectionError('邮件已提交，发送记录待确认，请稍后重试');
    return result.data;
  } finally {
    // Preserve an uncertain accepted delivery for recovery via the same provider key.
    if (!accepted) {
      const { error: releaseError } = await supabase.rpc(
        'finish_security_mail',
        { p_key: key, p_lease: claim.lease, p_sent: false }
      );
      if (releaseError) console.error('Mail delivery lease release failed');
    }
  }
}
