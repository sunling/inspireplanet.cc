import StarterKit from '@tiptap/starter-kit';
import { WritingRichContent } from '../../netlify/types';

export const createRichTextExtensions = () => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
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
];

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
