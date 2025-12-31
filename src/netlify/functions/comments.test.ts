
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './comments';
import jwt from 'jsonwebtoken';

// Hoist mocks
const { 
  mockFrom, 
  mockSelect, 
  mockEq, 
  mockOrder,
  mockInsert,
  mockSingle,
  mockLimit,
  mockOr
} = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockOrder: vi.fn(),
    mockInsert: vi.fn(),
    mockSingle: vi.fn(),
    mockLimit: vi.fn(),
    mockOr: vi.fn(),
  };
});

// Mock module
vi.mock('../../database/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}));

// Setup chaining
mockSelect.mockReturnValue({
  eq: mockEq,
  order: mockOrder,
  insert: mockInsert,
  or: mockOr,
  single: mockSingle,
  limit: mockLimit,
});

mockEq.mockReturnValue({
  order: mockOrder,
  single: mockSingle,
  limit: mockLimit,
  select: mockSelect // Added select for chained queries
});

mockInsert.mockReturnValue({
  select: mockSelect,
});

mockOr.mockReturnValue({
    limit: mockLimit
});

mockLimit.mockReturnValue({
    single: mockSingle
});

describe('comments function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    
    // Default chain
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle, or: mockOr, limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, limit: mockLimit, select: mockSelect });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockInsert.mockReturnValue({ select: mockSelect });
  });

  it('GET: should map snake_case DB columns to camelCase API response', async () => {
    // Mock DB data
    const mockDbData = [
      {
        id: 1,
        card_id: 'card1',
        name: 'User 1',
        comment: 'Test comment',
        created: '2023-01-01',
        user_id: 'user1'
      }
    ];

    // GET request triggers select -> eq -> order
    mockOrder.mockResolvedValue({ data: mockDbData, error: null });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { cardId: 'card1' }
    } as any;

    const response = await handler(event, {} as any);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const comment = body.comments[0];

    expect(comment.name).toBe('User 1');
    expect(comment.comment).toBe('Test comment');
    expect(comment.created).toBe('2023-01-01');
    
    // Verify query used snake_case
    expect(mockEq).toHaveBeenCalledWith('card_id', 'card1');
  });

  it('POST: should map camelCase API input to snake_case DB insert', async () => {
      // Mock JWT verify
      (jwt.verify as any).mockReturnValue({ userId: 'user123' });

      // Mock user lookup
      mockSingle.mockResolvedValue({ data: { name: 'Test User' }, error: null });

      // Mock insert return
      mockSelect.mockResolvedValue({ data: [{ id: 100 }], error: null }); // insert().select() returns promise

      const inputData = {
        cardId: 'card1',
        comment: 'New Comment'
      };

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify(inputData),
        headers: { authorization: 'Bearer test-token' }
      } as any;

      const response = await handler(event, {} as any);

      expect(response.statusCode).toBe(200);
      
      // Verify insert used snake_case keys
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
            card_id: 'card1',
            comment: 'New Comment',
            user_id: 'user123'
        })
      ]);
  });
});
