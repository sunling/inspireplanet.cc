// 轮播组件
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import styles from './index.module.css';
import { useResponsive } from '../../hooks/useResponsive';
import { WeeklyCard } from '@/netlify/types';
import { Box, IconButton } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
export interface CarouselItem extends WeeklyCard {
  category?: string;
}

export interface CarouselProps {
  items: CarouselItem[];
  height?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showIndicators?: boolean;
  showPlayButton?: boolean;
  className?: string;
}

const Carousel: React.FC<CarouselProps> = ({
  items,
  height = '400px',
  autoPlay = true,
  autoPlayInterval = 4000,
  showIndicators = true,
  showPlayButton = true,
  className = '',
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 响应式高度计算
  const getResponsiveHeight = useCallback(() => {
    if (typeof height === 'number') {
      if (isMobile) return `${Math.min(height, 320)}px`;
      if (isTablet) return `${Math.min(height, 400)}px`;
      return `${height}px`;
    }
    return height;
  }, [height, isMobile, isTablet]);

  const direction = useMemo(() => {
    if (isMobile || isTablet) {
      return 'vertical';
    }
    return 'horizontal';
  }, [isMobile, isTablet]);

  // 计算根样式
  const rootStyle = {
    height: getResponsiveHeight(),
    minHeight: '300px',
  };

  // 下一张
  const nextSlide = useCallback(() => {
    setCurrentSlide((current) => (current + 1) % items.length);
  }, [items.length]);

  // 上一张
  const prevSlide = useCallback(() => {
    setCurrentSlide((current) => (current - 1 + items.length) % items.length);
  }, [items.length]);

  // 跳转到指定幻灯片
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  // 开始自动播放
  const startAutoPlay = useCallback(() => {
    if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    autoPlayIntervalRef.current = setInterval(nextSlide, autoPlayInterval);
  }, [autoPlayInterval, nextSlide]);

  // 停止自动播放
  const stopAutoPlay = useCallback(() => {
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
  }, []);

  // 切换自动播放
  // const toggleAutoPlay = useCallback(() => {
  //   if (isPlaying) {
  //     stopAutoPlay();
  //     setIsPlaying(false);
  //   } else {
  //     startAutoPlay();
  //     setIsPlaying(true);
  //   }
  // }, [isPlaying, startAutoPlay, stopAutoPlay]);

  // 初始化和事件监听
  useEffect(() => {
    // 启动自动播放
    if (autoPlay || isPlaying) {
      startAutoPlay();
    }

    return () => {
      stopAutoPlay();
    };
  }, [autoPlay, isPlaying, startAutoPlay, stopAutoPlay]);

  // 悬停暂停
  useEffect(() => {
    if (isHovered) {
      stopAutoPlay();
    } else if (!isHovered && autoPlay && isPlaying) {
      startAutoPlay();
    }
  }, [isHovered, autoPlay, isPlaying, startAutoPlay, stopAutoPlay]);

  // 处理空状态或错误状态
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section
      className={`${styles['component__carousel']} ${className}`}
      style={rootStyle}
    >
      <div
        className={styles[`${direction}-wrapper`]}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {items.map((e, index) => {
          return (
            <Box
              key={e.id}
              className={styles[`${direction}-carousel-content`]}
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              <div className={styles[`${direction}-first`]}>
                <img
                  src={e.imagePath}
                  className={styles[`${direction}-carousel-img`]}
                  alt={e.title || `Slide ${index + 1}`}
                  loading="lazy"
                />
                <div className={styles[`cover-overlay`]}>
                  <div className={styles[`cover-title`]}>{e.title}</div>
                  <div className={styles[`cover-content`]}>{e.quote}</div>
                </div>
              </div>
              <div className={styles[`${direction}-second`]}>
                <div
                  className={styles[`${direction}-item-episode`]}
                >{`${e.episode}. ${e.name}`}</div>
                <div className={styles[`${direction}-item-title`]}>
                  {e.title}
                </div>
                <blockquote className={styles[`${direction}-item-quota`]}>
                  {e.quote}
                </blockquote>

                <div className={styles[`${direction}-item-desc`]}>
                  {e.detail}
                </div>
              </div>
            </Box>
          );
        })}
        {showPlayButton && (
          <div className={styles[`${direction}-carousel-action`]}>
            <IconButton
              className={styles['carousel-arrow-left']}
              sx={{ color: '#667eea' }}
              onClick={prevSlide}
              aria-label="上一张"
            >
              <ArrowBackIosIcon fontSize="small" />
            </IconButton>

            <IconButton
              className={styles['carousel-arrow-right']}
              onClick={nextSlide}
              sx={{ color: '#667eea' }}
              aria-label="下一张"
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </div>
        )}

        {showIndicators && (
          <Box
            className={styles[`${direction}-carousel-indicate`]}
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            {items.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  mt: 2,
                }}
              >
                {items.map((_, index) => {
                  const isActive = index === currentSlide;
                  return (
                    <IconButton
                      key={index}
                      className={styles['indicate-icon']}
                      sx={{
                        backgroundColor: isActive
                          ? '#3f51b5'
                          : 'rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                          backgroundColor: isActive
                            ? '#303f9f'
                            : 'rgba(0, 0, 0, 0.3)',
                        },
                      }}
                      size="small"
                      onClick={() => goToSlide(index)}
                      aria-label={`前往第 ${index + 1} 张幻灯片`}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </div>
    </section>
  );
};

export default Carousel;
