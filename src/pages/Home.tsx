import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  IconButton,
  Paper,
  useMediaQuery,
  useTheme,
  Chip,
  useScrollTrigger,
  Fade,
  Zoom,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Pause,
  PlayArrow,
  ChevronRight,
  FlashOn,
  Star,
} from '@mui/icons-material';

interface CardData {
  id: string;
  title: string;
  quote: string;
  coverUrl: string;
  author: string;
  date: string;
  tags: string[];
}

const Home: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMedium = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // 监听滚动以控制动画
  const trigger = useScrollTrigger();

  // 加载最新卡片数据
  const loadLatestCards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 这里应该调用API获取卡片数据
      // 现在使用模拟数据
      const mockCards: CardData[] = [
        {
          id: '1',
          title: '生命的意义',
          quote:
            '生命的意义不在于你呼吸了多少次，而在于有多少个让你屏住呼吸的时刻。',
          coverUrl: '/images/MorningRunlight.png',
          author: '匿名用户',
          date: '2024-01-15',
          tags: ['人生感悟', '哲理'],
        },
        {
          id: '2',
          title: '创新思维',
          quote: '创新不是推翻一切，而是在现有基础上看到新的可能性。',
          coverUrl: '/images/mistyblue.png',
          author: '李小明',
          date: '2024-01-14',
          tags: ['创新', '思维'],
        },
        {
          id: '3',
          title: '坚持不懈',
          quote: '成功的秘诀在于即使看不到希望，也依然选择坚持。',
          coverUrl: '/images/MistyMorningOnaCountryRoad.png',
          author: '王小红',
          date: '2024-01-13',
          tags: ['坚持', '成功'],
        },
      ];

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCards(mockCards);
      setIsLoading(false);
    } catch (err) {
      setError('加载卡片失败，请稍后重试');
      setIsLoading(false);
      console.error('加载卡片错误:', err);
    }
  };

  // 轮播相关函数
  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === cards.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? cards.length - 1 : prevIndex - 1
    );
  };

  // 自动播放
  const startAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    autoPlayRef.current = setInterval(nextSlide, 5000);
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const toggleAutoPlay = () => {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
    setIsPlaying(!isPlaying);
  };

  // 键盘导航处理
  const handleKeyboardNavigation = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextSlide();
        break;
      case ' ':
        e.preventDefault();
        toggleAutoPlay();
        break;
    }
  };

  // 触摸滑动支持
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const diffX = touchStartX.current - touch.clientX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      touchStartX.current = touch.clientX;
    }
  };

  // 初始化和清理
  useEffect(() => {
    loadLatestCards();

    // 键盘导航
    window.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation);
      stopAutoPlay();
    };
  }, []);

  // 自动播放
  useEffect(() => {
    if (cards.length > 1 && isPlaying) {
      startAutoPlay();
    }

    return () => {
      stopAutoPlay();
    };
  }, [cards.length, isPlaying]);

  // 渲染轮播内容
  const renderCarouselContent = () => {
    if (isLoading) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            py: 8,
          }}
        >
          <CircularProgress color="primary" size={60} />
          <Typography variant="h6" sx={{ mt: 4 }}>
            加载中...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            py: 8,
            px: 2,
          }}
        >
          <Typography
            variant="h6"
            color="error"
            sx={{ mb: 4, textAlign: 'center' }}
          >
            {error}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={loadLatestCards}
            sx={{ px: 4 }}
          >
            重新加载
          </Button>
        </Box>
      );
    }

    if (cards.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            py: 8,
            px: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 4, textAlign: 'center' }}>
            暂无最新卡片内容
          </Typography>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/cards"
            endIcon={<ChevronRight />}
            sx={{ px: 4 }}
          >
            查看所有卡片
          </Button>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'flex',
          transition: 'transform 0.5s ease-in-out',
          transform: `translateX(-${currentIndex * 100}%)`,
          width: `${cards.length * 100}%`,
        }}
      >
        {cards.map((card) => (
          <Box
            key={card.id}
            sx={{
              flex: `0 0 ${100 / cards.length}%`,
              padding: 2,
            }}
          >
            <Zoom in={true} style={{ transitionDelay: '150ms' }}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  '&:hover': {
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.15)',
                  },
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* 封面图片 */}
                <Box
                  sx={{
                    width: isMobile ? '100%' : '40%',
                    minWidth: isMobile ? '100%' : 300,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <CardMedia
                    component="img"
                    height={isMobile ? 200 : '100%'}
                    image={card.coverUrl}
                    alt={card.title}
                    sx={{
                      objectFit: 'cover',
                      width: '100%',
                      transition: 'transform 0.5s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6))',
                      display: 'none',
                      [theme.breakpoints.down('md')]: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 2,
                      },
                    }}
                  >
                    <Box sx={{ color: 'white', textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 'bold', mb: 1 }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {card.quote}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 卡片内容 */}
                <CardContent
                  sx={{
                    width: isMobile ? '100%' : '60%',
                    padding: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* 元数据 */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        作者: {card.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ·
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {card.date}
                      </Typography>
                    </Box>

                    {/* 标题和引用 */}
                    <Fade in={true} style={{ transitionDelay: '250ms' }}>
                      <div>
                        <Typography
                          variant={isMobile ? 'h6' : 'h5'}
                          component="h2"
                          gutterBottom
                          sx={{
                            fontWeight: 600,
                            color: '#333',
                            display: '-webkit-box',
                            WebkitLineClamp: isMobile ? 1 : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {card.title}
                        </Typography>
                        <Typography
                          variant="body1"
                          paragraph
                          sx={{
                            fontStyle: 'italic',
                            color: 'text.primary',
                            lineHeight: 1.8,
                            [theme.breakpoints.down('md')]: {
                              display: 'none',
                            },
                          }}
                        >
                          {card.quote}
                        </Typography>
                      </div>
                    </Fade>
                  </div>

                  <div>
                    {/* 标签和操作按钮 */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {card.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            icon={
                              isMobile ? undefined : <Star fontSize="inherit" />
                            }
                            sx={{
                              backgroundColor: '#f0f4ff',
                              color: '#667eea',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              '&:hover': {
                                backgroundColor: '#e0e7ff',
                              },
                            }}
                          />
                        ))}
                      </Box>
                      <Button
                        variant="contained"
                        component={Link}
                        to={`/card-detail/${card.id}`}
                        endIcon={<ChevronRight fontSize="small" />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          backgroundColor: '#667eea',
                          '&:hover': {
                            backgroundColor: '#5a67d8',
                          },
                          paddingLeft: 2,
                          paddingRight: 2,
                          minWidth: isMobile ? 'auto' : '120px',
                        }}
                      >
                        查看详情
                      </Button>
                    </Box>
                  </div>
                </CardContent>
              </Card>
            </Zoom>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ py: { xs: 4, md: 8 }, bgcolor: '#fafafa' }}>
      <Container maxWidth="lg">
        {/* 轮播部分 */}
        <Box sx={{ mb: 8 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <FlashOn color="primary" sx={{ fontSize: 24 }} />
            </Box>
            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              component="h1"
              sx={{
                mb: 2,
                fontWeight: 700,
                color: '#667eea',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              最新启发卡片
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              探索来自社区的灵感与智慧，发现新的思考方式和生活感悟
            </Typography>
          </Box>

          <Paper
            elevation={2}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            <Box
              sx={{
                overflow: 'hidden',
                position: 'relative',
                minHeight: isMobile ? 350 : 450,
                background:
                  'linear-gradient(to bottom right, #f0f4ff, #ffffff)',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onMouseEnter={() => stopAutoPlay()}
              onMouseLeave={() => isPlaying && startAutoPlay()}
            >
              {renderCarouselContent()}
            </Box>

            {/* 轮播控制按钮 */}
            {cards.length > 1 && (
              <>
                {/* 左右箭头 */}
                <IconButton
                  className="carousel-control prev"
                  onClick={prevSlide}
                  aria-label="上一张"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 16,
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                    minWidth: isMobile ? 36 : 40,
                    width: isMobile ? 36 : 40,
                    height: isMobile ? 36 : 40,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    opacity: isHovered ? 1 : 0.7,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <ArrowBack />
                </IconButton>
                <IconButton
                  className="carousel-control next"
                  onClick={nextSlide}
                  aria-label="下一张"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    right: 16,
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                    minWidth: isMobile ? 36 : 40,
                    width: isMobile ? 36 : 40,
                    height: isMobile ? 36 : 40,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    opacity: isHovered ? 1 : 0.7,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <ArrowForward />
                </IconButton>

                {/* 播放/暂停按钮 - 仅在桌面显示 */}
                {!isMobile && (
                  <IconButton
                    id="play-btn"
                    className="carousel-control play"
                    onClick={toggleAutoPlay}
                    aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                      },
                      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                      width: 40,
                      height: 40,
                    }}
                  >
                    {isPlaying ? (
                      <Pause sx={{ fontSize: 20 }} />
                    ) : (
                      <PlayArrow sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                )}

                {/* 指示器 */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: isMobile ? 12 : 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: isMobile ? 6 : 8,
                  }}
                >
                  {cards.map((_, index) => (
                    <IconButton
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      aria-label={`转到幻灯片 ${index + 1}`}
                      size="small"
                      sx={{
                        width: isMobile ? 6 : 8,
                        height: isMobile ? 6 : 8,
                        minWidth: isMobile ? 6 : 8,
                        padding: 0,
                        borderRadius: '50%',
                        backgroundColor:
                          index === currentIndex
                            ? '#667eea'
                            : 'rgba(102, 126, 234, 0.3)',
                        '&:hover': {
                          backgroundColor:
                            index === currentIndex
                              ? '#5a67d8'
                              : 'rgba(102, 126, 234, 0.5)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Paper>

          {/* 查看全部按钮 */}
          <Box
            sx={{
              mt: 6,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="contained"
              component={Link}
              to="/cards"
              endIcon={<ChevronRight />}
              sx={{
                px: isMobile ? 3 : 4,
                py: 1.2,
                borderRadius: '28px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                backgroundColor: '#667eea',
                '&:hover': {
                  backgroundColor: '#5a67d8',
                },
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                minWidth: isMobile ? '100%' : 'auto',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star fontSize="inherit" />
                查看所有卡片
              </Box>
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
