import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type {
  EpisodeSummary,
  WeeklyCard,
} from '../netlify/services/weeklyCards';
import type { EpisodePublication } from '../utils/episodePublication';
import { buildEpisodeNewsletterPreview } from '../utils/episodeNewsletter';

interface Props {
  year: number;
  episode: number;
  summary: EpisodeSummary | null;
  cards: WeeklyCard[];
  publication: EpisodePublication | null;
  onClose: () => void;
}

export default function EpisodeNewsletterPreview({
  year,
  episode,
  summary,
  cards,
  publication,
  onClose,
}: Props) {
  const [intro, setIntro] = useState(
    publication?.newsletter?.intro ?? summary?.overview ?? ''
  );
  const [quoteIndex, setQuoteIndex] = useState(
    publication?.newsletter?.featuredQuoteIndex ?? 0
  );
  const [format, setFormat] = useState<'html' | 'text'>('html');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const preview = useMemo(
    () =>
      buildEpisodeNewsletterPreview({
        year,
        episode,
        summary,
        cards,
        publication,
        intro,
        featuredQuoteIndex: quoteIndex,
      }),
    [year, episode, summary, cards, publication, intro, quoteIndex]
  );
  const validIndex = Boolean(cards[quoteIndex]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(preview.text);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="newsletter-preview-title"
    >
      <DialogTitle id="newsletter-preview-title">
        本期邮件预览 · {year} EP{episode}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            这里可预览邮件。修改只用于本次预览，关闭后不保存；订阅与发送功能将在后续接入。
          </Alert>
          {preview.missing.length > 0 && (
            <Alert severity="warning">
              待补齐：{preview.missing.join('；')}。
            </Alert>
          )}
          <Typography variant="body2">主题：{preview.subject}</Typography>
          <TextField
            label="邮件导语"
            multiline
            minRows={3}
            value={intro}
            inputProps={{ maxLength: 1000 }}
            onChange={(event) => {
              setIntro(event.target.value);
              setCopied(false);
            }}
            helperText="默认复用本期总结的导语，无需重新写一份。"
          />
          <TextField
            select
            label="精选金句"
            value={validIndex ? quoteIndex : ''}
            disabled={!cards.length}
            onChange={(event) => {
              setQuoteIndex(Number(event.target.value));
              setCopied(false);
            }}
            helperText={
              cards.length
                ? '保留原话与署名；读者可以继续查看全部卡片。'
                : '本期还没有金句卡片。'
            }
          >
            {cards.map((card, index) => (
              <MenuItem key={card.id} value={index}>
                {card.name} · {card.title || card.quote.slice(0, 30)}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <Button
              variant={format === 'html' ? 'contained' : 'outlined'}
              onClick={() => setFormat('html')}
            >
              邮件样式
            </Button>
            <Button
              variant={format === 'text' ? 'contained' : 'outlined'}
              onClick={() => setFormat('text')}
            >
              纯文字
            </Button>
          </Stack>
          {format === 'html' ? (
            <Box
              component="iframe"
              title="本期邮件正文预览"
              srcDoc={preview.html}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              sx={{
                width: '100%',
                height: { xs: 560, sm: 680 },
                border: '1px solid #eadfd4',
                borderRadius: 2,
                backgroundColor: '#f6f2ed',
              }}
            />
          ) : (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                backgroundColor: '#fffdf9',
                border: '1px solid #eadfd4',
                borderRadius: 2,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontFamily: 'inherit',
                lineHeight: 1.9,
              }}
            >
              {preview.text}
            </Box>
          )}
          {copyError && (
            <Alert severity="warning">
              复制失败，可切换到纯文字后手动选择复制。
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={copy}>{copied ? '已复制' : '复制纯文字'}</Button>
        <Button onClick={onClose}>关闭预览</Button>
      </DialogActions>
    </Dialog>
  );
}
