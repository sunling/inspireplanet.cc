import StarterKit from '@tiptap/starter-kit';
import { Mark, mergeAttributes } from '@tiptap/core';
import { marked } from 'marked';
import { WritingRichContent } from '../../netlify/types';

const safeCssColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return /^(#[\da-f]{3,8}|rgba?\([\d\s,.%]+\))$/i.test(value.trim())
    ? value.trim()
    : null;
};

const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => safeCssColor(element.style.color),
        renderHTML: ({ color }) => {
          const safeColor = safeCssColor(color);
          return safeColor ? { style: `color: ${safeColor}` } : {};
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="color"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

const TextHighlight = Mark.create({
  name: 'textHighlight',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => safeCssColor(element.style.backgroundColor),
        renderHTML: ({ color }) => {
          const safeColor = safeCssColor(color);
          return safeColor ? { style: `background-color: ${safeColor}` } : {};
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="background-color"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

export const createRichTextExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: null,
      },
    },
  }),
  TextColor,
  TextHighlight,
];

export function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)\s{0,3}(#{1,4}\s|[-*+]\s+|\d+[.)]\s+|>\s|```|(?:---|\*\*\*)\s*(?:\n|$))|\*\*[^*\n]+\*\*/m.test(
    text
  );
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;
}

export function plainTextToRichContent(text: string): WritingRichContent {
  const lines = text.split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  };
}
