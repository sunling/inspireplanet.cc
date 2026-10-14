import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import { QuoteSelection } from '@/hooks/useQuoteSelection';
import styles from './quoteResponseBar.module.css';

export default function QuoteResponseBar({
  quote,
  onRespond,
}: {
  quote: QuoteSelection | null;
  onRespond: (quote: QuoteSelection) => void;
}) {
  if (!quote?.text) return null;
  return (
    <aside className={styles.bar} aria-label="回应选中文字">
      <span>
        {quote.speaker
          ? `来自 ${quote.speaker} 的分享 · `
          : quote.label
            ? `${quote.label} · `
            : ''}
        {quote.text}
      </span>
      <button
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => onRespond(quote)}
      >
        <ChatBubbleOutline fontSize="small" />
        回应这段文字
      </button>
    </aside>
  );
}
