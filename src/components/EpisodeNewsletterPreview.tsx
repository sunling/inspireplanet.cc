import NewsletterBroadcast from './NewsletterBroadcast';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  createDefaultNewsletterDocument,
  renderNewsletterDocument,
  validateNewsletterSubject,
  NewsletterDocument,
} from '../utils/newsletterDocument';
import { newsletterPreviewApi } from '../netlify/services/newsletterPreview';
import NewsletterEditor from './NewsletterEditor';

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
  const [generated] = useState(() =>
    createDefaultNewsletterDocument(year, episode, summary, cards, publication)
  );
  const [subject, setSubject] = useState(generated.subject);
  const [document, setDocument] = useState<NewsletterDocument>(
    generated.document
  );
  const [resetToken, setResetToken] = useState(0);
  const [format, setFormat] = useState<'edit' | 'html' | 'text'>('edit');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const [sendResult, setSendResult] = useState<{
    fingerprint: string;
    recipient: string;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const preview = useMemo(() => {
    try {
      return { ...renderNewsletterDocument(document), error: null };
    } catch (error) {
      return {
        html: '',
        text: '',
        error: error instanceof Error ? error.message : '邮件格式不正确',
      };
    }
  }, [document]);
  const fingerprint = JSON.stringify([subject, document]);
  const sentCurrent = sendResult?.fingerprint === fingerprint;
  const onChange = (next: NewsletterDocument) => {
    setDocument(next);
    setCopied(false);
    setSendError(null);
  };
  const sendTest = async () => {
    if (sendingRef.current || sentCurrent) return;
    if (!validateNewsletterSubject(subject) || preview.error) {
      setSendError(
        preview.error || '请填写不超过 200 字符且不含换行的邮件主题'
      );
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
        requestId: requestRef.current.id,
        subject,
        document,
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
      await navigator.clipboard.writeText(`${subject}\n\n${preview.text}`);
      setCopied(true);
    } catch {
      setSendError('复制失败，请切换到纯文字后手动选择复制');
    }
  };
  const reset = () => {
    setSubject(generated.subject);
    setDocument(generated.document);
    setResetToken((value) => value + 1);
    setCopied(false);
    setSendError(null);
    setFormat('edit');
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
        编辑整封邮件 · {year} EP{episode}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            下面是可编辑的完整邮件。导语、金句、署名、链接和图片位置都可以修改。试发使用你最后编辑的内容；修改仅保留在本次预览，不更新正式详情页。
          </Alert>
          <TextField
            label="邮件主题（可编辑）"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setCopied(false);
              setSendError(null);
            }}
            inputProps={{ maxLength: 200 }}
          />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Button
              variant={format === 'edit' ? 'contained' : 'outlined'}
              onClick={() => setFormat('edit')}
            >
              编辑正文
            </Button>
            <Button
              variant={format === 'html' ? 'contained' : 'outlined'}
              onClick={() => setFormat('html')}
            >
              邮件效果
            </Button>
            <Button
              variant={format === 'text' ? 'contained' : 'outlined'}
              onClick={() => setFormat('text')}
            >
              纯文字
            </Button>
            <Button onClick={reset}>恢复自动生成内容</Button>
          </Stack>
          <Box sx={{ display: format === 'edit' ? 'block' : 'none' }}>
            <NewsletterEditor
              initialContent={generated.document}
              resetToken={resetToken}
              onChange={onChange}
            />
          </Box>
          {preview.error && <Alert severity="warning">{preview.error}</Alert>}
          {format === 'html' && !preview.error && (
            <Box
              component="iframe"
              title="最终邮件效果预览"
              srcDoc={preview.html}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              sx={{
                width: '100%',
                height: { xs: 560, sm: 680 },
                border: '1px solid #eadfd4',
                borderRadius: 2,
              }}
            />
          )}
          {format === 'text' && (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                backgroundColor: '#fffdf9',
                border: '1px solid #eadfd4',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontFamily: 'inherit',
                lineHeight: 1.9,
              }}
            >
              {preview.text}
            </Box>
          )}
          {!/xiaoyuzhoufm\.com\/episode\//.test(preview.text) && (
            <Typography variant="caption" color="text.secondary">
              本期尚未附播客。可选中文字后点击「编辑链接／播客」补入，也可以先试发当前版本。
            </Typography>
          )}
          <Box component="details">
            <Typography
              component="summary"
              variant="body2"
              sx={{ cursor: 'pointer' }}
            >
              查看原始金句，方便编辑时核对
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {cards.map((card) => (
                <Typography key={card.id} variant="body2">
                  {card.quote} —— {card.name}
                </Typography>
              ))}
            </Stack>
          </Box>
          {sendResult && sentCurrent && (
            <Alert severity="success">
              邮件服务已接受测试邮件，将发送到 {sendResult.recipient}
              。没有发送给订阅者。
            </Alert>
          )}
          {sendError && <Alert severity="error">{sendError}</Alert>}
          <NewsletterBroadcast
            draft={{ year, episode, subject, document }}
            disabled={
              sending ||
              Boolean(preview.error) ||
              !validateNewsletterSubject(subject)
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={copy}>{copied ? '已复制' : '复制纯文字'}</Button>
        <Button
          variant="contained"
          disabled={sending || sentCurrent}
          onClick={sendTest}
        >
          {sending
            ? '正在发送…'
            : sentCurrent
              ? '已发送本版测试邮件'
              : '发送测试邮件给自己'}
        </Button>
        <Button disabled={sending} onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
