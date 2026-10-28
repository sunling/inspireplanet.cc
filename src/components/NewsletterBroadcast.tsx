import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import {
  newsletterCampaignApi,
  type CampaignDraft,
} from '../netlify/services/newsletterCampaign';
import type { NewsletterCampaignStatus } from '../utils/newsletterCampaign';

export default function NewsletterBroadcast({
  draft,
  disabled,
}: {
  draft: CampaignDraft;
  disabled: boolean;
}) {
  const [state, setState] = useState<NewsletterCampaignStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reviewVersion, setReviewVersion] = useState('');
  const [reviewBody, setReviewBody] = useState(false);
  const mounted = useRef(true);
  const running = useRef(false);
  const fingerprint = JSON.stringify(draft);
  useEffect(() => {
    mounted.current = true;
    newsletterCampaignApi
      .status(draft.year, draft.episode)
      .then((r) => {
        if (mounted.current) {
          if (r.success && r.data) setState(r.data);
          else setError(r.error || '无法读取发送记录');
        }
      })
      .catch(() => {
        if (mounted.current) setError('无法读取发送记录，请刷新');
      });
    return () => {
      mounted.current = false;
    };
  }, [draft.year, draft.episode]);
  async function refresh() {
    setError('');
    try {
      const r = await newsletterCampaignApi.status(draft.year, draft.episode);
      if (!r.success || !r.data) throw Error(r.error);
      setState(r.data);
    } catch {
      setError('无法读取发送记录，请稍后刷新');
    }
  }
  async function prepare() {
    if (running.current || disabled) return;
    running.current = true;
    setBusy(true);
    setError('');
    setChecked(false);
    try {
      const r = await newsletterCampaignApi.prepare(draft);
      if (!r.success || !r.data) throw Error(r.error || '准备失败');
      setState(r.data);
      setReviewing(true);
      setReviewVersion(fingerprint);
    } catch (e) {
      setError(e instanceof Error ? e.message : '准备失败');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function send(start: boolean) {
    if (
      running.current ||
      !state?.campaign ||
      (start && (!checked || reviewVersion !== fingerprint))
    )
      return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      if (start) {
        const r = await newsletterCampaignApi.start(
          draft.year,
          draft.episode,
          state.campaign.revision
        );
        if (!r.success || !r.data) throw Error(r.error || '无法开始发送');
        if (mounted.current) {
          setState(r.data);
          setReviewing(false);
        }
      }
      let first = true;
      do {
        const r = await newsletterCampaignApi.process(
          draft.year,
          draft.episode,
          !start && first
        );
        first = false;
        if (!r.success || !r.data) throw Error(r.error || '发送中断');
        if (!mounted.current) break;
        setState(r.data);
        if (r.data.counts.pending === 0) break;
      } while (mounted.current);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : '发送中断，请刷新进度');
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const c = state?.campaign;
  const started = c && c.status !== 'draft';
  const counts = state?.counts;
  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eadfd4' }}>
      <Stack spacing={1.5}>
        <Typography component="h3" variant="subtitle1" fontWeight={650}>
          发送给订阅者
        </Typography>
        {state && !state?.canSend && (
          <Alert severity="info">
            {state.sendUnavailableReason ||
              '正式发送暂不可用，请刷新发送进度查看状态。'}
          </Alert>
        )}
        {state?.canSend && !started && state.available === 0 && (
          <Alert severity="info">
            当前没有已确认订阅者，确认订阅后即可准备正式发送。
          </Alert>
        )}
        {!started && (
          <Typography variant="body2" color="text.secondary">
            当前有 {state?.available ?? '—'}{' '}
            位已确认订阅者。先核对最终邮件和收件人数，再确认正式发送。
          </Typography>
        )}
        {started && counts && (
          <>
            <Typography variant="body2">
              本期已锁定的主题：{c.subject}
            </Typography>
            <Typography variant="body2" role="status">
              共 {state?.total || 0} 位 · 邮件服务已接受 {counts.sent} · 待发{' '}
              {counts.pending} · 处理中 {counts.sending} · 失败 {counts.failed}{' '}
              · 已跳过 {counts.skipped} · 待核实 {counts.uncertain}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              此处记录邮件服务接受结果，收件箱是否送达需另行查看。已发送的不会重复发送；发送前已退订或重新确认的会跳过。
            </Typography>
            {c.status === 'completed' && (
              <Alert severity={counts.uncertain ? 'warning' : 'success'}>
                {counts.uncertain
                  ? '本轮处理结束，部分结果待核实，不会自动重发。'
                  : '本期发送处理完成。'}
              </Alert>
            )}
            {!!counts.uncertain && (
              <Alert severity="warning">
                部分请求已超过安全重试时间，或退订密钥发生变化。请在邮件服务后台核实；系统已停止自动重发。
              </Alert>
            )}
          </>
        )}
        {reviewing && c?.status === 'draft' && (
          <Box sx={{ p: 2, border: '1px solid #e6cfbc', borderRadius: 2 }}>
            <Stack spacing={1}>
              <Typography fontWeight={650}>核对本次正式邮件</Typography>
              <Typography variant="body2">主题：{c.subject}</Typography>
              <Typography variant="body2">
                将发送给 {state?.total || 0}{' '}
                位已确认订阅者，每位单独收信，附退订入口。
              </Typography>
              {reviewVersion !== fingerprint && (
                <Alert severity="warning">
                  编辑稿已有变化，请重新准备最终版本。
                </Alert>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    disabled={busy}
                  />
                }
                label="我已核对主题、正文及收件人数，确认发送这一版"
              />
              <Button
                variant="contained"
                color="warning"
                disabled={
                  busy ||
                  !checked ||
                  (state?.total || 0) === 0 ||
                  reviewVersion !== fingerprint ||
                  disabled
                }
                onClick={() => send(true)}
              >
                确认发送给 {state?.total || 0} 位订阅者
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  setReviewing(false);
                  setChecked(false);
                }}
              >
                取消，继续编辑
              </Button>
            </Stack>
          </Box>
        )}
        {c && (
          <>
            <Button size="small" onClick={() => setReviewBody((v) => !v)}>
              {reviewBody ? '收起已保存的邮件' : '查看已保存的正式邮件'}
            </Button>
            {reviewBody && (
              <Box
                component="iframe"
                title="已保存的正式邮件"
                srcDoc={c.body_html}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                sx={{ width: '100%', height: 420, border: '1px solid #eadfd4' }}
              />
            )}
          </>
        )}
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {!started && (
            <Button
              variant="outlined"
              disabled={
                busy || disabled || !state?.canSend || !state?.available
              }
              onClick={prepare}
            >
              {busy ? '正在准备…' : '准备正式发送'}
            </Button>
          )}
          {started && c.status !== 'completed' && (
            <Button
              variant="contained"
              color="warning"
              disabled={busy || !state?.canSend}
              onClick={() => send(false)}
            >
              {busy ? '正在分批发送…' : '继续未完成／重试失败的发送'}
            </Button>
          )}
          <Button disabled={busy} onClick={refresh}>
            刷新发送进度
          </Button>
        </Stack>
        {busy && (
          <Typography variant="caption" color="text.secondary">
            正在分批处理。关闭页面会停止后续批次，当前批次仍可能完成；重新打开后可刷新并继续。处理中请求中断后约
            90 秒可重试。
          </Typography>
        )}
        {started && (
          <Typography variant="caption" color="text.secondary">
            本期正式版本已锁定，编辑器中的后续修改只影响试发。发送记录保存在服务器，关闭页面后仍可查看。
          </Typography>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Box>
  );
}
