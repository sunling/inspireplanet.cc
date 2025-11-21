// 轮播组件
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import styles from "./index.module.css";
import { useResponsive } from "../../hooks/useResponsive";
import { WeeklyCard } from "@/netlify/types";
import { Box, IconButton } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DownloadIcon from "@mui/icons-material/Download";
import { getRandomGradientClass } from "@/constants/gradient";
import DOMPurify from "dompurify";
import { marked } from "marked";
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
  height = "600px",
  autoPlay = true,
  autoPlayInterval = 3000,
  showIndicators = true,
  showPlayButton = true,
  className = "",
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gradientClassesRef = useRef<string[]>([]);
  const firstRefs = useRef<HTMLDivElement[]>([]);
  marked.setOptions({ breaks: true });

  // 响应式高度计算
  const getResponsiveHeight = useCallback(() => {
    if (typeof height === "number") {
      if (isMobile) return `${Math.min(height, 400)}px`;
      if (isTablet) return `${Math.min(height, 520)}px`;
      return `${height}px`;
    }
    return height;
  }, [height, isMobile, isTablet]);

  const direction = useMemo(() => {
    if (isMobile || isTablet) {
      return "vertical";
    }
    return "horizontal";
  }, [isMobile, isTablet]);

  // 计算根样式
  const rootStyle = {
    height: getResponsiveHeight(),
    minHeight: "300px",
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
    // 为每个条目生成一次随机背景类，保证渲染稳定
    gradientClassesRef.current = items.map(() => getRandomGradientClass());

    // 启动自动播放
    if (autoPlay || isPlaying) {
      startAutoPlay();
    }

    return () => {
      stopAutoPlay();
    };
  }, [autoPlay, isPlaying, startAutoPlay, stopAutoPlay]);

  const downloadSlide = async (index: number) => {
    try {
      const el = firstRefs.current[index];
      if (!el) return;
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      const safeTitle = (items[index]?.title || "weekly-card").replace(
        /[^a-zA-Z0-9\u4e00-\u9fa5]/g,
        "-"
      );
      link.download = `weekly-card-${safeTitle}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (_) {}
  };

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
      className={`${styles["component__carousel"]} ${className}`}
      style={rootStyle}
    >
      <div
        className={styles[`${direction}-wrapper`]}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {items.map((e, index) => {
          const bgClass =
            gradientClassesRef.current[index] || "card-gradient-1";
          return (
            <Box
              key={e.id}
              className={`${
                styles[`${direction}-carousel-content`]
              } ${bgClass}`}
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              <div
                className={styles[`${direction}-first`]}
                ref={(el) => {
                  if (el) firstRefs.current[index] = el;
                }}
                id={`carousel-first-${e.id}`}
              >
                <img
                  src={e.imagePath}
                  className={styles[`${direction}-carousel-img`]}
                  alt={e.title || `Slide ${index + 1}`}
                  loading="lazy"
                />
                <div className={styles[`cover-overlay`]}>
                  <div className={styles[`cover-title`]}>{e.title}</div>
                  <IconButton
                    aria-label="下载"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      downloadSlide(index);
                    }}
                    sx={{
                      position: "absolute",
                      right: 12,
                      bottom: 12,
                      backgroundColor: "#b2bceaff",
                      color: "#fff",
                      opacity: 0.85,
                      "&:hover": { opacity: 1 },
                    }}
                    size="small"
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </div>
                {direction === "vertical" && (
                  <div className={styles["vertical-quote"]}>{e.quote}</div>
                )}
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

                <div
                  className={styles[`${direction}-item-desc`]}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      e.detail ? marked.parse(e.detail).toString() : ""
                    ),
                  }}
                />
              </div>
            </Box>
          );
        })}
        {showPlayButton && (
          <div className={styles[`${direction}-carousel-action`]}>
            <IconButton
              className={styles["carousel-arrow-left"]}
              sx={{ color: "var(--primary)" }}
              onClick={prevSlide}
              aria-label="上一张"
            >
              <ArrowBackIosIcon fontSize="small" />
            </IconButton>

            <IconButton
              className={styles["carousel-arrow-right"]}
              onClick={nextSlide}
              sx={{ color: "var(--primary)" }}
              aria-label="下一张"
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </div>
        )}

        {showIndicators && (
          <Box
            className={styles[`${direction}-carousel-indicate`]}
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            {items.length > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                  mt: 2,
                }}
              >
                {items.map((_, index) => {
                  const isActive = index === currentSlide;
                  return (
                    <IconButton
                      key={index}
                      className={styles["indicate-icon"]}
                      sx={{
                        backgroundColor: isActive ? "#ff5a36" : "#ffb6c1",
                        "&:hover": {
                          backgroundColor: "#ff5a36",
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
