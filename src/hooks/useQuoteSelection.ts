import { RefObject, useEffect, useState } from 'react';

export interface QuoteSelection {
  text: string;
  speaker: string;
  label: string;
  path: string;
  anchor: { left: number; right: number; top: number; bottom: number };
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
    let selecting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let positionFrame = 0;
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
      const visibleRects = Array.from(range.getClientRects()).filter(
        (rect) =>
          rect.height > 0 && rect.bottom > 64 && rect.top < window.innerHeight
      );
      const anchor = visibleRects[visibleRects.length - 1];
      if (!anchor) {
        setQuote(null);
        return;
      }
      setQuote({
        anchor: {
          left: anchor.left,
          right: anchor.right,
          top: anchor.top,
          bottom: anchor.bottom,
        },
        text: selection.toString().trim(),
        speaker: getSourceSpeaker(
          source.getAttribute('data-response-speaker') || ''
        ),
        label: source.getAttribute('data-response-label') || '',
        path: source.getAttribute('data-response-path') || '',
      });
    };
    const scheduleUpdate = () => {
      clearTimeout(timer);
      if (!selecting) timer = setTimeout(updateSelection, 80);
    };
    const refreshPosition = () => {
      cancelAnimationFrame(positionFrame);
      if (!selecting) positionFrame = requestAnimationFrame(updateSelection);
    };
    const startSelection = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        !container.current?.contains(event.target as Node)
      )
        return;
      selecting = true;
      cancelAnimationFrame(positionFrame);
      clearTimeout(timer);
      setQuote(null);
    };
    const finishSelection = () => {
      selecting = false;
      scheduleUpdate();
    };
    setQuote(null);
    document.addEventListener('selectionchange', scheduleUpdate);
    document.addEventListener('pointerdown', startSelection);
    window.addEventListener('pointerup', finishSelection);
    window.addEventListener('pointercancel', finishSelection);
    window.addEventListener('scroll', refreshPosition, true);
    window.addEventListener('resize', refreshPosition);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(positionFrame);
      document.removeEventListener('selectionchange', scheduleUpdate);
      document.removeEventListener('pointerdown', startSelection);
      window.removeEventListener('pointerup', finishSelection);
      window.removeEventListener('pointercancel', finishSelection);
      window.removeEventListener('scroll', refreshPosition, true);
      window.removeEventListener('resize', refreshPosition);
    };
  }, [container, resetKey]);
  return quote;
}
