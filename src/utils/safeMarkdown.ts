import DOMPurify from 'dompurify';
import { marked } from 'marked';

/** Sanitize the final HTML, never the Markdown input. Do not transform it again. */
export function renderSafeMarkdown(content: string | null | undefined): string {
  if (!content) return '';
  try {
    const html = marked.parse(content, { async: false, breaks: true });
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    // Never return raw input/HTML to a dangerouslySetInnerHTML caller on failure.
    console.error('Unable to render card Markdown safely');
    return '';
  }
}
