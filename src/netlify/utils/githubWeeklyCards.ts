import { supabase } from '../../database/supabase';
import {
  EpisodeSummary,
  EpisodeTopic,
  WeeklyCard,
} from '../services/weeklyCards';

const GITHUB_OWNER = 'sunling';
const GITHUB_REPO = 'inspire-planet';
const GITHUB_BRANCH = 'main';

const TREE_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const TREE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface GitHubEpisodeEntry {
  year: number;
  dateRaw: string; // YYYYMMDD
  dateFormatted: string; // YYYY-MM-DD
  episodeNum: number;
  episode: string; // EPXX
  folderPath: string; // events/{year}/{YYYYMMDD}-epXX
  path?: string; // quote-cards.json path
  sha?: string; // quote-cards.json sha
  summaryPath?: string; // summary.json path
  summarySha?: string;
  recapPath?: string; // recap.md path
  recapSha?: string;
}

interface RawQuoteCard {
  name?: string;
  title?: string;
  quote?: string;
  detail?: string;
  episode?: string;
  image_path?: string;
}

let cachedTreeEntries: GitHubEpisodeEntry[] | null = null;
let cachedTreeTimestamp = 0;

// Cache parsed cards and summaries by git blob sha (immutable per content) or path
const episodeCardsCache = new Map<string, WeeklyCard[]>();
const episodeSummaryCache = new Map<string, EpisodeSummary>();

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'inspireplanet-cc',
  };
  const token =
    typeof process !== 'undefined' && process.env
      ? process.env.GITHUB_TOKEN || process.env.GH_TOKEN
      : undefined;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getGitHubEpisodeEntries(): Promise<GitHubEpisodeEntry[]> {
  const now = Date.now();
  if (cachedTreeEntries && now - cachedTreeTimestamp < TREE_CACHE_TTL_MS) {
    return cachedTreeEntries;
  }

  try {
    const response = await fetch(TREE_API_URL, {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub tree API failed: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as {
      tree?: Array<{ path?: string; type?: string; sha?: string }>;
    };

    const byFolder = new Map<string, GitHubEpisodeEntry>();

    for (const item of payload.tree || []) {
      if (item.type !== 'blob' || !item.path) continue;

      const match = item.path.match(
        /^(events\/(\d{4})\/(\d{8})-ep(\d+))\/(quote-cards\.json|summary\.json|recap\.md)$/i
      );
      if (!match) continue;

      const folderPath = match[1];
      const year = Number.parseInt(match[2], 10);
      const dateRaw = match[3];
      const episodeNum = Number.parseInt(match[4], 10);
      const fileName = match[5].toLowerCase();

      if (!Number.isFinite(year) || !Number.isFinite(episodeNum)) continue;

      let entry = byFolder.get(folderPath);
      if (!entry) {
        const dateFormatted = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
        const episode = `EP${String(episodeNum).padStart(2, '0')}`;
        entry = {
          year,
          dateRaw,
          dateFormatted,
          episodeNum,
          episode,
          folderPath,
        };
        byFolder.set(folderPath, entry);
      }

      if (fileName === 'quote-cards.json') {
        entry.path = item.path;
        entry.sha = item.sha || item.path;
      } else if (fileName === 'summary.json') {
        entry.summaryPath = item.path;
        entry.summarySha = item.sha || item.path;
      } else if (fileName === 'recap.md') {
        entry.recapPath = item.path;
        entry.recapSha = item.sha || item.path;
      }
    }

    const entries = Array.from(byFolder.values());

    // Sort newest first: year DESC, episodeNum DESC, dateRaw DESC
    entries.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.episodeNum !== a.episodeNum) return b.episodeNum - a.episodeNum;
      return b.dateRaw.localeCompare(a.dateRaw);
    });

    cachedTreeEntries = entries;
    cachedTreeTimestamp = now;
    return entries;
  } catch (error) {
    console.warn('Failed to fetch GitHub episode tree:', error);
    if (cachedTreeEntries) {
      return cachedTreeEntries;
    }
    throw error;
  }
}

