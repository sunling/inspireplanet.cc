import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  storageFrom: vi.fn(),
  from: vi.fn(),
  auth: vi.fn(),
  listBuckets: vi.fn(),
  createBucket: vi.fn(),
}));
vi.mock('../database/supabase', () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
      listBuckets: mocks.listBuckets,
      createBucket: mocks.createBucket,
    },
  },
}));
vi.mock('../netlify/utils/server', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getUserIdFromAuth: mocks.auth,
}));
import { handler } from '../netlify/functions/communityQr';
const request = (functionName: string, data = {}, method = 'GET') =>
  handler({
    httpMethod: method,
    headers: {},
    queryStringParameters: { functionName, ...data },
    body: JSON.stringify({ functionName, ...data }),
  } as any);
const image = 'data:image/png;base64,aGVsbG8=';
const old = {
  id: 'old',
  name: '1000-old.png',
  updated_at: '2026-10-19T00:00:00Z',
};
function bucket(name: string) {
  return {
    list: vi.fn().mockResolvedValue({ data: [old], error: null }),
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn((path) => ({
      data: { publicUrl: `https://storage.test/${name}/${path}` },
    })),
  };
}
let community: ReturnType<typeof bucket>;
let speakers: ReturnType<typeof bucket>;
beforeEach(() => {
  vi.clearAllMocks();
  community = bucket('community-qrcode');
  speakers = bucket('speaker-qrcode');
  mocks.storageFrom.mockImplementation((name) =>
    name === 'community-qrcode' ? community : speakers
  );
  mocks.auth.mockResolvedValue('42');
  const q: any = {};
  q.select = q.eq = vi.fn(() => q);
  q.single = vi
    .fn()
    .mockResolvedValue({ data: { role: 'organizer' }, error: null });
  mocks.from.mockReturnValue(q);
  mocks.listBuckets.mockResolvedValue({
    data: [{ id: 'community-qrcode' }, { id: 'speaker-qrcode' }],
    error: null,
  });
  mocks.createBucket.mockResolvedValue({ error: null });
});

describe('group-specific QR management', () => {
  it('keeps requests without a group compatible with the community page', async () => {
    const res = await request('current');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('/community-qrcode/1000-old.png');
    expect(speakers.list).not.toHaveBeenCalled();
  });
  it('reads the latest speaker QR separately', async () => {
    const res = await request('current', { group: 'speakers' });
    expect(res.body).toContain('/speaker-qrcode/1000-old.png');
    expect(speakers.list).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ sortBy: { column: 'name', order: 'desc' } })
    );
    expect(community.list).not.toHaveBeenCalled();
  });
  it('returns an empty QR while the speaker group has not been set up', async () => {
    speakers.list.mockResolvedValueOnce({
      data: null,
      error: { message: 'Bucket not found' },
    } as any);
    const res = await request('current', { group: 'speakers' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('"imageUrl":null');
  });
  it.each(['unknown', '../community-qrcode', '__proto__'])(
    'rejects an arbitrary group %s',
    async (group) => {
      expect((await request('current', { group })).statusCode).toBe(400);
      expect(mocks.storageFrom).not.toHaveBeenCalled();
    }
  );
  it.each([undefined, 'community', 'speakers'])(
    'updates only the selected group %s',
    async (group) => {
      const res = await request(
        'update',
        { ...(group ? { group } : {}), base64Image: image },
        'POST'
      );
      expect(res.statusCode).toBe(200);
      const selected = group === 'speakers' ? speakers : community;
      const other = group === 'speakers' ? community : speakers;
      expect(selected.upload).toHaveBeenCalledOnce();
      expect(selected.remove).toHaveBeenCalledWith(['1000-old.png']);
      expect(other.list).not.toHaveBeenCalled();
      expect(other.upload).not.toHaveBeenCalled();
      expect(other.remove).not.toHaveBeenCalled();
    }
  );
  it('creates a dedicated speaker bucket on first upload', async () => {
    mocks.listBuckets.mockResolvedValueOnce({
      data: [{ id: 'community-qrcode' }],
      error: null,
    });
    speakers.list.mockResolvedValueOnce({ data: [], error: null });
    expect(
      (
        await request(
          'update',
          { group: 'speakers', base64Image: image },
          'POST'
        )
      ).statusCode
    ).toBe(200);
    expect(mocks.createBucket).toHaveBeenCalledWith(
      'speaker-qrcode',
      expect.objectContaining({ public: true, fileSizeLimit: 3 * 1024 * 1024 })
    );
    expect(community.remove).not.toHaveBeenCalled();
  });
  it('requires login before uploading', async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect(
      (
        await request(
          'update',
          { group: 'speakers', base64Image: image },
          'POST'
        )
      ).statusCode
    ).toBe(401);
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
  it('requires organizer permission', async () => {
    mocks
      .from()
      .single.mockResolvedValueOnce({ data: { role: 'member' }, error: null });
    expect(
      (
        await request(
          'update',
          { group: 'speakers', base64Image: image },
          'POST'
        )
      ).statusCode
    ).toBe(403);
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
  it('does not delete the current QR when upload fails', async () => {
    speakers.upload.mockResolvedValueOnce({
      error: { message: 'upload failed' },
    } as any);
    expect(
      (
        await request(
          'update',
          { group: 'speakers', base64Image: image },
          'POST'
        )
      ).statusCode
    ).toBe(500);
    expect(speakers.remove).not.toHaveBeenCalled();
  });
  it('rejects an invalid image without touching storage', async () => {
    expect(
      (
        await request(
          'update',
          { group: 'speakers', base64Image: 'not-an-image' },
          'POST'
        )
      ).statusCode
    ).toBe(400);
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
  it('does not permit updates by GET', async () => {
    expect((await request('update', { group: 'speakers' })).statusCode).toBe(
      405
    );
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
});
