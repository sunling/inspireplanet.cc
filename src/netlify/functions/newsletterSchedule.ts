import deployment from '../generated/newsletterDeployment.json';
import { createHash, timingSafeEqual, randomUUID } from 'crypto';
import { supabase } from '../../database/supabase';
import { createDefaultNewsletterDocument, renderNewsletterDocument, validateNewsletterSubject } from '../../utils/newsletterDocument';
import { buildEpisodeNewsletterPreview } from '../../utils/episodeNewsletter';
import { getGitHubEpisodeEntries, fetchEpisodeCardsFromGitHub, getEpisodePublication } from '../utils/githubWeeklyCards';
import { newsletterTokenSecret, renderDeliveryEmail } from '../utils/newsletterBroadcast';
import type { EpisodeSummary } from '../services/weeklyCards';
import type { NetlifyEvent, NetlifyResponse } from '../types/http';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const reply = (statusCode: number, data: unknown): NetlifyResponse => ({
  statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data),
});
const site = 'https://inspireplanet.cc';
const recipients = ['sunling621@gmail.com', process.env.NEWSLETTER_SECOND_ORGANIZER_EMAIL || ''];
const day = 86400000;

// The next allowed weekday 08:00 Beijing slot, at least 24h after notice.
export function nextSendSlot(notice: Date): Date {
  const earliest = notice.getTime() + day;
  const first = new Date(earliest);
  first.setUTCHours(0, 0, 0, 0);
  if (earliest - first.getTime() > 10 * 60000) first.setUTCDate(first.getUTCDate() + 1);
  while (first.getUTCDay() === 0 || first.getUTCDay() === 6)
    first.setUTCDate(first.getUTCDate() + 1);
  return new Date(Math.max(first.getTime(), earliest));
}
async function sendNotice(subject: string, text: string, html: string | undefined, id: string, targets: string[] = recipients, from = `启发星球 <${process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc'}>`) {
  const ids: string[] = [];
  if (targets === recipients) {
    if (targets.some(to => !to) || new Set(targets).size !== 2) throw Error('OrganizerRecipientsNotConfigured');
    const verified = await supabase.from('users').select('email').eq('role', 'organizer').in('email', targets);
    if (verified.error || verified.data?.length !== 2) throw Error('OrganizerRecipientsNotVerified');
  }
  // Separate messages so recipients don't see a shared To list.
  for (const [index, to] of targets.entries()) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json', 'Idempotency-Key': `${id}-${index}` },
      body: JSON.stringify({ from, to, subject, text, ...(html ? { html } : {}) }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw Error('NoticeProviderRejected');
    ids.push(data.id);
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return ids;
}
function reminderContent(c: { year: number; episode: number; body_html: string; body_text: string }, attempt: string, test = false) {
  const url = `${site}/episodes/${c.year}/${c.episode}`;
  const expected = nextSendSlot(new Date(Date.parse(attempt) + 60000)).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const intro = (test ? '【测试】以下为模拟发送预告，不会安排实际群发。' : '') + `本期订阅邮件已准备好，预计北京时间 ${expected} 自动发送（以两封提醒均成功后至少 24 小时为准，网站显示实际计划时间）。无需确认；如需修改或暂停，请登录网站打开本期邮件编辑器：${url}`;
  const banner = `<p style="padding:18px;background:#fff5ec">${intro} <a href="${url}">查看及编辑本期邮件 →</a></p>`;
  return { text: intro + '\n\n' + c.body_text, html: c.body_html.replace(/<body[^>]*>/i, (tag: string) => tag + banner) };
}
async function discover(dryRun = false) {
  const now = Date.now();
  const entries = await getGitHubEpisodeEntries();
  const entry = entries.find(e => {
    const time = Date.parse(e.dateFormatted + 'T00:00:00+08:00');
    return time <= now && now - time < 7 * day;
  });
  if (!entry) return { ready: false, reason: 'No recent episode' };
  const episode = { year: entry.year, episode: entry.episodeNum, date: entry.dateFormatted };
  if (!entry.summaryPath || !entry.path) return { ...episode, ready: false, reason: 'Missing summary or quote cards' };
  const existing = await supabase.from('newsletter_campaigns').select('id,status,revision,auto_managed')
    .eq('year', entry.year).eq('episode', entry.episodeNum).maybeSingle();
  if (existing.error) throw Error('CampaignReadFailed');
  if (existing.data && !dryRun && (existing.data.status !== 'draft' || existing.data.auto_managed))
    return { ...episode, ready: false, reason: 'Campaign already exists', status: existing.data.status };
  // Require the actual structured summary, never historical fallback text.
  const raw = await fetch(`https://raw.githubusercontent.com/sunling/inspire-planet/main/${entry.summaryPath}`, { signal: AbortSignal.timeout(8000) });
  if (!raw.ok) throw Error('SummaryFetchFailed');
  const summary = await raw.json() as EpisodeSummary;
  if (!summary || typeof summary.title !== 'string' || typeof summary.overview !== 'string' ||
      !summary.title.trim() || !summary.overview.trim() || !Array.isArray(summary.topics) || !summary.topics.length) return { ...episode, ready: false, reason: 'Incomplete summary' };
  const [cards, publication] = await Promise.all([
    fetchEpisodeCardsFromGitHub(entry), getEpisodePublication(String(entry.episodeNum), entry.year),
  ]);
  const preview = buildEpisodeNewsletterPreview({ year: entry.year, episode: entry.episodeNum, summary, cards, publication });
  if (preview.missing.some(m => !m.includes('小宇宙'))) return { ...episode, ready: false, reason: 'Incomplete newsletter content' };
  const draft = createDefaultNewsletterDocument(entry.year, entry.episodeNum, summary, cards, publication);
  if (!validateNewsletterSubject(draft.subject)) return { ...episode, ready: false, reason: 'Invalid subject' };
  const rendered = renderNewsletterDocument(draft.document);
  const from = `启发星球 <${process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc'}>`;
  const report = { ...episode, ready: true, campaignExists: Boolean(existing.data),
    podcastIncluded: Boolean(publication?.podcast), quoteCount: cards.length,
    rendered: true, htmlBytes: Buffer.byteLength(rendered.html), textBytes: Buffer.byteLength(rendered.text),
    estimatedSendAt: nextSendSlot(new Date()).toISOString() };
  if (dryRun) return report;
  if (existing.data) {
    if (existing.data.status === 'draft' && !existing.data.auto_managed) {
      // Preserve the organizer's draft; claim only this exact unsent revision.
      const adopted = await supabase.from('newsletter_campaigns')
        .update({ auto_managed: true, auto_edited: true, revision: randomUUID() })
        .eq('id', existing.data.id).eq('revision', existing.data.revision)
        .eq('status', 'draft').eq('auto_managed', false).select('id').maybeSingle();
      if (adopted.error) throw Error('DraftAdoptionFailed');
      return { ...episode, ready: Boolean(adopted.data), reason: adopted.data ? 'Existing draft adopted' : 'Draft changed' };
    }
    return { ...episode, ready: false, reason: 'Campaign changed' };
  }
  const result = await supabase.rpc('newsletter_auto_create', {
    p_year: entry.year, p_episode: entry.episodeNum, p_subject: draft.subject,
    p_document: draft.document, p_html: rendered.html, p_text: rendered.text,
    p_hash: sha(JSON.stringify([draft.subject, rendered.html, rendered.text, from])), p_from: from,
  });
  if (result.error) throw Error('AutoCreateFailed');
  return report;
}
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const secret = process.env.NEWSLETTER_AUTOMATION_SECRET;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (event.httpMethod !== 'POST' || !secret || secret.length < 32 ||
      !timingSafeEqual(Buffer.from(sha(auth)), Buffer.from(sha('Bearer ' + secret))))
    return reply(403, { success: false });
  if (!deployment.production)
    return reply(503, { success: false, error: 'Production deployment required' });
  try {
    const request = JSON.parse(event.body || '{}');
    if (request.action === 'testReminder' || request.action === 'testNewsletter') {
      // Deliberately fixed test audience and episode. Never accept recipient overrides.
      if (process.env.NEWSLETTER_AUTOMATION_ENABLED !== 'false' ||
          !process.env.RESEND_API_KEY || !newsletterTokenSecret())
        return reply(503, { success: false, error: 'Test requires disabled automation and configured mail service' });
      if (typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(request.requestId))
        return reply(400, { success: false, error: 'Invalid test request id' });
      const row = await supabase.from('newsletter_campaigns')
        .select('id,year,episode,subject,body_html,body_text,site_url,from_email')
        .eq('year', 2026).eq('episode', 46).maybeSingle();
      if (row.error) throw Error('TestCampaignReadFailed');
      if (!row.data) return reply(404, { success: false, error: 'EP46 campaign not found' });
      const c = row.data;
      const reminder = request.action === 'testReminder';
      const recipient = reminder ? 'sunling621@gmail.com' : 'lingsun.us@gmail.com';
      let content;
      if (reminder) {
        // A fixed timestamp supplied by the runner preserves identical payload on retries.
        if (typeof request.testAt !== 'string' || !Number.isFinite(Date.parse(request.testAt)))
          return reply(400, { success: false, error: 'Invalid test timestamp' });
        content = reminderContent(c, request.testAt, true);
      } else {
        const subscriber = await supabase.from('newsletter_subscribers').select('id')
          .eq('email', recipient).eq('status', 'subscribed').not('confirmed_at', 'is', null).maybeSingle();
        if (subscriber.error) throw Error('TestSubscriberReadFailed');
        if (!subscriber.data) return reply(409, { success: false, error: 'Test recipient not confirmed' });
        // Synthetic token renders the real footer but cannot unsubscribe a real subscriber.
        const token = sha('newsletter-test-only:' + request.requestId + ':' + c.id);
        content = renderDeliveryEmail(c, token);
        const note = '【测试】这是正式邮件模板测试；退订链接仅供预览，不会取消订阅。';
        content = { html: content.html.replace(/<body[^>]*>/i, tag => tag + '<p>' + note + '</p>'),
          text: note + '\n\n' + content.text };
      }
      const ids = await sendNotice((reminder ? '【测试·发送预告】' : '【测试·正式邮件】') + c.subject,
        content.text, content.html, 'newsletter-test-' + request.action + '-' + request.requestId,
        [recipient], reminder ? undefined : c.from_email);
      return reply(200, { success: true, testMode: request.action, year: 2026, episode: 46,
        recipient, providerAccepted: true, messageId: ids[0], emailsSent: 1, writesPerformed: 0 });
    }
    if (request.action === 'dryRun') {
      // No write RPC, update, delivery processing or Resend request in this branch.
      const [subscribers, queue, discovery] = await Promise.all([
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true })
          .eq('status', 'subscribed').not('confirmed_at', 'is', null),
        supabase.from('newsletter_campaigns').select('auto_managed,auto_paused,auto_edited,auto_notice_at,auto_notice_attempt_at,auto_send_at,auto_result_at,auto_result_attempt_at', { count: 'exact', head: true })
          .eq('auto_managed', true).is('auto_result_at', null),
        discover(true),
      ]);
      if (subscribers.error || queue.error) throw Error('DryRunReadFailed');
      return reply(200, { success: true, dryRun: true, databaseReadable: true,
        automationEnabled: process.env.NEWSLETTER_AUTOMATION_ENABLED === 'true',
        resendConfigured: Boolean(process.env.RESEND_API_KEY), unsubscribeSecretConfigured: Boolean(newsletterTokenSecret()),
        confirmedSubscribers: subscribers.count, queuedCampaigns: queue.count, discovery,
        emailsSent: 0, writesPerformed: 0 });
    }
    if (process.env.NEWSLETTER_AUTOMATION_ENABLED !== 'true' ||
        !process.env.RESEND_API_KEY || !newsletterTokenSecret())
      return reply(503, { success: false, error: 'Automation disabled or not configured' });
    if (request.action === 'discover') {
      const discovery = await discover();
      return reply(200, { success: true, discovery });
    }
    if (request.action === 'queue' || request.action === 'tick') {
      let discovery;
      let discoveryFailed = false;
      if (request.action === 'tick') {
        try { discovery = await discover(); }
        catch { discoveryFailed = true; console.error('[newsletterSchedule] Discovery failed'); }
      }
      const rows = await supabase.from('newsletter_campaigns').select('id,year,episode,status')
        .eq('auto_managed', true).is('auto_result_at', null).order('created_at').limit(100);
      if (rows.error) throw Error('QueueReadFailed');
      return reply(200, { success: true, tasks: rows.data || [], discovery, discoveryFailed });
    }
    if (request.action !== 'advance' || typeof request.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(request.id))
      return reply(400, { success: false });
    const read = await supabase.from('newsletter_campaigns').select('*').eq('id', request.id).eq('auto_managed', true).maybeSingle();
    if (read.error) throw Error('CampaignReadFailed');
    const c = read.data;
    if (!c) return reply(404, { success: false });
    if (c.status === 'draft' && !c.auto_paused && !c.auto_notice_at) {
      // A persisted attempt prevents retrying ambiguous notices beyond provider idempotency.
      const now = new Date();
      if (c.auto_notice_attempt_at && now.getTime() - Date.parse(c.auto_notice_attempt_at) >= 23 * 3600000)
        return reply(409, { success: false, error: 'Reminder requires manual verification' });
      const attempt = c.auto_notice_attempt_at || now.toISOString();
      if (!c.auto_notice_attempt_at) {
        const claim = await supabase.from('newsletter_campaigns').update({ auto_notice_attempt_at: attempt })
          .eq('id', c.id).eq('revision', c.revision).eq('status', 'draft').eq('auto_paused', false)
          .is('auto_notice_attempt_at', null).select('id').maybeSingle();
        if (claim.error) throw Error('NoticeClaimFailed');
        if (!claim.data) return reply(200, { success: true, status: 'draft' });
      }
      const reminder = reminderContent(c, attempt);
      await sendNotice('[发送预告] ' + c.subject, reminder.text, reminder.html, 'newsletter-notice-' + c.id);
      const sentAt = new Date();
      const saved = await supabase.from('newsletter_campaigns').update({
        auto_notice_at: sentAt.toISOString(), auto_send_at: nextSendSlot(sentAt).toISOString(),
      }).eq('id', c.id).eq('status', 'draft').is('auto_notice_at', null);
      if (saved.error) throw Error('NoticeSaveFailed');
      return reply(200, { success: true, status: 'draft' });
    }
    if (c.status === 'draft' && !c.auto_paused && c.auto_notice_at) {
      if (!c.auto_send_at || Date.parse(c.auto_send_at) > Date.now())
        return reply(200, { success: true, status: 'draft', dueAt: c.auto_send_at });
      // A newly published podcast may be appended only to an untouched generated draft.
      if (!c.auto_edited && !c.body_text.includes('xiaoyuzhoufm.com/episode/')) {
        const pub = await getEpisodePublication(String(c.episode), c.year);
        if (pub?.podcast) {
          const doc = { ...c.document, content: [...c.document.content] };
          const index = doc.content.findIndex((node: { type: string }) => node.type === 'horizontalRule');
          doc.content.splice(index < 0 ? doc.content.length : index, 0, {
            type: 'paragraph', content: [{ type: 'text', text: pub.podcast.title + ' · 小宇宙收听 ↗',
              marks: [{ type: 'link', attrs: { href: pub.podcast.url } }] }],
          });
          const rendered = renderNewsletterDocument(doc);
          const updated = await supabase.from('newsletter_campaigns').update({
            document: doc, body_html: rendered.html, body_text: rendered.text,
            content_hash: sha(JSON.stringify([c.subject, rendered.html, rendered.text, c.from_email])),
            revision: randomUUID(),
          }).eq('id', c.id).eq('revision', c.revision).eq('status', 'draft').eq('auto_edited', false)
            .eq('auto_paused', false).select('revision').maybeSingle();
          if (updated.error) throw Error('PodcastUpdateFailed');
          if (!updated.data) return reply(200, { success: true, status: 'draft' });
          c.revision = updated.data.revision;
        }
      }
      const started = await supabase.rpc('newsletter_auto_start', { p_id: c.id, p_revision: c.revision });
      if (started.error) throw Error('AutoStartFailed');
      return reply(200, { success: true, status: started.data ? 'sending' : 'draft', dueAt: c.auto_send_at });
    }
    if (c.status === 'completed' && !c.auto_result_at) {
      const now = new Date();
      if (c.auto_result_attempt_at && now.getTime() - Date.parse(c.auto_result_attempt_at) >= 23 * 3600000)
        return reply(409, { success: false, error: 'Result notification requires manual verification' });
      if (!c.auto_result_attempt_at) {
        const claim = await supabase.from('newsletter_campaigns').update({ auto_result_attempt_at: now.toISOString() })
          .eq('id', c.id).is('auto_result_attempt_at', null).select('id').maybeSingle();
        if (claim.error) throw Error('ResultClaimFailed');
        if (!claim.data) return reply(200, { success: true, status: 'completed' });
      }
      const state = await supabase.rpc('newsletter_campaign_status', { p_year: c.year, p_episode: c.episode });
      if (state.error) throw Error('ResultReadFailed');
      const k = state.data.counts;
      await sendNotice('[发送结果] ' + c.subject,
        `邮件服务已接受 ${k.sent} 封，跳过 ${k.skipped} 封，待核实 ${k.uncertain} 封。接受不代表已送达。\n${site}/episodes/${c.year}/${c.episode}`,
        undefined, 'newsletter-result-' + c.id);
      const saved = await supabase.from('newsletter_campaigns').update({ auto_result_at: new Date().toISOString() }).eq('id', c.id);
      if (saved.error) throw Error('ResultSaveFailed');
    }
    return reply(200, { success: true, status: c.status });
  } catch {
    console.error('[newsletterSchedule] Operation failed');
    return reply(500, { success: false, error: 'Schedule operation failed' });
  }
}
