import { createHash, createHmac, randomBytes } from 'crypto';
import { Resend } from 'resend';
import { supabase } from '../../database/supabase';
import {
  isSubscriptionToken,
  normalizeSubscriptionEmail,
  SUBSCRIPTION_CONSENT,
  SUBSCRIPTION_MESSAGE,
} from '../../utils/newsletterSubscription';
import type { NetlifyEvent, NetlifyResponse } from '../types/http';

const statuses = ['pending', 'subscribed', 'unsubscribed'];
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const reply = (
  statusCode: number,
  data?: unknown,
  error?: string
): NetlifyResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(
    error ? { success: false, error } : { success: true, data }
  ),
});

/** Confirmation URLs never use client-supplied Host/Origin/redirect values. */
export function subscriptionSiteUrl(): string {
  const configured =
    process.env.CONTEXT === 'deploy-preview' ||
    process.env.CONTEXT === 'branch-deploy'
      ? process.env.DEPLOY_PRIME_URL
      : process.env.URL;
  if (configured) {
    const url = new URL(configured);
    if (
      url.protocol === 'https:' &&
      (url.hostname === 'inspireplanet.cc' ||
        url.hostname === 'www.inspireplanet.cc' ||
        /^[a-z0-9-]+--inspiration-planet\.netlify\.app$/.test(url.hostname) ||
        url.hostname === 'inspiration-planet.netlify.app')
    )
      return url.origin;
  }
  return 'https://inspireplanet.cc';
}
async function isOrganizer(event: NetlifyEvent): Promise<boolean> {
  const bearer = event.headers.authorization || event.headers.Authorization;
  if (!bearer?.startsWith('Bearer ')) return false;
  const { data, error } = await supabase.auth.getUser(bearer.slice(7));
  if (error || !data?.user?.email || !data.user.email_confirmed_at)
    return false;
  const role = await supabase
    .from('users')
    .select('role')
    .eq('email', data.user.email)
    .single();
  return !role.error && role.data?.role === 'organizer';
}
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST')
    return reply(405, undefined, '请求方式不支持');
  try {
    if ((event.body?.length || 0) > 4096)
      return reply(413, undefined, '请求内容过长');
    let body: Record<string, any> = {};
    if (event.httpMethod === 'POST') {
      if (
        !(event.headers['content-type'] || event.headers['Content-Type'] || '')
          .toLowerCase()
          .startsWith('application/json')
      )
        return reply(415, undefined, '请使用 JSON 请求');
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return reply(400, undefined, '请求格式不正确');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body))
        return reply(400, undefined, '请求格式不正确');
      const origin = event.headers.origin || event.headers.Origin;
      if (
        origin &&
        ![
          subscriptionSiteUrl(),
          'https://inspireplanet.cc',
          'https://www.inspireplanet.cc',
        ].includes(origin)
      )
        return reply(403, undefined, '请从启发星球站点提交');
    }
    const params = event.queryStringParameters || {};
    const action =
      event.httpMethod === 'GET' ? params.functionName : body.functionName;
    if (action === 'list' || action === 'remove') {
      if (!(await isOrganizer(event)))
        return reply(403, undefined, '请使用已验证邮箱的组织者账号登录');
      if (action === 'list') {
        if (event.httpMethod !== 'GET')
          return reply(405, undefined, '请求方式不支持');
        const page = Number(params.page || 1);
        const status = params.status || 'all';
        const search = (params.search || '').trim();
        if (
          !Number.isInteger(page) ||
          page < 1 ||
          page > 100000 ||
          !['all', ...statuses].includes(status) ||
          search.length > 254 ||
          (search && !/^[a-z0-9@.+_\-]+$/i.test(search))
        )
          return reply(400, undefined, '筛选条件不正确');
        let query = supabase
          .from('newsletter_subscribers')
          .select(
            'id,email,status,source,created_at,confirmed_at,unsubscribed_at',
            { count: 'exact' }
          )
          .order('created_at', { ascending: false })
          .order('id');
        if (status !== 'all') query = query.eq('status', status);
        if (search)
          query = query.ilike('email', `%${search.replace(/_/g, '\\_')}%`);
        const [list, ...counts] = await Promise.all([
          query.range((page - 1) * 25, page * 25 - 1),
          ...statuses.map((s) =>
            supabase
              .from('newsletter_subscribers')
              .select('id', { count: 'exact', head: true })
              .eq('status', s)
          ),
        ]);
        if (list.error || counts.some((c) => c.error))
          throw new Error('SubscriberReadFailed');
        return reply(200, {
          subscribers: list.data,
          total: list.count,
          counts: Object.fromEntries(
            statuses.map((s, i) => [s, counts[i].count || 0])
          ),
        });
      }
      if (event.httpMethod !== 'POST')
        return reply(405, undefined, '请求方式不支持');
      if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id))
        return reply(400, undefined, '订阅记录不正确');
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
          confirmation_token_hash: null,
          unsubscribe_token_hash: null,
          confirmation_expires_at: null,
        })
        .eq('id', body.id)
        .select('id')
        .maybeSingle();
      if (error) throw new Error('SubscriberUpdateFailed');
      if (!data) return reply(404, undefined, '订阅记录不存在');
      return reply(200, {
        message: '已移出有效订阅名单。对方之后可以自行重新订阅。',
      });
    }
    if (event.httpMethod !== 'POST')
      return reply(405, undefined, '请在页面中点击按钮完成操作');
    if (action === 'subscribe') {
      // Honeypot: same response, no database write or mail.
      if (body.website) return reply(200, { message: SUBSCRIPTION_MESSAGE });
      const email = normalizeSubscriptionEmail(body.email);
      if (!email) return reply(400, undefined, '请输入有效的邮箱地址');
      if (body.consent !== true)
        return reply(400, undefined, '请先同意接收每周分享邮件');
      const key = process.env.RESEND_API_KEY;
      if (!key)
        return reply(503, undefined, '订阅邮件服务暂未配置，请稍后再试');
      const confirmation = randomBytes(32).toString('hex');
      const unsubscribe = randomBytes(32).toString('hex');
      // The Netlify edge supplies this header. Never persist raw IPs.
      const ipKey = createHmac('sha256', key)
        .update(event.headers['x-nf-client-connection-ip'] || 'unknown')
        .digest('hex');
      const source =
        typeof body.source === 'string' &&
        /^\/(?:episodes\/\d{4}\/\d{1,4})?$/.test(body.source)
          ? body.source
          : '/';
      const { data: shouldSend, error } = await supabase.rpc(
        'newsletter_request_subscription',
        {
          p_email: email,
          p_confirmation_hash: digest(confirmation),
          p_unsubscribe_hash: digest(unsubscribe),
          p_ip_hash: ipKey,
          p_source: source,
          p_consent_version: SUBSCRIPTION_CONSENT,
        }
      );
      if (error) throw new Error('SubscriptionRequestFailed');
      if (shouldSend) {
        const site = subscriptionSiteUrl();
        // Fragments are not sent to the web server or included in referrers.
        const confirmUrl = `${site}/newsletter/confirm#${confirmation}`;
        const unsubscribeUrl = `${site}/newsletter/unsubscribe#${unsubscribe}`;
        const { data: sent, error: sendError } = await new Resend(
          key
        ).emails.send(
          {
            from: `启发星球 <${process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc'}>`,
            to: email,
            subject: '请确认订阅启发星球每周分享',
            text: `感谢你订阅启发星球。每周邮件包含本期会议精华、真实金句和已发布的小宇宙播客链接。\n\n请在 24 小时内点击链接，并在页面中确认订阅：\n${confirmUrl}\n\n如果不是你申请的，可以忽略本邮件，或点击下面的链接取消申请／退订：\n${unsubscribeUrl}\n未确认前不会收到每周分享。`,
            html: `<div style="max-width:560px;margin:auto;padding:32px;font:16px/1.8 sans-serif;color:#263630"><h1 style="font-size:24px">把每周的启发，带进收件箱</h1><p>感谢你订阅启发星球。每周邮件包含本期会议精华、真实金句和已发布的小宇宙播客链接。</p><p>请在 24 小时内打开链接，并在页面中确认订阅。</p><p><a href="${confirmUrl}">确认订阅每周分享 →</a></p><p style="font-size:13px;color:#666">如果不是你申请的，可以忽略本邮件，或<a href="${unsubscribeUrl}">取消申请／退订</a>。未确认前不会收到每周分享。</p></div>`,
          },
          { idempotencyKey: `newsletter-confirm-${digest(confirmation)}` }
        );
        if (sendError || !sent?.id) {
          // Invalidate only this attempt, never a newer token or an active subscription.
          await supabase
            .from('newsletter_subscribers')
            .update({
              confirmation_token_hash: null,
              confirmation_expires_at: null,
              requested_at: null,
            })
            .eq('email', email)
            .eq('confirmation_token_hash', digest(confirmation));
          return reply(502, undefined, '确认邮件未发送成功，请稍后重新申请');
        }
      }
      return reply(200, { message: SUBSCRIPTION_MESSAGE });
    }
    if (action === 'confirm' || action === 'unsubscribe') {
      if (!isSubscriptionToken(body.token))
        return reply(400, undefined, '链接无效，请重新申请订阅');
      const { data, error } = await supabase.rpc(
        action === 'confirm'
          ? 'newsletter_confirm_subscription'
          : 'newsletter_unsubscribe',
        { p_token_hash: digest(body.token) }
      );
      if (error) throw new Error('SubscriptionTokenFailed');
      if (action === 'confirm' && !data)
        return reply(
          400,
          undefined,
          '确认链接已过期或已使用。若尚未确认成功，请重新申请订阅。'
        );
      // Unsubscribe is idempotent and never discloses the associated email.
      return reply(200, {
        message:
          action === 'confirm'
            ? '订阅成功！之后的每周分享会发送到你的邮箱。'
            : '已退订／取消申请，不会再收到每周分享。',
      });
    }
    return reply(400, undefined, '无效的操作');
  } catch {
    // Never log request bodies, mailbox addresses, tokens or provider payloads.
    console.error('[newsletterSubscriptions] Operation failed');
    return reply(500, undefined, '暂时无法处理，请稍后重试');
  }
}
