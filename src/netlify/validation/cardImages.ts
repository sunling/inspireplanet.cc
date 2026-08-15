export function isPersistableCardImageUrl(value?: string | null): boolean {
  if (!value) return true;

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
