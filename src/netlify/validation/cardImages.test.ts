import { describe, expect, it } from 'vitest';
import { isPersistableCardImageUrl } from './cardImages';

describe('isPersistableCardImageUrl', () => {
  it('accepts an empty image or an HTTPS asset URL', () => {
    expect(isPersistableCardImageUrl('')).toBe(true);
    expect(
      isPersistableCardImageUrl(
        'https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/user_uploads/card/card.png'
      )
    ).toBe(true);
  });

  it('rejects base64 and non-HTTPS values', () => {
    expect(isPersistableCardImageUrl('data:image/png;base64,ZmFrZQ==')).toBe(
      false
    );
    expect(isPersistableCardImageUrl('http://example.com/card.png')).toBe(
      false
    );
    expect(isPersistableCardImageUrl('not-a-url')).toBe(false);
  });
});
