export const MAX_RESPONSE_CONTENT_LENGTH = 500;
export const MAX_RESPONSE_AUTHOR_LENGTH = 24;

export type EpisodeResponseInput = {
  meetupId: number;
  episodeNumber: number;
  content: string;
  author: string;
};

export type EpisodeResponseValidation =
  { ok: true; value: EpisodeResponseInput } | { ok: false; error: string };

export const validateEpisodeResponseInput = (
  data: Record<string, unknown>,
  requireConsent = false
): EpisodeResponseValidation => {
  const meetupId = Number(data.meetup_id);
  const episodeNumber = Number(data.episode_number);

  if (
    !Number.isInteger(meetupId) ||
    meetupId <= 0 ||
    !Number.isInteger(episodeNumber) ||
    episodeNumber <= 0
  ) {
    return { ok: false, error: '缺少有效的活动或期数' };
  }

  if (requireConsent && data.publish_consent !== true) {
    return { ok: false, error: '请确认愿意将内容公开到本期回应墙' };
  }

  const content = String(data.content || '').trim();
  const author = String(data.author || '').trim() || '匿名';

  if (
    requireConsent &&
    (!content || Array.from(content).length > MAX_RESPONSE_CONTENT_LENGTH)
  ) {
    return {
      ok: false,
      error: `回应需为 1-${MAX_RESPONSE_CONTENT_LENGTH} 个字符`,
    };
  }

  if (
    requireConsent &&
    Array.from(author).length > MAX_RESPONSE_AUTHOR_LENGTH
  ) {
    return {
      ok: false,
      error: `署名不能超过 ${MAX_RESPONSE_AUTHOR_LENGTH} 个字符`,
    };
  }

  return {
    ok: true,
    value: { meetupId, episodeNumber, content, author },
  };
};
