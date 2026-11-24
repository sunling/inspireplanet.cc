import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { newsletterSubscriptionsApi } from '../../netlify/services/newsletterSubscriptions';
import type {
  NewsletterSubscriber,
  SubscriberList,
  SubscriptionStatus,
} from '../../utils/newsletterSubscription';
const labels: Record<SubscriptionStatus, string> = {
  pending: '待确认',
  subscribed: '已订阅',
  unsubscribed: '已退订',
};
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN') : '—';
export default function NewsletterAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [list, setList] = useState<SubscriberList | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<NewsletterSubscriber | null>(null);
  const [removing, setRemoving] = useState(false);
  const [reminder, setReminder] = useState<NewsletterSubscriber | 'all' | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const generation = useRef(0);
  const sendLock = useRef(false);
  async function sendReminders() {
    if (!reminder || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setError('');
    setNotice('');
    let sent = 0, skipped = 0, failed = 0;
    try {
      let targets: NewsletterSubscriber[] = [];
      if (reminder === 'all') {
        let p = 1;
        while (true) {
          const result = await newsletterSubscriptionsApi.list(p, 'pending', '');
          if (!result.success || !result.data)
            throw new Error(result.error || '待确认名单加载失败');
          targets.push(...result.data.subscribers);
          if (p * 25 >= result.data.total || !result.data.subscribers.length) break;
          p++;
        }
      } else targets = [reminder];
      targets = Array.from(new Map(targets.map(s => [s.id, s])).values());
      for (const [i, target] of targets.entries()) {
        setProgress(`正在处理 ${i + 1}/${targets.length}…`);
        try {
          const result = await newsletterSubscriptionsApi.resendConfirmation(target.id);
          if (!result.success || !result.data) failed++;
          else if (result.data.outcome === 'sent') sent++;
          else skipped++;
        } catch { failed++; }
        if (i + 1 < targets.length) await new Promise(resolve => setTimeout(resolve, 650));
      }
      setNotice(`邮件服务已接受 ${sent} 封，跳过 ${skipped} 条（状态变化或 24 小时内已申请/发送），失败 ${failed} 条。接受不代表已送达。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setReminder(null);
      setSending(false);
      setProgress('');
      sendLock.current = false;
      setRefresh(v => v + 1);
    }
  }
  useEffect(() => {
    const id = ++generation.current;
    setBusy(true);
    setError('');
    newsletterSubscriptionsApi
      .list(page, status, filter)
      .then((result) => {
        if (id !== generation.current) return;
        if (!result.success || !result.data)
          throw new Error(result.error || '名单加载失败');
        setList(result.data);
      })
      .catch((err) => {
        if (id === generation.current)
          setError(err instanceof Error ? err.message : '名单加载失败');
      })
      .finally(() => {
        if (id === generation.current) setBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [page, status, filter, refresh]);
  async function remove() {
    if (!selected || removing) return;
    setRemoving(true);
    setError('');
    try {
      const result = await newsletterSubscriptionsApi.remove(selected.id);
      if (!result.success) throw new Error(result.error || '移除失败');
      setSelected(null);
      setNotice('已移出有效订阅名单。');
      setRefresh((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失败');
    } finally {
      setRemoving(false);
    }
  }
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        邮件订阅
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        维护每周分享的订阅名单。只有确认过邮箱的「已订阅」记录可以接收正式邮件。
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
        {(Object.keys(labels) as SubscriptionStatus[]).map((s) => (
          <Chip
            key={s}
            label={`${labels[s]} ${list?.counts[s] ?? '—'}`}
            color={s === 'subscribed' ? 'success' : 'default'}
            variant="outlined"
          />
        ))}
      </Stack>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter(search.trim());
          setPage(1);
        }}
        sx={{ mb: 2 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="搜索邮箱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputProps={{ maxLength: 254 }}
          />
          <TextField
            select
            size="small"
            label="订阅状态"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SubscriptionStatus | 'all');
              setPage(1);
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">全部状态</MenuItem>
            {Object.entries(labels).map(([s, label]) => (
              <MenuItem key={s} value={s}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="outlined">
            搜索
          </Button>
          <Button onClick={() => setRefresh((v) => v + 1)}>刷新名单</Button>
          <Button variant="contained" disabled={busy || sending || removing || !list?.counts.pending} onClick={() => setReminder('all')}>
            批量重发确认邮件（{list?.counts.pending ?? 0}）
          </Button>
        </Stack>
      </Box>
      {notice && (
        <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {busy ? (
        <Typography role="status">正在加载订阅名单…</Typography>
      ) : (
        !error && (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="邮件订阅名单">
                <TableHead>
                  <TableRow>
                    {[
                      '邮箱',
                      '状态',
                      '申请时间',
                      '最近确认邮件申请时间',
                      '确认时间',
                      '退订时间',
                      '操作',
                    ].map((t) => (
                      <TableCell key={t} sx={{ whiteSpace: 'nowrap' }}>
                        {t}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list?.subscribers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell
                        sx={{ overflowWrap: 'anywhere', minWidth: 180 }}
                      >
                        {s.email}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {labels[s.status]}
                      </TableCell>
                      <TableCell>{date(s.created_at)}</TableCell>
                      <TableCell>{date(s.requested_at ?? null)}</TableCell>
                      <TableCell>{date(s.confirmed_at)}</TableCell>
                      <TableCell>{date(s.unsubscribed_at)}</TableCell>
                      <TableCell>
                        {s.status === 'pending' && (
                          <Button size="small" disabled={sending || removing || (!!s.requested_at && Date.now() - new Date(s.requested_at).getTime() < 86400000)} onClick={() => setReminder(s)}>
                            重发确认邮件
                          </Button>
                        )}
                        <Button
                          size="small"
                          color="error"
                          disabled={sending || s.status === 'unsubscribed'}
                          onClick={() => setSelected(s)}
                        >
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!list?.subscribers.length && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        暂时没有符合条件的订阅记录。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <Typography variant="body2">
                第 {page} 页 · 共 {list?.total || 0} 条
              </Typography>
              <Button
                disabled={page * 25 >= (list?.total || 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </Stack>
          </>
        )
      )}
      <Dialog open={!!reminder} onClose={() => !sending && setReminder(null)}>
        <DialogTitle>重新发送确认邮件？</DialogTitle>
        <DialogContent>
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {reminder === 'all' ? `全部待确认用户（当前 ${list?.counts.pending ?? 0} 人，不受搜索或分页限制）` : reminder?.email}
          </Typography>
          <Typography color="text.secondary">
            仅向待确认用户发送，跳过 24 小时内已申请或发送的记录。新确认链接有效期 7 天，旧链接将失效。不会自动确认订阅。
          </Typography>
          {sending && <Typography role="status">{progress}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button disabled={sending} onClick={() => setReminder(null)}>取消</Button>
          <Button disabled={sending} onClick={sendReminders}>{sending ? '正在发送…' : '确认发送'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!selected} onClose={() => !removing && setSelected(null)}>
        <DialogTitle>移出订阅名单？</DialogTitle>
        <DialogContent>
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {selected?.email}
          </Typography>
          <Typography color="text.secondary">
            移除后不会再接收每周分享，未完成的确认链接也会失效。对方仍可自行重新申请订阅。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={removing} onClick={() => setSelected(null)}>
            取消
          </Button>
          <Button color="error" disabled={removing} onClick={remove}>
            {removing ? '正在移除…' : '确认移除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
