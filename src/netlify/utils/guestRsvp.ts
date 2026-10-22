import { createHmac, timingSafeEqual } from 'node:crypto';

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Guest RSVP signing is not configured');
  return createHmac('sha256', secret)
    .update('inspireplanet:guest-rsvp-cancel:v1')
    .digest();
}
export function assertGuestRsvpConfigured() {
  key();
}

// Separate from login JWTs: this two-part capability only cancels one guest RSVP.
export function guestCancellationToken(id: string, meetupId: number) {
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      purpose: 'cancel-guest-rsvp',
      id,
      meetupId,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
  ).toString('base64url');
  return `${payload}.${createHmac('sha256', key()).update(payload).digest('base64url')}`;
}
export function verifyGuestCancellationToken(
  token: unknown
): { id: string; meetupId: number } | null {
  if (typeof token !== 'string' || token.length > 2000) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const signature = Buffer.from(parts[1], 'base64url');
    const expected = createHmac('sha256', key()).update(parts[0]).digest();
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return null;
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (
      data.v !== 1 ||
      data.purpose !== 'cancel-guest-rsvp' ||
      typeof data.id !== 'string' ||
      !data.id ||
      !Number.isSafeInteger(data.meetupId) ||
      data.meetupId <= 0 ||
      !Number.isSafeInteger(data.exp) ||
      data.exp <= Date.now() / 1000 ||
      data.exp > Date.now() / 1000 + 7 * 24 * 60 * 60 + 60
    )
      return null;
    return { id: data.id, meetupId: data.meetupId };
  } catch {
    return null;
  }
}
