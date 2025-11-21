import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Typography, Grid } from "@mui/material";

import useResponsive from "@/hooks/useResponsive";
import { api } from "@/netlify/configs";
import { groupCardsByDate } from "@/utils/helper";
import { formatDate } from "@/utils";
import Loading from "@/components/Loading";
import ErrorCard from "@/components/ErrorCard";
import Empty from "@/components/Empty";
import InspireCard from "@/components/InspireCard";
import { useGlobalSnackbar } from "@/context/app";

const Cards: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedCards, setGroupedCards] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.cards.getAll();

      console.log("查询所有卡片返回", response);

      if (!response.success) {
        setError("接口请求失败");
        showSnackbar.error("接口请求失败");
      }

      let allCards = response.data?.records || [];

      // 过滤有效卡片
      const validCards = allCards.filter(
        (card) => card && card.title && card.detail
      );

      // 按日期分组
      const grouped = groupCardsByDate(validCards);
      setGroupedCards(grouped);
    } catch (err: any) {
      const text = err.message || "加载失败，请稍后再试";
      setError(text);
      showSnackbar.error(text);
    } finally {
      setLoading(false);
    }
  };

  // 加载卡片数据
  useEffect(() => {
    loadCards();
  }, []);

  // 处理卡片点击
  const handleCardClick = (cardId: string) => {
    navigate(`/card-detail?id=${cardId}`);
  };

  // 提交评论
  const handleSubmitComment = async (
    cardId: string,
    name: string,
    comment: string
  ) => {
    if (!name.trim() || !comment.trim()) {
      showSnackbar.warning("请填写姓名和评论内容");
      return;
    }

    try {
      // 使用统一API封装提交评论
      const response = await api.comments.create({
        cardId,
        name,
        comment,
      });

      // 检查响应状态并显示相应消息
      if (response.success) {
        const text = response.message || "评论提交成功！";
        showSnackbar.success(text);
        // todo:可以在这里添加刷新评论列表的逻辑
      } else {
        console.error("提交评论失败:", response.error);
        const text = response.error || "提交评论失败，请稍后再试";
        showSnackbar.error(text);
      }
    } catch (err: any) {
      console.error("提交评论异常:", err);
      const text = "提交评论时发生错误，请稍后再试";
      showSnackbar.error(text);
    }
  };

  // 使用外部的InspireCard组件

  // 获取适当的网格列数
  const getGridColumns = () => {
    if (isMobile) return 1;
    if (isMedium) return 2;
    return 3;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        padding: 2,
        background: "#f8f8fa",
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
                      mb: "1.5rem",
                      pb: "0.5rem",
                      color: "#4a6fa5",
                      textAlign: "left",
                      borderBottom: "1px solid #7aa6e7",
                    }}
                  >
                    {formatDate(date)}
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
                          onSubmitComment={handleSubmitComment}
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
