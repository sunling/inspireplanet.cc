import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { downloadCard as utilsDownloadCard } from '@/utils/share';

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import useResponsive from '@/hooks/useResponsive';
import { CardItem } from '../../netlify/types';
import { cardsApi } from '../../netlify/config';
import { getFontColorForGradient } from '@/constants/gradient';
import Loading from '@/components/Loading';
import ErrorCard from '@/components/ErrorCard';
import { useGlobalSnackbar } from '@/context/app';
import { getUserId } from '../../utils';

const CardDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 从查询参数获取卡片ID
  const getCardId = (): string | null => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('id');
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  const [card, setCard] = useState<CardItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 加载卡片详情
  const fetchCardById = async (card_id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // 使用统一API封装获取卡片详情
      const response = await cardsApi.getById(card_id);

      console.log('加载卡片详情返回', response);

      if (!response.success) {
        const text = '获取卡片失败：' + (response.error || '未知错误');
        showSnackbar.error(text);
        return;
      }

      if (!response.data?.records?.length) {
        return;
      }

      const cardData = response?.data?.records[0];

      // 规范化卡片数据格式
      const normalizedCard: CardItem = cardData;

      setCard(normalizedCard);
      checkDeletePermission(normalizedCard);
    } catch (error) {
      console.error('获取卡片失败:', error);
      const text = '获取卡片失败';
      setError('获取卡片详情失败');
      showSnackbar.error(text);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 检查用户是否可以删除卡片
  const checkDeletePermission = (cardData: CardItem) => {
    try {
      // 支持多种用户数据存储键名
      const userId = getUserId() || '';

      setCanDelete(!!userId && userId == cardData.user_id);
    } catch (e) {
      console.error('解析用户信息失败:', e);
      setCanDelete(false);
    }
  };

  // 初始化页面
  useEffect(() => {
    const initPage = async () => {
      const card_id = getCardId();
      if (!card_id) {
        const text = '未找到卡片ID，请返回卡片列表页面重试。';
        setError(text);

        showSnackbar.error(text);

        return;
      }

      fetchCardById(card_id);
    };
    initPage();
  }, [location.search]);

  // 下载卡片为图片
  const handleDownloadCard = async () => {
    if (!card) {
      showSnackbar.error('卡片数据加载失败，无法下载');
      return;
    }

    try {
      setDownloading(true);

      // 使用cardRef获取DOM元素
      const cardElement =
        document.getElementById('detail-card') || cardRef.current;

      if (!cardElement) {
        showSnackbar.error('找不到卡片元素，下载失败');
        return;
      }

      // 执行下载
      const success = await utilsDownloadCard(
        cardElement,
        `inspiration-${
          card.title?.replace(/[^\w\u4e00-\u9fa5]/g, '-') || 'card'
        }`
      );

      if (success) {
        showSnackbar.success('图片下载成功！');
      } else {
        showSnackbar.error('图片下载失败，请稍后重试');
      }
    } catch (error) {
      console.error('下载过程中出错:', error);
      showSnackbar.error('下载过程中发生错误，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  // 处理删除按钮点击
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  // 确认删除
  const handleDeleteConfirm = async () => {
    const card_id = getCardId();
    if (!card_id) return;

    setDeleting(true);
    try {
      const response = await cardsApi.delete(card_id);
      if (!response.success) {
        showSnackbar.error('删除失败：' + (response.error || '未知错误'));
        return;
      }
      showSnackbar.success('卡片已删除');
      navigate('/cards');
    } catch (error) {
      console.error('删除卡片失败:', error);
      showSnackbar.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // 取消删除
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
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
          <span dangerouslySetInnerHTML={{ __html: html as string }} />
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
        background: '#fffaf6',
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
                  backgroundColor: 'var(--primary)',
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
              elevation={0}
              sx={{
                mb: 6,
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e9e0d7',
                backgroundColor: '#fff',
              }}
            >
              <div className="card-container">
                <div
                  id="detail-card"
                  ref={cardRef}
                  className={`card ${card?.gradient_class || 'card-gradient-1'}`}
                  style={{
                    fontFamily: card?.font || 'Noto Sans SC, sans-serif',
                    color: getFontColorForGradient(
                      card?.gradient_class || 'card-gradient-1'
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
                    {card?.is_private && (
                      <Chip
                        icon={<LockOutlinedIcon />}
                        label="仅自己可见"
                        size="small"
                        sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.72)' }}
                      />
                    )}
                    <Typography
                      variant={isMobile ? 'h5' : 'h4'}
                      component="h1"
                      sx={{
                        fontWeight: 'bold',
                        mb: 3,
                        color: getFontColorForGradient(
                          card?.gradient_class || 'card-gradient-1'
                        ),
                      }}
                    >
                      {card ? sanitizeContent(card.title) : ''}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: `${getFontColorForGradient(
                          card?.gradient_class || 'card-gradient-1'
                        )}10`,
                        p: 3,
                        borderRadius: '8px',
                        mb: 3,
                        fontStyle: 'italic',
                        position: 'relative',
                        pl: 4,
                        '&::before': {
                          content: '"“"',
                          position: 'absolute',
                          left: 12,
                          top: -10,
                          fontSize: '2.6rem',
                          lineHeight: 1,
                          color: getFontColorForGradient(
                            card?.gradient_class || 'card-gradient-1'
                          ),
                          opacity: 0.2,
                        },
                      }}
                    >
                      <Typography
                        variant={isMobile ? 'body1' : 'h6'}
                        sx={{
                          color: getFontColorForGradient(
                            card?.gradient_class || 'card-gradient-1'
                          ),
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {sanitizeContent(card?.quote || '')}
                      </Typography>
                    </Box>
                    {(card?.image_path || card?.upload) && (
                      <Box sx={{ mb: 3 }}>
                        <img
                          src={card.image_path || card.upload}
                          alt={card?.title || ''}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            maxHeight: '400px',
                            objectFit: 'cover',
                            transition: isMobile
                              ? 'none'
                              : 'transform 0.5s ease',
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
                    )}
                    {card?.detail && (
                      <Box sx={{ mt: 4 }}>
                        {/* todo */}
                        <Typography
                          variant="body1"
                          sx={{
                            color: getFontColorForGradient(
                              card?.gradient_class || 'card-gradient-1'
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
                      alignItems: 'flex-start',
                      flexDirection: 'row',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getFontColorForGradient(
                            card?.gradient_class || 'card-gradient-1'
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
                            card?.gradient_class || 'card-gradient-1'
                          ),
                          opacity: 0.6,
                          mt: 0.5,
                        }}
                      >
                        {card
                          ? new Date(card.created).toLocaleDateString('zh-CN')
                          : ''}
                      </Typography>
                    </Box>
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
                loading={downloading}
                onClick={handleDownloadCard}
                sx={{
                  backgroundColor: '#c95837',
                  '&:hover': { backgroundColor: '#a9462c' },
                  py: 1.5,
                  px: { xs: 3, sm: 4 },
                  minWidth: { xs: 'auto', sm: '140px' },
                }}
              >
                下载卡片
              </Button>

              {canDelete && (
                <Button
                  id="edit-btn"
                  variant="contained"
                  onClick={() => navigate(`/card-edit/${card?.id}`)}
                  sx={{
                    backgroundColor: '#38a169',
                    '&:hover': { backgroundColor: '#319754' },
                    py: 1.5,
                    px: { xs: 3, sm: 4 },
                    minWidth: { xs: 'auto', sm: '140px' },
                  }}
                >
                  编辑卡片
                </Button>
              )}

              {canDelete && (
                <Button
                  id="delete-btn"
                  variant="contained"
                  disabled={deleting}
                  onClick={handleDeleteClick}
                  sx={{
                    backgroundColor: '#c53030',
                    '&:hover': { backgroundColor: '#9b2c2c' },
                    py: 1.5,
                    px: { xs: 3, sm: 4 },
                    minWidth: { xs: 'auto', sm: '140px' },
                  }}
                >
                  {deleting ? '删除中...' : '删除卡片'}
                </Button>
              )}
            </Box>

            {/* 删除确认对话框 */}
            <Dialog
              open={showDeleteDialog}
              onClose={handleDeleteCancel}
              aria-labelledby="delete-dialog-title"
            >
              <DialogTitle id="delete-dialog-title">确认删除</DialogTitle>
              <DialogContent>
                <Typography>确定要删除这张卡片吗？此操作无法撤销。</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDeleteCancel} disabled={deleting}>
                  取消
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  color="error"
                  variant="contained"
                >
                  {deleting ? '删除中...' : '确认删除'}
                </Button>
              </DialogActions>
            </Dialog>

          </>
        )}
      </Container>
    </Box>
  );
};

export default CardDetail;
