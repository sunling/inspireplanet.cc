import { createHash } from 'crypto';
import { Resend } from 'resend';
import { supabase } from '../../database/supabase';
import { buildEpisodeNewsletterPreview } from '../../utils/episodeNewsletter';
import {
  renderNewsletterDocument,
  validateNewsletterSubject,
} from '../../utils/newsletterDocument';
import { normalizeNewsletterImageUrl } from '../../utils/newsletterImage';
import { isXiaoyuzhouEpisodeUrl } from '../../utils/episodePublication';
import type { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getEpisodePublication,
  getEpisodeSummary,
  getWeeklyCardsByEpisode,
} from '../utils/githubWeeklyCards';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  handleOptionsRequest,
} from '../utils/server';

/** Only an explicitly requested test to the organizer's own verified mailbox. */
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();
  if (event.httpMethod !== 'POST')
    return createErrorResponse('请求方式不支持', 405);
  try {
    const authorization =
      event.headers.authorization || event.headers.Authorization;
    if (!authorization?.startsWith('Bearer '))
      return createErrorResponse('请先登录', 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(
      authorization.slice(7)
    );
    const authUser = authData?.user;
    if (authError || !authUser?.email || !authUser.email_confirmed_at)
      return createErrorResponse('请使用已验证邮箱的账号重新登录', 401);
    const { data: organizer, error: roleError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', authUser.email)
      .single();
    if (roleError || organizer?.role !== 'organizer')
      return createErrorResponse('只有组织者可以发送测试邮件', 403);

    const data = getDataFromEvent(event);
    // The editable document is a bounded JSON format, never arbitrary client HTML.
    // Keep the previous structured payload compatible while preview deployments update.
    if (data.document !== undefined) {
      if (
        !Number.isInteger(data.year) ||
        data.year < 2000 ||
        data.year > 9999 ||
        !Number.isInteger(data.episode) ||
        data.episode < 1 ||
        data.episode > 9999
      )
        return createErrorResponse('请选择有效的年份和期数');
      if (!validateNewsletterSubject(data.subject))
        return createErrorResponse('请填写不超过 200 字符且不含换行的邮件主题');
      if (
        typeof data.requestId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          data.requestId
        )
      )
        return createErrorResponse('无效的测试请求，请刷新页面重试');
      let rendered;
      try {
        rendered = renderNewsletterDocument(data.document);
      } catch (error) {
        return createErrorResponse(
          error instanceof Error ? error.message : '邮件正文格式不正确'
        );
      }
      return await sendRenderedTest(
        authUser.id,
        authUser.email,
        data.requestId,
        data.subject.trim(),
        rendered
      );
    }

    const {
      year,
      episode,
      intro,
      quotes,
      podcastUrl,
      podcastTitle,
      skipPodcast,
      requestId,
      expectedTitle,
      imageUrl = '',
      imageAlt = '',
    } = data;
    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 9999 ||
      !Number.isInteger(episode) ||
      episode < 1 ||
      episode > 9999
    )
      return createErrorResponse('请选择有效的年份和期数');
    if (typeof intro !== 'string' || !intro.trim() || intro.length > 1000)
      return createErrorResponse('请填写不超过 1000 字符的邮件导语');
    if (
      typeof requestId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestId
      )
    )
      return createErrorResponse('无效的测试请求，请刷新页面重试');
    if (
      !Array.isArray(quotes) ||
      !quotes.length ||
      quotes.length > 3 ||
      quotes.some(
        (quote) => !quote || !Number.isInteger(quote.index) || quote.index < 0
      ) ||
      new Set(quotes.map((quote) => quote.index)).size !== quotes.length
    )
      return createErrorResponse('请选择 1–3 条本期原话');
    if (
      typeof podcastUrl !== 'string' ||
      typeof podcastTitle !== 'string' ||
      podcastUrl.length > 2048 ||
      podcastTitle.length > 200 ||
      (skipPodcast !== undefined && typeof skipPodcast !== 'boolean')
    )
      return createErrorResponse('播客信息格式不正确');
    const omitPodcast = skipPodcast === true || !podcastUrl.trim();
    if (
      !omitPodcast &&
      (!isXiaoyuzhouEpisodeUrl(podcastUrl.trim()) || !podcastTitle.trim())
    )
      return createErrorResponse(
        '请填写真实的小宇宙单集链接和标题，或选择本期不附播客'
      );

    if (
      typeof imageUrl !== 'string' ||
      imageUrl.length > 2048 ||
      typeof imageAlt !== 'string' ||
      imageAlt.length > 200 ||
      (imageUrl.trim() && !normalizeNewsletterImageUrl(imageUrl))
    )
      return createErrorResponse(
        '请使用公开 GitHub 图片链接及不超过 200 字符的说明'
      );

    const [summary, cards, publication] = await Promise.all([
      getEpisodeSummary(String(episode), year),
      getWeeklyCardsByEpisode(String(episode), year),
      getEpisodePublication(String(episode), year),
    ]);
    if (!summary?.title || !summary.overview || !summary.topics?.length)
      return createErrorResponse('本期会议总结尚未准备好');
    if (
      summary.title !== expectedTitle ||
      quotes.some(
        (quote) =>
          cards[quote.index]?.quote !== quote.quote ||
          cards[quote.index]?.name !== quote.name
      )
    )
      return createErrorResponse(
        '本期内容已有变化，请重新打开预览并核对原话',
        409
      );
    const selected = quotes.map((quote) => quote.index);
    if (
      selected.some(
        (index) => !cards[index]?.quote.trim() || !cards[index]?.name.trim()
      ) ||
      new Set(selected.map((index) => cards[index].quote.trim())).size !==
        selected.length
    )
      return createErrorResponse('请选择不重复且有署名的本期原话');
    const draft = {
      ...publication,
      podcast: omitPodcast
        ? undefined
        : { url: podcastUrl.trim(), title: podcastTitle.trim() },
    };
    const preview = buildEpisodeNewsletterPreview({
      year,
      episode,
      summary,
      cards,
      publication: draft,
      intro,
      featuredQuoteIndices: selected,
      image: imageUrl.trim()
        ? { url: normalizeNewsletterImageUrl(imageUrl)!, alt: imageAlt }
        : undefined,
    });
    const missing = preview.missing.filter(
      (message) => !(omitPodcast && message.includes('小宇宙'))
    );
    if (missing.length) return createErrorResponse(missing.join('；'));
    return await sendRenderedTest(
      authUser.id,
      authUser.email,
      requestId,
      preview.subject,
      preview
    );
  } catch (error) {
    console.error(
      '[newsletterPreview] Test email failed',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return createErrorResponse('测试邮件发送失败，请稍后重试', 500);
  }
}

