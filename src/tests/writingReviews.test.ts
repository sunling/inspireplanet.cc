import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  auth: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('../database/supabase', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('../netlify/utils/server', async (original) => ({
  ...(await original<typeof import('../netlify/utils/server')>()),
  getAuthenticatedUser: mocks.auth,
}));
import { handler } from '../netlify/functions/writingReviews';
import { handler as writingsHandler } from '../netlify/functions/writings';
import { handler as interactionsHandler } from '../netlify/functions/writingInteractions';
function event(action: string, values = {}, method = 'GET') {
  return {
    httpMethod: method,
    headers: {},
    queryStringParameters:
      method === 'GET' || method === 'DELETE'
        ? { functionName: action, ...values }
        : {},
    body:
      method === 'POST'
        ? JSON.stringify({ functionName: action, ...values })
        : null,
  } as any;
}
function query(result: unknown) {
  const chain: any = {};
  for (const name of [
    'select',
    'eq',
    'gte',
    'lt',
    'order',
    'range',
    'upsert',
    'delete',
    'ilike',
    'in',
    'update',
  ])
    chain[name] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return chain;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: '7' });
});
describe('private weekly reviews', () => {
  it('rejects unauthenticated requests before reading the database', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await handler(event('weekly'))).statusCode).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each(['save', 'delete'])(
    'cannot %s discoveries for another user’s post',
    async (action) => {
      const posts = query({ data: null, error: null });
      mocks.from.mockReturnValue(posts);
      expect(
        (
          await handler(
            event(
              action,
              { post_id: '42', discovery: '发现' },
              action === 'save' ? 'POST' : 'DELETE'
            )
          )
        ).statusCode
      ).toBe(404);
      expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
      expect(mocks.from).toHaveBeenCalledTimes(1);
    }
  );
  it('filters by owner and half-open Shanghai week before paginating', async () => {
    const posts = query({ data: [], error: null, count: 0 });
    mocks.from.mockReturnValue(posts);
    const response = await handler(
      event('weekly', { week: '2026-10-19', page: '1' })
    );
    expect(response.statusCode).toBe(200);
    expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
    expect(posts.eq).toHaveBeenCalledWith('status', 'published');
    expect(posts.gte).toHaveBeenCalledWith(
      'created_at',
      '2026-10-18T16:00:00.000Z'
    );
    expect(posts.lt).toHaveBeenCalledWith(
      'created_at',
      '2026-10-25T16:00:00.000Z'
    );
    expect(JSON.parse(response.body).data).toMatchObject({
      post: null,
      total: 0,
      note: null,
    });
  });
  it('persists discovery with server authenticated ownership and an idempotent conflict key', async () => {
    const posts = query({ data: { id: 42 }, error: null });
    const notes = query({
      data: { post_id: 42, discovery: '新发现', updated_at: 'now' },
      error: null,
    });
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts' ? posts : notes
    );
    const response = await handler(
      event(
        'save',
        { post_id: '42', user_id: '999', discovery: ' 新发现 ' },
        'POST'
      )
    );
    expect(response.statusCode).toBe(200);
    expect(notes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '7',
        post_id: '42',
        discovery: '新发现',
      }),
      { onConflict: 'user_id,post_id' }
    );
  });
  it.each(['', ' '.repeat(3), '字'.repeat(4001)])(
    'rejects invalid discovery content',
    async (discovery) => {
      mocks.from.mockReturnValue(query({ data: { id: 42 }, error: null }));
      expect(
        (await handler(event('save', { post_id: '42', discovery }, 'POST')))
          .statusCode
      ).toBe(400);
      expect(mocks.from).toHaveBeenCalledTimes(1);
    }
  );
  it('returns an error instead of hiding database failures as an empty week', async () => {
    mocks.from.mockReturnValue(
      query({ data: null, error: { message: 'unavailable' } })
    );
    expect(
      (await handler(event('weekly', { week: '2026-10-19' }))).statusCode
    ).toBe(500);
  });
});

