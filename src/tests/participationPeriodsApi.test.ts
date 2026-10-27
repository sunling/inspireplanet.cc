import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  existing: [] as { id: number }[],
}));
vi.mock('../netlify/utils/server', () => ({
  getAuthenticatedUser: mocks.auth,
  getFunctionNameFromEvent: (event: any) => JSON.parse(event.body).functionName,
  getDataFromEvent: (event: any) => JSON.parse(event.body),
  createSuccessResponse: (data: any) => ({
    statusCode: 200,
    body: JSON.stringify(data),
  }),
  createErrorResponse: (error: string, statusCode = 400) => ({
    statusCode,
    body: error,
  }),
  handleOptionsRequest: vi.fn(),
}));
vi.mock('../database/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('../netlify/utils/email', () => ({
  sendCompletionCertificateEmail: vi.fn(),
  sendRSVPConfirmEmail: vi.fn(),
  sendRSVPRejectEmail: vi.fn(),
}));
import { handler } from '../netlify/functions/participants';
const periods = [{ start_date: '2026-01-01', end_date: '2026-02-01' }];
const request = (extra = {}) =>
  handler(
    {
      httpMethod: 'POST',
      body: JSON.stringify({
        functionName: 'batchUpdateParticipationPeriods',
        meetup_id: 58,
        rsvp_ids: [1, 2],
        participation_periods: periods,
        ...extra,
      }),
    } as any,
    {}
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: '1', role: 'organizer' });
  mocks.existing = [{ id: 1 }, { id: 2 }];
  mocks.from.mockImplementation(() => {
    let writing = false;
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      update: (value: any) => {
        writing = true;
        mocks.update(value);
        return query;
      },
      then: (resolve: any) =>
        resolve({
          data: writing
            ? mocks.existing.map((row) => ({
                ...row,
                participation_periods: periods,
              }))
            : mocks.existing,
          error: null,
        }),
    };
    return query;
  });
});
describe('batch participation periods API', () => {
  it('updates all selected participants with one database update', async () => {
    const result = await request();
    expect(result.statusCode).toBe(200);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      participation_periods: periods,
    });
    expect(JSON.parse(result.body).participants).toHaveLength(2);
  });
  it('rejects unauthorized users before accessing participants', async () => {
    mocks.auth.mockResolvedValue({ role: 'user' });
    expect((await request()).statusCode).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('does not update any rows if a selected participant is outside the activity', async () => {
    mocks.existing = [{ id: 1 }];
    expect((await request()).statusCode).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rejects invalid dates and empty selections', async () => {
    expect(
      (
        await request({
          participation_periods: [
            { start_date: '2026-02-31', end_date: '2026-03-01' },
          ],
        })
      ).statusCode
    ).toBe(400);
    expect((await request({ rsvp_ids: [] })).statusCode).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
