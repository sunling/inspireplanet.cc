import { RefObject, useEffect, useState } from 'react';

export interface QuoteSelection {
  text: string;
  speaker: string;
  label: string;
  path: string;
}

const IGNORED_SPEAKERS = new Set(['现场分享', '星友分享', '匿名']);

export const getSourceSpeaker = (speaker = '') =>
  IGNORED_SPEAKERS.has(speaker.trim()) ? '' : speaker.trim();

const sourceForNode = (node: Node) =>
  (node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement
  )?.closest('[data-response-source]');

export default function useQuoteSelection(
  container: RefObject<HTMLElement | null>,
  resetKey: string
) {
  const [quote, setQuote] = useState<QuoteSelection | null>(null);
  useEffect(() => {
    const updateSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setQuote(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const source = sourceForNode(range.startContainer);
      // A selection must stay within one source, including nested discussions.
      if (
        !source ||
        !container.current?.contains(source) ||
        sourceForNode(range.endContainer) !== source ||
        range.cloneContents().querySelector('[data-response-source]')
      ) {
        setQuote(null);
        return;
      }
      setQuote({
        text: selection.toString().trim(),
        speaker: getSourceSpeaker(
          source.getAttribute('data-response-speaker') || ''
        ),
        label: source.getAttribute('data-response-label') || '',
        path: source.getAttribute('data-response-path') || '',
      });
    };
    setQuote(null);
    document.addEventListener('selectionchange', updateSelection);
    return () =>
      document.removeEventListener('selectionchange', updateSelection);
  }, [container, resetKey]);
  return quote;
}
