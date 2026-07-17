import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlifyEvent } from '../types/http';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../../database/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: { getUser: vi.fn() },
  },
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: vi.fn() } })),
}));

import { handler } from './treehole';

const postEvent = (body: Record<string, unknown>): NetlifyEvent => ({
  httpMethod: 'POST',
  headers: {},
  body: JSON.stringify(body),
});

describe('treehole function', () => {
  beforeEach(() => {
    fromMock.mockReset();
    delete process.env.RESEND_API_KEY;
  });

  it('rejects a question that is too short before touching the database', async () => {
    const result = await handler(
      postEvent({ functionName: 'createQuestion', content: '太短了' })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('10–2000');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('publishes an anonymous question immediately', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 12,
        content: '这是一个足够具体的匿名问题内容。',
        created_at: '2026-07-16T20:00:00.000Z',
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    fromMock.mockReturnValue({ insert });

    const result = await handler(
      postEvent({
        functionName: 'createQuestion',
        content: '这是一个足够具体的匿名问题内容。',
      })
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body).data.question).toMatchObject({
      id: 12,
      responseCount: 0,
    });
    expect(insert).toHaveBeenCalledWith({
      content: '这是一个足够具体的匿名问题内容。',
    });
  });

  it('publishes a response with the default nickname immediately', async () => {
    const questionSingle = vi.fn().mockResolvedValue({
      data: { id: 12 },
      error: null,
    });
    const questionSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ single: questionSingle })),
      })),
    }));

    const responseSingle = vi.fn().mockResolvedValue({
      data: {
        id: 8,
        question_id: 12,
        content: '我也经历过类似的事情。',
        nickname: '一位路过的人',
        created_at: '2026-07-16T20:01:00.000Z',
      },
      error: null,
    });
    const responseInsert = vi.fn(() => ({
      select: vi.fn(() => ({ single: responseSingle })),
    }));

    fromMock
      .mockReturnValueOnce({ select: questionSelect })
      .mockReturnValueOnce({ insert: responseInsert });

    const result = await handler(
      postEvent({
        functionName: 'createResponse',
        questionId: 12,
        content: '我也经历过类似的事情。',
      })
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body).data.response).toMatchObject({
      id: 8,
      questionId: 12,
      nickname: '一位路过的人',
    });
    expect(responseInsert).toHaveBeenCalledWith({
      question_id: 12,
      content: '我也经历过类似的事情。',
      nickname: '一位路过的人',
    });
  });
});
