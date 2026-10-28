import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { newsletterSubscriptionsApi } from '../netlify/services/newsletterSubscriptions';
import { normalizeSubscriptionEmail } from '../utils/newsletterSubscription';

export default function NewsletterSignup({
  source = '/',
}: {
  source?: string;
}) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');
    const normalized = normalizeSubscriptionEmail(email);
    if (!normalized) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (!consent) {
      setError('请先同意接收每周分享邮件');
      return;
    }
    setBusy(true);
    try {
      const result = await newsletterSubscriptionsApi.subscribe(
        normalized,
        consent,
        source,
        website
      );
      if (!result.success || !result.data)
        throw new Error(result.error || '暂时无法订阅');
      setMessage(result.data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : '暂时无法订阅，请稍后重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Box
      component="section"
      aria-label="订阅每周分享"
      sx={{
        my: 4,
        p: { xs: 2.5, sm: 4 },
        borderRadius: 3,
        bgcolor: '#f3f6f1',
        border: '1px solid #dce6d8',
      }}
    >
      <Typography component="h2" variant="h5" fontWeight={650} gutterBottom>
        把每周的启发，带进收件箱
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        一封邮件回顾本期精华、三条真实金句，以及已发布的小宇宙播客。无需注册账号，随时可以退订。
      </Typography>
      <Box component="form" onSubmit={submit}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="邮箱地址"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            fullWidth
            inputProps={{ maxLength: 254 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            sx={{ minWidth: 150, whiteSpace: 'nowrap' }}
          >
            {busy ? '正在提交…' : '订阅每周分享'}
          </Button>
        </Stack>
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: '-10000px',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
        >
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              我同意接收启发星球每周分享，邮箱仅用于订阅相关邮件。
            </Typography>
          }
        />
        <Typography variant="caption" component="p" color="text.secondary">
          提交后请查收确认邮件，点击确认才会加入有效订阅名单。
        </Typography>
        {message && (
          <Alert severity="success" sx={{ mt: 2 }} role="status">
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
