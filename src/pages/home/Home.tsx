import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { Container, Button, Box, Typography, Paper, IconButton } from "@mui/material";
import { useResponsive } from "../../hooks/useResponsive";
import { ChevronRight, Star } from "@mui/icons-material";
import Carousel from "../../components/Carousel";
import Empty from "../../components/Empty/index";
import Loading from "../../components/Loading/index";
import { api } from "../../netlify/configs";
import { WeeklyCard } from "../../netlify/types/index";
import styles from "./home.module.css";
import ErrorCard from "../../components/ErrorCard/index";
import { getFontColorForGradient, getRandomGradientClass } from "@/constants/gradient";
import DOMPurify from "dompurify";
import { marked } from "marked";
import html2canvas from "html2canvas";

const Home: React.FC = () => {
  const [cards, setCards] = useState<WeeklyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gradients, setGradients] = useState<string[]>([]);
  marked.setOptions({ breaks: true });

  // 加载最新卡片数据
  const fetchLatestCards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用统一API封装获取最新卡片数据
      const response = await api.weeklyCards.getLatest();

      const records = response?.data?.records || [];

      const formattedCards: WeeklyCard[] = records.filter(
        (card: WeeklyCard) => card.title && card.quote
      ); // 过滤无效卡片

      setCards(formattedCards);
      setGradients(formattedCards.map(() => getRandomGradientClass()));
      setIsLoading(false);
    } catch (err) {
      console.error("加载卡片错误:", err);
      setError("加载卡片失败，请稍后重试");
      setIsLoading(false);
    }
  };

  // 初始化和清理
  useEffect(() => {
    fetchLatestCards();
  }, []);

  useEffect(() => {
    if (!isMobile || cards.length === 0) return;
    const t = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 5000);
    return () => clearInterval(t);
  }, [isMobile, cards.length]);

  const handleDownloadMobile = async (cardId: string) => {
    const el = document.getElementById(`home-mobile-card-${cardId}`);
    if (!el) return;
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement("a");
    const safeTitle = (cards[currentIndex]?.title || "card").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-");
    link.download = `weekly-card-${safeTitle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // 渲染轮播内容
  const renderCarouselContent = () => {
    if (isLoading) {
      return <Loading message="加载卡片中..." size={24} />;
    }

    if (error) {
      return (
        <ErrorCard
          message={error}
          description="请稍后重试或检查网络连接"
          onRetry={fetchLatestCards}
          retryText="重新加载"
        />
      );
    }

    if (cards.length === 0) {
      return (
        <Empty
          message="暂无最新卡片内容"
          description="前往卡片页面查看更多精彩内容"
        />
      );
    }

    if (isMobile) {
      const card = cards[currentIndex];
      const gradientClass = gradients[currentIndex] || "card-gradient-1";
      const fontColor = getFontColorForGradient(gradientClass);
      return (
        <Box sx={{ px: 1 }}>
          <Paper
            elevation={1}
            id={`home-mobile-card-${card.id}`}
            className={gradientClass}
            sx={{
              borderRadius: "12px",
              overflow: "hidden",
              p: 3,
              color: fontColor,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", mb: 2, color: fontColor }}
            >
              {card.title}
            </Typography>

            <Box
              sx={{
                backgroundColor: `${fontColor}10`,
                p: 2,
                borderRadius: "8px",
                mb: 3,
                fontStyle: "italic",
                position: "relative",
                pl: 4,
                "&::before": {
                  content: '"“"',
                  position: "absolute",
                  left: 8,
                  top: -10,
                  fontSize: "2.2rem",
                  lineHeight: 1,
                  color: fontColor,
                  opacity: 0.2,
                },
              }}
            >
              <Typography variant="body1" sx={{ color: fontColor, whiteSpace: "pre-line" }}>
                {card.quote}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <img
                src={card.imagePath || "/images/mistyblue.png"}
                alt={card.title}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  maxHeight: "240px",
                  objectFit: "cover",
                }}
              />
            </Box>

            <Box sx={{ fontSize: "1rem", lineHeight: 1.6, mb: 3 }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    card.detail ? marked.parse(card.detail).toString() : ""
                  ),
                }}
              />
            </Box>

            <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: fontColor, opacity: 0.8 }}>
                — {card.name}
              </Typography>
              <Typography variant="caption" sx={{ color: fontColor, opacity: 0.8 }}>
                {new Date(card.created).toLocaleDateString("zh-CN")}
              </Typography>
            </Box>

            <IconButton
              aria-label="下载"
              onClick={() => handleDownloadMobile(card.id)}
              sx={{
                position: "absolute",
                bottom: 10,
                right: 10,
                backgroundColor: "#667eea",
                color: "white",
                opacity: 0.8,
                "&:hover": { opacity: 1 },
              }}
              size="small"
            >
              下载
            </IconButton>
          </Paper>
        </Box>
      );
    }

    return (
      <Carousel
        items={cards}
        autoPlay={true}
        autoPlayInterval={5000}
        showIndicators={true}
      />
    );
  };

  return (
    <div className={styles["home-container"]}>
      <Container maxWidth="lg">
        {/* 轮播部分 */}
        <section className={styles["carousel-section"]}>
          <div className={styles["section-header"]}>
            {/* <h2 className={styles["section-title"]}>最新启发卡片</h2> */}
            {/* <p className={styles["section-description"]}>
              探索来自社区的灵感与智慧，发现新的思考方式和生活感悟
            </p> */}
          </div>

          <div className={styles["carousel-container"]}>
            {renderCarouselContent()}
          </div>

          {/* 查看全部按钮 */}
          <div className={styles["view-all-container"]}>
            <Button
              variant="contained"
              component={Link}
              to="/cards"
              endIcon={<ChevronRight />}
              className={`${styles["view-all-button"]} ${
                isMobile ? styles["mobile-button"] : ""
              }`}
            >
              <Star fontSize="inherit" />
              查看所有卡片
            </Button>
          </div>
        </section>
      </Container>
    </div>
  );
};

export default Home;