describe('title search backend', () => {
  it('applies literal title matching within the owner scope before pagination', async () => {
    const posts = query({ data: [], error: null, count: 0 });
    posts.ilike = vi.fn(() => posts);
    mocks.from.mockReturnValue(posts);
    const response = await writingsHandler(
      event('getAll', { scope: 'mine', keyword: '成长_100%' })
    );
    expect(response.statusCode).toBe(200);
    expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
    expect(posts.ilike).toHaveBeenCalledWith('title', '%成长\\_100\\%%');
    expect(posts.range).toHaveBeenCalledWith(0, 11);
  });
});

describe('review writing creation', () => {
  it('rejects references to another author before creating a post', async () => {
    const posts = query({ data: null, error: null });
    mocks.from.mockReturnValue(posts);
    const response = await writingsHandler(
      event(
        'create',
        {
          review_source_id: '42',
          title: '回看',
          body: '现在的发现',
          visibility: 'public',
        },
        'POST'
      )
    );
    expect(response.statusCode).toBe(403);
    expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('publishes a review and author response through the atomic database function', async () => {
    const row = {
      id: 99,
      user_id: 7,
      writing_type: 'review',
      review_source_id: 42,
      body: '现在的发现',
      visibility: 'public',
    };
    const source = query({ data: { id: 42 }, error: null });
    const posts = query({ data: row, error: null });
    mocks.from.mockReturnValueOnce(source).mockReturnValue(posts);
    mocks.rpc.mockResolvedValue({ data: 99, error: null });
    const response = await writingsHandler(
      event(
        'create',
        {
          review_source_id: '42',
          title: '回看',
          body: '现在的发现',
          visibility: 'public',
        },
        'POST'
      )
    );
    expect(response.statusCode).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_writing_post_v2',
      expect.objectContaining({ p_visibility: 'private' })
    );
    expect(mocks.rpc).toHaveBeenCalledWith('publish_writing_review', {
      p_post_id: 99,
      p_user_id: 7,
      p_source_id: 42,
      p_visibility: 'public',
      p_editor_mode: 'basic',
      p_body_rich: null,
    });
    expect(posts.update).toHaveBeenCalledWith({ image_urls: [] });
    expect(JSON.parse(response.body).data.post).toMatchObject({
      writing_type: 'review',
      review_source_id: '42',
    });
  });
  it('can filter only review writings while preserving owner access', async () => {
    const posts = query({ data: [], count: 0, error: null });
    mocks.from.mockReturnValue(posts);
    const response = await writingsHandler(
      event('getAll', { scope: 'mine', writing_type: 'review' })
    );
    expect(response.statusCode).toBe(200);
    expect(posts.eq).toHaveBeenCalledWith('writing_type', 'review');
    expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
  });
  it('keeps the original readable when saved discoveries fail to load', async () => {
    const posts = query({
      data: [{ id: 42, user_id: 7, body: '原文仍可阅读' }],
      count: 1,
      error: null,
    });
    const notes = query({ data: null, error: { code: '42P01' } });
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts' ? posts : notes
    );
    const response = await handler(event('weekly', { week: '2026-10-19' }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data).toMatchObject({
      post: { body: '原文仍可阅读' },
      note: null,
      note_error: expect.any(String),
    });
  });
});

describe('review schema rollout compatibility', () => {
  const missingColumn = {
    code: '42703',
    message: 'column writing_posts.writing_type does not exist',
  };
  function oldSchemaQuery(data: unknown, keepError = false) {
    let legacy = false;
    const chain = query({});
    chain.select.mockImplementation((columns: string) => {
      legacy = !columns.includes('writing_type');
      return chain;
    });
    chain.then = (resolve: any) =>
      Promise.resolve(
        legacy && !keepError
          ? {
              data,
              error: null,
              count: Array.isArray(data) ? data.length : null,
            }
          : { data: null, error: missingColumn }
      ).then(resolve);
    chain.single = vi.fn(() => chain);
    return chain;
  }
  it('restores the ordinary list without dropping ownership, sorting or pagination', async () => {
    const posts = oldSchemaQuery([
      { id: 42, user_id: 7, body: '旧书写', visibility: 'private' },
    ]);
    mocks.from.mockReturnValue(posts);
    const response = await writingsHandler(event('getAll', { scope: 'mine' }));
    expect(response.statusCode).toBe(200);
    expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
    expect(posts.range).toHaveBeenCalledWith(0, 11);
    expect(posts.select).toHaveBeenCalledTimes(2);
    expect(JSON.parse(response.body).data.records[0]).toMatchObject({
      body: '旧书写',
      writing_type: 'original',
    });
  });
  it('restores the original detail without new review columns', async () => {
    const posts = oldSchemaQuery({
      id: 42,
      user_id: 7,
      body: '旧书写',
      visibility: 'private',
    });
    mocks.from.mockReturnValue(posts);
    const response = await writingsHandler(event('getById', { id: '42' }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.post.id).toBe('42');
    expect(posts.eq).toHaveBeenCalledWith('id', '42');
  });
  it('restores weekly originals with owner/date filters when both review migrations are missing', async () => {
    const posts = oldSchemaQuery([
      { id: 42, user_id: 7, body: '旧书写', visibility: 'private' },
    ]);
    const notes = query({
      data: null,
      error: { code: '42P01', message: 'missing notes table' },
    });
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts' ? posts : notes
    );
    const response = await handler(event('weekly', { week: '2026-10-19' }));
    expect(response.statusCode).toBe(200);
    expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
    expect(posts.gte).toHaveBeenCalledTimes(2);
    expect(posts.lt).toHaveBeenCalledTimes(2);
    expect(JSON.parse(response.body).data).toMatchObject({
      post: { body: '旧书写' },
      note_error: expect.stringContaining('数据库迁移'),
    });
  });
  it('does not silently remove a requested review-only filter', async () => {
    const posts = oldSchemaQuery([], true);
    mocks.from.mockReturnValue(posts);
    const response = await writingsHandler(
      event('getAll', { scope: 'mine', writing_type: 'review' })
    );
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body).error).toContain('数据库迁移');
    expect(posts.eq).toHaveBeenCalledWith('writing_type', 'review');
  });
  it('rejects review creation before inserting a post when the schema is old', async () => {
    mocks.from.mockReturnValue(query({ data: null, error: missingColumn }));
    const response = await writingsHandler(
      event(
        'create',
        { review_source_id: '42', body: '回看感想', visibility: 'public' },
        'POST'
      )
    );
    expect(response.statusCode).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('keeps real database errors visible without a legacy retry', async () => {
    const posts = query({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });
    mocks.from.mockReturnValue(posts);
    expect(
      (await writingsHandler(event('getAll', { scope: 'mine' }))).statusCode
    ).toBe(500);
    expect(posts.select).toHaveBeenCalledTimes(1);
  });
});

describe('public review publishing', () => {
  it('honors private visibility while keeping the review attributed to its author', async () => {
    const row = {
      id: 99,
      user_id: 7,
      writing_type: 'review',
      review_source_id: 42,
      visibility: 'private',
    };
    const posts = query({ data: row, error: null });
    mocks.from.mockReturnValue(posts);
    mocks.rpc.mockResolvedValue({ data: 99, error: null });
    const response = await writingsHandler(
      event(
        'create',
        {
          review_source_id: '42',
          title: '回看',
          body: '发现',
          visibility: 'private',
          is_anonymous: true,
          group_id: '999',
        },
        'POST'
      )
    );
    expect(response.statusCode).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'publish_writing_review',
      expect.objectContaining({
        p_post_id: 99,
        p_user_id: 7,
        p_source_id: 42,
        p_visibility: 'private',
      })
    );
    expect(JSON.parse(response.body).data.post.visibility).toBe('private');
  });
  it.each([
    [{ code: 'PGRST202', message: 'function missing' }, 503],
    [{ code: '23514', message: 'comment constraint failed' }, 500],
  ])(
    'cleans up the provisional private review when publishing fails',
    async (error, status) => {
      const posts = query({ data: { id: 42, user_id: 7 }, error: null });
      mocks.from.mockReturnValue(posts);
      mocks.rpc
        .mockResolvedValueOnce({ data: 99, error: null })
        .mockResolvedValueOnce({ data: null, error });
      const response = await writingsHandler(
        event(
          'create',
          {
            review_source_id: '42',
            title: '回看',
            body: '发现',
            visibility: 'public',
          },
          'POST'
        )
      );
      expect(response.statusCode).toBe(status);
      expect(posts.delete).toHaveBeenCalledOnce();
      expect(posts.eq).toHaveBeenCalledWith('id', 99);
      expect(posts.eq).toHaveBeenCalledWith('user_id', '7');
    }
  );
  it('allows an author to make a review private when edited', async () => {
    const row = {
      id: 99,
      user_id: 7,
      writing_type: 'review',
      review_source_id: 42,
      visibility: 'public',
      image_urls: [],
    };
    const posts = query({ data: row, error: null });
    mocks.from.mockReturnValue(posts);
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const response = await writingsHandler(
      event(
        'update',
        {
          id: '99',
          body: '更新后的发现',
          visibility: 'private',
          is_anonymous: true,
        },
        'POST'
      )
    );
    expect(response.statusCode).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'update_writing_post_v2',
      expect.objectContaining({ p_visibility: 'private' })
    );
    expect(posts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'private',
        is_anonymous: false,
        group_id: null,
      })
    );
  });
});

