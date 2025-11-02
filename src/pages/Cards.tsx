import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { cardAPI, commentAPI } from '../service'; // 导入API服务
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Grid,
} from '@mui/material';

// 导入渐变字体颜色配置
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': '#2c3e50',
  'card-gradient-2': '#2c3e50',
  'card-gradient-3': '#2c3e50',
  'card-gradient-4': '#2c3e50',
  'card-gradient-5': '#ffffff',
  'card-gradient-6': '#ffffff',
  'card-gradient-7': '#ffffff',
  'card-gradient-8': '#ffffff',
  'card-gradient-9': '#ffffff',
  'card-gradient-10': '#ffffff',
};

// 定义卡片渐变样式映射
const gradientStyles: Record<string, React.CSSProperties> = {
  'card-gradient-1': {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  'card-gradient-2': {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  'card-gradient-3': {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  'card-gradient-4': {
    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  'card-gradient-5': {
    background: 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)',
  },
  'card-gradient-6': {
    background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  },
  'card-gradient-7': {
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  'card-gradient-8': {
    background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  },
  'card-gradient-9': {
    background: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  },
  'card-gradient-10': {
    background: 'linear-gradient(135deg, #eea849 0%, #f46b45 100%)',
  },
};

// 获取渐变对应的字体颜色
const getFontColorForGradient = (gradientClass: string): string => {
  return gradientFontColors[gradientClass] || '#2c3e50';
};

// 定义卡片接口
interface Card {
  id: string;
  Title: string;
  Quote: string;
  Detail?: string;
  ImagePath?: string;
  Creator?: string;
  Created: string;
  Font?: string;
  gradient?: string;
}

const Cards: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedCards, setGroupedCards] = useState<Record<string, Card[]>>({});
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 定义卡片接口扩展，添加gradient属性
  interface CardWithGradient extends Card {
    gradient?: string;
  }

  // 加载卡片数据
  useEffect(() => {
    const loadCards = async () => {
      debugger;
      try {
        setLoading(true);
        setError(null);

        // 使用cardAPI获取卡片数据
        const response = await cardAPI.fetchCards();
        const allCards = response.records || [];
        setCards(allCards);

        // 过滤有效卡片
        const validCards = allCards.filter(
          (card) => card && card.Title && card.Quote
        );

        // 按日期分组
        const grouped = groupCardsByDate(validCards);
        setGroupedCards(grouped);
      } catch (err: any) {
        debugger;
        console.error('加载卡片失败:', err);
        setError(err.message || '加载失败，请稍后再试');

        // 加载失败时使用备用数据
        const fallbackCards = [
          {
            id: '1',
            Title: '创新思维',
            Quote: '创新是成功的关键',
            Detail: '创新能够帮助我们找到新的解决方案，开拓新的市场机会。',
            Creator: '张三',
            Created: new Date().toISOString(),
            gradient: 'card-gradient-1',
          },
          {
            id: '2',
            Title: '团队协作',
            Quote: '一个人可以走得很快，但一群人可以走得更远',
            Detail:
              '团队协作能够汇集不同的想法和技能，创造出超越个人能力的成果。',
            Creator: '李四',
            Created: new Date().toISOString(),
            gradient: 'card-gradient-2',
          },
          {
            id: '3',
            Title: '成长型思维',
            Quote: '挑战不是阻碍，而是成长的机会',
            Detail: '拥有成长型思维的人相信能力可以通过努力和学习来发展。',
            Creator: '王五',
            Created: new Date(Date.now() - 86400000).toISOString(), // 昨天
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
  const groupCardsByDate = (cards: Card[]): Record<string, Card[]> => {
    const grouped: Record<string, Card[]> = {};

    cards.forEach((card) => {
      const date = new Date(card.Created).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(card);
    });

    return grouped;
  };

  // 格式化日期显示
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
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
      // 使用commentAPI提交评论
      await commentAPI.createComment({
        cardId,
        name,
        comment,
      });

      // 显示成功消息
      alert('评论提交成功！');
    } catch (err: any) {
      console.error('提交评论失败:', err);
      alert(err.message || '提交评论失败，请稍后再试');
    }
  };

  // 卡片组件
  const CardComponent: React.FC<{
    card: Card;
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
    const gradientStyle = gradientStyles[card.gradient || 'card-gradient-1'];
    // Quote box背景色
    const quoteBoxBg = 'rgba(255, 255, 255, 0.9)';
    // 最终图片路径，使用默认图片如果没有提供
    const finalImage = card.ImagePath || '/images/mistyblue.png';

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
            ...gradientStyle,
            color: fontColor,
            fontFamily: card.Font || 'sans-serif',
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
              alt={card.Title}
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
              {card.Title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {formatCardDate(card.Created)}
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
              "{card.Quote}"
            </Typography>
          </Box>

          {/* 卡片详情 */}
          {card.Detail && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">{card.Detail}</Typography>
            </Box>
          )}

          {/* 卡片创作者 */}
          {card.Creator && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                — {card.Creator}
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
