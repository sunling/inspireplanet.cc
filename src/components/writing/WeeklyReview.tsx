import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import RichTextRenderer from '../rich-text/RichTextRenderer';
import WritingCard from './WritingCard';
import { writingReviewsApi } from '../../netlify/services/writingReviews';
import { writingsApi } from '../../netlify/services/writings';
import { WritingPost, WritingWeeklyReview } from '../../netlify/types/writing';
import { reviewWeekRange, writingWeek } from '../../utils/writingReview';

const ReviewWritings: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WritingPost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    writingsApi
      .list({ scope: 'mine', writing_type: 'review', page, page_size: 9 })
      .then((response) => {
        if (!active) return;
        if (!response.success)
          throw new Error(response.error || '加载回看书写失败');
        setRecords(response.data?.records || []);
        setTotal(response.data?.total || 0);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, retry]);
  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">
        从回看中写下的感想，会作为独立书写保存在这里，也出现在「我的书写」中。
      </Typography>
      {loading ? (
        <CircularProgress aria-label="加载回看书写" />
      ) : error ? (
        <Alert
          severity="error"
          action={<Button onClick={() => setRetry(retry + 1)}>重试</Button>}
        >
          {error}
        </Alert>
      ) : !records.length ? (
        <Paper sx={{ p: 5, textAlign: 'center' }} elevation={0}>
          还没有回看书写。重读一篇记录，把现在的想法写下来吧。
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 3,
            }}
          >
            {records.map((post) => (
              <WritingCard
                key={post.id}
                post={post}
                onClick={(id) => navigate(`/writing-circle/${id}`)}
              />
            ))}
          </Box>
          {total > 9 && (
            <Pagination
              count={Math.ceil(total / 9)}
              page={page}
              onChange={(_, value) => setPage(value)}
            />
          )}
        </>
      )}
    </Stack>
  );
};

