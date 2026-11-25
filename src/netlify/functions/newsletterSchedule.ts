import deployment from '../generated/newsletterDeployment.json';
import { createHash, timingSafeEqual } from 'crypto';
import { supabase } from '../../database/supabase';
import { createDefaultNewsletterDocument, renderNewsletterDocument, validateNewsletterSubject } from '../../utils/newsletterDocument';
import { buildEpisodeNewsletterPreview } from '../../utils/episodeNewsletter';
import { getGitHubEpisodeEntries, fetchEpisodeCardsFromGitHub, getEpisodePublication } from '../utils/githubWeeklyCards';
import { newsletterTokenSecret } from '../utils/newsletterBroadcast';
import type { EpisodeSummary } from '../services/weeklyCards';
import type { NetlifyEvent, NetlifyResponse } from '../types/http';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const reply = (statusCode: number, data: unknown): NetlifyResponse => ({
  statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data),
});
const site = 'https://inspireplanet.cc';
const recipients = ['sunling621@gmail.com', 'yl4420@columbia.edu'];
const day = 86400000;

// The next allowed weekday 08:00 Beijing slot, at least 24h after notice.
export function nextSendSlot(notice: Date): Date {
  const earliest = notice.getTime() + day;
  const first = new Date(earliest);
  first.setUTCHours(0, 0, 0, 0);
  if (first.getTime() < earliest) first.setUTCDate(first.getUTCDate() + 1);
  while (first.getUTCDay() === 0 || first.getUTCDay() === 6)
    first.setUTCDate(first.getUTCDate() + 1);
  return first;
}
async function sendNotice(subject: string, text: string, html: string | undefined, id: string) {
  // Separate messages so recipients don't see a shared To list.
  for (const [index, to] of recipients.entries()) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json', 'Idempotency-Key': `${id}-${index}` },
      body: JSON.stringify({ from: `启发星球 <${process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc'}>`, to, subject, text, ...(html ? { html } : {}) }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw Error('NoticeProviderRejected');
    await new Promise(resolve => setTimeout(resolve, 600));
  }
}
async function discover() {
  const now = Date.now();
  const entries = await getGitHubEpisodeEntries();
  const entry = entries.find(e => {
    const time = Date.parse(e.dateFormatted + 'T00:00:00+08:00');
    return time <= now && now - time < 7 * day;
  });
  if (!entry || !entry.summaryPath || !entry.path) return;
  const existing = await supabase.from('newsletter_campaigns').select('id')
    .eq('year', entry.year).eq('episode', entry.episodeNum).maybeSingle();
  if (existing.error) throw Error('CampaignReadFailed');
  if (existing.data) return;
  // Require the actual structured summary, never historical fallback text.
  const raw = await fetch(`https://raw.githubusercontent.com/sunling/inspire-planet/main/${entry.summaryPath}`, { signal: AbortSignal.timeout(8000) });
  if (!raw.ok) throw Error('SummaryFetchFailed');
  const summary = await raw.json() as EpisodeSummary;
  if (!summary || typeof summary.title !== 'string' || typeof summary.overview !== 'string' ||
      !summary.title.trim() || !summary.overview.trim() || !Array.isArray(summary.topics) || !summary.topics.length) return;
  const [cards, publication] = await Promise.all([
    fetchEpisodeCardsFromGitHub(entry), getEpisodePublication(String(entry.episodeNum), entry.year),
  ]);
  const preview = buildEpisodeNewsletterPreview({ year: entry.year, episode: entry.episodeNum, summary, cards, publication });
  if (preview.missing.some(m => !m.includes('小宇宙'))) return;
  const draft = createDefaultNewsletterDocument(entry.year, entry.episodeNum, summary, cards, publication);
  if (!validateNewsletterSubject(draft.subject)) return;
  const rendered = renderNewsletterDocument(draft.document);
  const from = `启发星球 <${process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc'}>`;
  const result = await supabase.rpc('newsletter_auto_create', {
    p_year: entry.year, p_episode: entry.episodeNum, p_subject: draft.subject,
    p_document: draft.document, p_html: rendered.html, p_text: rendered.text,
    p_hash: sha(JSON.stringify([draft.subject, rendered.html, rendered.text, from])), p_from: from,
  });
  if (result.error) throw Error('AutoCreateFailed');
}
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const secret = process.env.NEWSLETTER_AUTOMATION_SECRET;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (event.httpMethod !== 'POST' || !secret || secret.length < 32 ||
      !timingSafeEqual(Buffer.from(sha(auth)), Buffer.from(sha('Bearer ' + secret))))
    return reply(403, { success: false });
  if (!deployment.production || process.env.NEWSLETTER_AUTOMATION_ENABLED !== 'true' ||
      !process.env.RESEND_API_KEY || !newsletterTokenSecret())
    return reply(503, { success: false, error: 'Automation disabled or not configured' });
  try {
    const request = JSON.parse(event.body || '{}');
    if (request.action === 'discover') {
      await discover();
      return reply(200, { success: true });
    }
    if (request.action === 'queue') {
      const rows = await supabase.from('newsletter_campaigns').select('id,year,episode,status')
        .eq('auto_managed', true).is('auto_result_at', null).order('created_at').limit(100);
      if (rows.error) throw Error('QueueReadFailed');
      return reply(200, { success: true, tasks: rows.data || [] });
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
      const url = `${site}/episodes/${c.year}/${c.episode}`;
      const intro = `本期订阅邮件已准备好。提醒成功后至少保留 24 小时，随后在下一个工作日上午 8 点（北京时间）定时任务中自动发送。无需确认；如需修改或暂停，请登录网站打开本期邮件编辑器：${url}`;
      const banner = `<p style="padding:18px;background:#fff5ec">${intro} <a href="${url}">查看及编辑本期邮件 →</a></p>`;
      await sendNotice('[发送预告] ' + c.subject, intro + '\n\n' + c.body_text,
        c.body_html.replace(/<body[^>]*>/i, (tag: string) => tag + banner), 'newsletter-notice-' + c.id);
      const sentAt = new Date();
      const saved = await supabase.from('newsletter_campaigns').update({
        auto_notice_at: sentAt.toISOString(), auto_send_at: nextSendSlot(sentAt).toISOString(),
      }).eq('id', c.id).eq('status', 'draft').is('auto_notice_at', null);
      if (saved.error) throw Error('NoticeSaveFailed');
      return reply(200, { success: true, status: 'draft' });
    }
    if (c.status === 'draft' && !c.auto_paused && c.auto_notice_at) {
      const started = await supabase.rpc('newsletter_auto_start', { p_id: c.id, p_revision: c.revision });
      if (started.error) throw Error('AutoStartFailed');
      return reply(200, { success: true, status: started.data ? 'sending' : 'draft' });
    }
    if (c.status === 'completed' && !c.auto_result_at) {
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
