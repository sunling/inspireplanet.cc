import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
} from '@mui/material';

import { CardItem } from '@/netlify/types';
import useResponsive from '@/hooks/useResponsive';
import { api } from '@/netlify/configs';
import { getFontColorForGradient, gradientStyles } from '@/constants/gradient';
import { formatDate } from '@/utils';
import { groupCardsByDate } from '@/utils/helper';
import Loading from '@/components/Loading';
import ErrorCard from '@/components/ErrorCard';
import Empty from '@/components/Empty';
import useSnackbar from '@/hooks/useSnackbar';

const Cards: React.FC = () => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedCards, setGroupedCards] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();
  const { showSnackbar, SnackbarComponent } = useSnackbar();

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.cards.getAll();

      console.log('查询所有卡片返回', response);

      if (!response.success) {
        setError('接口请求失败');
        showSnackbar.error('接口请求失败');
      }

      let allCards = response.data?.records || [];

      setCards(allCards as any);

      // 过滤有效卡片
      const validCards = allCards.filter(
        (card) => card && card.title && card.detail
      );

      // 按日期分组
      const grouped = groupCardsByDate(validCards);
      setGroupedCards(grouped);
    } catch (err: any) {
      const text = err.message || '加载失败，请稍后再试';
      setError(text);
      showSnackbar.error(text);
    } finally {
      setLoading(false);
    }
  };

  // 加载卡片数据
  useEffect(() => {
    loadCards();
  }, []);

  // 处理卡片点击
  const handleCardClick = (cardId: string) => {
    navigate(`/card-detail/${cardId}`);
  };

  // 提交评论
  const handleSubmitComment = async (
    cardId: string,
    name: string,
    comment: string
  ) => {
    if (!name.trim() || !comment.trim()) {
      showSnackbar.warning('请填写姓名和评论内容');
      return;
    }

    try {
      // 使用统一API封装提交评论
      const response = await api.comments.create({
        cardId,
        name,
        comment,
      });

      // 检查响应状态并显示相应消息
      if (response.success) {
        const text = response.message || '评论提交成功！';
        showSnackbar.success(text);
        // todo:可以在这里添加刷新评论列表的逻辑
      } else {
        console.error('提交评论失败:', response.error);
        const text = response.error || '提交评论失败，请稍后再试';
        showSnackbar.error(text);
      }
    } catch (err: any) {
      console.error('提交评论异常:', err);
      const text = '提交评论时发生错误，请稍后再试';
      showSnackbar.error(text);
    }
  };

  // 卡片组件
  const CardComponent: React.FC<{
    card: CardItem;
    onCardClick: (id: string) => void;
    onSubmitComment: (id: string, name: string, comment: string) => void;
  }> = ({ card, onCardClick, onSubmitComment }) => {
    const [showCommentForm, setShowCommentForm] = useState<boolean>(false);
    const [commentName, setCommentName] = useState<string>('');
    const [commentText, setCommentText] = useState<string>('');

    // 获取字体颜色和渐变样式
    const fontColor = getFontColorForGradient(
      card.gradientClass || 'card-gradient-1'
    );
    const gradientStyle =
      gradientStyles[card.gradientClass || 'card-gradient-1'];
    // Quote box背景色
    const quoteBoxBg = 'rgba(255, 255, 255, 0.9)';
    // 最终图片路径，使用默认图片如果没有提供
    const finalImage = card.imagePath || '/images/mistyblue.png';

    // 格式化创建日期
    const formatCardDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <Box
        sx={{
          position: 'relative',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:hover': {
            transform: 'translateY(-4px)',
            transition: 'transform 0.3s ease',
          },
        }}
        onClick={() => onCardClick(card.id)}
      >
        <Card
          sx={{
            color: fontColor,
            fontFamily: 'sans-serif',
            borderRadius: '8px',
            padding: 2,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            ...gradientStyle,
          }}
        >
          {/* 卡片图片 */}
          {finalImage && (
            <Box
              component="img"
              src={finalImage}
              alt={card.title || '卡片图片'}
              loading="lazy"
              sx={{
                width: '100%',
                height: 'auto',
                borderRadius: '4px',
                mb: 2,
              }}
            />
          )}

          {/* 卡片标题 */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              sx={{ fontWeight: 'bold', mb: 1 }}
            >
              {card.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {formatCardDate(card.created || '')}
            </Typography>
          </Box>

          {/* 卡片引言 */}
          <Box
            sx={{
              backgroundColor: quoteBoxBg,
              padding: 2,
              borderRadius: '4px',
              mb: 2,
              color: '#333',
            }}
          >
            <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
              "{card.quote || ''}"
            </Typography>
          </Box>

          {/* 卡片详情 */}
          {card.detail && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">{card.detail}</Typography>
            </Box>
          )}

          {/* 卡片创作者 */}
          {card.creator && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                — {card.creator}
              </Typography>
            </Box>
          )}
        </Card>

        {/* 卡片操作区域 */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2,
            opacity: 0,
            '&:hover': {
              opacity: 1,
              transition: 'opacity 0.3s ease',
            },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="contained"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            sx={{ mb: 2 }}
            onClick={() => onCardClick(card.id)}
          >
            查看详情
          </Button>

          {showCommentForm && (
            <Box
              sx={{
                width: '100%',
                backgroundColor: 'white',
                padding: 2,
                borderRadius: '4px',
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: '#333', fontWeight: 'bold' }}
              >
                添加评论
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="你的名字"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                margin="dense"
                onClick={(e) => e.stopPropagation()}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="写下你的想法..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                margin="dense"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="small"
                onClick={() =>
                  onSubmitComment(card.id, commentName, commentText)
                }
              >
                提交评论
              </Button>
            </Box>
          )}

          <Button
            variant="contained"
            color="success"
            size={isMobile ? 'small' : 'medium'}
            onClick={(e) => {
              e.stopPropagation();
              setShowCommentForm(!showCommentForm);
            }}
          >
            {showCommentForm ? '取消' : '添加评论'}
          </Button>
        </Box>
      </Box>
    );
  };

  // 获取适当的网格列数
  const getGridColumns = () => {
    if (isMobile) return 1;
    if (isMedium) return 2;
    return 3;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        padding: 2,
        background: '#f7f8f9',
      }}
    >
      <Container maxWidth="lg">
        <Box id="cards-content" sx={{ py: 4 }}>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorCard />
          ) : Object.keys(groupedCards).length === 0 ? (
            <Empty />
          ) : (
            // 按日期排序（最新的在前）
            Object.keys(groupedCards)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map((date) => (
                <Box key={date} sx={{ mb: 8 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      mb: 4,
                      color: '#4a6fa5',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {formatDate(date)}
                  </Typography>
                  <Grid
                    container
                    spacing={4}
                    sx={{
                      '& > .MuiGrid-item': {
                        display: 'flex',
                      },
                    }}
                  >
                    {groupedCards[date].map((card) => (
                      <Grid
                        size={{
                          xs: 12,
                          sm: getGridColumns() === 1 ? 12 : 6,
                          md: Math.floor(12 / getGridColumns()),
                        }}
                        key={card.id}
                      >
                        <CardComponent
                          card={card}
                          onCardClick={handleCardClick}
                          onSubmitComment={handleSubmitComment}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))
          )}
        </Box>
      </Container>
      <SnackbarComponent />
    </Box>
  );
};

export default Cards;
