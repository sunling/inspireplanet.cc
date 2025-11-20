import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/netlify/configs';
import { CardItem } from '@/netlify/types';
import { formatDate, getCurrentUser } from '@/utils';
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
  Chip,
  Divider,
} from '@mui/material';
import useResponsive from '@/hooks/useResponsive';
import { useGlobalSnackbar } from '@/context/app';
import Loading from '@/components/Loading';
import Empty from '@/components/Empty';

// 卡片数据验证结果
interface ValidationResult {
  isValid: boolean;
  sanitizedCard?: CardItem;
}

const MyCards: React.FC = () => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

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
    const sanitizedCard: CardItem = {
      id: card.id || '',
      title: DOMPurify.sanitize(card.title),
      quote: DOMPurify.sanitize(card.quote),
      detail: card.detail ? DOMPurify.sanitize(card.detail) : undefined,
      imagePath: card.imagePath
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
  const fetchMyCards = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser?.username) {
        showSnackbar.error('请先登录');
        return [];
      }
      setLoading(true);
      setError(null);
      // 使用统一的api对象获取卡片数据
      const response = await api.cards.getAll();
      if (!response.success) {
        showSnackbar.error(response.error || '获取卡片失败，请稍后再试');
        return [];
      }

      const records = response?.data?.records || [];
      const list =
        records.filter(
          (item) =>
            item.username === currentUser.username ||
            item.creator === currentUser.username
        ) || [];
      setCards(list);
    } catch (e) {
      console.error('获取卡片失败:', e);
      showSnackbar.error('获取卡片失败，请稍后再试');
      setError('获取卡片失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化卡片日期
  const formatCardDate = (dateString?: string): string => {
    if (!dateString) return '';
    return formatDate(new Date(dateString).toISOString());
  };

  // 按日期分组卡片
  const groupCardsByDate = (
    cards: CardItem[]
  ): { [key: string]: CardItem[] } => {
    const grouped: { [key: string]: CardItem[] } = {};
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

  // 按日期分组卡片
  const groupedCards = groupCardsByDate(cards);

  useEffect(() => {
    fetchMyCards();
  }, []);

  // 渲染空状态
  const renderEmptyState = () => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return <Empty description="登录后才能查看您创建的卡片" />;
    }

    return (
      <Empty
        description="创建一张卡片，记录下您的启发时刻"
        message="创建卡片"
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-light)', py: 4 }}>
        <Container maxWidth="lg">
          <Loading />
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-light)', py: 4 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h6"
            color="error"
            textAlign="center"
            sx={{ py: 10 }}
          >
            {error}
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-light)', py: 4 }}>
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

        {cards.length === 0 ? (
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
                                  <Typography variant="body1">
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
