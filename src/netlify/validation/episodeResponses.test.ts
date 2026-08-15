import { describe, expect, it } from 'vitest';

import {
  MAX_RESPONSE_CONTENT_LENGTH,
  validateEpisodeResponseInput,
} from './episodeResponses';

describe('validateEpisodeResponseInput', () => {
  it('normalizes a valid public response', () => {
    expect(
      validateEpisodeResponseInput(
        {
          meetup_id: '39',
          episode_number: '30',
          content: '  我想把这一句留下来。  ',
          author: '  星友  ',
          publish_consent: true,
        },
        true
      )
    ).toEqual({
      ok: true,
      value: {
        meetupId: 39,
        episodeNumber: 30,
        content: '我想把这一句留下来。',
        author: '星友',
      },
    });
  });

  it('requires explicit consent before publishing', () => {
    const result = validateEpisodeResponseInput(
      {
        meetup_id: 39,
        episode_number: 30,
        content: '一句回应',
      },
      true
    );

    expect(result.ok).toBe(false);
  });

  it('counts unicode characters instead of UTF-16 code units', () => {
    const result = validateEpisodeResponseInput(
      {
        meetup_id: 39,
        episode_number: 30,
        content: '🌱'.repeat(MAX_RESPONSE_CONTENT_LENGTH),
        publish_consent: true,
      },
      true
    );

    expect(result.ok).toBe(true);
  });

  it('rejects an overlong response', () => {
    const result = validateEpisodeResponseInput(
      {
        meetup_id: 39,
        episode_number: 30,
        content: '字'.repeat(MAX_RESPONSE_CONTENT_LENGTH + 1),
        publish_consent: true,
      },
      true
    );

    expect(result.ok).toBe(false);
  });
});
