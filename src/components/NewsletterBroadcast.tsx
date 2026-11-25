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
  onLoadDraft,
  onSaveState,
}: {
  draft: CampaignDraft;
  disabled: boolean;
  onLoadDraft?: (draft: CampaignDraft) => void;
  onSaveState?: (state: 'loading' | 'saved' | 'dirty' | 'saving' | 'error' | 'locked') => void;
}) {
  const [state, setState] = useState<NewsletterCampaignStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reviewVersion, setReviewVersion] = useState('');
  const [reviewBody, setReviewBody] = useState(false);
  const [loadedRevision, setLoadedRevision] = useState<string | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState('');
  const [saveTime, setSaveTime] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const initialDraft = useRef(draft);
  const loadRef = useRef(onLoadDraft);
  loadRef.current = onLoadDraft;
  const mounted = useRef(true);
  const running = useRef(false);
  const fingerprint = JSON.stringify(draft);
  useEffect(() => {
    mounted.current = true;
    newsletterCampaignApi
      .status(draft.year, draft.episode)
      .then((r) => {
        if (mounted.current) {
          if (r.success && r.data) {
            setState(r.data);
            const c = r.data.campaign;
            if (c) {
              const saved = {year: draft.year, episode: draft.episode, subject: c.subject, document: c.document};
              setSavedFingerprint(JSON.stringify(saved));
              setLoadedRevision(c.revision);
              loadRef.current?.(saved);
            } else setSavedFingerprint(JSON.stringify(initialDraft.current));
            setLoaded(true);
          }
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
    if (running.current || disabled || !loaded || saveFailed) return;
    running.current = true;
    setBusy(true);
    setError('');
    setChecked(false);
    try {
      const r = await newsletterCampaignApi.prepare(draft, loadedRevision);
      if (!r.success || !r.data) throw Error(r.error || '准备失败');
      setState(r.data);
      setLoadedRevision(r.data.campaign?.revision || null);
      setSavedFingerprint(fingerprint);
      setSaveFailed(false);
      setReviewing(true);
      setReviewVersion(fingerprint);
    } catch (e) {
      setError(e instanceof Error ? e.message : '准备失败');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function saveDraft() {
    if (running.current || disabled || !loaded || !state?.canSend ||
        (state.campaign && state.campaign.status !== 'draft')) return;
    running.current = true;
    setBusy(true);
    setSaveFailed(false);
    setError('');
    try {
      const r = await newsletterCampaignApi.saveDraft(draft, loadedRevision);
      if (!r.success || !r.data?.campaign) throw Error(r.error || '保存失败');
      setState(r.data);
      setLoadedRevision(r.data.campaign.revision);
      setSavedFingerprint(fingerprint);
      setSaveTime(new Date().toLocaleTimeString('zh-CN'));
      setReviewing(false);
      setChecked(false);
    } catch (e) {
      setSaveFailed(true);
      setError(e instanceof Error ? e.message : '保存失败，请重新载入');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function changeSchedule(action: 'pause' | 'resume') {
    const c = state?.campaign;
    if (running.current || !c || c.status !== 'draft' || !c.auto_managed ||
        loadedRevision !== c.revision || fingerprint !== savedFingerprint) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await newsletterCampaignApi.autoPause(draft.year, draft.episode, c.revision, action === 'pause');
      if (!r.success || !r.data) throw Error(r.error || '操作失败');
      setState(r.data);
      setLoadedRevision(r.data.campaign?.revision || null);
      setReviewing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
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
  const scheduled = c?.auto_managed && !started;
  const counts = state?.counts;
  const dirty = loaded && fingerprint !== savedFingerprint;
  const saveState = started ? 'locked' : !loaded ? 'loading' : saveFailed ? 'error' : busy ? 'saving' : dirty ? 'dirty' : 'saved';
  useEffect(() => { onSaveState?.(saveState); }, [saveState, onSaveState]);
  useEffect(() => {
    if (!dirty || busy || disabled || started || !state?.canSend || saveFailed || reviewing) return;
    const timer = window.setTimeout(() => { void saveDraft(); }, 2000);
    return () => window.clearTimeout(timer);
  }, [fingerprint, savedFingerprint, busy, disabled, started, state?.canSend, saveFailed, reviewing, loadedRevision]);
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
        {!started && (
          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
            <Typography variant="caption" role="status">
              {!loaded ? '正在载入草稿…' : saveFailed ? '保存失败，请重试或重新载入' : busy ? '正在处理…' : dirty ? '尚未保存' : saveTime ? '已保存 · ' + saveTime : c ? '已载入服务器草稿' : '尚未创建草稿'}
            </Typography>
            <Button variant="outlined" disabled={!loaded || busy || disabled || !state?.canSend} onClick={saveDraft}>保存草稿</Button>
            {c && <Button disabled={busy} onClick={async () => {
              if (dirty && !window.confirm('重新载入会覆盖未保存的修改，继续？')) return;
              const r = await newsletterCampaignApi.status(draft.year, draft.episode);
              if (!r.success || !r.data?.campaign) { setError('无法载入草稿'); return; }
              const latest = r.data.campaign;
              const saved = {year: draft.year, episode: draft.episode, subject: latest.subject, document: latest.document};
              setState(r.data); setLoadedRevision(latest.revision); setSavedFingerprint(JSON.stringify(saved));
              onLoadDraft?.(saved); setSaveFailed(false); setReviewing(false);
            }}>重新载入草稿</Button>}
          </Stack>
        )}
        {scheduled && c && (
          <Box sx={{ p: 2, border: '1px solid #e6cfbc', borderRadius: 2 }}>
            <Stack spacing={1}>
              <Alert severity={c.auto_paused ? 'warning' : 'info'}>
                {c.auto_paused ? '自动发送已暂停' : c.auto_send_at
                  ? '计划发送（北京时间）：' + new Date(c.auto_send_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                  : '等待发送预览提醒；提醒成功后至少保留 24 小时。'}
              </Alert>
              <Typography variant="body2">无需人工确认。编辑后自动保存；只有服务器已保存的版本会用于发送。</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button color="warning" disabled={busy || dirty || !state?.canSend} onClick={() => changeSchedule(c.auto_paused ? 'resume' : 'pause')}>
                  {c.auto_paused ? '恢复自动发送' : '暂停自动发送'}
                </Button>
                <Button disabled={busy || dirty || !state?.canSend || !state?.available} onClick={prepare}>立即发送已保存版本…</Button>
              </Stack>
            </Stack>
          </Box>
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
          {!started && !scheduled && (
            <Button
              variant="outlined"
              disabled={
                busy || disabled || !loaded || !state?.canSend || !state?.available
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
