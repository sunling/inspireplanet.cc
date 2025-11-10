import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Divider,
  CircularProgress,
} from '@mui/material';
import useResponsive from '@/hooks/useResponsive';
import { CardItem, Comment } from '@/netlify/types';
import { api } from '@/netlify/configs';
import { getFontColorForGradient } from '@/constants/gradient';
import Loading from '@/components/Loading';
import Empty from '@/components/Empty';
import ErrorCard from '@/components/ErrorCard';

const CardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useResponsive();

  const [card, setCard] = useState<CardItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 评论表单状态
  const [commentForm, setCommentForm] = useState({
    name: '',
    content: '',
  });
  const [submittingComment, setSubmittingComment] = useState(false);

  // 加载卡片详情
  const fetchCardById = async (cardId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // 使用统一API封装获取卡片详情
      const response = await api.cards.getById(cardId);

      console.log('加载卡片详情返回', response);

      if (!response.success || !response.data?.records?.length) {
        throw new Error('获取卡片失败：' + (response.error || '未知错误'));
      }

      const cardData = response.data.records[0];

      // 规范化卡片数据格式
      const normalizedCard: CardItem = {
        id: cardData.id || '',
        title: cardData.title || '未命名卡片',
        quote: cardData.quote || '',
        detail: cardData.detail,
        imagePath: cardData.imagePath || cardData.upload,
        creator: cardData.creator,
        font: cardData.font,
        gradientClass: cardData.gradientClass || 'card-gradient-1',
        created: cardData.created || new Date().toISOString(),
        username: cardData.username || cardData.creator,
      };

      setCard(normalizedCard);
    } catch (error) {
      console.error('获取卡片失败:', error);
      setError('获取卡片详情失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 加载评论
  const fetchComments = async (cardId: string) => {
    try {
      // 使用统一的api对象获取评论
      const response = await api.comments.getByCardId(cardId);
      console.log('fetchComments返回', fetchComments);

      if (!response.success || !response.data?.comments?.length) {
        throw new Error('获取评论失败：' + (response.error || '未知错误'));
      }

      const commentData = response.data?.comments || [];

      // 规范化评论数据格式，支持更多可能的字段名
      const list = commentData.map(
        (comment: any): Comment => ({
          id: comment.id,
          name: comment.name || comment.creator || '匿名用户',
          comment: comment.comment || comment.content || '',
          created: comment.created || new Date().toISOString(),
          cardId: comment.cardId || cardId, // 确保cardId存在
          createdAt: comment.comment.created || new Date().toISOString(),
        })
      );
      setComments(list);
    } catch (error) {
      console.error('获取评论失败:', error);
      return [];
    }
  };

  // 检查用户是否可以编辑卡片
  const checkEditPermission = (cardData: CardItem) => {
    try {
      // 支持多种用户数据存储键名
      const userData =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      if (!userData) {
        setCanEdit(false);
        return;
      }

      const user = JSON.parse(userData);
      const currentUsername = user.username || '';
      const cardUsername = cardData.username || '';

      setCanEdit(currentUsername && currentUsername === cardUsername);
    } catch (e) {
      console.error('解析用户信息失败:', e);
      setCanEdit(false);
    }
  };

  // 初始化页面
  useEffect(() => {
    const initPage = async () => {
      if (!id) {
        setError('未找到卡片ID，请返回卡片列表页面重试。');

        return;
      }

      fetchCardById(id);
      fetchComments(id);
    };
    initPage();
  }, [id]);

  // 下载卡片为图片
  const downloadCard = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    try {
      // 实际环境中应该使用html2canvas库来实现下载功能
      // 这里模拟下载过程
      await new Promise((resolve) => setTimeout(resolve, 1500));

      alert('卡片下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  // 处理编辑按钮点击
  const handleEdit = () => {
    if (id) {
      navigate(`/card-edit?id=${id}`);
    }
  };

  // 提交评论
  const handleCommentSubmit = async () => {
    if (!commentForm.name.trim()) {
      alert('请输入您的姓名');
      return;
    }

    if (!commentForm.content.trim()) {
      alert('请输入评论内容');
      return;
    }

    if (!id) {
      alert('卡片ID无效');
      return;
    }

    setSubmittingComment(true);

    try {
      // 使用统一API封装提交评论
      console.log('正在提交评论...');
      const response = await api.comments.create({
        cardId: id,
        name: commentForm.name,
        comment: commentForm.content,
      });

      if (!response.success) {
        throw new Error('提交评论失败：' + (response.error || '未知错误'));
      }

      if (!response.data) {
        return;
      }

      // 创建新评论对象
      const newComment: Comment = response.data;

      // 更新评论列表
      setComments([...comments, newComment]);

      // 重置表单
      setCommentForm({ name: '', content: '' });

      alert('评论提交成功！');
    } catch (error: any) {
      console.error('提交评论失败:', error.message || error);
      alert('提交评论失败，请稍后重试');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 格式化日期
  const formatCommentDate = (dateString: string) => {
    try {
      if (!dateString) return '日期未知';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '日期未知';
      }
      return `${date.getFullYear()}年${
        date.getMonth() + 1
      }月${date.getDate()}日 ${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, '0')}`;
    } catch (e) {
      console.error('日期格式化错误:', e);
      return '日期未知';
    }
  };

  // 清理和处理内容
  const sanitizeContent = (content: string | undefined | null) => {
    if (!content) return '';
    try {
      return DOMPurify.sanitize(String(content));
    } catch (e) {
      console.error('内容净化错误:', e);
      return String(content);
    }
  };

  // 处理Markdown内容
  const renderMarkdown = (text: string | undefined | null) => {
    if (!text) return '';
    try {
      marked.setOptions({ breaks: true });
      const html = marked.parse(sanitizeContent(text));
      return (
        <Fragment>
          <p dangerouslySetInnerHTML={{ __html: html as string }} />
        </Fragment>
      );
    } catch (e) {
      return <Fragment>{sanitizeContent(text)}</Fragment>;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 4, sm: 8 },
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="md">
        {isLoading ? (
          <Loading message="加载卡片中..." />
        ) : error ? (
          <section style={{ marginTop: '2rem' }}>
            <ErrorCard
              message="加载失败"
              description={error}
              onRetry={() => {
                window.location.reload();
              }}
              retryText="重试"
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/cards')}
                sx={{
                  backgroundColor: '#667eea',
                  '&:hover': { backgroundColor: '#5a67d8' },
                }}
              >
                返回卡片列表
              </Button>
            </Box>
          </section>
        ) : (
          <>
            <Paper
              elevation={3}
              sx={{
                mb: 6,
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="card-container">
                <div
                  id="detail-card"
                  ref={cardRef}
                  className={`card ${card?.gradientClass || 'card-gradient-1'}`}
                  style={{
                    fontFamily: card?.font || 'Noto Sans SC, sans-serif',
                    color: getFontColorForGradient(
                      card?.gradientClass || 'card-gradient-1'
                    ),
                    padding: isMobile ? '24px' : '40px',
                    minHeight: '300px',
                    transition: 'transform 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        'translateY(-5px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        'translateY(0)';
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant={isMobile ? 'h5' : 'h4'}
                      component="h1"
                      sx={{
                        fontWeight: 'bold',
                        mb: 3,
                        color: getFontColorForGradient(
                          card?.gradientClass || 'card-gradient-1'
                        ),
                      }}
                    >
                      {card ? sanitizeContent(card.title) : ''}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: `${getFontColorForGradient(
                          card?.gradientClass || 'card-gradient-1'
                        )}10`,
                        p: 3,
                        borderRadius: '8px',
                        mb: 3,
                        fontStyle: 'italic',
                      }}
                    >
                      <Typography
                        variant={isMobile ? 'body1' : 'h6'}
                        sx={{
                          color: getFontColorForGradient(
                            card?.gradientClass || 'card-gradient-1'
                          ),
                        }}
                      >
                        {sanitizeContent(card?.quote || '')}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                      <img
                        src={card?.imagePath || '/images/mistyblue.png'}
                        alt={card?.title || ''}
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          maxHeight: '400px',
                          objectFit: 'cover',
                          transition: isMobile ? 'none' : 'transform 0.5s ease',
                        }}
                        onMouseOver={(e) =>
                          !isMobile &&
                          (e.currentTarget.style.transform = 'scale(1.05)')
                        }
                        onMouseOut={(e) =>
                          !isMobile &&
                          (e.currentTarget.style.transform = 'scale(1)')
                        }
                      />
                    </Box>
                    {card?.detail && (
                      <Box sx={{ mt: 4 }}>
                        {/* todo */}
                        <Typography
                          variant="body1"
                          sx={{
                            color: getFontColorForGradient(
                              card?.gradientClass || 'card-gradient-1'
                            ),
                            lineHeight: 1.8,
                          }}
                        >
                          {renderMarkdown(card.detail)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{
                      mt: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: getFontColorForGradient(
                          card?.gradientClass || 'card-gradient-1'
                        ),
                        opacity: 0.8,
                      }}
                    >
                      {card?.creator
                        ? `— ${sanitizeContent(card.creator)}`
                        : ''}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: getFontColorForGradient(
                          card?.gradientClass || 'card-gradient-1'
                        ),
                        opacity: 0.8,
                      }}
                    >
                      {card
                        ? new Date(card.created).toLocaleDateString('zh-CN')
                        : ''}
                    </Typography>
                  </Box>
                </div>
              </div>
            </Paper>

            <Box
              sx={{
                mb: 6,
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <Button
                id="download-btn"
                variant="contained"
                disabled={downloading || !card}
                onClick={downloadCard}
                sx={{
                  backgroundColor: '#3182ce',
                  '&:hover': { backgroundColor: '#2c5aa0' },
                  py: 1.5,
                  px: { xs: 3, sm: 4 },
                  minWidth: { xs: 'auto', sm: '140px' },
                }}
              >
                {downloading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    下载中...
                  </Box>
                ) : (
                  '下载卡片'
                )}
              </Button>

              {canEdit && (
                <Button
                  id="edit-btn"
                  variant="contained"
                  onClick={handleEdit}
                  sx={{
                    backgroundColor: '#e53e3e',
                    '&:hover': { backgroundColor: '#c53030' },
                    py: 1.5,
                    px: { xs: 3, sm: 4 },
                    minWidth: { xs: 'auto', sm: '140px' },
                  }}
                >
                  编辑卡片
                </Button>
              )}

              <Button
                id="share-btn"
                variant="contained"
                onClick={() => alert('分享功能已触发')}
                sx={{
                  backgroundColor: '#38a169',
                  '&:hover': { backgroundColor: '#2f855a' },
                  py: 1.5,
                  px: { xs: 3, sm: 4 },
                  minWidth: { xs: 'auto', sm: '140px' },
                }}
              >
                分享卡片
              </Button>
            </Box>

            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                component="h2"
                sx={{ mb: 4, color: '#667eea' }}
              >
                评论
              </Typography>

              <Box sx={{ mb: 6 }}>
                {comments.length === 0 ? (
                  <Empty message="暂无评论" description="快来分享您的想法吧" />
                ) : (
                  comments.map((comment) => (
                    <Paper
                      key={comment.id || comment.created}
                      elevation={1}
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        transition: 'box-shadow 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: 1,
                          textAlign: isMobile ? 'center' : 'left',
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 'bold', color: '#667eea' }}
                        >
                          {sanitizeContent(comment.name || comment.Name)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCommentDate(comment.created)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeContent(
                              comment.comment || comment.created
                            ).replace(/\n/g, '<br>'),
                          }}
                        />
                      </Typography>
                    </Paper>
                  ))
                )}
              </Box>

              <Divider sx={{ mb: 4 }} />

              <Typography variant="h6" sx={{ mb: 3, color: '#667eea' }}>
                添加评论
              </Typography>

              <Box>
                <TextField
                  fullWidth
                  label="姓名"
                  value={commentForm.name}
                  onChange={(e) =>
                    setCommentForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="请输入您的姓名"
                  margin="normal"
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="评论内容"
                  multiline
                  rows={isMobile ? 3 : 4}
                  value={commentForm.content}
                  onChange={(e) =>
                    setCommentForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="写下您的想法..."
                  margin="normal"
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submittingComment}
                  onClick={handleCommentSubmit}
                  fullWidth={isMobile}
                  sx={{
                    mt: 3,
                    backgroundColor: '#667eea',
                    '&:hover': { backgroundColor: '#5a67d8' },
                    py: 1.2,
                  }}
                >
                  {submittingComment ? '提交中...' : '提交评论'}
                </Button>
              </Box>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default CardDetail;
