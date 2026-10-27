import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../database/supabase', () => ({ supabase: {} }));

const fetchMock = vi.fn();
const base = 'events/2026/20261024-ep42/';
const podcast = {
  url: 'https://www.xiaoyuzhoufm.com/episode/0123456789abcdef01234567',
  title: '本期节目',
};
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('optional publication reader', () => {
  it('selects the exact year, reads metadata-only entries, and caches by SHA', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({
          tree: [
            {
              type: 'blob',
              path: 'events/2025/20251025-ep42/episode-publication.json',
              sha: 'old',
            },
            {
              type: 'blob',
              path: base + 'episode-publication.json',
              sha: 'new',
            },
          ],
        })
      )
      .mockResolvedValueOnce(response({ podcast }));
    const { getEpisodePublication } =
      await import('../netlify/utils/githubWeeklyCards');
    expect(await getEpisodePublication('42', 2026)).toEqual({ podcast });
    expect(fetchMock.mock.calls[1][0]).toContain(base);
    expect(await getEpisodePublication('EP42', 2026)).toEqual({ podcast });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await getEpisodePublication('42', 2024)).toBeNull();
  });
  it('does not fetch metadata for historical episodes that have none', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        tree: [{ type: 'blob', path: base + 'summary.json', sha: 'summary' }],
      })
    );
    const { getEpisodePublication } =
      await import('../netlify/utils/githubWeeklyCards');
    expect(await getEpisodePublication('42', 2026)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not break the recap if metadata is malformed or unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({
          tree: [
            {
              type: 'blob',
              path: base + 'episode-publication.json',
              sha: 'new',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        response({ podcast: { url: 'javascript:alert(1)', title: 'bad' } })
      )
      .mockResolvedValueOnce(response({}, false));
    const { getEpisodePublication } =
      await import('../netlify/utils/githubWeeklyCards');
    expect(await getEpisodePublication('42', 2026)).toBeNull();
    expect(await getEpisodePublication('42', 2026)).toBeNull();
  });
  it('refreshes changed metadata after tree TTL expires', async () => {
    vi.useFakeTimers();
    const tree = (sha: string) =>
      response({
        tree: [{ type: 'blob', path: base + 'episode-publication.json', sha }],
      });
    fetchMock
      .mockResolvedValueOnce(tree('one'))
      .mockResolvedValueOnce(response({ podcast }))
      .mockResolvedValueOnce(tree('two'))
      .mockResolvedValueOnce(
        response({ podcast: { ...podcast, title: '更正标题' } })
      );
    const { getEpisodePublication } =
      await import('../netlify/utils/githubWeeklyCards');
    await getEpisodePublication('42', 2026);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect((await getEpisodePublication('42', 2026))?.podcast?.title).toBe(
      '更正标题'
    );
  });
});
