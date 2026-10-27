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
  getDefaultNewsletterIntro,
} from '../utils/episodeNewsletter';
import { isXiaoyuzhouEpisodeUrl } from '../utils/episodePublication';
import { normalizeNewsletterImageUrl } from '../utils/newsletterImage';
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
    getDefaultNewsletterIntro(summary, publication)
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
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('启发星球本期分享');
  const effectiveSkipPodcast = skipPodcast || !podcastUrl.trim();
  const imageSource = normalizeNewsletterImageUrl(imageUrl);
  const podcastInputRef = useRef<HTMLInputElement>(null);
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
            !effectiveSkipPodcast && validPodcast && podcastTitle.trim()
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
        image: imageUrl.trim() ? { url: imageUrl, alt: imageAlt } : undefined,
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
      effectiveSkipPodcast,
      imageUrl,
      imageAlt,
    ]
  );
  const missing = preview.missing.filter(
    (message) => !(effectiveSkipPodcast && message.includes('小宇宙'))
  );
  const fingerprint = JSON.stringify([
    intro,
    quoteIndices,
    podcastUrl.trim(),
    podcastTitle.trim(),
    effectiveSkipPodcast,
    imageUrl,
    imageAlt,
  ]);
  const sentCurrent = sendResult?.fingerprint === fingerprint;

  const sendTest = async () => {
    if (sendingRef.current || sentCurrent) return;
    if (missing.length) {
      setSendError(missing.join('；'));
      if (!effectiveSkipPodcast && !validPodcast)
        podcastInputRef.current?.focus();
      return;
    }
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
        skipPodcast: effectiveSkipPodcast,
        imageUrl: imageUrl.trim(),
        imageAlt,
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
            条不同分享者的原话，保留署名。可发送测试邮件到当前账号的已验证邮箱。未填播客链接时，先发送不含播客的版本。修改只用于本次预览，关闭后不保存。
          </Alert>
          {missing.length > 0 && (
            <Alert severity="warning">待补齐：{missing.join('；')}。</Alert>
          )}
          <Typography variant="h6">编辑邮件内容</Typography>
          <Typography variant="body2">主题：{preview.subject}</Typography>
          <TextField
            label="邮件导语：本期精华与 1–2 个问题"
            multiline
            minRows={3}
            value={intro}
            inputProps={{ maxLength: 1000 }}
            onChange={(event) => {
              setIntro(event.target.value);
              setCopied(false);
            }}
            helperText="先用一小段概括本期最有意思的交流，再自然带出 1–2 个真实讨论的问题；可直接修改。"
          />
          <Box
            component="fieldset"
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
            label="本期小宇宙单集链接（可编辑）"
            inputRef={podcastInputRef}
            value={podcastUrl}
            error={
              !effectiveSkipPodcast &&
              Boolean(podcastUrl.trim()) &&
              !validPodcast
            }
            onChange={(event) => {
              setPodcastUrl(event.target.value);
              if (event.target.value.trim()) setSkipPodcast(false);
              setCopied(false);
            }}
            inputProps={{ maxLength: 2048 }}
            helperText="默认带入本期播客，可直接修改或粘贴新链接；填写后自动取消“不附播客”。修改用于本次预览与测试发送。"
          />
          <TextField
            label="播客标题"
            value={podcastTitle}
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
                onChange={(event) => {
                  setSkipPodcast(event.target.checked);
                  setCopied(false);
                }}
              />
            }
            label="本期暂不附播客"
          />
          {effectiveSkipPodcast && (
            <Alert severity="info">
              本次测试邮件不包含播客。可先试发，也可在上方输入链接后加入。
            </Alert>
          )}
          <TextField
            label="邮件配图（可选，GitHub 图片链接）"
            value={imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value);
              setCopied(false);
            }}
            error={Boolean(imageUrl.trim()) && !imageSource}
            inputProps={{ maxLength: 2048 }}
            helperText="可粘贴公开 GitHub 图库中的图片页面地址或 raw 直链，会自动转换为图片直链。私有仓库图片无法供收件人读取。"
          />
          {imageUrl.trim() && (
            <TextField
              label="图片说明"
              value={imageAlt}
              onChange={(event) => {
                setImageAlt(event.target.value);
                setCopied(false);
              }}
              inputProps={{ maxLength: 200 }}
              helperText="收件人屏蔽图片时显示这段说明。"
            />
          )}
          <Typography variant="h6">邮件效果预览（只读）</Typography>
          <Typography variant="body2" color="text.secondary">
            下方显示实际邮件效果；需要修改文字、播客或图片，请使用上方编辑框。
          </Typography>
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
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          onClick={() => {
            podcastInputRef.current?.focus();
            podcastInputRef.current?.scrollIntoView({
              block: 'center',
              behavior: 'smooth',
            });
          }}
        >
          修改播客链接
        </Button>
        <Button onClick={copy}>{copied ? '已复制' : '复制纯文字'}</Button>
        <Button
          variant="contained"
          disabled={sending || sentCurrent}
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
