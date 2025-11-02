import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { cardAPI, commentAPI } from '../service'; // 导入API服务
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';

// 导入渐变字体颜色配置
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': 'rgb(107, 33, 168)',
  'card-gradient-2': 'rgb(234, 88, 12)',
  'card-gradient-3': 'rgb(13, 148, 136)',
  'card-gradient-4': 'rgb(79, 70, 229)',
  'card-gradient-5': 'rgb(220, 38, 38)',
};

const getFontColorForGradient = (gradient: string): string => {
  return gradientFontColors[gradient] || 'rgb(0, 0, 0)';
};

interface CardData {
  id: string;
  Title: string;
  Quote: string;
  Detail?: string;
  ImagePath?: string;
  Creator?: string;
  Font?: string;
  GradientClass?: string;
  Upload?: string;
  Created: string;
  Username?: string;
}

interface CommentData {
  id?: string;
  name: string;
  comment: string;
  created: string;
}

const CardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [card, setCard] = useState<CardData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      // 使用cardAPI获取卡片详情
      const response = await cardAPI.fetchCardById(cardId);

      // 处理不同格式的响应数据
      if (!response) return null;

      // 规范化卡片数据格式
      const normalizedCard: CardData = {
        id: response.id || response._id || '',
        Title: response.Title || response.title || '未命名卡片',
        Quote: response.Quote || response.quote || '',
        Detail: response.Detail || response.detail,
        ImagePath: response.ImagePath || response.image || response.Upload,
        Creator: response.Creator || response.creator,
        Font: response.Font || response.font,
        GradientClass: response.GradientClass || response.gradient,
        Created:
          response.Created || response.created_at || new Date().toISOString(),
        Username: response.Username || response.username,
      };

      return normalizedCard;
    } catch (error) {
      console.error('获取卡片失败:', error);
      return null;
    }
  };

  // 加载评论
  const fetchComments = async (cardId: string) => {
    try {
      // 使用commentAPI获取评论
      const response = await commentAPI.fetchComments(cardId);

      // 处理不同格式的响应数据
      const commentData =
        response?.records || (response as any)?.comments || [];

      // 规范化评论数据格式
      return commentData.map(
        (comment: any): CommentData => ({
          id: comment.id || comment._id,
          name: comment.name || '匿名用户',
          comment: comment.comment || comment.content || '',
          created:
            comment.created || comment.created_at || new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('获取评论失败:', error);
      return [];
    }
  };

  // 检查用户是否可以编辑卡片
  const checkEditPermission = (cardData: CardData) => {
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
      const cardUsername = cardData.Username || '';

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
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 加载卡片详情
        const cardData = await fetchCardById(id);
        if (!cardData) {
          setError('未找到该卡片，可能已被删除或ID无效。');

          // 设置默认卡片数据避免页面渲染错误
          const defaultCard: CardData = {
            id: id,
            Title: '卡片未找到',
            Quote: '该卡片可能已被删除或ID无效',
            Created: new Date().toISOString(),
          };
          setCard(defaultCard);
          setIsLoading(false);
          return;
        }

        setCard(cardData);
        checkEditPermission(cardData);

        // 加载评论
        const commentsData = await fetchComments(id);
        setComments(commentsData);
      } catch (err) {
        console.error('加载卡片详情失败:', err);
        setError('加载失败，请稍后再试。');

        // 设置默认卡片数据避免页面渲染错误
        const defaultCard: CardData = {
          id: id,
          Title: '加载失败',
          Quote: '卡片加载过程中发生错误',
          Created: new Date().toISOString(),
        };
        setCard(defaultCard);
      } finally {
        setIsLoading(false);
      }
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
      alert('请输入您的名字');
      return;
    }

    if (!commentForm.content.trim()) {
      alert('请输入评论内容');
      return;
    }

    if (!id) return;

    setSubmittingComment(true);
    try {
      // 使用commentAPI提交评论
      const response = await commentAPI.createComment({
        cardId: id,
        name: commentForm.name,
        comment: commentForm.content,
      });

      // 处理不同格式的响应数据
      const commentId =
        response?.data?.id || (response as any)?.id || (response as any)?._id;

      // 添加新评论
      const newComment: CommentData = {
        id: commentId,
        name: commentForm.name,
        comment: commentForm.content,
        created: new Date().toISOString(),
      };

      setComments((prev) => [newComment, ...prev]);

      // 重置表单
      setCommentForm({ name: '', content: '' });

      alert('评论提交成功！');
    } catch (error: any) {
      console.error('提交评论失败:', error);
      alert(error.message || '评论提交失败，请稍后再试');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 格式化日期
  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${
      date.getMonth() + 1
    }月${date.getDate()}日 ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  };

  // 清理和处理内容
  const sanitizeContent = (content: string | undefined) => {
    if (!content) return '';
    return DOMPurify.sanitize(content);
  };

  // 处理Markdown内容
  const renderMarkdown = (text: string | undefined) => {
    if (!text) return '';
    marked.setOptions({ breaks: true });
    const html = marked.parse(sanitizeContent(text));
    return <div dangerouslySetInnerHTML={{ __html: html as string }} />;
  };

  // 渲染卡片内容
  const renderCard = () => {
    if (!card) return null;
    const gradientClass = card.GradientClass || 'card-gradient-1';
    const fontColor = getFontColorForGradient(gradientClass);

    return (
      <div className="card-container">
        <div
          id="detail-card"
          ref={cardRef}
          className={`card ${gradientClass}`}
          style={{
            fontFamily: card.Font || 'Noto Sans SC, sans-serif',
            color: fontColor,
          }}
        >
          <div className="card-body">
            <div className="title">{sanitizeContent(card.Title)}</div>
            <div
              className="quote-box"
              style={{ backgroundColor: `${fontColor}10` }}
            >
              {sanitizeContent(card.Quote)}
            </div>
            <img
              src={card.ImagePath || '/images/mistyblue.png'}
              alt={card.Title}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
            {card.Detail && (
              <div className="detail-text">{renderMarkdown(card.Detail)}</div>
            )}
          </div>
          <div className="card-footer">
            <div className="footer">
              {card.Creator ? `— ${sanitizeContent(card.Creator)}` : ''}
            </div>
            <div className="date">
              {new Date(card.Created).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染评论列表
  const renderComments = () => {
    if (comments.length === 0) {
      return <div className="no-comments">暂无评论</div>;
    }

    return (
      <div className="comments-container">
        {comments.map((comment) => (
          <div key={comment.id || comment.created} className="comment">
            <div className="comment-header">
              <span className="comment-author">
                {sanitizeContent(comment.name)}
              </span>
              <span className="comment-date">
                {formatCommentDate(comment.created)}
              </span>
            </div>
            <div className="comment-body">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeContent(comment.comment).replace(
                    /\n/g,
                    '<br>'
                  ),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60vh',
            }}
          >
            <CircularProgress size={60} color="inherit" />
          </Box>
        ) : error ? (
          <Box sx={{ mt: 8 }}>
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/cards')}
              sx={{
                backgroundColor: '#667eea',
                '&:hover': { backgroundColor: '#5a67d8' },
              }}
            >
              返回卡片列表
            </Button>
          </Box>
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
                  className={`card ${card?.GradientClass || 'card-gradient-1'}`}
                  style={{
                    fontFamily: card?.Font || 'Noto Sans SC, sans-serif',
                    color: getFontColorForGradient(
                      card?.GradientClass || 'card-gradient-1'
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
                          card?.GradientClass || 'card-gradient-1'
                        ),
                      }}
                    >
                      {card ? sanitizeContent(card.Title) : ''}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: `${getFontColorForGradient(
                          card?.GradientClass || 'card-gradient-1'
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
                            card?.GradientClass || 'card-gradient-1'
                          ),
                        }}
                      >
                        {sanitizeContent(card?.Quote || '')}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                      <img
                        src={card?.ImagePath || '/images/mistyblue.png'}
                        alt={card?.Title || ''}
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
                    {card?.Detail && (
                      <Box sx={{ mt: 4 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: getFontColorForGradient(
                              card?.GradientClass || 'card-gradient-1'
                            ),
                            lineHeight: 1.8,
                          }}
                        >
                          {renderMarkdown(card.Detail)}
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
                          card?.GradientClass || 'card-gradient-1'
                        ),
                        opacity: 0.8,
                      }}
                    >
                      {card?.Creator
                        ? `— ${sanitizeContent(card.Creator)}`
                        : ''}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: getFontColorForGradient(
                          card?.GradientClass || 'card-gradient-1'
                        ),
                        opacity: 0.8,
                      }}
                    >
                      {card
                        ? new Date(card.Created).toLocaleDateString('zh-CN')
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
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    暂无评论
                  </Typography>
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
                          {sanitizeContent(comment.name)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCommentDate(comment.created)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeContent(comment.comment).replace(
                              /\n/g,
                              '<br>'
                            ),
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
                  {submittingComment ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      提交中...
                    </Box>
                  ) : (
                    '提交评论'
                  )}
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
