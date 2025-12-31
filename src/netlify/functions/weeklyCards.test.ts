
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './weeklyCards';

// Hoist mocks
const { 
  mockFrom, 
  mockSelect, 
  mockIlike, 
  mockOrder, 
  mockLimit 
} = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockIlike: vi.fn(),
    mockOrder: vi.fn(),
    mockLimit: vi.fn(),
  };
});

// Mock module
vi.mock('../../database/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Setup chaining
mockSelect.mockReturnValue({
  ilike: mockIlike,
  order: mockOrder,
});

mockIlike.mockReturnValue({
  order: mockOrder,
});

mockOrder.mockReturnValue({
  limit: mockLimit,
});

mockFrom.mockReturnValue({
  select: mockSelect,
});

describe('weeklyCards function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ ilike: mockIlike, order: mockOrder });
    mockIlike.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
  });

  it('fetch: should map snake_case DB columns to camelCase API response', async () => {
    // Mock DB data with snake_case columns
    const mockDbData = [
      {
        id: '123',
        episode: 'EP01',
        title: 'Weekly Title',
        name: 'Weekly Name',
        quote: 'Weekly Quote',
        detail: 'Weekly Detail',
        created: '2023-01-01',
        image_path: 'weekly/path.png' // snake_case
      }
    ];

    // Mock limit (end of chain)
    mockLimit.mockResolvedValue({ data: mockDbData, error: null });
    // Also mock order in case limit is not called (though code calls limit if limitParam is present)
    // Wait, the code calls limit if limitParam is present. If not, await query is called on result of order.
    // So order should also return a promise-like object if awaited directly? 
    // Or we just test the case where it returns data.
    // In the code: `const { data, error } = await query;`
    // If limit is not called, query is the result of order().
    mockOrder.mockResolvedValue({ data: mockDbData, error: null });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: {}
    } as any;

    const response = await handler(event, {} as any);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const card = body.records[0];

    // Verify mapping
    expect(card.title).toBe('Weekly Title');
    expect(card.imagePath).toBe('weekly/path.png');
    expect(card.episode).toBe('EP01');
    expect(card.created).toBe('2023-01-01');
  });

  it('should filter by episode using snake_case column', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { episode: 'EP01' }
    } as any;

    await handler(event, {} as any);

    expect(mockIlike).toHaveBeenCalledWith('episode', '%01%');
  });
});
