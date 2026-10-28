import { createHmac } from 'crypto';

/** Domain-separated HMAC; fallback reuses an existing server-only secret. */
export function newsletterTokenSecret(): string | null {
  const value =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  return value && value.length >= 32 ? value : null;
}
export function deliveryUnsubscribeToken(deliveryId: string): string {
  const secret = newsletterTokenSecret();
  if (!secret) throw new Error('NewsletterSecretMissing');
  return createHmac('sha256', secret)
    .update(`newsletter-unsubscribe-v1:${deliveryId}`)
    .digest('hex');
}
export function renderDeliveryEmail(
  campaign: { body_html: string; body_text: string; site_url: string },
  token: string
) {
  if (
    !/^[a-f0-9]{64}$/.test(token) ||
    campaign.site_url !== 'https://inspireplanet.cc'
  )
    throw new Error('InvalidDelivery');
  const url = `${campaign.site_url}/newsletter/unsubscribe#${token}`;
  const previewFooter = '邮件预览 · 正式邮件将包含退订入口';
  // Replace the renderer's final system footer only; user text can contain the same phrase.
  const htmlIndex = campaign.body_html.lastIndexOf(previewFooter);
  const textIndex = campaign.body_text.lastIndexOf(previewFooter);
  if (htmlIndex < 0 || textIndex < 0)
    throw new Error('MissingNewsletterFooter');
  return {
    html:
      campaign.body_html.slice(0, htmlIndex) +
      `你收到这封邮件，是因为你确认订阅了启发星球每周分享。<a href="${url}" style="color:#8f492e">退订每周分享</a>` +
      campaign.body_html.slice(htmlIndex + previewFooter.length),
    text:
      campaign.body_text.slice(0, textIndex) +
      `你收到这封邮件，是因为你确认订阅了启发星球每周分享。\n退订每周分享：${url}` +
      campaign.body_text.slice(textIndex + previewFooter.length),
  };
}
