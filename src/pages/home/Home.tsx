import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { Container, Button } from "@mui/material";
import { useResponsive } from "../../hooks/useResponsive";
import { ChevronRight, Star } from "@mui/icons-material";
import Carousel from "../../components/Carousel";
import Empty from "../../components/Empty/index";
import Loading from "../../components/Loading/index";
import { api } from "../../netlify/configs";
import { WeeklyCard } from "../../netlify/types/index";
import styles from "./home.module.css";
import ErrorCard from "../../components/ErrorCard/index";

const Home: React.FC = () => {
  const [cards, setCards] = useState<WeeklyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useResponsive();

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