async function sendRenderedTest(
  userId: string,
  recipient: string,
  requestId: string,
  subject: string,
  preview: { html: string; text: string }
): Promise<NetlifyResponse> {
  const key = process.env.RESEND_API_KEY;
  if (!key)
    return createErrorResponse(
      '当前环境尚未配置邮件服务，请配置 RESEND_API_KEY 后重新部署',
      503
    );
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';
  const testFooter = '测试邮件 · 仅发送给当前组织者，不会发送给订阅者。';
  const html = preview.html.replace(
    '邮件预览 · 正式邮件将包含退订入口',
    testFooter
  );
  const text = preview.text.replace(
    '邮件预览 · 正式邮件将包含退订入口',
    testFooter
  );
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([userId, requestId, subject, html]))
    .digest('hex');
  const { data: sent, error } = await new Resend(key).emails.send(
    {
      from: `启发星球 <${from}>`,
      // Recipient always comes from the verified session; HTML is rendered server-side.
      to: recipient,
      subject: `[测试] ${subject}`,
      html,
      text,
    },
    { idempotencyKey: `episode-newsletter-test-${fingerprint}` }
  );
  if (error || !sent?.id)
    return createErrorResponse('邮件服务未接受发送，请稍后重试', 502);
  return createSuccessResponse({
    recipient: recipient,
    messageId: sent.id,
  });
}
