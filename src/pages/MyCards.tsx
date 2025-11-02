import React, { useState, useEffect, JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Grid,
  Paper,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Avatar,
  Chip,
  Divider,
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

// 获取渐变对应的字体颜色
const getFontColorForGradient = (gradientClass: string): string => {
  return gradientFontColors[gradientClass] || '#2c3e50';
};

// 卡片数据类型定义
interface Card {
  id: string;
  Title: string;
  Quote: string;
  Detail?: string;
  ImagePath?: string;
  Font: string;
  Creator: string;
  Username: string;
  Created: string;
  // 其他可能的字段
}

// 卡片数据验证结果
interface ValidationResult {
  isValid: boolean;
  sanitizedCard?: Card;
}

const MyCards: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 获取当前登录用户信息
  const getCurrentUser = (): any => {
    try {
      const userStr = localStorage.getItem('userData');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (e) {
      console.error('解析用户信息失败:', e);
      return null;
    }
  };

  // 清理和验证卡片数据
  const sanitizeAndValidateCard = (
    card: any,
    requiredFields: string[]
  ): ValidationResult => {
    // 检查必填字段
    for (const field of requiredFields) {
      if (!card[field]) {
        return { isValid: false };
      }
    }

    // 清理HTML内容
    const sanitizedCard: Card = {
      id: card.id || '',
      Title: DOMPurify.sanitize(card.Title),
      Quote: DOMPurify.sanitize(card.Quote),
      Detail: card.Detail ? DOMPurify.sanitize(card.Detail) : '',
      ImagePath: card.ImagePath ? DOMPurify.sanitize(card.ImagePath) : '',
      Font: DOMPurify.sanitize(card.Font),
      Creator: DOMPurify.sanitize(card.Creator),
      Username: DOMPurify.sanitize(card.Username),
      Created: card.Created || new Date().toISOString(),
    };

    return { isValid: true, sanitizedCard };
  };

  // 获取卡片数据
  const fetchCards = async (): Promise<Card[]> => {
    try {
      // 在实际应用中，这里应该调用API获取卡片数据
      // 这里使用模拟数据
      const response = await fetch('/.netlify/functions/getCards');
      if (!response.ok) {
        throw new Error('获取卡片数据失败');
      }
      return await response.json();
    } catch (e) {
      console.error('获取卡片失败:', e);
      // 返回模拟数据
      return [
        {
          id: '1',
          Title: '生活的艺术',
          Quote: '生活不是等待暴风雨过去，而是学会在雨中跳舞。',
          Detail: '每个人的生活都会遇到困难和挑战，关键是我们如何面对。',
          Font: 'font-serif',
          Creator: '张三',
          Username: 'zhangsan',
          Created: new Date().toISOString(),
        },
        {
          id: '2',
          Title: '梦想的力量',
          Quote: '世界会向那些有目标和远见的人让路。',
          Detail: '有了明确的目标，就有了前进的方向。',
          Font: 'font-sans',
          Creator: '张三',
          Username: 'zhangsan',
          Created: new Date(Date.now() - 86400000).toISOString(), // 昨天
        },
      ];
    }
  };

  // 渲染卡片
  const renderCarouselCard = (card: Card, index: number): JSX.Element => {
    // 随机选择一个渐变背景
    const gradients = [
      'card-gradient-1',
      'card-gradient-2',
      'card-gradient-3',
      'card-gradient-4',
      'card-gradient-5',
    ];
    const gradientClass = gradients[index % gradients.length];

    // 获取字体颜色
    const fontColor = getFontColorForGradient(gradientClass);
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
      <div
        key={card.id}
        className="card-container"
        onClick={() => navigate(`/card-detail?id=${card.id}`)}
      >
        <div
          className={`card ${gradientClass}`}
          style={{
            cursor: 'pointer',
            color: fontColor,
            fontFamily: card.Font || 'sans-serif',
          }}
        >
          <div className="card-body">
            <div className="title">{card.Title}</div>
            <div
              className="quote-box"
              style={{
                backgroundColor: quoteBoxBg,
                color: fontColor,
              }}
            >
              {card.Quote}
            </div>
            <img
              src={finalImage}
              alt={card.Title}
              style={{
                width: '90%',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '12px',
                margin: '0 20px',
              }}
            />
            {card.Detail && (
              <div
                className="detail-text"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(card.Detail),
                }}
              />
            )}
          </div>
          <div className="card-footer">
            <div className="footer" style={{ color: fontColor }}>
              ——{card.Creator || '匿名'} · {formatCardDate(card.Created)}
            </div>
          </div>
        </div>
        <div
          className="card-hover-overlay"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="btn btn-warm view-details-btn"
            onClick={() => navigate(`/card-detail?id=${card.id}`)}
          >
            查看详情
          </button>
          <button
            className="btn btn-primary edit-btn"
            onClick={() => navigate(`/card-edit?id=${card.id}`)}
          >
            编辑卡片
          </button>
        </div>
      </div>
    );
  };

  // 按日期分组卡片
  const groupCardsByDate = (cards: Card[]): { [key: string]: Card[] } => {
    const grouped: { [key: string]: Card[] } = {};
    cards.forEach((card) => {
      const date = new Date(card.Created).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(card);
    });

    // 对每个日期内的卡片按时间倒序排列
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort(
        (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime()
      );
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

  // 加载用户卡片
  const loadMyCards = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取当前用户
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 获取所有卡片
      const allCards = await fetchCards();

      if (!allCards || allCards.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // 过滤出当前用户创建的卡片
      const username = currentUser.username || currentUser.email;
      const myCards = allCards
        .filter((card) => card.Username === username)
        .filter((card) => card && card.Title && card.Quote)
        .map((card) =>
          sanitizeAndValidateCard(card, [
            'Font',
            'Title',
            'Quote',
            'Creator',
            'Username',
            'Created',
          ])
        )
        .filter((result) => result.isValid)
        .map((result) => result.sanitizedCard!);

      setCards(myCards);
    } catch (err) {
      console.error('加载卡片失败:', err);
      setError('加载失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyCards();
  }, []);

  // 渲染空状态
  const renderEmptyState = () => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return (
        <div className="empty-state">
          <h3>请先登录</h3>
          <p>登录后才能查看您创建的卡片</p>
          <button
            className="create-card-btn"
            onClick={() => navigate('/login')}
          >
            去登录
          </button>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <h3>您还没有创建过卡片</h3>
        <p>创建一张卡片，记录下您的启发时刻</p>
        <button
          className="create-card-btn"
          onClick={() => navigate('/create-card')}
        >
          创建卡片
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="cards-container">
        <div className="loading-placeholder">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cards-container">
        <div className="text-center p-lg">{error}</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return <div className="cards-container">{renderEmptyState()}</div>;
  }

  // 按日期分组卡片
  const groupedCards = groupCardsByDate(cards);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: 4,
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          我的灵感卡片
        </Typography>

        <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => navigate('/create-card')}
              sx={{ textTransform: 'none', px: 3 }}
            >
              创建新卡片
            </Button>
          </Box>
        </Paper>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 10,
            }}
          >
            <CircularProgress size={48} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 10,
            }}
          >
            <Typography variant="h6" color="error">
              {error}
            </Typography>
          </Box>
        ) : cards.length === 0 ? (
          <Paper
            elevation={1}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            {renderEmptyState()}
          </Paper>
        ) : (
          <Box>
            {Object.keys(groupedCards)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map((date) => {
                const dateCards = groupedCards[date];
                return (
                  <Paper
                    key={date}
                    elevation={2}
                    sx={{
                      mb: 4,
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: '#fafafa',
                        borderBottom: '1px solid #e0e0e0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ color: '#555', fontWeight: 'bold' }}
                      >
                        {formatDate(date)}
                      </Typography>
                      <Chip
                        label={`${dateCards.length} 张卡片`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={3}>
                        {dateCards.map((card, index) => (
                          <Grid
                            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                            key={card.id}
                          >
                            <Card
                              onClick={() =>
                                navigate(`/card-detail?id=${card.id}`)
                              }
                              sx={{
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 3,
                                },
                              }}
                            >
                              <CardContent sx={{ p: 0 }}>
                                <Box
                                  sx={{
                                    p: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    fontFamily: card.Font || 'sans-serif',
                                  }}
                                >
                                  <Typography
                                    variant="h6"
                                    component="div"
                                    gutterBottom
                                    sx={{ fontWeight: 'bold' }}
                                  >
                                    {card.Title}
                                  </Typography>
                                  <Typography variant="body1" paragraph>
                                    {card.Quote}
                                  </Typography>
                                  {card.ImagePath && (
                                    <Box sx={{ mt: 2, mb: 2 }}>
                                      <CardMedia
                                        component="img"
                                        height="140"
                                        image={card.ImagePath}
                                        alt={card.Title}
                                        sx={{
                                          borderRadius: 1,
                                          objectFit: 'contain',
                                        }}
                                      />
                                    </Box>
                                  )}
                                  <Divider sx={{ my: 2 }} />
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      color="textSecondary"
                                    >
                                      ——{card.Creator || '匿名'}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                    >
                                      {formatDate(card.Created)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Paper>
                );
              })}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MyCards;
