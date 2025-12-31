
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler, createNotification } from './notifications';
import jwt from 'jsonwebtoken';

// Hoist mocks
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockInsertSelect, // Special mock for insert().select()
  mockUpdate,
  mockEq, // Shared eq for select/update? Better separate if possible, but let's try Thenable approach
  mockOrder,
  mockRange,
  mockSingle,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockInsertSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockRange: vi.fn(),
  mockSingle: vi.fn(),
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

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a Thenable mock (acts as function returning object, but also awaitable)
// Actually, we just need the object returned by the function to have .then
const createThenable = (resolvedValue: any, chainMethods: any = {}) => {
  return {
    ...chainMethods,
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
};

describe('notifications function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };

    // -- Chain Setup --
    
    // from()
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    });

    // insert() -> select() -> Result
    mockInsert.mockReturnValue({
      select: mockInsertSelect,
    });
    // Default insert result
    mockInsertSelect.mockResolvedValue({ data: [], error: null });

    // update() -> eq() -> eq() -> Result
    // To support chaining and awaiting, eq should return itself AND be awaitable?
    // Or we mock the specific sequence.
    // For update: .update({...}).eq(...).eq(...)
    // The last eq must return the result. The middle eq must return an object with eq.
    // Since we don't know how many eqs, let's make mockEq return { eq: mockEq, ...chain } AND be a promise?
    // No, standard mocks return undefined by default.
    
    // Let's use a "Chainable Mock" strategy.
    // We will make mockEq return ITSELF (or a proxy) which also has .then?
    // This is hard with just vi.fn().
    
    // Simpler: mockUpdate returns an object with `eq`.
    // That `eq` returns an object with `eq`.
    // The final object has `then`.
    // Since we use the same `mockEq` for all, we can make `mockEq` return `mockEqResult` which has `eq` pointing to `mockEq`?
    
    // Let's try this:
    // mockUpdate returns { eq: mockEq }
    // mockEq returns { eq: mockEq, ...others } AND we can spy on it.
    // To make `await mockEq()` work, mockEq MUST return a Thenable.
    // But if it returns a Thenable, `mockEq().eq` might be undefined if the Thenable is a native Promise.
    // Custom Thenable object:
    
    const thenableEq = {
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
      range: mockRange,
      then: (resolve: any) => resolve({ error: null }), // Default success
    };
    
    mockUpdate.mockReturnValue(thenableEq);
    mockSelect.mockReturnValue(thenableEq);
    mockEq.mockReturnValue(thenableEq);
    mockOrder.mockReturnValue(thenableEq);
    
    // Specific terminators
    mockRange.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });
    
    // Override specific behaviors in tests
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('handler (HTTP)', () => {
    it('OPTIONS: should return 200', async () => {
      const response = await handler({ httpMethod: 'OPTIONS' });
      expect(response.statusCode).toBe(200);
    });

    it('GET: should return 401 if no auth', async () => {
      const response = await handler({ httpMethod: 'GET', headers: {} });
      expect(response.statusCode).toBe(401);
    });

    it('GET: should return 200 with list', async () => {
      (jwt.verify as any).mockReturnValue({ userId: 123 });
      
      const mockData = [{ id: 1 }];
      mockRange.mockResolvedValue({ data: mockData, error: null });

      const event = {
        httpMethod: 'GET',
        headers: { authorization: 'Bearer valid' },
        queryStringParameters: { limit: '10', offset: '0' }
      };

      const response = await handler(event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).notifications).toEqual(mockData);
      
      // Verify chain
      // select -> eq -> order -> range
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', 123);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });

    it('PUT: should mark single as read', async () => {
      (jwt.verify as any).mockReturnValue({ userId: 123 });
      
      // The chain ends with .eq().eq() which returns 'thenableEq'.
      // thenableEq resolves to { error: null } by default.
      
      const event = {
        httpMethod: 'PUT',
        headers: { authorization: 'Bearer valid' },
        queryStringParameters: { id: '1' }
      };

      const response = await handler(event);
      expect(response.statusCode).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'read' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('PUT: should handle error', async () => {
        (jwt.verify as any).mockReturnValue({ userId: 123 });
        
        // Make the chain fail
        // We need mockEq to return a thenable that resolves to error.
        // But mockEq is reused.
        // We can use mockImplementationOnce on mockEq?
        // But mockEq is called multiple times in chain.
        // The LAST call is what matters for await.
        
        // If we change the "then" of the object returned by mockEq?
        // We defined `thenableEq` in beforeEach.
        // We can override the `then` method of the return value.
        
        mockEq.mockReturnValue({
            ...mockEq(), // properties
            then: (resolve: any) => resolve({ error: { message: 'Update failed' } })
        } as any);

        const event = {
          httpMethod: 'PUT',
          headers: { authorization: 'Bearer valid' },
          queryStringParameters: { id: '1' }
        };
  
        const response = await handler(event);
        expect(response.statusCode).toBe(500);
    });
  });

  describe('createNotification', () => {
    it('should insert and send email', async () => {
      process.env.RESEND_API_KEY = 'key';
      
      // insert().select()
      mockInsertSelect.mockResolvedValue({ error: null });
      
      // user fetch: select().eq().single()
      mockSingle.mockResolvedValue({ 
        data: { email: 'test@test.com', name: 'Test' }, 
        error: null 
      });
      
      mockFetch.mockResolvedValue({ ok: true });

      await createNotification(123, 'Title', 'Content');
      
      expect(mockInsert).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle insert error', async () => {
       mockInsertSelect.mockResolvedValue({ error: { message: 'Fail' } });
       const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
       
       await createNotification(123, 'T', 'C');
       
       expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('insert failed'), 'Fail');
       expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
