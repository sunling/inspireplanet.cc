
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './cards';

// Hoist mocks so they are available in vi.mock
const { 
  mockFrom, 
  mockSelect, 
  mockInsert, 
  mockUpdate, 
  mockEq, 
  mockIn, 
  mockOrder, 
  mockLimit, 
  mockSingle 
} = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockEq: vi.fn(),
    mockIn: vi.fn(),
    mockOrder: vi.fn(),
    mockLimit: vi.fn(),
    mockSingle: vi.fn(),
  };
});

// Mock the module
vi.mock('../../database/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Chaining setup - needs to be done after hoisting, usually in beforeEach or top level
mockSelect.mockReturnValue({
  eq: mockEq,
  in: mockIn,
  order: mockOrder,
});

mockEq.mockReturnValue({
  single: mockSingle,
  select: mockSelect,
});

mockIn.mockReturnValue({
  order: mockOrder,
});

mockOrder.mockReturnValue({
  limit: mockLimit,
});

mockFrom.mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
});

describe('cards function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset default implementations
    mockFrom.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
    });
    
    mockSelect.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder });
    mockEq.mockReturnValue({ single: mockSingle, select: mockSelect });
    mockIn.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
  });

  it('fetch: should map snake_case DB columns to camelCase API response', async () => {
    // 模拟数据库返回 snake_case 数据
    const mockDbData = [
      {
        id: '123',
        title: 'Test Card',
        quote: 'Test Quote',
        detail: 'Test Detail',
        font: 'Test Font',
        image_path: 'test/path.png', // snake_case
        upload: 'true',
        creator: 'User1',
        created: '2023-01-01',
        gradient_class: 'gradient-1', // snake_case
        username: 'user1',
        likes_count: 5 // snake_case
      }
    ];

    mockLimit.mockResolvedValue({ data: mockDbData, error: null });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: {}
    } as any;

    const response = await handler(event, {} as any);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const card = body.records[0];

    // 验证 API 返回 camelCase
    expect(card.title).toBe('Test Card');
    expect(card.imagePath).toBe('test/path.png'); // 这将失败，如果代码还在用 ImagePath
    expect(card.gradientClass).toBe('gradient-1');
    expect(card.likesCount).toBe(5);
  });

  it('save: should map camelCase API input to snake_case DB insert', async () => {
    const inputData = {
      title: 'New Card',
      quote: 'New Quote',
      detail: 'New Detail',
      imagePath: 'new/path.png', // camelCase
      gradientClass: 'gradient-2'
    };

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify(inputData)
    } as any;

    // Mock insert return
    mockInsert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'new-id' }], error: null })
    });

    const response = await handler(event, {} as any);

    expect(response.statusCode).toBe(200);
    
    // 验证 insert 被调用时使用了 snake_case
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'New Card',
        image_path: 'new/path.png', // snake_case
        gradient_class: 'gradient-2'
      })
    ]);
  });
});
