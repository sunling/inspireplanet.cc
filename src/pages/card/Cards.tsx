import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Grid } from '@mui/material';

import useResponsive from '@/hooks/useResponsive';
import { cardsApi } from '@/netlify/config';
import { dateTime, react } from '@/utils/helpers';
import Loading from '@/components/Loading';
import ErrorCard from '@/components/ErrorCard';
import Empty from '@/components/Empty';
import InspireCard from '@/components/InspireCard';
import { useGlobalSnackbar } from '@/context/app';

const Cards: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedCards, setGroupedCards] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  const loadCards = react.withLoading(
    async () => {
      const response = await cardsApi.getAll();

      react.handleApiResponse(
        response,
        (data) => {
          const allCards = data?.records || [];
          const validCards = allCards.filter(
            (card: any) => card && card.title && card.detail
          );
          const grouped = dateTime.groupCardsByDate(validCards);
          setGroupedCards(grouped);
        },
        (error) => {
          setError(error);
          showSnackbar.error(error);
        }
      );
    },
    setLoading,
    setError
  );

  // 加载卡片数据
  useEffect(() => {
    loadCards();
    try {
      (window as any).setCommentForm = (content?: string) => {};
    } catch {}
  }, []);

  // 处理卡片点击
  const handleCardClick = (cardId: string) => {
    navigate(`/card-detail?id=${cardId}`);
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
        background: '#f8f8fa',
      }}
    >
      <Container maxWidth="lg">
        <Box id="cards-content" sx={{ py: 4 }}>
          {loading ? (
            <Loading size={40} />
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
                    variant="h5"
                    sx={{
                      mb: '1.5rem',
                      pb: '0.5rem',
                      color: '#4a6fa5',
                      textAlign: 'left',
                      borderBottom: '1px solid #7aa6e7',
                    }}
                  >
                    {dateTime.formatDate(date)}
                  </Typography>

                  <Grid container spacing={4}>
                    {groupedCards[date].map((card) => (
                      <Grid
                        size={{
                          xs: 12,
                          sm: getGridColumns() === 1 ? 12 : 6,
                          md: Math.floor(12 / getGridColumns()),
                        }}
                        key={card.id}
                      >
                        <InspireCard
                          card={card}
                          onCardClick={handleCardClick}
                          canComment={false}
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