describe('author review responses', () => {
  it('returns the author identity and a link to the published review', async () => {
    const post = query({
      data: { id: 42, user_id: 7, visibility: 'public', status: 'published' },
      error: null,
    });
    const comments = query({
      data: [
        {
          id: 12,
          post_id: 42,
          user_id: 7,
          review_post_id: 99,
          content: '【作者回看】发现',
          author: { id: 7, name: '作者本人' },
        },
      ],
      error: null,
    });
    const resonance = query({ data: null, count: 0, error: null });
    let postReads = 0;
    const publicReviews = query({ data: [{ id: 99 }], error: null });
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts'
        ? ++postReads === 1
          ? post
          : publicReviews
        : table === 'writing_comments'
          ? comments
          : resonance
    );
    const response = await interactionsHandler(event('get', { post_id: '42' }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.comments[0]).toMatchObject({
      user_id: '7',
      review_post_id: '99',
      author: { name: '作者本人' },
      is_anonymous: false,
    });
    expect(comments.eq).toHaveBeenCalledWith('post_id', '42');
    expect(comments.eq).toHaveBeenCalledWith('status', 'published');
  });
  it('keeps ordinary comments readable before the response-link migration', async () => {
    const post = query({
      data: { id: 42, user_id: 7, visibility: 'public', status: 'published' },
      error: null,
    });
    const comments = query({});
    let legacy = false;
    comments.select.mockImplementation((columns: string) => {
      legacy = !columns.includes('review_post_id');
      return comments;
    });
    comments.then = (resolve: any) =>
      Promise.resolve(
        legacy
          ? {
              data: [{ id: 12, post_id: 42, user_id: 7, content: '原有回应' }],
              error: null,
            }
          : {
              data: null,
              error: {
                code: '42703',
                message: 'column review_post_id does not exist',
              },
            }
      ).then(resolve);
    const resonance = query({ data: null, count: 0, error: null });
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts'
        ? post
        : table === 'writing_comments'
          ? comments
          : resonance
    );
    const response = await interactionsHandler(event('get', { post_id: '42' }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.comments[0]).toMatchObject({
      content: '原有回应',
      review_post_id: null,
    });
  });
  it('does not reveal private original comments to another reader', async () => {
    const post = query({
      data: {
        id: 42,
        user_id: 999,
        visibility: 'private',
        status: 'published',
      },
      error: null,
    });
    mocks.from.mockReturnValue(post);
    expect(
      (await interactionsHandler(event('get', { post_id: '42' }))).statusCode
    ).toBe(404);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('writing_posts');
  });
});

