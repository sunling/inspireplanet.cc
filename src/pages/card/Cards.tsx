import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Pagination } from '@mui/material';

import useResponsive from '@/hooks/useResponsive';
import { cardsApi } from '@/netlify/config';

import Loading from '@/components/Loading';
import ErrorCard from '@/components/ErrorCard';
import Empty from '@/components/Empty';
import InspireCard from '@/components/InspireCard';
import { useGlobalSnackbar } from '@/context/app';

const PAGE_SIZE = 6;

const Cards: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  const loadCards = async (currentPage: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await cardsApi.getAll({
        page: currentPage,
        limit: PAGE_SIZE,
      });

      if (!response.success) {
        setError('接口请求失败');
        showSnackbar.error('接口请求失败');
        return;
      }

      const allCards = response.data?.records || [];
      const validCards = allCards.filter(
        (card) => card && card.title && card.detail
      );
      setCards(validCards);
      setTotal(response.data?.total ?? 0);
    } catch (err: any) {
      const text = err.message || '加载失败，请稍后再试';
      setError(text);
      showSnackbar.error(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards(page);
    try {
      (window as any).setCommentForm = (content?: string) => {};
    } catch {}
  }, [page]);

  const handleCardClick = (cardId: string) => {
    navigate(`/card-detail?id=${cardId}`);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columnCount = isMobile ? 1 : isMedium ? 2 : 3;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Box sx={{ minHeight: '100vh', padding: 2, background: '#f8f8fa' }}>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {loading ? (
            <Loading size={40} />
          ) : error ? (
            <ErrorCard />
          ) : cards.length === 0 ? (
            <Empty />
          ) : (
            <>
              <Box
                sx={{
                  columnCount,
                  columnGap: '24px',
                }}
              >
                {cards.map((card) => (
                  <Box
                    key={card.id}
                    sx={{
                      breakInside: 'avoid',
                      mb: '24px',
                    }}
                  >
                    <InspireCard
                      card={card}
                      onCardClick={handleCardClick}
                      canComment={false}
                    />
                  </Box>
                ))}
              </Box>

              {totalPages > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mt: 4,
                    mb: 2,
                  }}
                >
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default Cards;