export async function fetchEpisodeCardsFromGitHub(
  entry: GitHubEpisodeEntry
): Promise<WeeklyCard[]> {
  if (!entry.path) return [];

  const cacheKey = `${entry.path}:${entry.sha || ''}`;
  const cached = episodeCardsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rawUrl = `${RAW_BASE_URL}/${entry.path}`;
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': 'inspireplanet-cc' },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`
    );
  }

  const rawCards = (await response.json()) as RawQuoteCard[];
  if (!Array.isArray(rawCards)) {
    return [];
  }

  // Noon UTC ensures the calendar date YYYY-MM-DD is identical in both Asia/Shanghai and Americas timezones
  const createdIso = `${entry.dateFormatted}T12:00:00.000Z`;
  const epCode = `ep${String(entry.episodeNum).padStart(2, '0')}`;

  const cards: WeeklyCard[] = rawCards
    .filter((c) => c && (c.title || c.quote))
    .map((c, index) => {
      const epNum = Number(c.episode?.match(/\d+/)?.[0] || entry.episodeNum);
      const normalizedEp = `EP${String(epNum).padStart(2, '0')}`;
      return {
        id: `${entry.year}-${epCode}-${index + 1}`,
        episode: normalizedEp,
        name: String(c.name || '').trim(),
        title: String(c.title || '').trim(),
        quote: String(c.quote || '').trim(),
        detail: String(c.detail || '').trim(),
        ...(c.image_path ? { image_path: c.image_path } : {}),
        created: createdIso,
      };
    });

  episodeCardsCache.set(cacheKey, cards);
  return cards;
}

function parseRecapMarkdownToSummary(
  markdown: string,
  entry: GitHubEpisodeEntry
): EpisodeSummary | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let mainTitle = `启发星球 ${entry.episode}`;
  const introParagraphs: string[] = [];
  const topics: EpisodeTopic[] = [];

  let currentSectionTitle: string | null = null;
  let currentSectionParas: string[] = [];

  const flushSection = () => {
    if (!currentSectionTitle) return;
    if (
      currentSectionTitle.includes('参与启发星球') ||
      currentSectionTitle.includes('加入')
    ) {
      currentSectionTitle = null;
      currentSectionParas = [];
      return;
    }

    let speaker = '现场分享';
    let topicTitle = currentSectionTitle;
    const colonMatch = currentSectionTitle.match(/^([^：:]{1,12})[：:]\s*(.+)$/);
    if (colonMatch) {
      speaker = colonMatch[1].trim();
      topicTitle = colonMatch[2].trim();
    }

    const cleanedParas = currentSectionParas
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('<!--') && p !== '---');

    if (cleanedParas.length > 0) {
      let quote: string | undefined;
      const bodyParas: string[] = [];

      for (const p of cleanedParas) {
        if (
          !quote &&
          ((p.startsWith('“') && p.endsWith('”')) ||
            (p.startsWith('"') && p.endsWith('"')) ||
            p.startsWith('>'))
        ) {
          quote = p.replace(/^[>“"]+|[”"]+$/g, '').trim();
        } else {
          bodyParas.push(p);
        }
      }

      const summaryText =
        bodyParas.slice(0, 2).join('\n\n') || cleanedParas[0] || '';
      const discussionText =
        bodyParas.length > 2 ? bodyParas.slice(2).join('\n\n') : undefined;

      topics.push({
        speaker,
        title: topicTitle,
        summary: summaryText,
        ...(discussionText ? { discussion: discussionText } : {}),
        ...(quote ? { quote } : {}),
      });
    }

    currentSectionTitle = null;
    currentSectionParas = [];
  };

  let buffer: string[] = [];
  const flushParagraph = () => {
    if (buffer.length === 0) return;
    const para = buffer.join(' ').trim();
    buffer = [];
    if (!para || para === '---' || para.startsWith('<!--')) return;
    if (currentSectionTitle) {
      currentSectionParas.push(para);
    } else {
      introParagraphs.push(para);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('# ')) {
      flushParagraph();
      const rawHeading = line.replace(/^#\s+/, '').trim();
      const parts = rawHeading.split(/[｜|]/);
      mainTitle = (parts.length > 1 ? parts.slice(1).join('｜') : rawHeading).trim();
    } else if (line.startsWith('## ')) {
      flushParagraph();
      flushSection();
      currentSectionTitle = line.replace(/^##\s+/, '').trim();
    } else if (line === '') {
      flushParagraph();
    } else {
      buffer.push(line);
    }
  }
  flushParagraph();
  flushSection();

  if (topics.length === 0 && introParagraphs.length === 0) {
    return null;
  }

  const cleanIntro = introParagraphs.filter(
    (p) => !(p.startsWith('“') && p.endsWith('”') && p.length < 40)
  );

  return {
    episode: entry.episode,
    date: entry.dateFormatted,
    title: mainTitle,
    overview: (cleanIntro.length > 0 ? cleanIntro : introParagraphs).join('\n\n'),
    topics,
  };
}

export async function fetchEpisodeSummaryFromGitHub(
  entry: GitHubEpisodeEntry
): Promise<EpisodeSummary | null> {
  // 1. Prefer structured summary.json
  if (entry.summaryPath) {
    const cacheKey = `summary:${entry.summaryPath}:${entry.summarySha || ''}`;
    const cached = episodeSummaryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const rawUrl = `${RAW_BASE_URL}/${entry.summaryPath}`;
      const response = await fetch(rawUrl, {
        headers: { 'User-Agent': 'inspireplanet-cc' },
      });
      if (response.ok) {
        const data = (await response.json()) as EpisodeSummary;
        if (data && data.title && Array.isArray(data.topics)) {
          episodeSummaryCache.set(cacheKey, data);
          return data;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch summary.json for ${entry.folderPath}:`, error);
    }
  }

  // 2. Fallback to parsing recap.md for historical episodes (EP21–EP37)
  if (entry.recapPath) {
    const cacheKey = `recap:${entry.recapPath}:${entry.recapSha || ''}`;
    const cached = episodeSummaryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const rawUrl = `${RAW_BASE_URL}/${entry.recapPath}`;
      const response = await fetch(rawUrl, {
        headers: { 'User-Agent': 'inspireplanet-cc' },
      });
      if (response.ok) {
        const md = await response.text();
        const parsed = parseRecapMarkdownToSummary(md, entry);
        if (parsed) {
          episodeSummaryCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch recap.md for ${entry.folderPath}:`, error);
    }
  }

  return null;
}

async function fetchConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next()
  );
  await Promise.all(runners);
  return results;
}

