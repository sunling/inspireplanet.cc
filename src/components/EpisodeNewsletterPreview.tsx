import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type {
  EpisodeSummary,
  WeeklyCard,
} from '../netlify/services/weeklyCards';
import type { EpisodePublication } from '../utils/episodePublication';
import {
  buildEpisodeNewsletterPreview,
  selectDefaultQuoteIndices,
} from '../utils/episodeNewsletter';
import { isXiaoyuzhouEpisodeUrl } from '../utils/episodePublication';
import { newsletterPreviewApi } from '../netlify/services/newsletterPreview';

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
  const [quoteIndices, setQuoteIndices] = useState<number[]>(
    publication?.newsletter?.featuredQuoteIndices ??
      (publication?.newsletter?.featuredQuoteIndex !== undefined
        ? [publication.newsletter.featuredQuoteIndex]
        : selectDefaultQuoteIndices(cards))
  );
  const [podcastUrl, setPodcastUrl] = useState(publication?.podcast?.url ?? '');
  const [podcastTitle, setPodcastTitle] = useState(
    publication?.podcast?.title ?? `启发星球 EP${episode}`
  );
  const [skipPodcast, setSkipPodcast] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const [sendResult, setSendResult] = useState<{
    fingerprint: string;
    recipient: string;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const validPodcast = isXiaoyuzhouEpisodeUrl(podcastUrl.trim());
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
        publication: {
          ...publication,
          podcast:
            !skipPodcast && validPodcast && podcastTitle.trim()
              ? {
                  ...(publication?.podcast?.url === podcastUrl.trim()
                    ? publication.podcast
                    : {}),
                  url: podcastUrl.trim(),
                  title: podcastTitle.trim(),
                }
              : undefined,
        },
        intro,
        featuredQuoteIndices: quoteIndices,
      }),
    [
      year,
      episode,
      summary,
      cards,
      publication,
      intro,
      quoteIndices,
      podcastUrl,
      podcastTitle,
      validPodcast,
      skipPodcast,
    ]
  );
  const missing = preview.missing.filter(
    (message) => !(skipPodcast && message.includes('小宇宙'))
  );
  const fingerprint = JSON.stringify([
    intro,
    quoteIndices,
    podcastUrl.trim(),
    podcastTitle.trim(),
    skipPodcast,
  ]);
  const sentCurrent = sendResult?.fingerprint === fingerprint;

  const sendTest = async () => {
    if (sendingRef.current || missing.length || sentCurrent) return;
    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    try {
      if (requestRef.current?.fingerprint !== fingerprint)
        requestRef.current = { fingerprint, id: crypto.randomUUID() };
      const result = await newsletterPreviewApi.sendTest({
        year,
        episode,
        intro,
        quotes: quoteIndices.map((index) => ({
          index,
          quote: cards[index].quote,
          name: cards[index].name,
        })),
        podcastUrl: podcastUrl.trim(),
        podcastTitle: podcastTitle.trim(),
        skipPodcast,
        expectedTitle: summary?.title || '',
        requestId: requestRef.current.id,
      });
      if (!result.success || !result.data)
        throw new Error(result.error || '测试邮件发送失败');
      setSendResult({ fingerprint, recipient: result.data.recipient });
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : '测试邮件发送失败，请稍后重试'
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

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
      onClose={sending ? undefined : onClose}
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
            默认选 3
            条不同分享者的原话，保留署名。补入小宇宙链接后，可以发送测试邮件到当前账号的已验证邮箱。修改只用于本次预览，关闭后不保存。
          </Alert>
          {missing.length > 0 && (
            <Alert severity="warning">待补齐：{missing.join('；')}。</Alert>
          )}
          <Typography variant="body2">主题：{preview.subject}</Typography>
          <TextField
            label="邮件导语"
            disabled={sending}
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
          <Box
            component="fieldset"
            disabled={sending}
            sx={{
              m: 0,
              p: 2,
              border: '1px solid #ddd',
              borderRadius: 1,
              minWidth: 0,
            }}
          >
            <Typography component="legend" variant="body2">
              精选原话（已选 {quoteIndices.length}/3）
            </Typography>
            <Typography variant="caption" color="text.secondary">
              直接选自本期金句，不能在这里改写。发送前请按转写核对原话与署名；尽量保留
              3 条。
            </Typography>
            <Stack sx={{ maxHeight: 300, overflowY: 'auto', mt: 1 }}>
              {cards.map((card, index) => (
                <FormControlLabel
                  key={card.id}
                  sx={{ alignItems: 'flex-start', mx: 0, py: 0.5 }}
                  control={
                    <Checkbox
                      checked={quoteIndices.includes(index)}
                      disabled={
                        !quoteIndices.includes(index) &&
                        quoteIndices.length >= 3
                      }
                      onChange={() => {
                        setQuoteIndices((current) =>
                          current.includes(index)
                            ? current.filter((item) => item !== index)
                            : [...current, index]
                        );
                        setCopied(false);
                      }}
                    />
                  }
                  label={
                    <Box sx={{ pt: 0.8 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {card.quote}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        —— {card.name}
                      </Typography>
                    </Box>
                  }
                />
              ))}
              {!cards.length && (
                <Typography variant="body2">本期还没有金句卡片。</Typography>
              )}
            </Stack>
          </Box>
          <TextField
            label="本期小宇宙单集链接"
            value={podcastUrl}
            disabled={sending || skipPodcast}
            error={!skipPodcast && Boolean(podcastUrl.trim()) && !validPodcast}
            onChange={(event) => {
              setPodcastUrl(event.target.value);
              setCopied(false);
            }}
            inputProps={{ maxLength: 2048 }}
            helperText="粘贴已发布的单集链接，邮件预览会同步更新。这里只用于本次预览与测试发送。"
          />
          <TextField
            label="播客标题"
            value={podcastTitle}
            disabled={sending || skipPodcast}
            onChange={(event) => {
              setPodcastTitle(event.target.value);
              setCopied(false);
            }}
            inputProps={{ maxLength: 200 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={skipPodcast}
                disabled={sending}
                onChange={(event) => {
                  setSkipPodcast(event.target.checked);
                  setCopied(false);
                }}
              />
            }
            label="本期暂不附播客"
          />
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
          {sendResult && sentCurrent && (
            <Alert severity="success">
              邮件服务已接受测试邮件，将发送到 {sendResult.recipient}
              。如未收到，请检查垃圾邮件；没有发送给订阅者。
            </Alert>
          )}
          {sendError && <Alert severity="error">{sendError}</Alert>}
          {copyError && (
            <Alert severity="warning">
              复制失败，可切换到纯文字后手动选择复制。
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={copy}>{copied ? '已复制' : '复制纯文字'}</Button>
        <Button
          variant="contained"
          disabled={sending || missing.length > 0 || sentCurrent}
          onClick={sendTest}
        >
          {sending
            ? '正在发送…'
            : sentCurrent
              ? '已发送测试邮件'
              : '发送测试邮件给自己'}
        </Button>
        <Button disabled={sending} onClick={onClose}>
          关闭预览
        </Button>
      </DialogActions>
    </Dialog>
  );
}
