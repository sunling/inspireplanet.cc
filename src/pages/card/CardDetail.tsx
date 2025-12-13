import React, { useState, useEffect, useRef, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { marked } from "marked";

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Divider,
} from "@mui/material";
import useResponsive from "@/hooks/useResponsive";
import { CardItem, Comment } from "@/netlify/types";
import { api } from "@/netlify/configs";
import { getFontColorForGradient } from "@/constants/gradient";
import Loading from "@/components/Loading";
import Empty from "@/components/Empty";
import ErrorCard from "@/components/ErrorCard";
import { useGlobalSnackbar } from "@/context/app";

const CardDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 从查询参数获取卡片ID
  const getCardId = (): string | null => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("id");
  };

  const cardId = getCardId();
  const cardRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  const [card, setCard] = useState<CardItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 评论表单状态
  const [commentForm, setCommentForm] = useState({
    content: "",
  });
  const [submittingComment, setSubmittingComment] = useState(false);

  // 加载卡片详情
  const fetchCardById = async (cardId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // 使用统一API封装获取卡片详情
      const response = await api.cards.getById(cardId);

      console.log("加载卡片详情返回", response);

      if (!response.success) {
        const text = "获取卡片失败：" + (response.error || "未知错误");
        showSnackbar.error(text);
        return;
      }

      if (!response.data?.records?.length) {
        return;
      }

      const cardData = response?.data?.records[0];

      // 规范化卡片数据格式
      const normalizedCard: CardItem = {
        id: cardData.id || "",
        title: cardData.title || "未命名卡片",
        quote: cardData.quote || "",
        detail: cardData.detail,
        imagePath: cardData.imagePath || cardData.upload,
        creator: cardData.creator,
        font: cardData.font,
        gradientClass: cardData.gradientClass || "card-gradient-1",
        created: cardData.created || new Date().toISOString(),
        username: cardData.username || cardData.creator,
      };

      setCard(normalizedCard);
    } catch (error) {
      console.error("获取卡片失败:", error);
      const text = "获取卡片失败";
      setError("获取卡片详情失败");
      showSnackbar.error(text);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 加载评论
  const fetchComments = async (cardId: string) => {
    try {
      // 使用统一的api对象获取评论
      const response = await api.comments.getByCardId(cardId);
      console.log("fetchComments返回", response);

      if (!response.success) {
        const text = "获取评论失败：" + (response.error || "未知错误");
        showSnackbar.error(text);
        return;
      }

      const commentData = response.data?.comments || [];

      // 规范化评论数据格式，支持更多可能的字段名
      const list = commentData.map(
        (comment: any): Comment => ({
          id: comment.id,
          name: comment.name || comment.creator || "匿名用户",
          comment: comment.comment || comment.content || "",
          created: comment.created || new Date().toISOString(),
          cardId: comment.cardId || cardId, // 确保cardId存在
          createdAt: comment.comment.created || new Date().toISOString(),
        })
      );
      setComments(list);
    } catch (error) {
      console.error("获取评论失败:", error);
      showSnackbar.error("获取评论失败");

      return [];
    }
  };

  // 检查用户是否可以编辑卡片
  const checkEditPermission = (cardData: CardItem) => {
    try {
      // 支持多种用户数据存储键名
      const userData =
        localStorage.getItem("userInfo") || localStorage.getItem("userData");
      if (!userData) {
        setCanEdit(false);
        return;
      }

      const user = JSON.parse(userData);
      const currentUsername = user.username || "";
      const cardUsername = cardData.username || "";

      setCanEdit(currentUsername && currentUsername === cardUsername);
    } catch (e) {
      console.error("解析用户信息失败:", e);
      setCanEdit(false);
    }
  };

  // 初始化页面
  useEffect(() => {
    const initPage = async () => {
      const cardId = getCardId();
      if (!cardId) {
        const text = "未找到卡片ID，请返回卡片列表页面重试。";
        setError(text);

        showSnackbar.error(text);

        return;
      }

      fetchCardById(cardId);
      fetchComments(cardId);
    };
    initPage();
  }, [location.search]);

  // 下载卡片为图片
  const handleDownloadCard = async () => {
    if (!card) {
      showSnackbar.error("卡片数据加载失败，无法下载");
      return;
    }

    try {
      setDownloading(true);

      // 导入downloadCard函数
      const { downloadCard: utilsDownloadCard } = await import("@/utils/share");

      // 使用cardRef获取DOM元素
      const cardElement =
        document.getElementById("detail-card") || cardRef.current;

      if (!cardElement) {
        showSnackbar.error("找不到卡片元素，下载失败");
        return;
      }

      // 执行下载
      const success = await utilsDownloadCard(
        cardElement,
        `inspiration-${
          card.title?.replace(/[^\w\u4e00-\u9fa5]/g, "-") || "card"
        }`
      );

      if (success) {
        showSnackbar.success("图片下载成功！");
      } else {
        showSnackbar.error("图片下载失败，请稍后重试");
      }
    } catch (error) {
      console.error("下载过程中出错:", error);
      showSnackbar.error("下载过程中发生错误，请稍后重试");
    } finally {
      setDownloading(false);
    }
  };

  // 处理编辑按钮点击
  const handleEdit = () => {
    const cardId = getCardId();
    if (cardId) {
      navigate(`/card-edit?id=${cardId}`);
    }
  };

  // 提交评论
  const handleCommentSubmit = async () => {
    const cardId = getCardId();
    const token = localStorage.getItem("authToken");
    if (!token) {
      const redirect = cardId ? `/card-detail?id=${cardId}` : "/cards";
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (!commentForm.content.trim()) {
      showSnackbar.warning("请输入评论内容");
      return;
    }

    if (!cardId) {
      showSnackbar.warning("卡片ID无效");
      return;
    }

    setSubmittingComment(true);

    try {
      // 使用统一API封装提交评论
      console.log("正在提交评论...");
      const response = await api.comments.create({
        cardId: cardId,
        comment: commentForm.content,
      });

      if (!response.success) {
        const text = "提交评论失败：" + (response.error || "未知错误");
        showSnackbar.warning(text);
        return;
      }

      await fetchComments(cardId);

      // 重置表单
      setCommentForm({ content: "" });

      showSnackbar.success("评论提交成功！");
    } catch (error: any) {
      console.error("提交评论失败:", error.message || error);

      showSnackbar.error("提交评论失败，请稍后重试");
    } finally {
      setSubmittingComment(false);
    }
  };

  // 格式化日期
  const formatCommentDate = (dateString: string) => {
    try {
      if (!dateString) return "日期未知";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "日期未知";
      }
      return `${date.getFullYear()}年${
        date.getMonth() + 1
      }月${date.getDate()}日 ${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;
    } catch (e) {
      console.error("日期格式化错误:", e);
      return "日期未知";
    }
  };

  // 清理和处理内容
  const sanitizeContent = (content: string | undefined | null) => {
    if (!content) return "";
    try {
      return DOMPurify.sanitize(String(content));
    } catch (e) {
      console.error("内容净化错误:", e);
      return String(content);
    }
  };

  // 处理Markdown内容
  const renderMarkdown = (text: string | undefined | null) => {
    if (!text) return "";
    try {
      marked.setOptions({ breaks: true });
      const html = marked.parse(sanitizeContent(text));
      // console.log('html', html);
      return (
        <Fragment>
          <span dangerouslySetInnerHTML={{ __html: html as string }} />
        </Fragment>
      );
    } catch (e) {
      return <Fragment>{sanitizeContent(text)}</Fragment>;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 4, sm: 8 },
        background: "#eff3fb",
      }}
    >
      <Container maxWidth="md">
        {isLoading ? (
          <Loading message="加载卡片中..." />
        ) : error ? (
          <section style={{ marginTop: "2rem" }}>
            <ErrorCard
              message="加载失败"
              description={error}
              onRetry={() => {
                window.location.reload();
              }}
              retryText="重试"
            />
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Button
                variant="contained"
                onClick={() => navigate("/cards")}
                sx={{
                  backgroundColor: "var(--primary)",
                  "&:hover": { backgroundColor: "#5a67d8" },
                }}
              >
                返回卡片列表
              </Button>
            </Box>
          </section>
        ) : (
          <>
            <Paper
              elevation={3}
              sx={{
                mb: 6,
                borderRadius: "16px",
                overflow: "hidden",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="card-container">
                <div
                  id="detail-card"
                  ref={cardRef}
                  className={`card ${card?.gradientClass || "card-gradient-1"}`}
                  style={{
                    fontFamily: card?.font || "Noto Sans SC, sans-serif",
                    color: getFontColorForGradient(
                      card?.gradientClass || "card-gradient-1"
                    ),
                    padding: isMobile ? "24px" : "40px",
                    minHeight: "300px",
                    transition: "transform 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        "translateY(-5px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        "translateY(0)";
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      component="h1"
                      sx={{
                        fontWeight: "bold",
                        mb: 3,
                        color: getFontColorForGradient(
                          card?.gradientClass || "card-gradient-1"
                        ),
                      }}
                    >
                      {card ? sanitizeContent(card.title) : ""}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: `${getFontColorForGradient(
                          card?.gradientClass || "card-gradient-1"
                        )}10`,
                        p: 3,
                        borderRadius: "8px",
                        mb: 3,
                        fontStyle: "italic",
                        position: "relative",
                        pl: 4,
                        "&::before": {
                          content: '"“"',
                          position: "absolute",
                          left: 12,
                          top: -10,
                          fontSize: "2.6rem",
                          lineHeight: 1,
                          color: getFontColorForGradient(
                            card?.gradientClass || "card-gradient-1"
                          ),
                          opacity: 0.2,
                        },
                      }}
                    >
                      <Typography
                        variant={isMobile ? "body1" : "h6"}
                        sx={{
                          color: getFontColorForGradient(
                            card?.gradientClass || "card-gradient-1"
                          ),
                          whiteSpace: "pre-line",
                        }}
                      >
                        {sanitizeContent(card?.quote || "")}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                      <img
                        src={card?.imagePath || "/images/mistyblue.png"}
                        alt={card?.title || ""}
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: "8px",
                          maxHeight: "400px",
                          objectFit: "cover",
                          transition: isMobile ? "none" : "transform 0.5s ease",
                        }}
                        onMouseOver={(e) =>
                          !isMobile &&
                          (e.currentTarget.style.transform = "scale(1.05)")
                        }
                        onMouseOut={(e) =>
                          !isMobile &&
                          (e.currentTarget.style.transform = "scale(1)")
                        }
                      />
                    </Box>
                    {card?.detail && (
                      <Box sx={{ mt: 4 }}>
                        {/* todo */}
                        <Typography
                          variant="body1"
                          sx={{
                            color: getFontColorForGradient(
                              card?.gradientClass || "card-gradient-1"
                            ),
                            lineHeight: 1.8,
                          }}
                        >
                          {renderMarkdown(card.detail)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{
                      mt: 4,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexDirection: isMobile ? "column" : "row",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: getFontColorForGradient(
                          card?.gradientClass || "card-gradient-1"
                        ),
                        opacity: 0.8,
                      }}
                    >
                      {card?.creator
                        ? `— ${sanitizeContent(card.creator)}`
                        : ""}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: getFontColorForGradient(
                          card?.gradientClass || "card-gradient-1"
                        ),
                        opacity: 0.8,
                      }}
                    >
                      {card
                        ? new Date(card.created).toLocaleDateString("zh-CN")
                        : ""}
                    </Typography>
                  </Box>
                </div>
              </div>
            </Paper>

            <Box
              sx={{
                mb: 6,
                display: "flex",
                gap: { xs: 1, sm: 2 },
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Button
                id="download-btn"
                variant="contained"
                disabled={downloading || !card}
                loading={downloading}
                onClick={handleDownloadCard}
                sx={{
                  backgroundColor: "#3182ce",
                  "&:hover": { backgroundColor: "#2c5aa0" },
                  py: 1.5,
                  px: { xs: 3, sm: 4 },
                  minWidth: { xs: "auto", sm: "140px" },
                }}
              >
                下载卡片
              </Button>

              {canEdit && (
                <Button
                  id="edit-btn"
                  variant="contained"
                  onClick={handleEdit}
                  sx={{
                    backgroundColor: "#e53e3e",
                    "&:hover": { backgroundColor: "#c53030" },
                    py: 1.5,
                    px: { xs: 3, sm: 4 },
                    minWidth: { xs: "auto", sm: "140px" },
                  }}
                >
                  编辑卡片
                </Button>
              )}
            </Box>

            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Typography
                variant={isMobile ? "h6" : "h5"}
                component="h2"
                sx={{ mb: 4, color: "var(--primary)" }}
              >
                评论
              </Typography>

              <Box sx={{ mb: 6 }}>
                {comments.length === 0 ? (
                  <Empty message="暂无评论" description="快来分享您的想法吧" />
                ) : (
                  comments.map((comment) => (
                    <Paper
                      key={comment.id || comment.created}
                      elevation={1}
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: "8px",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        transition: "box-shadow 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                          flexDirection: isMobile ? "column" : "row",
                          gap: 1,
                          textAlign: isMobile ? "center" : "left",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: "bold", color: "var(--primary)" }}
                        >
                          {sanitizeContent(comment.name || comment.Name)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCommentDate(comment.created)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: sanitizeContent(
                              comment.comment || comment.created
                            ).replace(/\n/g, "<br>"),
                          }}
                        />
                      </Typography>
                      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                        <Button size="small" variant="text" onClick={() => handleReplyClick(comment.name || comment.Name)}>
                          回复
                        </Button>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>

              <Divider sx={{ mb: 4 }} />

              <Typography variant="h6" sx={{ mb: 3, color: "var(--primary)" }}>
                添加评论
              </Typography>

              <Box>
                <TextField
                  fullWidth
                  label="评论内容"
                  multiline
                  rows={isMobile ? 3 : 4}
                  value={commentForm.content}
                  inputRef={commentInputRef}
                  onChange={(e) =>
                    setCommentForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="写下您的想法..."
                  margin="normal"
                  variant="outlined"
                  size={isMobile ? "small" : "medium"}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submittingComment}
                  onClick={handleCommentSubmit}
                  fullWidth={isMobile}
                  sx={{
                    mt: 3,
                    "&:hover": { backgroundColor: "#5a67d8" },
                    py: 1.2,
                  }}
                >
                  {submittingComment ? "提交中..." : "提交评论"}
                </Button>
              </Box>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default CardDetail;
  const handleReplyClick = (name: string) => {
    setCommentForm({ content: `@${name} ` });
    setTimeout(() => {
      try {
        commentInputRef.current?.focus();
        const el = commentInputRef.current as any;
        if (el && el.setSelectionRange) {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      } catch {}
    }, 50);
  };
