
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../../netlify/functions/rsvp';
import jwt from 'jsonwebtoken';

// Hoist mocks
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('../../database/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe('rsvp function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };

    // Setup basic chain structure
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should reuse cancelled RSVP if userId matches, even if wechatId differs', async () => {
    // Mock user login
    (jwt.verify as any).mockReturnValue({ userId: 123 });

    // Mock Meetup Check (select -> eq -> single)
    const mockMeetupCheck = {
        eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
                data: { id: 1, status: 'active', max_ppl: 100 }, 
                error: null 
            })
        })
    };

    // Mock RSVP Check (select -> eq -> eq -> limit)
    // We need to distinguish between Meetup Check (table='meetups') and RSVP Check (table='meetup_rsvps')
    
    mockFrom.mockImplementation((table) => {
        if (table === 'meetups') {
            return {
                select: () => mockMeetupCheck
            };
        }
        if (table === 'meetup_rsvps') {
            return {
                select: mockSelect,
                update: mockUpdate,
                insert: mockInsert,
            };
        }
        return {};
    });

    // Mock Select Chain for RSVP
    // Call 1: select -> eq(meetup_id) -> eq(user_id) -> limit(1) -> returns RECORD
    // Call 2: select -> eq(meetup_id) -> eq(wechat_id) -> limit(1) -> returns EMPTY (if not found in 1)
    
    // Implementation: Capture calls and return appropriate data
    const mockLimit = vi.fn();
    const mockEq2 = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    mockSelect.mockReturnValue({ eq: mockEq1 });

    mockLimit.mockImplementation(async () => {
        // Inspect the calls to eq1 and eq2 to decide what to return
        // Note: This is tricky because eq1 and eq2 are shared.
        // But since we await each query, we can inspect the last call?
        // Or better, build a dynamic chain.
        return { data: [], error: null };
    });
    
    // Better Dynamic Mock
    mockSelect.mockImplementation(() => {
        let filters: Record<string, any> = {};
        const chain = {
            eq: (field: string, val: any) => {
                filters[field] = val;
                return chain;
            },
            limit: async () => {
                // Logic based on filters
                if (filters.user_id === 123) {
                    return { data: [{ id: 999, status: 'cancelled', user_id: 123, wechat_id: 'old' }], error: null };
                }
                return { data: [], error: null };
            }
        };
        return chain;
    });

    // Mock Update
    const mockUpdateSelect = vi.fn().mockResolvedValue({ data: [{ id: 999, status: 'confirmed' }], error: null });
    const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({
        meetup_id: 1,
        name: 'New Name',
        wechat_id: 'new_wechat', 
      })
    };

    const response = await handler(event, {});
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    
    // Verify Update was called with new wechat_id
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'confirmed',
        wechat_id: 'new_wechat',
        name: 'New Name'
    }));
    
    // Verify Insert was NOT called
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