describe('private review comment visibility', () => {
  it('excludes private review responses and their replies even if marked published', async () => {
    const post = query({
      data: { id: 42, user_id: 7, visibility: 'public', status: 'published' },
      error: null,
    });
    const reviews = query({ data: [], error: null });
    const comments = query({
      data: [
        {
          id: 12,
          post_id: 42,
          user_id: 7,
          review_post_id: 99,
          content: '私密回看摘要',
        },
        { id: 13, post_id: 42, user_id: 8, parent_id: 12, content: '回看回复' },
        { id: 14, post_id: 42, user_id: 8, content: '普通评论' },
      ],
      error: null,
    });
    const resonance = query({ data: null, count: 0, error: null });
    let postReads = 0;
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts'
        ? ++postReads === 1
          ? post
          : reviews
        : table === 'writing_comments'
          ? comments
          : resonance
    );
    const response = await interactionsHandler(event('get', { post_id: '42' }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.comments).toEqual([
      expect.objectContaining({ id: '14', content: '普通评论' }),
    ]);
    expect(reviews.eq).toHaveBeenCalledWith('visibility', 'public');
  });
  it('does not return response excerpts if visibility verification fails', async () => {
    const post = query({
      data: { id: 42, user_id: 7, visibility: 'public', status: 'published' },
      error: null,
    });
    const reviews = query({ data: null, error: { message: 'unavailable' } });
    const comments = query({
      data: [
        {
          id: 12,
          post_id: 42,
          user_id: 7,
          review_post_id: 99,
          content: '不能泄露',
        },
      ],
      error: null,
    });
    const resonance = query({ data: null, count: 0, error: null });
    let postReads = 0;
    mocks.from.mockImplementation((table) =>
      table === 'writing_posts'
        ? ++postReads === 1
          ? post
          : reviews
        : table === 'writing_comments'
          ? comments
          : resonance
    );
    const response = await interactionsHandler(event('get', { post_id: '42' }));
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('不能泄露');
  });
});