function getRecordYearAndEpisodeKey(card: WeeklyCard): string {
  const date = card.created ? new Date(card.created) : null;
  const year =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
        }).format(date)
      : '';
  const epNum = Number(card.episode?.match(/\d+/)?.[0] || 0);
  return `${year}-EP${String(epNum).padStart(2, '0')}`;
}

export async function getLatestWeeklyCards(): Promise<WeeklyCard[]> {
  try {
    const entries = (await getGitHubEpisodeEntries()).filter((e) => !!e.path);
    if (entries.length > 0) {
      return await fetchEpisodeCardsFromGitHub(entries[0]);
    }
  } catch (error) {
    console.warn(
      'Falling back to Supabase for getLatestWeeklyCards due to error:',
      error
    );
  }

  // Fallback to Supabase if GitHub is unreachable
  const { data: latestEpisode, error: episodeError } = await supabase
    .from('weekly_cards')
    .select('episode')
    .order('created', { ascending: false })
    .limit(1);

  if (episodeError || !latestEpisode || latestEpisode.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from('weekly_cards')
    .select('*')
    .eq('episode', latestEpisode[0].episode)
    .order('created', { ascending: false });

  return (data as WeeklyCard[]) || [];
}

export async function getEpisodeSummary(
  episodeInput: string,
  yearInput?: string | number
): Promise<EpisodeSummary | null> {
  const digits = episodeInput.match(/\d+/)?.[0] || '';
  const targetEpNum = digits ? Number.parseInt(digits, 10) : NaN;
  const targetYear =
    yearInput !== undefined && yearInput !== null && String(yearInput).trim()
      ? Number.parseInt(String(yearInput), 10)
      : NaN;

  if (!Number.isFinite(targetEpNum)) return null;

  try {
    const entries = await getGitHubEpisodeEntries();
    const matching = entries.filter(
      (e) =>
        e.episodeNum === targetEpNum &&
        (!Number.isFinite(targetYear) || e.year === targetYear)
    );
    if (matching.length > 0) {
      const summary = await fetchEpisodeSummaryFromGitHub(matching[0]);
      if (summary) return summary;
    }
  } catch (error) {
    console.warn('Error fetching episode summary from GitHub:', error);
  }

  return null;
}

export async function getWeeklyCardsByEpisode(
  episodeInput: string,
  yearInput?: string | number
): Promise<WeeklyCard[]> {
  const digits = episodeInput.match(/\d+/)?.[0] || '';
  const targetEpNum = digits ? Number.parseInt(digits, 10) : NaN;
  const targetYear =
    yearInput !== undefined && yearInput !== null && String(yearInput).trim()
      ? Number.parseInt(String(yearInput), 10)
      : NaN;

  if (Number.isFinite(targetEpNum)) {
    try {
      const entries = await getGitHubEpisodeEntries();
      const matching = entries.filter(
        (e) =>
          e.path &&
          e.episodeNum === targetEpNum &&
          (!Number.isFinite(targetYear) || e.year === targetYear)
      );

      if (matching.length > 0) {
        return await fetchEpisodeCardsFromGitHub(matching[0]);
      }
    } catch (error) {
      console.warn(
        'Falling back to Supabase for getWeeklyCardsByEpisode due to error:',
        error
      );
    }
  }

  // Fallback to Supabase if not found in GitHub tree yet
  let query = supabase.from('weekly_cards').select('*');
  if (Number.isFinite(targetEpNum)) {
    const padded = `EP${String(targetEpNum).padStart(2, '0')}`;
    const unpadded = `EP${targetEpNum}`;
    query = query.in('episode', [padded, unpadded]);
  } else {
    query = query.ilike('episode', `%${episodeInput}%`);
  }
  query = query.order('created', { ascending: false });

  const { data: result, error } = await query;
  if (error || !result) {
    return [];
  }

  const records = result as WeeklyCard[];
  if (Number.isFinite(targetYear)) {
    return records.filter((r) => {
      const y = r.created ? new Date(r.created).getFullYear() : NaN;
      return y === targetYear;
    });
  }
  return records;
}

export async function getAllWeeklyCards(limit?: number): Promise<WeeklyCard[]> {
  let githubCards: WeeklyCard[] = [];
  const githubKeys = new Set<string>();
  let has2025ArchiveOnGitHub = false;

  try {
    const entries = (await getGitHubEpisodeEntries()).filter((e) => !!e.path);
    has2025ArchiveOnGitHub = entries.some((e) => e.year <= 2025);
    const perEpisodeLists = await fetchConcurrency(entries, 12, async (entry) => {
      try {
        const cards = await fetchEpisodeCardsFromGitHub(entry);
        githubKeys.add(
          `${entry.year}-EP${String(entry.episodeNum).padStart(2, '0')}`
        );
        return cards;
      } catch (err) {
        console.warn(`Failed to fetch episode ${entry.path}:`, err);
        return [];
      }
    });
    githubCards = perEpisodeLists.flat();
  } catch (error) {
    console.warn(
      'Failed to load all weekly cards from GitHub, falling back to Supabase:',
      error
    );
  }

  // Only query Supabase fallback if GitHub failed or 2025 archive hasn't been pushed yet
  let supabaseCards: WeeklyCard[] = [];
  if (githubCards.length === 0 || !has2025ArchiveOnGitHub) {
    try {
      const { data } = await supabase
        .from('weekly_cards')
        .select('*')
        .order('created', { ascending: false });
      if (data) {
        supabaseCards = (data as WeeklyCard[]).filter(
          (card) => !githubKeys.has(getRecordYearAndEpisodeKey(card))
        );
      }
    } catch (error) {
      // Ignore Supabase fallback errors if GitHub succeeded
    }
  }

  const combined = [...githubCards, ...supabaseCards].sort((a, b) => {
    const timeA = a.created ? new Date(a.created).getTime() : 0;
    const timeB = b.created ? new Date(b.created).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    const epA = Number(a.episode?.match(/\d+/)?.[0] || 0);
    const epB = Number(b.episode?.match(/\d+/)?.[0] || 0);
    return epB - epA;
  });

  if (limit && limit > 0) {
    return combined.slice(0, limit);
  }
  return combined;
}
