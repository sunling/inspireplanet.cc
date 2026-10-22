import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  from: vi.fn(() => {
    throw new Error('Retired weekly archive accessed');
  }),
}));
vi.mock('../database/supabase', () => ({ supabase: database }));
const card = {
  name: 'Speaker',
  title: 'From GitHub',
  quote: 'Quote',
  detail: 'Detail',
};
const tree = [
  {
    path: 'events/2026/20261021-ep02/quote-cards.json',
    type: 'blob',
    sha: 'new',
  },
  {
    path: 'events/2025/20251021-ep02/quote-cards.json',
    type: 'blob',
    sha: 'archive',
  },
];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  database.from.mockClear();
  fetchMock = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(url.includes('api.github.com') ? { tree } : [card]),
        { status: 200 }
      )
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  expect(database.from).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('GitHub-only weekly content', () => {
  it('keeps latest cards and year-specific episodes from the content repository', async () => {
    const weekly = await import('../netlify/utils/githubWeeklyCards');
    const latest = await weekly.getLatestWeeklyCards();
    expect(latest[0]).toMatchObject({ id: '2026-ep02-1', title: card.title });
    const old = await weekly.getWeeklyCardsByEpisode('EP02', '2025');
    expect(old[0].id).toBe('2025-ep02-1');
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
      'https://raw.githubusercontent.com/sunling/inspire-planet/main/events/2025/20251021-ep02/quote-cards.json'
    );
  });
  it('keeps all cards sorted and applies limits', async () => {
    const weekly = await import('../netlify/utils/githubWeeklyCards');
    expect((await weekly.getAllWeeklyCards()).map((c) => c.id)).toEqual([
      '2026-ep02-1',
      '2025-ep02-1',
    ]);
    expect(await weekly.getAllWeeklyCards(1)).toHaveLength(1);
  });
  it('does not return archived database cards for an absent episode', async () => {
    const weekly = await import('../netlify/utils/githubWeeklyCards');
    expect(await weekly.getWeeklyCardsByEpisode('EP99')).toEqual([]);
    expect(await weekly.getWeeklyCardsByEpisode('invalid')).toEqual([]);
  });
  it('does not reactivate the database on GitHub failure', async () => {
    fetchMock.mockRejectedValue(new Error('GitHub unavailable'));
    const weekly = await import('../netlify/utils/githubWeeklyCards');
    expect(await weekly.getLatestWeeklyCards()).toEqual([]);
    expect(await weekly.getWeeklyCardsByEpisode('EP02')).toEqual([]);
    expect(await weekly.getAllWeeklyCards()).toEqual([]);
  });
  it('keeps healthy episodes if another GitHub blob fails', async () => {
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/2025/') ? new Response('', { status: 503 }) : original(url)
    );
    const weekly = await import('../netlify/utils/githubWeeklyCards');
    expect((await weekly.getAllWeeklyCards()).map((c) => c.id)).toEqual([
      '2026-ep02-1',
    ]);
  });
});
