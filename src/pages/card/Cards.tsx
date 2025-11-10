import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Grid,
  Card,
} from '@mui/material';

import { any } from '@/netlify/types';
import useResponsive from '@/hooks/useResponsive';
import { api } from '@/netlify/configs';
import { getFontColorForGradient } from '@/constants/gradient';
import { formatDate } from '@/utils';

// 使用导入的CardData类型

const Cards: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedCards, setGroupedCards] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();

  // 已在外部定义CardWithGradient

  // 加载卡片数据
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        setError(null);

        // 使用统一API封装获取卡片数据
        const response = await api.cards.getAll();

        // 确保数据格式正确处理
        const allCards =
          response.success && Array.isArray(response.data) ? response.data : [];

        // 规范化卡片数据格式 - 处理不同格式的数据
        const normalizedCards = allCards.map((card: any) => ({
          id: card.id || card.ID || '',
          title: card.title || '',
          content: card.content || card.quote || '',
          detail: card.detail || '',
          author: card.author || '未知',
          createdAt: card.createdAt || card.created || new Date().toISOString(),
          updated:
            card.updated ||
            card.createdAt ||
            card.created ||
            new Date().toISOString(),
          gradient: card.gradient || card.Gradient || 'card-gradient-1', // 确保有默认渐变样式
          // 为了向后兼容保留以下属性
          quote: card.quote || card.content || '',
          creator: card.creator || card.author || '未知',
          created: card.createdAt || card.created || new Date().toISOString(),
        }));

        setCards(normalizedCards as any);

        // 过滤有效卡片
        const validCards = normalizedCards.filter(
          (card) => card && card.title && card.content
        );

        // 按日期分组
        const grouped = groupCardsByDate(validCards);
        setGroupedCards(grouped);
      } catch (err: any) {
        console.error('加载卡片失败:', err);
        setError(err.message || '加载失败，请稍后再试');

        // 加载失败时使用备用数据
        const fallbackCards = [
          {
            id: '1',
            title: '创新思维',
            content: '创新是成功的关键',
            detail: '创新能够帮助我们找到新的解决方案，开拓新的市场机会。',
            author: '张三',
            createdAt: new Date().toISOString(),
            gradient: 'card-gradient-1',
          },
          {
            id: '2',
            title: '团队协作',
            content: '一个人可以走得很快，但一群人可以走得更远',
            detail:
              '团队协作能够汇集不同的想法和技能，创造出超越个人能力的成果。',
            author: '李四',
            createdAt: new Date().toISOString(),
            gradient: 'card-gradient-2',
          },
          {
            id: '3',
            title: '成长型思维',
            content: '挑战不是阻碍，而是成长的机会',
            detail: '拥有成长型思维的人相信能力可以通过努力和学习来发展。',
            author: '王五',
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 昨天
            gradient: 'card-gradient-3',
          },
        ];
        setCards(fallbackCards);
        const grouped = groupCardsByDate(fallbackCards);
        setGroupedCards(grouped);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, []);

  // 按日期分组卡片
  const groupCardsByDate = (cards: any[]): Record<string, any[]> => {
    const grouped: Record<string, any[]> = {};

    cards.forEach((card) => {
      const date = new Date(card.created || '').toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(card);
    });

    return grouped;
  };

  // 处理卡片点击
  const handleCardClick = (cardId: string) => {
    navigate(`/card-detail?id=${cardId}`);
  };

  // 提交评论
  const handleSubmitComment = async (
    cardId: string,
    name: string,
    comment: string
  ) => {
    if (!name.trim() || !comment.trim()) {
      alert('请填写姓名和评论内容');
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
        alert(response.message || '评论提交成功！');
        // 可以在这里添加刷新评论列表的逻辑
      } else {
        console.error('提交评论失败:', response.error);
        alert(response.error || '提交评论失败，请稍后再试');
      }
    } catch (err: any) {
      console.error('提交评论异常:', err);
      alert('提交评论时发生错误，请稍后再试');
    }
  };

  // 卡片组件
  const CardComponent: React.FC<{
    card: any;
    onCardClick: (id: string) => void;
    onSubmitComment: (id: string, name: string, comment: string) => void;
  }> = ({ card, onCardClick, onSubmitComment }) => {
    const [showCommentForm, setShowCommentForm] = useState<boolean>(false);
    const [commentName, setCommentName] = useState<string>('');
    const [commentText, setCommentText] = useState<string>('');

    // 获取字体颜色和渐变样式
    const fontColor = getFontColorForGradient(
      card.gradient || 'card-gradient-1'
    );
    // const gradientStyle = gradientStyle[card.gradient || 'card-gradient-1'];
    const gradientStyle = 'card-gradient-1';
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
              {formatCardDate(card.createdAt || card.created || '')}
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
              "{card.content || card.quote}"
            </Typography>
          </Box>

          {/* 卡片详情 */}
          {card.detail && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">{card.detail}</Typography>
            </Box>
          )}

          {/* 卡片创作者 */}
          {card.author && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                — {card.author}
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
            variant="outlined"
            color="inherit"
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Box id="cards-content" sx={{ py: 4 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 10,
              }}
            >
              <CircularProgress size={60} color="inherit" />
            </Box>
          ) : error ? (
            <Box sx={{ py: 6 }}>
              <Alert severity="error" sx={{ textAlign: 'center' }}>
                {error}
              </Alert>
            </Box>
          ) : Object.keys(groupedCards).length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 10,
              }}
            >
              <Typography variant="h6" sx={{ color: 'white' }}>
                暂无卡片数据
              </Typography>
            </Box>
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
                      color: 'white',
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
    </Box>
  );
};

export default Cards;
