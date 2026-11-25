import deployment from '../generated/newsletterDeployment.json';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { supabase } from '../../database/supabase';
import {
  renderNewsletterDocument,
  validateNewsletterSubject,
} from '../../utils/newsletterDocument';
import {
  deliveryUnsubscribeToken,
  newsletterTokenSecret,
  renderDeliveryEmail,
} from '../utils/newsletterBroadcast';
import type { NetlifyEvent, NetlifyResponse } from '../types/http';

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
  },
  body: JSON.stringify(
    error ? { success: false, error } : { success: true, data }
  ),
});
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
// Netlify CONTEXT is captured by the build, not assumed to exist at runtime.
const production = () => deployment.production === true;
function unavailableReason() {
  if (!production()) return '预览环境不允许正式群发，请在正式站操作';
  if (!process.env.RESEND_API_KEY || !newsletterTokenSecret())
    return '正式邮件服务配置不完整，请联系组织者检查服务器密钥';
  return null;
}
async function status(year: number, episode: number) {
  const { data, error } = await supabase.rpc('newsletter_campaign_status', {
    p_year: year,
    p_episode: episode,
  });
  if (error) throw new Error('CampaignReadFailed');
  const reason = unavailableReason();
  return { ...data, canSend: !reason, sendUnavailableReason: reason };
}
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (!['POST', 'GET'].includes(event.httpMethod))
    return reply(405, undefined, '请求方式不支持');
  try {
    const auth = event.headers.authorization || event.headers.Authorization;
    if (!auth?.startsWith('Bearer ')) return reply(401, undefined, '请先登录');
    const automationSecret = process.env.NEWSLETTER_AUTOMATION_SECRET;
    const supplied = auth.slice(7);
    const automated = Boolean(automationSecret && automationSecret.length >= 32 &&
      timingSafeEqual(Buffer.from(hash(supplied)), Buffer.from(hash(automationSecret))));
    let actor = 'newsletter-automation';
    if (!automated) {
    const verified = await supabase.auth.getUser(supplied);
    const user = verified.data?.user;
    if (verified.error || !user?.email || !user.email_confirmed_at)
      return reply(401, undefined, '请使用已验证邮箱重新登录');
    const role = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();
    if (role.error || role.data?.role !== 'organizer')
      return reply(403, undefined, '只有组织者可以管理正式邮件');
    actor = user.id;
    }
    if ((event.body?.length || 0) > 250000)
      return reply(413, undefined, '邮件内容过长');
    let data: Record<string, any>;
    if (event.httpMethod === 'POST') {
      if (
        !(event.headers['content-type'] || event.headers['Content-Type'] || '')
          .toLowerCase()
          .startsWith('application/json')
      )
        return reply(415, undefined, '请使用 JSON 请求');
      try {
        data = JSON.parse(event.body || '{}');
      } catch {
        return reply(400, undefined, '请求格式不正确');
      }
      if (!data || typeof data !== 'object' || Array.isArray(data))
        return reply(400, undefined, '请求格式不正确');
    } else data = event.queryStringParameters || {};
    const year = Number(data.year),
      episode = Number(data.episode);
    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 9999 ||
      !Number.isInteger(episode) ||
      episode < 1 ||
      episode > 9999
    )
      return reply(400, undefined, '年份或期数不正确');
    const action = data.functionName;
    if (automated && (action !== 'process' || process.env.NEWSLETTER_AUTOMATION_ENABLED !== 'true'))
      return reply(403, undefined, '自动化仅允许处理已开始的发送任务');
    if (action === 'status' && event.httpMethod === 'GET')
      return reply(200, await status(year, episode));
    if (
      !['prepare', 'start', 'process', 'autoEdit', 'autoPause'].includes(action) ||
      event.httpMethod !== 'POST'
    )
      return reply(405, undefined, '请求方式不支持');
    if (!production())
      return reply(403, undefined, '预览环境不允许正式群发，请在正式站操作');
    if (!process.env.RESEND_API_KEY || !newsletterTokenSecret())
      return reply(503, undefined, '正式邮件服务暂未配置完整');
    const origin = event.headers.origin || event.headers.Origin;
    if (
      origin &&
      ![
        'https://inspireplanet.cc',
        'https://www.inspireplanet.cc',
        'https://inspiration-planet.netlify.app',
      ].includes(origin)
    )
      return reply(403, undefined, '请从启发星球正式站操作');
    if (action === 'autoPause' || action === 'autoEdit') {
      const current = (await status(year, episode)).campaign;
      if (!current?.auto_managed || current.status !== 'draft' || current.revision !== data.hash)
        return reply(409, undefined, '草稿已经变化，请刷新并重新载入');
      let result;
      if (action === 'autoPause') {
        if (typeof data.paused !== 'boolean') return reply(400, undefined, '参数无效');
        result = await supabase.rpc('newsletter_auto_pause', {
          p_id: current.id, p_revision: data.hash, p_paused: data.paused,
        });
      } else {
        if (!validateNewsletterSubject(data.subject))
          return reply(400, undefined, '邮件主题无效');
        const rendered = renderNewsletterDocument(data.document);
        const subject = data.subject.trim();
        result = await supabase.rpc('newsletter_auto_edit', {
          p_id: current.id, p_revision: data.hash, p_subject: subject,
          p_document: data.document, p_html: rendered.html, p_text: rendered.text,
          p_hash: hash(JSON.stringify([subject, rendered.html, rendered.text])),
        });
      }
      if (result.error) throw new Error('ScheduledUpdateFailed');
      if (!result.data) return reply(409, undefined, '草稿已经变化，请刷新');
      return reply(200, await status(year, episode));
    }
    if (action === 'prepare') {
      const current = (await status(year, episode)).campaign;
      if (current?.auto_managed)
        return reply(409, undefined, '请使用自动发送草稿的保存功能');
      if (!validateNewsletterSubject(data.subject))
        return reply(400, undefined, '请填写有效的邮件主题');
      let rendered;
      try {
        rendered = renderNewsletterDocument(data.document);
      } catch (err) {
        return reply(
          400,
          undefined,
          err instanceof Error ? err.message : '邮件正文格式不正确'
        );
      }
      const subject = data.subject.trim();
      const from = `启发星球 <${process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc'}>`;
      const contentHash = hash(
        JSON.stringify([subject, rendered.html, rendered.text, from])
      );
      const { error } = await supabase.rpc('newsletter_prepare_campaign', {
        p_year: year,
        p_episode: episode,
        p_subject: subject,
        p_document: data.document,
        p_html: rendered.html,
        p_text: rendered.text,
        p_hash: contentHash,
        p_from: from,
        p_actor: actor,
      });
      if (error) throw new Error('CampaignPrepareFailed');
      return reply(200, await status(year, episode));
    }
    if (action === 'start') {
      if (
        typeof data.hash !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          data.hash
        )
      )
        return reply(400, undefined, '请重新核对邮件后发送');
      const { data: started, error } = await supabase.rpc(
        'newsletter_start_campaign',
        { p_year: year, p_episode: episode, p_revision: data.hash }
      );
      if (error) throw new Error('CampaignStartFailed');
      if (!started)
        return reply(
          409,
          undefined,
          '邮件或收件名单已有变化，请刷新并重新核对'
        );
      // For scheduled drafts explicitly sent early by an organizer, enqueue
      // a server-side worker. The existing browser loop is a safe fallback.
      const current = await status(year, episode);
      if (current.campaign?.auto_managed && automationSecret && automationSecret.length >= 32 &&
          process.env.NEWSLETTER_AUTOMATION_ENABLED === 'true') {
        try {
          await fetch('https://inspireplanet.cc/.netlify/functions/newsletterDispatch-background', {
            method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
            headers: { Authorization: 'Bearer ' + automationSecret, 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, episode }),
          });
        } catch { /* Already started; schedule runner/browser can resume safely. */ }
      }
      return reply(200, current);
    }
    if (automated) {
      const current = (await status(year, episode)).campaign;
      if (!current?.auto_managed || current.status !== 'sending')
        return reply(403, undefined, '仅允许处理已经开始的自动发送任务');
    }
    const lease = randomUUID();
    const { data: claimed, error: claimError } = await supabase.rpc(
      'newsletter_claim_deliveries',
      {
        p_year: year,
        p_episode: episode,
        p_lease: lease,
        p_retry: data.retry === true,
      }
    );
    if (claimError) throw new Error('CampaignClaimFailed');
    for (const delivery of claimed || []) {
      const token = deliveryUnsubscribeToken(delivery.id);
      const rendered = renderDeliveryEmail(delivery, token);
      const tokenHash = hash(token);
      const { data: ready, error: readyError } = await supabase.rpc(
        'newsletter_authorize_delivery',
        { p_id: delivery.id, p_lease: lease, p_token_hash: tokenHash }
      );
      if (readyError) throw new Error('DeliveryAuthorizeFailed');
      if (!ready) continue;
      let messageId: string | null = null;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `episode-newsletter-${delivery.id}`,
          },
          body: JSON.stringify({
            from: delivery.from_email,
            to: delivery.email,
            subject: delivery.subject,
            html: rendered.html,
            text: rendered.text,
          }),
        });
        const result = await response.json();
        if (response.ok && typeof result.id === 'string' && result.id)
          messageId = result.id;
      } catch {
        /* An ambiguous provider result is retried with identical payload/key only within 23h. */
      }
      const { error: finishError } = await supabase.rpc(
        'newsletter_finish_delivery',
        { p_id: delivery.id, p_lease: lease, p_message_id: messageId }
      );
      if (finishError) throw new Error('DeliveryReceiptFailed');
      // Stay below the provider's default 2 requests/second limit.
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return reply(200, await status(year, episode));
  } catch {
    console.error('[newsletterCampaign] Operation failed');
    return reply(
      500,
      undefined,
      '处理未完成，请刷新查看已保存的发送进度后继续'
    );
  }
}
