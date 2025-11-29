import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api, http } from "../../netlify/configs";
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import useResponsive from "../../hooks/useResponsive";
import { useGlobalSnackbar } from "../../context/app";

import ErrorCard from "../../components/ErrorCard";
import Loading from "../../components/Loading";
import Empty from "../../components/Empty";
import { Meetup } from "../../netlify/types/index";
import { isUpcoming, formatTime, formatDate } from "../../utils";

const Meetups: React.FC = () => {
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [filteredMeetups, setFilteredMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [myRsvpIds, setMyRsvpIds] = useState<Set<string>>(new Set());

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // 模态框状态
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [currentQRUrl, setCurrentQRUrl] = useState<string | null>(null);

  const { isMobile } = useResponsive();

  // RSVP表单状态
  const [rsvpForm, setRsvpForm] = useState({
    name: "",
    wechatId: "",
  });

  // 检查用户登录状态并显示创建按钮
  useEffect(() => {
    const checkAuthAndShowCreateButton = () => {
      try {
        const token =
          localStorage.getItem("userToken") ||
          localStorage.getItem("authToken");
        if (token) {
          setShowCreateButton(true);
        }
      } catch (error) {
        console.error("检查认证状态失败:", error);
      }
    };

    checkAuthAndShowCreateButton();
    loadMeetups();
  }, []);

  // 加载活动列表
  const loadMeetups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用统一的api对象获取活动列表
      const response = await api.meetups.getAll();
      console.log("loadMeetups 响应", response);
      if (!response.success) {
        showSnackbar.error("查询会议列表失败");
        return;
      }
      const meetups = response.data?.meetups || [];

      setMeetups(meetups);
      setFilteredMeetups(meetups);
    } catch (err) {
      console.error("加载活动失败:", err);
      setError("加载活动失败，请稍后再试");
      showSnackbar.error("加载活动失败，请稍后再试");

      setMeetups([]);
      setFilteredMeetups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, meetups]);

  // 加载我的报名列表，用于禁用报名按钮
  const loadMyRsvps = async () => {
    try {
      const userStr = localStorage.getItem("userInfo") || localStorage.getItem("userData");
      if (!userStr) return;
      const user = JSON.parse(userStr || "{}");
      const wechat = (user?.wechat_id || "").trim();
      if (!wechat) return;
      const res = await api.rsvp.getByWechatId(wechat);
      if (res.success) {
        const ids = (res.data?.rsvps || []).map((r: any) => String(r.meetup_id));
        setMyRsvpIds(new Set(ids));
      }
    } catch (e) {
      console.error("加载我的报名失败:", e);
    }
  };

  useEffect(() => {
    loadMyRsvps();
  }, [meetups.length]);

  const applyFilters = () => {
    let filtered = [...meetups];

    // 类型过滤
    if (typeFilter) {
      filtered = filtered.filter((meetup) => meetup.type === typeFilter);
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (meetup) =>
          meetup.title.toLowerCase().includes(query) ||
          meetup.description.toLowerCase().includes(query)
      );
    }

    setFilteredMeetups(filtered);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // 处理类型过滤变化
  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  // 报名参加活动
  const handleJoinMeetup = async (meetupId: string, qrImageUrl?: string) => {
    const token =
      localStorage.getItem("userToken") || localStorage.getItem("authToken");
    const userInfo =
      localStorage.getItem("userInfo") || localStorage.getItem("userData");

    if (!token || !userInfo) {
      showSnackbar.warning("请先登录后再报名参加活动");
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    try {
      const user = JSON.parse(userInfo);

      // 检查是否已经报名
      try {
        // 使用统一的API检查RSVP状态
        const isRSVPed = await checkRSVPStatus(meetupId);

        if (isRSVPed) {
          if (qrImageUrl) {
            showQRCode(qrImageUrl);
          } else {
            showSnackbar.info(
              "您已经报名了这个活动！请联系组织者获取群聊信息。"
            );
          }
          return;
        }
      } catch (error) {
        console.error("检查报名状态失败:", error);
      }

      // 显示报名确认对话框
      setRsvpForm({
        name: user.name || "",
        wechatId: user.wechat_id || "",
      });
      setCurrentMeetupId(meetupId);
      setCurrentQRUrl(qrImageUrl || null);
      setShowRSVPDialog(true);
    } catch (error) {
      console.error("处理报名失败:", error);
      showSnackbar.error("处理报名请求失败，请稍后重试");
    }
  };

  // 检查RSVP状态
  const checkRSVPStatus = async (meetupId: string): Promise<boolean> => {
    try {
      const userStr =
        localStorage.getItem("userInfo") || localStorage.getItem("userData");
      if (!userStr) return false;
      const user = JSON.parse(userStr || "{}");
      const wechat = (user?.wechat_id || "").trim();
      if (!wechat) return false;

      const res = await api.rsvp.getByWechatId(wechat);
      const rsvps = res.success ? res.data?.rsvps || [] : [];
      return rsvps.some((r: any) => String(r.meetup_id) === String(meetupId));
    } catch (error) {
      console.error("检查报名状态失败:", error);
      return false;
    }
  };

  // 提交RSVP
  const handleSubmitRSVP = async () => {
    if (!rsvpForm.name.trim()) {
      showSnackbar.warning("请输入您的姓名");
      return;
    }

    if (!currentMeetupId) return;

    try {
      // 使用统一的api对象提交报名信息
      const response = await api.rsvp.create({
        meetup_id: Number(currentMeetupId),
        wechat_id: rsvpForm.wechatId.trim(),
        name: rsvpForm.name.trim(),
      });

      if (!response.success) {
        const msg = (response as any)?.error || "报名失败";
        throw new Error(msg);
      }

      // 关闭对话框
      setShowRSVPDialog(false);

      // 更新本地数据
      setMeetups((prev: Meetup[]) =>
        prev.map((meetup) =>
          meetup.id === currentMeetupId
            ? { ...meetup, participant_count: meetup.participant_count + 1 }
            : meetup
        )
      );

      // 将当前活动标记为已报名，禁用按钮
      setMyRsvpIds((prev) => new Set([...Array.from(prev), String(currentMeetupId)]));

      // 显示成功消息和二维码
      if (currentQRUrl) {
        setTimeout(() => {
          showQRCode(currentQRUrl);
        }, 500);
      } else {
        showSnackbar.success("报名成功！请联系组织者获取群聊信息。");
      }
    } catch (error) {
      console.error("报名失败:", error);
      const msg = error instanceof Error ? error.message : "报名失败，请稍后重试";
      showSnackbar.error(msg);
    }
  };

  // 显示二维码弹窗
  const showQRCode = (qrImageUrl: string) => {
    setCurrentQRUrl(qrImageUrl);
    setShowQRModal(true);
  };

  // 获取活动类型标签
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "online":
        return "线上活动";
      case "offline":
        return "线下活动";
      case "culture":
        return "文化活动";
      case "outdoor":
        return "户外活动";
      default:
        return "其他活动";
    }
  };

  // 获取活动类型颜色
  const getTypeColor = (
    type: string
  ): "primary" | "success" | "info" | "warning" | "default" => {
    switch (type) {
      case "online":
        return "primary";
      case "offline":
        return "success";
      case "culture":
        return "info";
      case "outdoor":
        return "warning";
      default:
        return "default";
    }
  };

  // 获取活动状态标签
  const getStatusLabel = (meetup: Meetup): string => {
    const now = new Date();
    const start = new Date(meetup.datetime);
    const dur = Number(meetup.duration);
    const hasDur = Number.isFinite(dur) && dur > 0;
    const end = new Date(start.getTime() + (hasDur ? dur * 3600 * 1000 : 0));

    if (now < start) return "即将开始";
    if (now > end) return "已结束";
    return "进行中";
  };

  // 获取活动状态颜色
  const getStatusColor = (
    meetup: Meetup
  ): "primary" | "success" | "default" => {
    const label = getStatusLabel(meetup);
    if (label === "已结束") return "default";
    return label === "即将开始" ? "success" : "primary";
  };

  // 渲染活动列表
  const renderMeetups = () => {
    if (filteredMeetups.length === 0) {
      return (
        <Empty
          message="暂无活动"
          description={
            searchQuery || typeFilter
              ? "没有找到匹配的活动，请尝试其他搜索条件"
              : "暂无活动内容，敬请期待"
          }
        />
      );
    }

    return (
      <Box
        component="ul"
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          } as any,
          gap: "1.5rem",
          listStyle: "none",
          padding: 0,
          margin: "1.5rem 0 0 0",
        }}
      >
        {filteredMeetups.map((meetup: Meetup) => {
          const isUpcomingMeetup = isUpcoming(meetup.datetime);
          const formattedDate = formatDate(meetup.datetime);
          const formattedTime = formatTime(meetup.datetime);
          const typeColor = getTypeColor(meetup.type);

          return (
            <li key={meetup.id}>
              <Card
                sx={{
                  height: "100%",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  },
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <CardContent
                  onClick={() => navigate(`/meetup-detail?id=${meetup.id}`)}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Chip
                      label={getTypeLabel(meetup.type)}
                      color={typeColor}
                      size={isMobile ? "small" : "medium"}
                    />
                    <Chip
                      label={getStatusLabel(meetup)}
                      color={getStatusColor(meetup)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    {meetup.title}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        📅
                      </Typography>
                      <Typography variant="body2">{formattedDate}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        🕐
                      </Typography>
                      <Typography variant="body2">{formattedTime}</Typography>
                    </Box>
                    {meetup.location && (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          📍
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ wordBreak: "break-all" }}
                        >
                          {meetup.location}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      wordBreak: "break-all",
                      overflow: "hidden",
                    }}
                  >
                    {meetup.description}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      👤
                    </Typography>
                    <Typography variant="body2">
                      组织者：{meetup.organizer}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions
                  sx={{
                    justifyContent: "flex-end",
                    p: 2,
                    borderTop: "1px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {getStatusLabel(meetup) !== "已结束" && (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      disabled={!isUpcomingMeetup || myRsvpIds.has(String(meetup.id))}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinMeetup(meetup.id, meetup.qr_image_url);
                      }}
                      sx={{ fontWeight: 600 }}
                    >
                      {myRsvpIds.has(String(meetup.id)) ? "已报名" : "报名参加"}
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/meetup-detail?id=${meetup.id}`);
                    }}
                  >
                    查看详情
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {meetup.participant_count}
                    {Number(meetup.max_participants) > 0 ? "/" + meetup.max_participants : ""} 人参加
                  </Typography>
                </CardActions>
              </Card>
            </li>
          );
        })}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 4,
        px: 2,
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: "primary.main" }}
          >
            活动列表
          </Typography>
          {showCreateButton && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate("/create-meetup")}
              id="createMeetupBtn"
              sx={{ fontWeight: 600, boxShadow: "0 3px 6px rgba(0,0,0,0.16)" }}
            >
              发起活动
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box sx={{ flex: 1, position: "relative" }}>
            <TextField
              fullWidth
              id="searchInput"
              placeholder="搜索活动标题或描述..."
              value={searchQuery}
              onChange={handleSearchChange}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              InputProps={{
                endAdornment: searchQuery ? (
                  <Button
                    onClick={handleClearSearch}
                    size="small"
                    sx={{ minWidth: "auto" }}
                  >
                    ×
                  </Button>
                ) : undefined,
              }}
              sx={{ bgcolor: "rgba(255, 255, 255, 0.9)", borderRadius: 1 }}
            />
          </Box>
          <Box sx={{ width: { xs: "100%", sm: "180px" } }}>
            <Select
              fullWidth
              value={typeFilter}
              onChange={(event) =>
                handleTypeFilterChange(
                  event as unknown as React.ChangeEvent<HTMLSelectElement>
                )
              }
              displayEmpty
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              id="typeFilter"
              sx={{ bgcolor: "rgba(255, 255, 255, 0.9)", borderRadius: 1 }}
            >
              <MenuItem value="">所有类型</MenuItem>
              <MenuItem value="online">线上活动</MenuItem>
              <MenuItem value="offline">线下活动</MenuItem>
              <MenuItem value="culture">文化活动</MenuItem>
              <MenuItem value="outdoor">户外活动</MenuItem>
            </Select>
          </Box>
        </Box>

        <Box id="meetupsContainer">
          {isLoading ? (
            <Loading message="正在加载活动..." size={40} />
          ) : error ? (
            <ErrorCard
              message={error}
              description="请稍后重试或检查网络连接"
              onRetry={loadMeetups}
              retryText="重新加载"
            />
          ) : (
            renderMeetups()
          )}
        </Box>
      </Container>

      {/* 报名确认对话框 */}
      <Dialog
        open={showRSVPDialog}
        onClose={() => setShowRSVPDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>确认报名</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="姓名"
              value={rsvpForm.name}
              onChange={(e) =>
                setRsvpForm((prev: { name: string; wechatId: string }) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              margin="normal"
              variant="outlined"
              placeholder="请输入您的姓名"
              required
            />
            <TextField
              fullWidth
              label="微信号"
              value={rsvpForm.wechatId}
              onChange={(e) =>
                setRsvpForm((prev: { name: string; wechatId: string }) => ({
                  ...prev,
                  wechatId: e.target.value,
                }))
              }
              margin="normal"
              variant="outlined"
              placeholder="请输入您的微信号"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRSVPDialog(false)}>取消</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitRSVP}
            disabled={!rsvpForm.name.trim()}
          >
            确认报名
          </Button>
        </DialogActions>
      </Dialog>

      {/* 二维码弹窗 */}
      <Dialog
        open={showQRModal}
        onClose={() => setShowQRModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, textAlign: "center" }}>
          扫码进群
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            {currentQRUrl && (
              <Box
                sx={{
                  bgcolor: "white",
                  p: 2,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <img
                  src={currentQRUrl}
                  alt="群聊二维码"
                  style={{ maxWidth: "200px", height: "auto" }}
                />
              </Box>
            )}
            <Typography variant="body1" sx={{ textAlign: "center" }}>
              请使用微信扫描二维码加入群聊
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowQRModal(false)}
            fullWidth
            sx={{ mx: 2 }}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Meetups;
