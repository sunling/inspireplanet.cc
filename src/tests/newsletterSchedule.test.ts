import { describe, expect, it, vi } from 'vitest';
vi.mock('../database/supabase', () => ({ supabase: {} }));
vi.mock('../netlify/generated/newsletterDeployment.json', () => ({ default: { production: true } }));
import { nextSendSlot, handler } from '../netlify/functions/newsletterSchedule';
describe('newsletter schedule', () => {
  it('allows Monday morning after a Sunday reminder', () => {
    expect(nextSendSlot(new Date('2026-11-29T00:03:00Z')).toISOString()).toBe('2026-11-30T00:03:00.000Z');
  });
  it('defers Sunday evening notices to Tuesday', () => {
    expect(nextSendSlot(new Date('2026-11-29T12:00:00Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
  it('preserves the full 24 hours and skips weekend send slots', () => {
    expect(nextSendSlot(new Date('2026-12-04T00:00:00Z')).toISOString()).toBe('2026-12-07T00:00:00.000Z');
  });
  it('rejects unauthenticated automation', async () => {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    expect(r.statusCode).toBe(403);
  });
});
