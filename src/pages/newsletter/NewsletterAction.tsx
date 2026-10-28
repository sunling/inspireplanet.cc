import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import NewsletterSignup from '../../components/NewsletterSignup';
import { newsletterSubscriptionsApi } from '../../netlify/services/newsletterSubscriptions';
import { isSubscriptionToken } from '../../utils/newsletterSubscription';

export default function NewsletterAction() {
  const location = useLocation();
  const action = location.pathname.endsWith('/unsubscribe')
    ? 'unsubscribe'
    : 'confirm';
  // No automatic mutation: email security scanners may open links without consent.
  const token = location.hash.slice(1);
  const valid = isSubscriptionToken(token);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    if (busy || message || !valid) return;
    setBusy(true);
    setError('');
    try {
      const result = await newsletterSubscriptionsApi.tokenAction(
        action,
        token
      );
      if (!result.success || !result.data)
        throw new Error(result.error || '操作失败');
      setMessage(result.data.message);
      window.history.replaceState(null, '', location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="overline">启发星球 · 每周分享</Typography>
          <Typography variant="h4" component="h1">
            {action === 'confirm' ? '确认订阅' : '退订每周分享'}
          </Typography>
          {message ? (
            <Alert severity="success" role="status">
              {message}
            </Alert>
          ) : (
            <>
              <Typography color="text.secondary">
                {action === 'confirm'
                  ? '点击下方按钮，确认你愿意接收每期会议精华、真实金句和播客链接。'
                  : '点击下方按钮后，将停止接收每周分享邮件，也会取消尚未完成的订阅申请。'}
              </Typography>
              {!valid && (
                <Alert severity="warning">
                  链接不完整，请从邮件中重新打开完整链接。
                </Alert>
              )}
              {error && <Alert severity="error">{error}</Alert>}
              <Button
                variant="contained"
                disabled={busy || !valid}
                onClick={submit}
              >
                {busy
                  ? '正在处理…'
                  : action === 'confirm'
                    ? '确认订阅每周分享'
                    : '确认退订／取消申请'}
              </Button>
            </>
          )}
          <Button component={RouterLink} to="/">
            回到启发星球
          </Button>
        </Stack>
      </Paper>
      {(error || !valid) && action === 'confirm' && !message && (
        <NewsletterSignup />
      )}
    </Container>
  );
}
