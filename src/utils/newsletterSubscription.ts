export type SubscriptionStatus = 'pending' | 'subscribed' | 'unsubscribed';
export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: SubscriptionStatus;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}
export interface SubscriberList {
  subscribers: NewsletterSubscriber[];
  total: number;
  counts: Record<SubscriptionStatus, number>;
}
export const SUBSCRIPTION_MESSAGE =
  '如果这个邮箱需要确认，我们已发送确认邮件。请检查收件箱及垃圾邮件，点击确认后订阅才会生效。重复申请请间隔 10 分钟。';
export const SUBSCRIPTION_CONSENT = 'weekly-recap-v1';
export function normalizeSubscriptionEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email
    ) &&
    email.split('@')[0].length <= 64
    ? email
    : null;
}
export function isSubscriptionToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
