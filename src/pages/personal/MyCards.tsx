import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../netlify/configs';
import { CardData } from '../netlify/types/index';
import { getFontColorForGradient } from '../constants/gradient';
import { formatDate } from '../utils';
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
  CircularProgress,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import useResponsive from '../hooks/useResponsive';

// 卡片数据验证结果
interface ValidationResult {
  isValid: boolean;
  sanitizedCard?: CardData;
}

const MyCards: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();

  // 获取当前登录用户信息
  const getCurrentUser = (): {
    username?: string;
    wechatId?: string;
  } | null => {
    try {
      // 尝试从localStorage获取用户信息，支持多种存储键名
      const userStr =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
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
      title: DOMPurify.sanitize(card.title),
        quote: DOMPurify.sanitize(card.quote),
        detail:
          card.detail
            ? DOMPurify.sanitize(card.detail)
            : undefined,
        imagePath:
          card.imagePath
            ? DOMPurify.sanitize(card.imagePath)
            : undefined,
        font: DOMPurify.sanitize(card.font),
        creator: DOMPurify.sanitize(card.creator),
      username: DOMPurify.sanitize(card.username),
      created: card.created || new Date().toISOString(),
    };

    return { isValid: true, sanitizedCard };
  };

  // 获取卡片数据
  const fetchCards = async (): Promise<Card[]> => {
    try {
      // 使用统一的api对象获取卡片数据
      const response = await api.cards.getAll();

      if (response.success && response.data) {
        return response.data.map(
          (record => ({
              id: record.id || record._id || '',
              title: record.title || '未命名卡片',
        quote: record.quote || '',
        detail: record.detail,
        imagePath: record.imagePath || record.imageUrl,
        font: record.font || 'sans-serif',
        creator: record.creator || '未知作者',
            username: record.username || '',
            created:
              record.created || new Date().toISOString(),
          }) as CardData
        );
      }
      return [];
    } catch (e) {
      console.error('获取卡片失败:', e);
      // 错误处理，保持向后兼容性
      return [];
    }
  };

  // 渲染卡片
  const renderCarouselCard = (card: CardData, index: number): React.JSX.Element => {
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
    const finalImage =
      card.imagePath || '/images/mistyblue.png';



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
            fontFamily: card.font || 'sans-serif',
          }}
        >
          <div className="card-body">
            <div className="title">{card.title}</div>
            <div
              className="quote-box"
              style={{
                backgroundColor: quoteBoxBg,
                color: fontColor,
              }}
            >
              {card.quote}
            </div>
            <img
              src={card.imagePath || '/images/mistyblue.png'}
              alt={card.title || '卡片图片'}
              style={{
                width: '90%',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '12px',
                margin: '0 20px',
              }}
            />
            {card.detail && (
              <div
                className="detail-text"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(card.detail || ''),
                }}
              />
            )}
          </div>
          <div className="card-footer">
            <div className="footer" style={{ color: fontColor }}>
              ——{card.creator || '匿名'} · {formatCardDate(card.created)}
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
  const groupCardsByDate = (cards: CardData[]): { [key: string]: CardData[] } => {
    const grouped: { [key: string]: Card[] } = {};
    cards.forEach((card) => {
      const date = new Date(card.created).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(card);
    });

    // 对每个日期内的卡片按时间倒序排列
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    });

    return grouped;
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

      // 使用cardAPI获取用户自己的卡片
      // 先尝试获取用户卡片，如果失败则获取所有卡片并过滤
      try {
        // 尝试直接获取用户卡片，使用统一的api对象
        const response = await api.cards.getUserCards();
        // 适配不同的响应格式
        const userCards =
          response.success && response.data ? response.data : [];

        // 验证和清理卡片数据
        const myCards = userCards
          .filter(
            (card: any) =>
              card && card.title && card.quote
          )
          .map((card: any) => {
            // 适配可能的字段名差异
            const normalizedCard = {
              id: card.id || card._id,
              title: card.title,
            quote: card.quote,
            detail: card.detail,
            imagePath: card.imagePath || card.image,
            font: card.font,
            creator: card.creator,
              username: card.username,
              created: card.created || card.created_at,
            } as CardData;
            return sanitizeAndValidateCard(normalizedCard, [
              'font',
              'title',
              'quote',
              'creator',
              'username',
              'created',
            ]);
          })
          .filter((result: ValidationResult) => result.isValid)
          .map((result: ValidationResult) => result.sanitizedCard!);

        setCards(myCards);
      } catch (userCardsError) {
        console.warn(
          '获取用户卡片失败，尝试获取所有卡片并过滤:',
          userCardsError
        );

        // 备用方案：获取所有卡片并过滤
        const allCards = await fetchCards();
        const username = currentUser.username || currentUser.wechatId || '';
        const myCards = allCards
          .filter((card) => card.username === username)
          .filter((card) => card && card.title && card.quote)
          .map((card) =>
            sanitizeAndValidateCard(card, [
              'font',
              'title',
              'quote',
              'creator',
              'username',
              'created',
            ])
          )
          .filter((result) => result.isValid)
          .map((result) => result.sanitizedCard!);

        setCards(myCards);
      }
    } catch (err) {
      console.error('加载卡片失败:', err);
      setError('加载失败，请稍后再试');

      // 设置空数组作为备用，避免渲染错误
      setCards([]);
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
                                    fontFamily: card.font || 'sans-serif',
                                  }}
                                >
                                  <Typography
                                    variant="h6"
                                    component="div"
                                    gutterBottom
                                    sx={{ fontWeight: 'bold' }}
                                  >
                                    {card.title}
                                  </Typography>
                                  <Typography variant="body1" paragraph>
                                    {card.quote}
                                  </Typography>
                                  {card.imagePath && (
                                    <Box sx={{ mt: 2, mb: 2 }}>
                                      <CardMedia
                                        component="img"
                                        height="140"
                                        image={card.imagePath}
                                        alt={card.title}
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
                                      ——{card.creator || '匿名'}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                    >
                                      {formatDate(card.created)}
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
