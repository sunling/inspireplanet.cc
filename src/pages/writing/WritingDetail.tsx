import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Loading from '../../components/Loading';
import { WritingComment, WritingPost } from '../../netlify/types';
import { writingInteractionsApi, writingsApi } from '../../netlify/config';
import { formatDate, formatLocalDateTime } from '../../utils/date';
import { useGlobalSnackbar } from '../../context/app';
import HighlightedText from '../../components/writing/HighlightedText';
import { isUserLoggedIn } from '../../utils/user';
import { downloadCard } from '../../utils/share';

const WritingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();
  const [post, setPost] = useState<WritingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<WritingComment[]>([]);
  const [comment, setComment] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [replyTo, setReplyTo] = useState<WritingComment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(true);
  const [resonanceLoading, setResonanceLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [downloadImage, setDownloadImage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const interactionInputRef = useRef<HTMLInputElement>(null);
  const downloadCardRef = useRef<HTMLDivElement>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;
    if (!id) {
      setError('书写 ID 无效');
      setLoading(false);
      return;
    }

    writingsApi
      .getById(id)
      .then((response) => {
        if (!active) return;
        if (!response.success || !response.data?.post) {
          setError(response.error || '书写不存在或不可访问');
          return;
        }
        setPost(response.data.post);
        writingInteractionsApi
          .get(id)
          .then((interaction) => {
            if (!active || !interaction.success || !interaction.data) return;
            const interactionData = interaction.data;
            setComments(interactionData.comments);
            setPost((current) =>
              current
                ? {
                    ...current,
                    resonance_count: interactionData.resonance_count,
                    has_resonated: interactionData.has_resonated,
                    comment_count: interactionData.comments.length,
                  }
                : current
            );
          })
          .finally(() => {
            if (active) setInteractionLoading(false);
          });
      })
      .catch(() => {
        if (active) setError('加载书写失败，请稍后重试');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id || !window.confirm('确定删除这篇书写吗？删除后无法恢复。')) return;
    setDeleting(true);
    try {
      const response = await writingsApi.delete(id);
      if (!response.success) {
        showSnackbar.error(response.error || '删除失败');
        return;
      }
      showSnackbar.success('书写已删除');
      navigate('/writing-circle?scope=mine');
    } catch {
      showSnackbar.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!post || downloading) return;
    setDownloading(true);
    try {
      const isWechat = /MicroMessenger/i.test(window.navigator.userAgent);
      const safeTitle = (post.title || '一则自我观察')
        .replace(/[\\/:*?"<>|]/g, '-')
        .slice(0, 40);
      const success = await downloadCard(
        downloadCardRef.current,
        `书写-${safeTitle}`,
        isWechat ? setDownloadImage : undefined
      );
      if (!success) showSnackbar.error('生成书写图片失败，请稍后重试');
      else if (!isWechat) showSnackbar.success('书写图片已下载');
    } catch {
      showSnackbar.error('生成书写图片失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  const requireLogin = () => {
    if (isUserLoggedIn()) return true;
    navigate(`/login?redirect=${encodeURIComponent(`/writing-circle/${id}`)}`);
    return false;
  };

  const handleResonance = async () => {
    if (!id || resonanceLoading || !requireLogin()) return;
    setResonanceLoading(true);
    try {
      const response = await writingInteractionsApi.toggleResonance(id);
      if (response.success && response.data)
        setPost((current) =>
          current ? { ...current, ...response.data } : current
        );
      else showSnackbar.error(response.error || '操作失败');
    } catch {
      showSnackbar.error('操作失败，请稍后重试');
    } finally {
      setResonanceLoading(false);
    }
  };

  const handleComment = async () => {
    if (!id || !comment.trim() || !requireLogin()) return;
    setSubmitting(true);
    try {
      const response = await writingInteractionsApi.addComment(
        id,
        comment,
        null,
        commentAnonymous
      );
      if (!response.success || !response.data)
        return showSnackbar.error(response.error || '评论失败');
      const newComment = response.data.comment;
      setComments((current) => [...current, newComment]);
      setComment('');
    } catch {
      showSnackbar.error('评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!id || !replyTo || !replyContent.trim() || !requireLogin()) return;
    setSubmitting(true);
    try {
      const response = await writingInteractionsApi.addComment(
        id,
        replyContent,
        replyTo.id,
        commentAnonymous
      );
      if (!response.success || !response.data)
        return showSnackbar.error(response.error || '回复失败');
      const newReply = response.data.comment;
      setComments((current) => [...current, newReply]);
      setReplyTo(null);
      setReplyContent('');
    } catch {
      showSnackbar.error('回复失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;
    setDeletingCommentId(commentId);
    try {
      const response = await writingInteractionsApi.deleteComment(commentId);
      if (!response.success) {
        showSnackbar.error(response.error || '删除失败');
        return;
      }
      setComments((current) => {
        const removed = new Set([commentId]);
        let changed = true;
        while (changed) {
          changed = false;
          current.forEach((item) => {
            if (
              item.parent_id &&
              removed.has(item.parent_id) &&
              !removed.has(item.id)
            ) {
              removed.add(item.id);
              changed = true;
            }
          });
        }
        return current.filter((item) => !removed.has(item.id));
      });
      showSnackbar.success('评论已删除');
    } catch {
      showSnackbar.error('删除失败，请稍后重试');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const getDescendants = (parentId: string): WritingComment[] => {
    const direct = comments.filter((item) => item.parent_id === parentId);
    return direct.flatMap((item) => [item, ...getDescendants(item.id)]);
  };

  const startReply = (item: WritingComment) => {
    if (!requireLogin()) return;
    setReplyTo(item);
    setReplyContent('');
    window.setTimeout(() => interactionInputRef.current?.focus(), 0);
  };

  const renderComment = (item: WritingComment): React.ReactNode => {
    const replies = getDescendants(item.id);
    return (
      <Stack
        key={item.id}
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 38,
            height: 38,
            bgcolor: '#e7a977',
            fontSize: 16,
            borderRadius: 1,
          }}
        >
          {item.author.name.slice(0, 1)}
        </Avatar>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography fontWeight={700} color="#576b95" fontSize={14}>
            {item.author.name}
          </Typography>
          <Typography
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, mt: 0.25 }}
          >
            {item.content}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ mt: 0.25 }}
          >
            <Typography variant="caption" color="text.secondary">
              {formatDate(item.created_at)}
            </Typography>
            <Button
              size="small"
              sx={{ minWidth: 0, px: 0.75, color: 'text.secondary' }}
              onClick={() => startReply(item)}
            >
              回复
            </Button>
            {item.can_delete && (
              <Button
                size="small"
                color="error"
                sx={{ minWidth: 0, px: 0.75, gap: 0.5 }}
                onClick={() => handleDeleteComment(item.id)}
                disabled={Boolean(deletingCommentId)}
              >
                {deletingCommentId === item.id && (
                  <CircularProgress size={14} color="inherit" />
                )}
                {deletingCommentId === item.id ? '删除中' : '删除'}
              </Button>
            )}
          </Stack>
          {replies.length > 0 && (
            <Box
              sx={{
                mt: 1,
                px: 1.5,
                py: 1,
                bgcolor: '#f5f5f5',
                borderRadius: 1.5,
              }}
            >
              {replies.map((reply) => {
                const parent = comments.find(
                  (candidate) => candidate.id === reply.parent_id
                );
                return (
                  <Box key={reply.id} sx={{ py: 0.5 }}>
                    <Typography
                      component="div"
                      variant="body2"
                      sx={{
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ color: '#576b95', fontWeight: 700 }}
                      >
                        {reply.author.name}
                      </Box>
                      {parent && parent.id !== item.id && (
                        <>
                          <Box
                            component="span"
                            sx={{ color: 'text.secondary' }}
                          >
                            {' '}
                            回复{' '}
                          </Box>
                          <Box
                            component="span"
                            sx={{ color: '#576b95', fontWeight: 700 }}
                          >
                            {parent.author.name}
                          </Box>
                        </>
                      )}
                      <Box component="span">：{reply.content}</Box>
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(reply.created_at)}
                      </Typography>
                      <Button
                        size="small"
                        sx={{ minWidth: 0, px: 0.75, color: 'text.secondary' }}
                        onClick={() => startReply(reply)}
                      >
                        回复
                      </Button>
                      {reply.can_delete && (
                        <Button
                          size="small"
                          color="error"
                          sx={{ minWidth: 0, px: 0.75 }}
                          onClick={() => handleDeleteComment(reply.id)}
                          disabled={Boolean(deletingCommentId)}
                        >
                          {deletingCommentId === reply.id ? '删除中…' : '删除'}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Stack>
    );
  };

  if (loading) return <Loading message="正在打开这篇书写..." />;

  if (!post) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#f7f5f2',
          pt: { xs: 3, md: 6 },
          pb: { xs: 3, md: 6 },
        }}
      >
        <Container maxWidth="md">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/writing-circle')}
            sx={{ mb: 2 }}
          >
            返回书写圈子
          </Button>
          <Alert severity="error">{error || '书写不存在'}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f7f5f2',
        pt: { xs: 3, md: 6 },
        pb:
          post?.visibility !== 'private'
            ? { xs: 17, sm: 15 }
            : { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="md">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/writing-circle')}
          sx={{ mb: 2 }}
        >
          返回书写圈子
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 4 }}>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {post.visibility === 'private' && (
                    <Chip label="仅自己可见" size="small" variant="outlined" />
                  )}
                  {post.visibility === 'group' && (
                    <Chip
                      label={post.group?.name || '讨论组可见'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {post.template_snapshot && (
                    <Chip
                      label={post.template_snapshot.template_name}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography
                  variant="h4"
                  component="h1"
                  fontWeight={750}
                  sx={{
                    fontSize: { xs: '1.65rem', sm: '2rem' },
                    lineHeight: 1.35,
                  }}
                >
                  <HighlightedText
                    text={
                      post.title ||
                      post.template_snapshot?.template_name ||
                      '一则自我观察'
                    }
                  />
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {post.author.name} · {formatLocalDateTime(post.created_at)}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignSelf="flex-start">
                <Button
                  variant="contained"
                  startIcon={
                    downloading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <DownloadOutlinedIcon />
                    )
                  }
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? '生成中' : '下载书写'}
                </Button>
                {post.can_edit && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() =>
                        navigate(`/writing-circle/${post.id}/edit`)
                      }
                    >
                      编辑
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      删除
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>

            {post.template_snapshot?.items.some((item) =>
              item.answer.trim()
            ) && (
              <>
                <Divider />
                <Box>
                  <Stack spacing={3}>
                    {post.template_snapshot.items
                      .filter((item) => item.answer.trim())
                      .map((item) => (
                        <Box key={item.key}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            gutterBottom
                          >
                            {item.prompt}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.9 }}
                          >
                            <HighlightedText text={item.answer} />
                          </Typography>
                        </Box>
                      ))}
                  </Stack>
                </Box>
              </>
            )}

            {post.body.trim() && (
              <>
                <Divider />
                <Box>
                  <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>
                    <HighlightedText text={post.body} />
                  </Typography>
                </Box>
              </>
            )}

            {post.image_urls.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs:
                      post.image_urls.length === 1
                        ? '1fr'
                        : post.image_urls.length === 2
                          ? 'repeat(2, minmax(0, 1fr))'
                          : 'repeat(3, minmax(0, 1fr))',
                    sm:
                      post.image_urls.length === 1
                        ? 'minmax(0, 560px)'
                        : post.image_urls.length === 2
                          ? 'repeat(2, minmax(0, 1fr))'
                          : 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: { xs: 0.75, sm: 1 },
                  maxWidth: post.image_urls.length === 1 ? 560 : 760,
                  width: '100%',
                }}
              >
                {post.image_urls.map((imageUrl, index) => (
                  <Box
                    key={`${imageUrl}-${index}`}
                    component="button"
                    type="button"
                    onClick={() => setPreviewImage(imageUrl)}
                    aria-label={`查看第 ${index + 1} 张配图`}
                    sx={{
                      display: 'block',
                      border: 0,
                      p: 0,
                      bgcolor: '#f3f1ee',
                      cursor: 'zoom-in',
                      overflow: 'hidden',
                      borderRadius: 1.5,
                      aspectRatio:
                        post.image_urls.length === 1 ? '16 / 10' : '1 / 1',
                      '&:focus-visible': {
                        outline: '3px solid',
                        outlineColor: 'primary.light',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={`${post.title || '书写配图'} ${index + 1}`}
                      loading="lazy"
                      sx={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.02)' },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {post.topics.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {post.topics.map((topic) => (
                  <Typography
                    key={topic.id}
                    component="span"
                    variant="body2"
                    sx={{
                      color: '#496a61',
                      fontWeight: 600,
                    }}
                  >
                    {topic.name.startsWith('#') ? topic.name : `#${topic.name}`}
                  </Typography>
                ))}
              </Box>
            )}

            {post.visibility !== 'private' && (
              <>
                <Divider />
                <Box>
                  <Alert severity="info" sx={{ my: 2 }}>
                    欢迎分享这篇书写带给你的触动。不要评价作者，也不必提供建议或解决方案。我们只是在这里各自停留，彼此看见。
                  </Alert>
                  {interactionLoading ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="center"
                      sx={{ py: 4 }}
                    >
                      <CircularProgress size={20} />
                      <Typography color="text.secondary">
                        正在加载回应…
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={2} sx={{ mt: 3 }}>
                      {comments
                        .filter((item) => !item.parent_id)
                        .map((item) => renderComment(item))}
                    </Stack>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
      {post && (
        <Box
          sx={{
            position: 'fixed',
            left: '-10000px',
            top: 0,
            width: 420,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <Box
            ref={downloadCardRef}
            sx={{
              width: 420,
              minHeight: 560,
              boxSizing: 'border-box',
              p: '36px 34px 110px',
              color: '#302b27',
              bgcolor: '#fbf8f2',
              backgroundImage:
                'linear-gradient(145deg, rgba(220, 235, 227, 0.72), rgba(251, 248, 242, 0.2) 42%, rgba(242, 221, 190, 0.55))',
              border: '1px solid #e4ddd3',
              position: 'relative',
            }}
          >
            <Typography
              sx={{ color: '#678078', fontSize: 13, fontWeight: 700, mb: 2 }}
            >
              启发星球 · 书写圈子
            </Typography>
            <Typography
              component="h1"
              sx={{ fontSize: 26, lineHeight: 1.4, fontWeight: 750, mb: 1.5 }}
            >
              <HighlightedText
                text={
                  post.title ||
                  post.template_snapshot?.template_name ||
                  '一则自我观察'
                }
              />
            </Typography>
            <Typography sx={{ color: '#766f69', fontSize: 13, mb: 3 }}>
              {post.author.name} · {formatLocalDateTime(post.created_at)}
            </Typography>
            {post.template_snapshot?.items
              .filter((item) => item.answer.trim())
              .map((item) => (
                <Box key={item.key} sx={{ mb: 2.5 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.75 }}>
                    {item.prompt}
                  </Typography>
                  <Typography
                    sx={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.8,
                      fontSize: 15,
                    }}
                  >
                    <HighlightedText text={item.answer} />
                  </Typography>
                </Box>
              ))}
            {post.body.trim() && (
              <Typography
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.9, fontSize: 15 }}
              >
                <HighlightedText text={post.body} />
              </Typography>
            )}
            {post.image_urls.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns:
                    post.image_urls.length === 1
                      ? '1fr'
                      : 'repeat(3, minmax(0, 1fr))',
                  gap: 0.75,
                  mt: 3,
                }}
              >
                {post.image_urls.slice(0, 9).map((imageUrl, index) => (
                  <Box
                    key={`${imageUrl}-${index}`}
                    component="img"
                    src={imageUrl}
                    crossOrigin="anonymous"
                    alt=""
                    sx={{
                      width: '100%',
                      aspectRatio: post.image_urls.length === 1 ? '4 / 3' : '1',
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Box>
            )}
            <Typography
              sx={{
                position: 'absolute',
                left: 34,
                bottom: 34,
                color: '#766f69',
                fontSize: 12,
              }}
            >
              扫码阅读完整书写
            </Typography>
          </Box>
        </Box>
      )}
      {post?.visibility !== 'private' && (
        <Paper
          square
          elevation={10}
          sx={{
            position: 'fixed',
            zIndex: (theme) => theme.zIndex.appBar,
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(12px)',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <Container maxWidth="md" sx={{ py: 1.25 }}>
            {replyTo && (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 0.75, pl: { sm: 14 } }}
              >
                <Typography variant="caption" color="text.secondary">
                  正在回复 {replyTo.author.name}
                </Typography>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent('');
                  }}
                  sx={{ minWidth: 0, color: 'text.secondary' }}
                >
                  取消
                </Button>
              </Stack>
            )}
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <Button
                onClick={handleResonance}
                aria-label={`${post.has_resonated ? '取消共鸣' : '共鸣'}，当前 ${post.resonance_count} 次`}
                startIcon={
                  post.has_resonated ? (
                    <TipsAndUpdatesIcon />
                  ) : (
                    <TipsAndUpdatesOutlinedIcon />
                  )
                }
                variant={post.has_resonated ? 'contained' : 'outlined'}
                disabled={resonanceLoading || interactionLoading}
                sx={{
                  minWidth: 64,
                  height: 40,
                  borderRadius: 1.5,
                  px: { xs: 1, sm: 2 },
                  borderColor: '#c58b2a',
                  borderWidth: post.has_resonated ? 2 : 1,
                  bgcolor: post.has_resonated ? '#c58b2a' : 'transparent',
                  color: post.has_resonated ? '#fff' : '#95691f',
                  '& .MuiButton-startIcon': { mr: 0.5 },
                  '&:hover': {
                    borderColor: '#a8731e',
                    bgcolor: post.has_resonated ? '#a8731e' : '#fff8e8',
                  },
                }}
              >
                {resonanceLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  post.resonance_count
                )}
              </Button>
              <TextField
                fullWidth
                inputRef={interactionInputRef}
                size="small"
                multiline
                maxRows={3}
                value={replyTo ? replyContent : comment}
                onChange={(event) => {
                  const value = event.target.value.slice(0, 500);
                  if (replyTo) setReplyContent(value);
                  else setComment(value);
                }}
                placeholder={
                  replyTo ? `回复 ${replyTo.author.name}…` : '写你的回应…'
                }
                slotProps={{
                  input: {
                    startAdornment: (
                      <ChatBubbleOutlineIcon
                        color="action"
                        sx={{ mr: 1, fontSize: 19, alignSelf: 'center' }}
                      />
                    ),
                  },
                }}
              />
              <Tooltip
                title={commentAnonymous ? '取消匿名评论' : '使用佚名评论'}
              >
                <IconButton
                  aria-label={
                    commentAnonymous ? '取消匿名评论' : '使用佚名评论'
                  }
                  aria-pressed={commentAnonymous}
                  onClick={() => setCommentAnonymous((value) => !value)}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: commentAnonymous ? '#e87545' : 'divider',
                    bgcolor: commentAnonymous ? '#e87545' : 'transparent',
                    color: commentAnonymous ? '#fff' : 'text.secondary',
                    '&:hover': {
                      bgcolor: commentAnonymous ? '#cf6034' : 'action.hover',
                    },
                  }}
                >
                  <PersonOffOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                color="primary"
                onClick={replyTo ? handleReply : handleComment}
                disabled={
                  !(replyTo ? replyContent : comment).trim() || submitting
                }
                aria-label={
                  replyTo ? `发送给 ${replyTo.author.name}` : '发送评论'
                }
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled',
                  },
                }}
              >
                {submitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </Stack>
          </Container>
        </Paper>
      )}
      <Dialog
        open={Boolean(downloadImage)}
        onClose={() => setDownloadImage('')}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            长按图片保存到相册
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ mt: 0.5, mb: 2 }}
          >
            图片已包含书写内容和详情页二维码
          </Typography>
          <Box
            component="img"
            src={downloadImage}
            alt="可长按保存的书写图片"
            sx={{ display: 'block', width: '100%', height: 'auto' }}
          />
          <Button onClick={() => setDownloadImage('')} sx={{ mt: 2 }}>
            关闭
          </Button>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage('')}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1, sm: 3 },
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'visible',
            },
          },
          backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.88)' } },
        }}
      >
        <IconButton
          aria-label="关闭图片预览"
          onClick={() => setPreviewImage('')}
          sx={{
            position: 'absolute',
            right: 0,
            top: -48,
            color: '#fff',
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={previewImage}
          alt="书写配图预览"
          sx={{
            display: 'block',
            maxWidth: 'min(94vw, 1200px)',
            maxHeight: '88vh',
            objectFit: 'contain',
          }}
        />
      </Dialog>
    </Box>
  );
};

export default WritingDetail;
