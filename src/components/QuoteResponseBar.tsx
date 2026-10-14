import { RefObject, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import useQuoteSelection, { QuoteSelection } from '@/hooks/useQuoteSelection';
import styles from './quoteResponseBar.module.css';

export default function QuoteResponseBar({
  container,
  resetKey,
  requirePath = false,
  onRespond,
}: {
  container: RefObject<HTMLElement | null>;
  resetKey: string;
  requirePath?: boolean;
  onRespond: (quote: QuoteSelection) => void;
}) {
  // Selection changes must not rerender the page's selectable HTML.
  const quote = useQuoteSelection(container, resetKey);
  const barRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const visible = Boolean(quote?.text && (!requirePath || quote.path));

  useLayoutEffect(() => {
    if (!visible || !quote || !barRef.current) return;
    const { width, height } = barRef.current.getBoundingClientRect();
    const padding = 8;
    const below = quote.anchor.bottom + padding;
    const top =
      below + height <= window.innerHeight - padding
        ? below
        : quote.anchor.top - height - padding;
    setPosition({
      left: Math.max(
        padding,
        Math.min(quote.anchor.left, window.innerWidth - width - padding)
      ),
      top: Math.max(
        64 + padding,
        Math.min(top, window.innerHeight - height - padding)
      ),
    });
  }, [quote, visible]);

  if (!visible || !quote) return null;
  return createPortal(
    <aside
      ref={barRef}
      className={styles.bar}
      style={position}
      aria-label="回应选中文字"
      data-quote-response-toolbar
    >
      {(quote.speaker || quote.label) && (
        <span>
          {quote.speaker ? `来自 ${quote.speaker} 的分享` : quote.label}
        </span>
      )}
      <button
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => onRespond(quote)}
      >
        <ChatBubbleOutline fontSize="small" />
        回应这段文字
      </button>
    </aside>,
    document.body
  );
}