const WeeklyReview: React.FC<{ userId: string }> = ({ userId }) => {
  const currentWeek = writingWeek();
  const [tab, setTab] = useState('weekly');
  const [week, setWeek] = useState(currentWeek);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WritingWeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState('');
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('');
  const [createdId, setCreatedId] = useState('');
  const draftKey = (id: string) => `writing-review-draft:${userId}:${id}`;
  // Session drafts survive switching tabs, without being submitted or published.
  const cacheDraft = (
    id: string,
    value: string,
    draftTitle: string,
    draftVisibility = visibility
  ) => {
    try {
      sessionStorage.setItem(
        draftKey(id),
        JSON.stringify({
          discovery: value,
          title: draftTitle,
          visibility: draftVisibility,
        })
      );
    } catch {
      /* Storage may be disabled. */
    }
  };
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setMessage('');
    writingReviewsApi
      .weekly(week, page)
      .then((response) => {
        if (!active) return;
        if (!response.success || !response.data)
          throw new Error(response.error || '加载回看失败');
        const result = response.data;
        setData(result);
        setCreatedId('');
        let nextVisibility: 'public' | 'private' = 'public';
        let value = result.note?.discovery || '';
        let nextTitle =
          `回看：${result.post?.title || result.post?.template_snapshot?.template_name || '一则思考'}`.slice(
            0,
            80
          );
        try {
          const draft =
            result.post &&
            JSON.parse(
              sessionStorage.getItem(draftKey(result.post.id)) || 'null'
            );
          if (draft?.visibility === 'private') nextVisibility = 'private';
          if (typeof draft?.discovery === 'string') value = draft.discovery;
          if (typeof draft?.title === 'string') nextTitle = draft.title;
        } catch {
          /* Ignore invalid local drafts. */
        }
        setVisibility(nextVisibility);
        setDiscovery(value);
        setTitle(nextTitle);
      })
      .catch((error) => {
        if (active) setError(error.message || '加载失败，请重试');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [week, page, retry, userId]);
  const post = data?.post;
  const changingPost = loading || data?.week !== week || data?.page !== page;
  const changeWeek = (offset: number) => {
    setWeek(writingWeek(new Date(`${week}T04:00:00Z`), offset));
    setPage(1);
  };
  const publishReview = async () => {
    if (!post || changingPost) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await writingsApi.create({
        title: title.trim(),
        body: discovery.trim(),
        visibility,
        review_source_id: post.id,
      });
      if (!response.success || !response.data?.post)
        throw new Error(response.error || '保存回看失败');
      setCreatedId(response.data.post.id);
      setMessage(
        visibility === 'public'
          ? '回看已公开分享，并已在原书写下添加你的回看评论。'
          : '回看已私密保存，仅自己可见，不会展示在原书写的评论中。'
      );
    } catch (error) {
      setError((error as Error).message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Stack spacing={3}>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        aria-label="回看内容"
        variant="scrollable"
      >
        <Tab value="weekly" label="每周回看" />
        <Tab value="writings" label="回看书写" />
      </Tabs>
      {tab === 'writings' ? (
        <ReviewWritings />
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, bgcolor: '#edf3ee' }}
          >
            <Typography variant="h5" fontWeight={750} gutterBottom>
              {week === currentWeek
                ? '本周，重新看看自己'
                : '重新遇见那一周的自己'}
            </Typography>
            <Typography color="text.secondary">
              左边重读当时的记录，右边写下现在的感想。默认公开分享，也可选择私密保存。公开回看会在原书写下留下此刻的发现。
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 2 }}
            >
              <Button
                disabled={loading || saving}
                onClick={() => changeWeek(-1)}
              >
                上一周
              </Button>
              <Typography variant="body2">
                {week} — {reviewWeekRange(week).lastDay} · 北京时间
              </Typography>
              <Button
                disabled={week >= currentWeek || loading || saving}
                onClick={() => changeWeek(1)}
              >
                下一周
              </Button>
              {week !== currentWeek && (
                <Button
                  disabled={loading || saving}
                  onClick={() => {
                    setWeek(currentWeek);
                    setPage(1);
                  }}
                >
                  回到本周
                </Button>
              )}
            </Stack>
          </Paper>
          {error && (
            <Alert
              severity="error"
              action={
                (!data || changingPost) && (
                  <Button onClick={() => setRetry(retry + 1)}>重试</Button>
                )
              }
            >
              {error}
            </Alert>
          )}
          {message && (
            <Alert
              severity="success"
              action={
                createdId && (
                  <Button component={Link} to={`/writing-circle/${createdId}`}>
                    查看书写
                  </Button>
                )
              }
            >
              {message}
            </Alert>
          )}
          {loading && !data ? (
            <Box sx={{ textAlign: 'center', p: 5 }}>
              <CircularProgress aria-label="正在加载回看" />
            </Box>
          ) : !post && !error ? (
            <Paper elevation={0} sx={{ p: 5, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>
                这一周还没有书写
              </Typography>
              <Typography color="text.secondary">
                可以回到上一周看看，也可以从今天开始记下一点生活。
              </Typography>
              <Button component={Link} to="/writing-circle/new" sx={{ mt: 2 }}>
                开始书写
              </Button>
            </Paper>
          ) : (
            post && (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      md: 'minmax(0, 1.25fr) minmax(0, 1fr)',
                    },
                    gap: 3,
                    alignItems: 'start',
                  }}
                >
                  <Paper
                    component="article"
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 4 },
                      borderRadius: 3,
                      minWidth: 0,
                      alignSelf: {
                        xs: 'start',
                        md: loading ? 'stretch' : 'start',
                      },
                      display: loading ? 'flex' : 'block',
                      flexDirection: 'column',
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 2 }}
                    >
                      <Chip
                        size="small"
                        label="当时的书写"
                        variant="outlined"
                      />
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        component="nav"
                        aria-label="切换回看书写"
                      >
                        <Button
                          size="small"
                          disabled={saving || loading || page <= 1}
                          onClick={() => setPage(page - 1)}
                          sx={{ minWidth: 0, px: 1 }}
                        >
                          上一篇
                        </Button>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          aria-live="polite"
                          sx={{
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {data.page} / {data.total}
                        </Typography>
                        <Button
                          size="small"
                          disabled={saving || loading || page >= data.total}
                          onClick={() => setPage(page + 1)}
                          sx={{ minWidth: 0, px: 1 }}
                        >
                          下一篇
                        </Button>
                      </Stack>
                    </Stack>
                    {loading ? (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: 280,
                          flex: 1,
                        }}
                        aria-busy="true"
                      >
                        <CircularProgress aria-label="正在加载原书写" />
                      </Box>
                    ) : changingPost ? (
                      <Alert
                        severity="error"
                        action={
                          <Button onClick={() => setRetry(retry + 1)}>
                            重试
                          </Button>
                        }
                      >
                        原书写加载失败，请重试。右侧草稿已保留。
                      </Alert>
                    ) : (
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {new Date(post.created_at).toLocaleString('zh-CN', {
                            timeZone: 'Asia/Shanghai',
                          })}
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight={750}
                          sx={{ mb: 3, overflowWrap: 'anywhere' }}
                        >
                          {post.title ||
                            post.template_snapshot?.template_name ||
                            '一则思考'}
                        </Typography>
                        {post.editor_mode === 'rich' && post.body_rich ? (
                          <RichTextRenderer content={post.body_rich} />
                        ) : (
                          <Typography
                            sx={{
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                              lineHeight: 1.9,
                            }}
                          >
                            {post.body}
                          </Typography>
                        )}
                        {post.template_snapshot?.items
                          .filter((item) => item.answer.trim())
                          .map((item) => (
                            <Box key={item.key} sx={{ mt: 3 }}>
                              <Typography fontWeight={700}>
                                {item.prompt}
                              </Typography>
                              <Typography
                                sx={{
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'anywhere',
                                  mt: 1,
                                  lineHeight: 1.9,
                                }}
                              >
                                {item.answer}
                              </Typography>
                            </Box>
                          ))}
                        {!!post.image_urls?.length && (
                          <Stack spacing={2} sx={{ mt: 3 }}>
                            {post.image_urls.map((url) => (
                              <Box
                                key={url}
                                component="img"
                                src={url}
                                alt="原书写配图"
                                loading="lazy"
                                sx={{ width: '100%', borderRadius: 2 }}
                              />
                            ))}
                          </Stack>
                        )}
                        <Button
                          component={Link}
                          to={`/writing-circle/${post.id}`}
                          sx={{ mt: 3 }}
                        >
                          查看原书写
                        </Button>
                      </>
                    )}
                  </Paper>
                  <Paper
                    component="section"
                    aria-label="现在的回看感想"
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 3 },
                      borderRadius: 3,
                      border: '1px solid #cbded2',
                      minWidth: 0,
                      position: { md: 'sticky' },
                      top: { md: 90 },
                    }}
                  >
                    <Stack spacing={2.5}>
                      <Box>
                        <Chip
                          size="small"
                          label="现在的我"
                          sx={{ mb: 2, bgcolor: '#e8f1ed', color: '#3e685b' }}
                        />
                        <Typography variant="h6" fontWeight={700}>
                          回头看，你有什么新的发现？
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          当时在意的事，现在怎么样了？如果再次遇到，你会怎样回应？
                        </Typography>
                      </Box>
                      {data.note_error && (
                        <Alert
                          severity="warning"
                          action={
                            <Button onClick={() => setRetry(retry + 1)}>
                              重试
                            </Button>
                          }
                        >
                          {data.note_error} 原书写仍可阅读。
                        </Alert>
                      )}
                      <TextField
                        fullWidth
                        label="回看书写标题"
                        value={title}
                        disabled={saving}
                        onChange={(event) => {
                          setTitle(event.target.value);
                          cacheDraft(post.id, discovery, event.target.value);
                        }}
                        slotProps={{ htmlInput: { maxLength: 80 } }}
                      />
                      <TextField
                        fullWidth
                        multiline
                        label="回看感想"
                        placeholder="不需要总结得多好，写下真实的发现就可以……"
                        value={discovery}
                        disabled={saving}
                        onChange={(event) => {
                          setDiscovery(event.target.value);
                          cacheDraft(post.id, event.target.value, title);
                        }}
                        slotProps={{
                          input: { inputComponent: 'textarea' },
                          htmlInput: {
                            maxLength: 4000,
                            rows: 9,
                            style: {
                              resize: 'vertical',
                              overflow: 'auto',
                              minHeight: 120,
                            },
                          },
                        }}
                        helperText={`${discovery.length} / 4000 · 可拖动右下角调整高度 · 切换记录会保留草稿`}
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel id="review-visibility-label">
                          谁可以看见回看
                        </InputLabel>
                        <Select
                          labelId="review-visibility-label"
                          label="谁可以看见回看"
                          value={visibility}
                          disabled={saving || !!createdId}
                          onChange={(event) => {
                            const value = event.target.value as
                              | 'public'
                              | 'private';
                            setVisibility(value);
                            cacheDraft(post.id, discovery, title, value);
                          }}
                        >
                          <MenuItem value="public">公开分享（默认）</MenuItem>
                          <MenuItem value="private">仅自己可见</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary">
                        {visibility === 'public'
                          ? '公开分享后，会在原书写下展示你的回看评论。原书写的可见范围保持不变。'
                          : '私密回看仅自己可见，不会展示在原书写的评论中。'}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        <Button
                          variant="contained"
                          disabled={
                            saving ||
                            changingPost ||
                            !discovery.trim() ||
                            !title.trim() ||
                            !!createdId
                          }
                          onClick={publishReview}
                        >
                          {saving
                            ? '正在保存…'
                            : createdId
                              ? '已创建回看书写'
                              : visibility === 'private'
                                ? '保存私密回看'
                                : '公开分享回看'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>
              </>
            )
          )}
        </>
      )}
    </Stack>
  );
};
export default WeeklyReview;
