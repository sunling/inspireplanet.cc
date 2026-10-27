/** Email images must use a public GitHub image, never an authenticated file page. */
export function normalizeNewsletterImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048)
    return null;
  if (/[\s\x00-\x1f]/.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.searchParams.has('token')
    )
      return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
      if (parts.length < 5 || parts[2] !== 'blob') return null;
      parts.splice(2, 1);
    } else if (url.hostname !== 'raw.githubusercontent.com' || parts.length < 4)
      return null;
    if (!/\.(png|jpe?g|gif|webp)$/i.test(parts[parts.length - 1] || ''))
      return null;
    return `https://raw.githubusercontent.com/${parts.join('/')}`;
  } catch {
    return null;
  }
}