it('defaults a new review to public when visibility is omitted', async () => {
  const posts = query({
    data: {
      id: 99,
      user_id: 7,
      writing_type: 'review',
      review_source_id: 42,
      visibility: 'public',
    },
    error: null,
  });
  mocks.from.mockReturnValue(posts);
  mocks.rpc.mockResolvedValue({ data: 99, error: null });
  const response = await writingsHandler(
    event(
      'create',
      { review_source_id: '42', title: '回看', body: '发现' },
      'POST'
    )
  );
  expect(response.statusCode).toBe(201);
  expect(mocks.rpc).toHaveBeenCalledWith(
    'publish_writing_review',
    expect.objectContaining({ p_visibility: 'public' })
  );
});
it('does not return orphan replies after a private review comment has been hidden', async () => {
  const post = query({
    data: { id: 42, user_id: 7, visibility: 'public', status: 'published' },
    error: null,
  });
  const comments = query({
    data: [
      {
        id: 13,
        post_id: 42,
        user_id: 8,
        parent_id: 12,
        content: '隐藏回看的回复',
      },
      { id: 14, post_id: 42, user_id: 8, content: '普通评论' },
    ],
    error: null,
  });
  const resonance = query({ data: null, count: 0, error: null });
  mocks.from.mockImplementation((table) =>
    table === 'writing_posts'
      ? post
      : table === 'writing_comments'
        ? comments
        : resonance
  );
  const response = await interactionsHandler(event('get', { post_id: '42' }));
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body).data.comments).toEqual([
    expect.objectContaining({ id: '14' }),
  ]);
});
