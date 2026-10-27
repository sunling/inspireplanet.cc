/** Optional public metadata shared by the episode page and newsletter preview. */
export interface EpisodePublication {
  podcast?: {
    url: string;
    title: string;
    durationSeconds?: number;
    publishedAt?: string;
  };
  newsletter?: {
    intro?: string;
    /** Zero-based position in this episode's quote-cards.json. */
    featuredQuoteIndex?: number;
  };
}

export function isXiaoyuzhouEpisodeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || /[\s\x00-\x1f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['xiaoyuzhoufm.com', 'www.xiaoyuzhoufm.com'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^\/episode\/[a-f0-9]{24}\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** Fail closed on malformed metadata without breaking historical episode pages. */
export function parseEpisodePublication(
  value: unknown
): EpisodePublication | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['podcast', 'newsletter'].includes(key)))
    return null;
  const result: EpisodePublication = {};
  if (row.podcast !== undefined) {
    if (
      !row.podcast ||
      typeof row.podcast !== 'object' ||
      Array.isArray(row.podcast)
    )
      return null;
    const podcast = row.podcast as Record<string, unknown>;
    if (
      Object.keys(podcast).some(
        (key) =>
          !['url', 'title', 'durationSeconds', 'publishedAt'].includes(key)
      )
    )
      return null;
    if (
      !isXiaoyuzhouEpisodeUrl(podcast.url) ||
      typeof podcast.title !== 'string' ||
      !podcast.title.trim()
    )
      return null;
    if (
      podcast.durationSeconds !== undefined &&
      (typeof podcast.durationSeconds !== 'number' ||
        !Number.isInteger(podcast.durationSeconds) ||
        podcast.durationSeconds <= 0)
    )
      return null;
    if (podcast.publishedAt !== undefined) {
      if (
        typeof podcast.publishedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(podcast.publishedAt)
      )
        return null;
      const date = new Date(`${podcast.publishedAt}T00:00:00Z`);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== podcast.publishedAt
      )
        return null;
    }
    result.podcast = {
      url: podcast.url,
      title: podcast.title.trim(),
      ...(podcast.durationSeconds !== undefined
        ? { durationSeconds: podcast.durationSeconds as number }
        : {}),
      ...(podcast.publishedAt !== undefined
        ? { publishedAt: podcast.publishedAt as string }
        : {}),
    };
  }
  if (row.newsletter !== undefined) {
    if (
      !row.newsletter ||
      typeof row.newsletter !== 'object' ||
      Array.isArray(row.newsletter)
    )
      return null;
    const newsletter = row.newsletter as Record<string, unknown>;
    if (
      Object.keys(newsletter).some(
        (key) => !['intro', 'featuredQuoteIndex'].includes(key)
      )
    )
      return null;
    if (
      newsletter.intro !== undefined &&
      (typeof newsletter.intro !== 'string' ||
        !newsletter.intro.trim() ||
        newsletter.intro.length > 1000)
    )
      return null;
    if (
      newsletter.featuredQuoteIndex !== undefined &&
      (typeof newsletter.featuredQuoteIndex !== 'number' ||
        !Number.isInteger(newsletter.featuredQuoteIndex) ||
        newsletter.featuredQuoteIndex < 0)
    )
      return null;
    result.newsletter = {
      ...(newsletter.intro !== undefined
        ? { intro: (newsletter.intro as string).trim() }
        : {}),
      ...(newsletter.featuredQuoteIndex !== undefined
        ? { featuredQuoteIndex: newsletter.featuredQuoteIndex as number }
        : {}),
    };
  }
  return result;
}
