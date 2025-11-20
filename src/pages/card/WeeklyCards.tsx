import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import useResponsive from '@/hooks/useResponsive';

import {
  getFontColorForGradient,
  getRandomGradientClass,
} from '@/constants/gradient';
import { WeeklyCard } from '@/netlify/types';
import { api } from '@/netlify/configs';
import { useGlobalSnackbar } from '@/context/app';
import Empty from '@/components/Empty';
import Loading from '@/components/Loading';

export interface WeeklyCardItem extends WeeklyCard {
  gradient: string;
}

const WeeklyCards: React.FC = () => {
  const [cards, setCards] = useState<WeeklyCardItem[]>([]);
  const [filteredCards, setFilteredCards] = useState<WeeklyCardItem[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const { isMobile, isMedium } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  // 定义错误状态
  const [error, setError] = useState<string | null>(null);

  // 加载卡片数据
  useEffect(() => {
    const loadWeeklyCards = async () => {
      try {
        setLoading(true);
        setError(null);

        // 使用统一API封装获取周刊卡片数据
        const res = await api.weeklyCards.getAll();
        console.log('获取到的周刊卡片数据:', res);

        if (!res.success) {
          setError('获取周刊卡片数据失败');
          showSnackbar.error('获取周刊卡片数据失败');
          return;
        }

        const allCards = res?.data?.records || [];

        // 规范化卡片数据格式
        const normalizedCards = allCards.map((card: WeeklyCard) => ({
          ...card,
          gradient: 'card-gradient-1', // 默认渐变样式
        }));

        setCards(normalizedCards);
        setFilteredCards(normalizedCards);

        // 提取所有唯一的期数
        const uniqueEpisodes = Array.from(
          new Set(normalizedCards.map((card: WeeklyCard) => card.episode))
        ).sort((a, b) => {
          // 按期数降序排序
          const numA = parseInt((a as string).replace(/\D/g, ''));
          const numB = parseInt((b as string).replace(/\D/g, ''));
          return numB - numA;
        });

        console.log('uniqueEpisodes:', uniqueEpisodes);
        setEpisodes(uniqueEpisodes as string[]);
      } catch (error: any) {
        console.error('加载周刊卡片失败:', error);
        setError('加载数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyCards();
  }, []);

  // 输入去抖
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // 过滤卡片（期数 + 关键字）
  useEffect(() => {
    const base =
      selectedEpisode === 'all'
        ? cards
        : cards.filter((card) => card.episode === selectedEpisode);

    if (!debouncedQuery) {
      setFilteredCards(base);
      return;
    }

    const q = debouncedQuery.toLowerCase();
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

    const match = (card: WeeklyCardItem) => {
      const title = (card.title || '').toLowerCase();
      const quote = (card.quote || '').toLowerCase();
      const detailText = stripHtml(card.detail || '').toLowerCase();
      const name = (card.name || '').toLowerCase();
      return (
        title.includes(q) ||
        quote.includes(q) ||
        detailText.includes(q) ||
        name.includes(q)
      );
    };

    setFilteredCards(base.filter(match));
  }, [selectedEpisode, cards, debouncedQuery]);

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const renderHighlighted = (text: string, query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return text;
    const reg = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    const parts = text.split(reg);
    return parts.map((part, i) =>
      reg.test(part) ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>
    );
  };

  // 下载卡片功能
  const handleDownloadCard = async (cardId: string) => {
    try {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (!cardElement) return;

      // 隐藏下载按钮
      const downloadButton = cardElement.querySelector('.download-btn');
      if (downloadButton) {
        (downloadButton as HTMLElement).style.display = 'none';
      }

      // 使用html2canvas捕获卡片
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // 恢复下载按钮显示
      if (downloadButton) {
        (downloadButton as HTMLElement).style.display = 'block';
      }

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `weekly-card-${cardId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('下载卡片失败:', error);
      // 显示用户友好的错误消息
      if (error instanceof Error) {
        alert(`下载失败: ${error.message}`);
      }
    }
  };

  // 按期数分组卡片
  const groupedCards = filteredCards.reduce(
    (groups: Record<string, WeeklyCardItem[]>, card) => {
      const episode = card.episode;
      if (!groups[episode]) {
        groups[episode] = [];
      }
      groups[episode].push(card);
      return groups;
    },
    {}
  );

  // 按期数排序
  const sortedEpisodes = Object.keys(groupedCards).sort((a, b) => {
    return parseInt(b.replace(/\D/g, '')) - parseInt(a.replace(/\D/g, ''));
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 8,
        background: '#fff9f0',
      }}
    >
      <Container maxWidth="lg">

        {/* 搜索与期数过滤器 */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 6,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 2 : 3,
              width: '100%',
            }}
          >
            <Box sx={{ width: '100%', maxWidth: 600, flex: 1 }}>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入标题/引语/正文/作者，支持模糊搜索"
                size={isMobile ? 'small' : 'medium'}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && (
                        <IconButton aria-label="清空" onClick={() => setSearchQuery('')} edge="end">
                          ✕
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#667eea33',
                    },
                    '&:hover fieldset': {
                      borderColor: '#667eea66',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
            </Box>
            <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
              <InputLabel id="episode-filter-label">期数</InputLabel>
              <Select
                labelId="episode-filter-label"
                id="episode-filter"
                value={selectedEpisode}
                label="期数"
                onChange={(event) => setSelectedEpisode(event.target.value)}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#667eea33',
                    },
                    '&:hover fieldset': {
                      borderColor: '#667eea66',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              >
                <MenuItem value="all">所有期数</MenuItem>
                {episodes.map((episode) => (
                  <MenuItem key={episode} value={episode}>
                    {episode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* 卡片容器 */}
        {loading ? (
          <Loading size={60} />
        ) : sortedEpisodes.length === 0 ? (
          <Empty message="暂无卡片数据" />
        ) : (
          <Grid container spacing={4}>
            {sortedEpisodes.map((episode) => (
              <Grid key={episode} size={{ xs: 12 }}>
                <Typography
                  variant="h4"
                  component="h2"
                  id={`episode-${episode.toLowerCase()}`}
                  sx={{
                    fontWeight: 'bold',
                    paddingBottom: '1rem',
                    marginBottom: '1.5rem',
                    color: '#667eea',
                    borderBottom: '1px solid #667eea',
                  }}
                >
                  {episode}
                </Typography>

                <Grid
                  container
                  spacing={3}
                  id={`episode-container-${episode.toLowerCase()}`}
                >
                  {groupedCards[episode].map((card) => {
                    const fontColor = getFontColorForGradient(card.gradient);
                    const randomGradientClass = getRandomGradientClass();
                    return (
                      <Grid key={card.id} size={{ xs: 12, md: 6 }}>
                        <Box
                          sx={{
                            position: 'relative',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <Paper
                            elevation={1}
                            id={`card-${card.id}`}
                            className={randomGradientClass}
                            sx={{
                              height: '100%',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              p: 4,
                              color: fontColor,
                              position: 'relative',

                              backdropFilter: 'blur(10px)',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <Typography
                              variant="h5"
                              component="h3"
                              sx={{
                                fontWeight: 'bold',
                                mb: 2,
                                color: fontColor,
                              }}
                            >
                              {renderHighlighted(card.title, debouncedQuery)}
                            </Typography>

                            <Box
                              sx={{
                                backgroundColor: `${fontColor}10`,
                                p: 2,
                                borderRadius: '8px',
                                mb: 3,
                                fontStyle: 'italic',
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{ color: fontColor }}
                              >
                                {renderHighlighted(card.quote, debouncedQuery)}
                              </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                              <img
                                src={card.imagePath || '/images/mistyblue.png'}
                                alt={card.title}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  borderRadius: '8px',
                                  maxHeight: '200px',
                                  objectFit: 'cover',
                                }}
                              />
                            </Box>

                            <Box
                              sx={{
                                fontSize: '1rem',
                                lineHeight: 1.6,
                                mb: 3,
                                flexGrow: 1,
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(card.detail),
                                }}
                              />
                            </Box>

                            <Box
                              sx={{
                                mt: 'auto',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: fontColor, opacity: 0.8 }}
                              >
                                — {card.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: fontColor, opacity: 0.8 }}
                              >
                                {new Date(card.created).toLocaleDateString(
                                  'zh-CN'
                                )}
                              </Typography>
                            </Box>
                          </Paper>

                          <Button
                            className="download-btn"
                            onClick={() => handleDownloadCard(card.id)}
                            title="下载卡片"
                            sx={{
                              position: 'absolute',
                              bottom: 10,
                              right: 10,
                              backgroundColor: '#667eea',
                              '&:hover': {
                                backgroundColor: '#5a67d8',
                                opacity: '1',
                              },
                              minWidth: 'auto',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              color: 'white',
                              opacity: '0.5',
                              p: 0,
                            }}
                          >
                            <Typography variant="caption">下载</Typography>
                          </Button>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 返回首页链接 */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Button
            variant="contained"
            component={Link}
            to="/"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#667eea',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              py: 1.2,
              px: 4,
            }}
          >
            返回首页
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default WeeklyCards;
