// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { renderSafeMarkdown } from '../utils/safeMarkdown';

const fragment = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
};
afterEach(() => vi.restoreAllMocks());

const dangerousLinks = [
  '[audit link](javascript:alert%281%29)',
  '[audit link](JaVaScRiPt:alert%281%29)',
  '[audit link](javascript&#58;alert%281%29)',
  '[audit link](jav&#x61;script:alert%281%29)',
  '[audit link](vbscript:msgbox%281%29)',
  '[audit link](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
  '[audit link][ref]\n\n[ref]: javascript:alert%281%29',
  '<a href="java&#x09;script:alert(1)">audit link</a>',
  '<a href="java&#x0a;script:alert(1)">audit link</a>',
];

describe('final HTML sanitization for card Markdown', () => {
  it('reproduces the unsafe old ordering and removes the generated dangerous href', () => {
    const input = dangerousLinks[0];
    const old = marked.parse(DOMPurify.sanitize(input), { async: false });
    expect(fragment(old).querySelector('a')?.getAttribute('href')).toMatch(
      /^javascript:/
    );
    const fixed = fragment(renderSafeMarkdown(input));
    expect(fixed.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(fixed.textContent).toContain('audit link');
  });
  it.each(dangerousLinks)('removes executable links: %s', (input) => {
    const html = fragment(renderSafeMarkdown(input));
    expect(html.textContent).toContain('audit link');
    expect(html.querySelector('a')?.hasAttribute('href')).toBe(false);
  });
  it('removes raw HTML scripts, event handlers and mixed Markdown attacks', () => {
    const html = fragment(
      renderSafeMarkdown(
        '**Hello**\n\n<img src="https://example.test/photo.png" onerror="alert(1)">\n' +
          '<script>alert(1)</script><svg onload="alert(1)"></svg>' +
          '\n\n[audit link](javascript:alert%281%29)'
      )
    );
    expect(html.querySelector('strong')?.textContent).toBe('Hello');
    expect(html.querySelector('script,svg,iframe,object,embed')).toBeNull();
    expect(html.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(html.querySelector('a')?.hasAttribute('href')).toBe(false);
  });
  it('preserves normal formatting, line breaks, images and links', () => {
    const html = fragment(
      renderSafeMarkdown(
        '# Title\n\n**Bold** and *emphasis*\nnext line\n\n' +
          '- Item\n\n`code`\n\n' +
          '[web](https://example.test/path?q=1&x=2) [relative](/cards?id=1) ' +
          '[mail](mailto:hello@example.test)\n\n![photo](https://example.test/photo.png)'
      )
    );
    expect(html.querySelector('h1')?.textContent).toBe('Title');
    expect(html.querySelector('strong')?.textContent).toBe('Bold');
    expect(html.querySelector('em')?.textContent).toBe('emphasis');
    expect(html.querySelector('br')).not.toBeNull();
    expect(html.querySelector('li')?.textContent).toBe('Item');
    expect(html.querySelector('code')?.textContent).toBe('code');
    expect(
      [...html.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    ).toEqual([
      'https://example.test/path?q=1&x=2',
      '/cards?id=1',
      'mailto:hello@example.test',
    ]);
    expect(html.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/photo.png'
    );
  });
  it.each([undefined, null, ''])('handles empty input: %s', (input) => {
    expect(renderSafeMarkdown(input)).toBe('');
  });
  it('returns no injectable content if Markdown parsing fails', () => {
    vi.spyOn(marked, 'parse').mockImplementationOnce(() => {
      throw new Error('parser failure');
    });
    expect(renderSafeMarkdown(dangerousLinks[0])).toBe('');
  });
  it('returns no injectable content if final sanitization fails', () => {
    vi.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => {
      throw new Error('sanitizer failure');
    });
    expect(renderSafeMarkdown('<img src=x onerror=alert(1)>')).toBe('');
  });
});
