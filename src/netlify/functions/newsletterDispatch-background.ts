import deployment from '../generated/newsletterDeployment.json';
import { createHash, timingSafeEqual } from 'crypto';
import type { NetlifyEvent, NetlifyResponse } from '../types/http';
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const base = 'https://inspireplanet.cc/.netlify/functions/';
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const secret = process.env.NEWSLETTER_AUTOMATION_SECRET;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (event.httpMethod !== 'POST' || !deployment.production ||
      process.env.NEWSLETTER_AUTOMATION_ENABLED !== 'true' || !secret || secret.length < 32 ||
      !timingSafeEqual(Buffer.from(sha(auth)), Buffer.from(sha('Bearer ' + secret))))
    return { statusCode: 403, body: '' };
  try {
    const { year, episode } = JSON.parse(event.body || '{}');
    if (!Number.isInteger(year) || year < 2000 || year > 9999 ||
        !Number.isInteger(episode) || episode < 1 || episode > 9999)
      return { statusCode: 400, body: '' };
    const deadline = Date.now() + 12 * 60000;
    for (let i = 0; i < 300 && Date.now() < deadline; i++) {
      const response = await fetch(base + 'newsletterCampaign', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
        headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'process', year, episode, retry: i === 0 }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw Error('BatchFailed');
      if (!result.data.counts.pending) {
        // Completion notification is handled by the next scheduled run.
        return { statusCode: 200, body: '' };
      }
    }
    return { statusCode: 200, body: '' };
  } catch {
    console.error('[newsletterDispatch] Batch interrupted; scheduled task can resume');
    return { statusCode: 500, body: '' };
  }
}
