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
  CircularProgress,
  useMediaQuery,
  useTheme,
  Grid,
  Alert,
} from '@mui/material';

// 导入渐变字体颜色配置
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': 'rgb(107, 33, 168)',
  'card-gradient-2': 'rgb(234, 88, 12)',
  'card-gradient-3': 'rgb(13, 148, 136)',
  'card-gradient-4': 'rgb(79, 70, 229)',
  'card-gradient-5': 'rgb(220, 38, 38)',
};

const getFontColorForGradient = (gradient: string): string => {
  return gradientFontColors[gradient] || 'rgb(0, 0, 0)';
};

// 定义周刊卡片接口
interface WeeklyCard {
  id: string;
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
  imageUrl?: string;
  gradient: string;
  createdAt: string;
  updatedAt: string;
}

const WeeklyCards: React.FC = () => {
  const [cards, setCards] = useState<WeeklyCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<WeeklyCard[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [episodes, setEpisodes] = useState<string[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 定义错误状态
  const [error, setError] = useState<string | null>(null);

  // 加载卡片数据
  useEffect(() => {
    const loadWeeklyCards = async () => {
      try {
        setLoading(true);
        setError(null);

        // 使用正确的API端点，与HTML中的实现保持一致
        const response = await fetch(`/.netlify/functions/fetchWeeklyCards`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API错误: ${response.status}`);
        }

        const data = await response.json();
        const allCards = data.records || [];

        // 规范化卡片数据格式
        const normalizedCards = allCards.map((card: any) => ({
          id: card.id || '',
          episode: card.Episode || '',
          name: card.Name || '',
          title: card.Title || '',
          quote: card.Quote || '',
          detail: card.Detail || '',
          imageUrl: card.ImagePath || '',
          gradient: 'card-gradient-1', // 默认渐变样式
          createdAt: card.Created || new Date().toISOString(),
          updatedAt: card.Created || new Date().toISOString(),
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

  // 过滤卡片
  useEffect(() => {
    if (selectedEpisode === 'all') {
      setFilteredCards(cards);
    } else {
      setFilteredCards(
        cards.filter((card) => card.episode === selectedEpisode)
      );
    }
  }, [selectedEpisode, cards]);

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

  // 处理期数选择变化
  const handleEpisodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEpisode(e.target.value);
  };

  // 按期数分组卡片
  const groupedCards = filteredCards.reduce(
    (groups: Record<string, WeeklyCard[]>, card) => {
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          component="h1"
          sx={{
            textAlign: 'center',
            mb: 6,
            color: 'white',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          启发星球周刊
        </Typography>

        {/* 期数过滤器 */}
        <Paper
          elevation={3}
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
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: '#667eea' }}>
              选择期数
            </Typography>
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '40vh',
            }}
          >
            <CircularProgress size={60} color="inherit" />
          </Box>
        ) : sortedEpisodes.length === 0 ? (
          <Paper
            elevation={3}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              暂无卡片数据
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={4}>
            {sortedEpisodes.map((episode) => (
              <Grid size={{ xs: 12, md: 6 }} key={episode}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="h4"
                    component="h2"
                    id={`episode-${episode.toLowerCase()}`}
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    {episode}
                  </Typography>
                </Paper>

                <Grid
                  container
                  spacing={3}
                  id={`episode-container-${episode.toLowerCase()}`}
                >
                  {groupedCards[episode].map((card) => {
                    const fontColor = getFontColorForGradient(card.gradient);
                    return (
                      <Grid key={card.id}>
                        <Box
                          sx={{
                            position: 'relative',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <Paper
                            elevation={3}
                            className={`${card.gradient}`}
                            id={`card-${card.id}`}
                            sx={{
                              height: '100%',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              p: 4,
                              color: fontColor,
                              position: 'relative',
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                              {card.title}
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
                                {card.quote}
                              </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                              <img
                                src={card.imageUrl || '/images/mistyblue.png'}
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
                                {new Date(card.createdAt).toLocaleDateString(
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
                              '&:hover': { backgroundColor: '#5a67d8' },
                              minWidth: 'auto',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
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
