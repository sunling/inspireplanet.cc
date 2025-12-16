import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api, http } from "../../netlify/configs";
import {
  Meetup,
  MeetupMode,
  MeetupStatus,
  MeetupType,
  Participant,
  UserInfo,
} from "../../netlify/types/index";
import { isUpcoming, formatTime, formatDate } from "../../utils";
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  CircularProgress,
  Card,
} from "@mui/material";

import ErrorCard from "../../components/ErrorCard";
import Loading from "../../components/Loading";
import Empty from "../../components/Empty";
import { useGlobalSnackbar } from "../../context/app";

const MeetupDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 从查询参数中获取id
  const getMeetupId = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("id");
  };

  const id = getMeetupId();

  const showSnackbar = useGlobalSnackbar();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 模态框状态
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  // RSVP表单状态
  const [rsvpForm, setRsvpForm] = useState({
    name: "",
    wechatId: "",
  });

  // 提交状态
  const [submitStatus, setSubmitStatus] = useState<
    "initial" | "loading" | "success" | "error"
  >("initial");

  // 加载活动详情
  useEffect(() => {
    const meetupId = getMeetupId();

    if (!meetupId) {
      setError("缺少活动ID参数");
      setIsLoading(false);
      return;
    }

    loadMeetupDetail(meetupId);
  }, [location.search]); // 依赖location.search而不是id

  // 加载活动详情数据
  const loadMeetupDetail = async (meetupId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用统一的api客户端获取活动详情
      const response = await api.meetups.getById(meetupId);
      console.log("获取活动详情原始响应:", response);

      if (!response.success) {
        showSnackbar.error(`获取活动详情失败: ${response.error || "未知错误"}`);
        return;
      }

      const list = response.data?.meetups || [];

      if (list.length === 0) {
        showSnackbar.error("活动不存在");
        return;
      }

      const meetupData = list[0];

      // 处理数据格式，确保符合Meetup接口要求
      const processedMeetup: Meetup = {
        id: meetupData.id,
        title: meetupData.title || "未命名活动",
        description: meetupData.description || "",
        type: (meetupData.type || MeetupType.ONLINE) as MeetupType,
        mode: meetupData.mode as MeetupMode,
        datetime: meetupData.datetime || new Date().toISOString(),
        location: meetupData.location,
        fee: meetupData.fee,
        max_ppl: meetupData.max_ppl,
        max_participants: meetupData.max_participants,
        duration: meetupData.duration,
        organizer: meetupData.organizer || "未知组织者",
        creator: meetupData.creator,
        contact: meetupData.contact || "",
        qr_image_url: meetupData.qr_image_url,
        status: (meetupData.status || MeetupStatus.UPCOMING) as MeetupStatus,
        created_at: meetupData.created_at || new Date().toISOString(),
        participant_count: meetupData.participant_count || 0,
        cover: meetupData.cover,
      };

      setMeetup(processedMeetup);

      // 加载参与者信息
      loadParticipants(meetupId);
    } catch (err) {
      console.error("加载活动详情失败:", err);
      setError("加载活动详情失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染主内容
  const renderContent = () => {
    if (isLoading) {
      return <Loading message="加载活动详情中..." size={60} />;
    }

    if (error) {
      return (
        <ErrorCard
          message={error}
          description="请稍后重试或返回活动列表"
          onRetry={() => loadMeetupDetail(getMeetupId()!)}
          retryText="重新加载"
        />
      );
    }

    if (!meetup) {
      return (
        <Empty message="活动不存在" description="该活动可能已被删除或移动" />
      );
    }

    return renderMeetupDetail();
  };

  // 加载参与者信息
  const loadParticipants = async (meetupId: string) => {
    try {
      // 使用统一的api对象获取参与者列表
      const response = await api.rsvp.getByMeetupId(meetupId);
      console.log("获取参与者列表原始响应:", response);
      if (!response.success) {
        showSnackbar.error(
          `获取参与者列表失败: ${response.error || "未知错误"}`
        );
        return;
      }

      const rsvps = response?.data?.rsvps || [];
      // 处理数据格式
      const processedParticipants: Participant[] = rsvps
        .map((record: any) => ({
          name: record.name || "未知用户",
          wechat_id: record.wechat_id,
          created_at: record.created_at,
          meetup_id: record.meetup_id,
        }))
        .filter((item) => `${item.meetup_id}` === meetupId);

      setParticipants(processedParticipants);
    } catch (err) {
      console.error("加载参与者信息失败:", err);
      showSnackbar.error("加载参与者信息失败，请稍后重试");
    }
  };

  // 报名参加活动
  const handleJoinMeetup = async () => {
    if (!meetup) return;

    const rawToken =
      localStorage.getItem("userToken") || localStorage.getItem("authToken");
    const token =
      rawToken && rawToken !== "null" && rawToken !== "undefined"
        ? rawToken
        : "";
    const userInfoStr =
      localStorage.getItem("userInfo") || localStorage.getItem("userData");

    let parsedUser: any = null;
    try {
      parsedUser = userInfoStr ? JSON.parse(userInfoStr) : null;
    } catch {
      parsedUser = null;
    }

    const looksLikeJwt = typeof token === "string" && token.includes(".");
    const hasUserBasics =
      parsedUser && (parsedUser.id || parsedUser.username || parsedUser.email);

    if (!looksLikeJwt || !hasUserBasics) {
      showSnackbar.error("请先登录后再报名参加活动");
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setIsActionLoading(true);

    try {
      const verify = await api.auth.verifyToken();
      const valid = (verify.success && (verify.data as any)?.valid) === true;
      if (!valid) {
        showSnackbar.error("请先登录后再报名参加活动");
        const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      const userInfo: UserInfo = JSON.parse(userInfoStr || "{}");

      // 检查是否已经报名
      const isAlreadyRegistered = await checkRSVPStatus(
        meetup.id,
        userInfo.wechat_id || ""
      );
      if (isAlreadyRegistered) {
        if (meetup.qr_image_url) {
          showQRCode(meetup.qr_image_url);
        } else {
          showSnackbar.info("您已经报名了这个活动！请联系组织者获取群聊信息。");
        }
        return;
      }

      // 显示报名确认对话框
      setRsvpForm({
        name: userInfo.name || "",
        wechatId: userInfo.wechat_id || "",
      });
      setShowRSVPDialog(true);
    } catch (error) {
      console.error("处理报名失败:", error);
      showSnackbar.error("处理报名请求失败，请稍后重试");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 检查RSVP状态
  const checkRSVPStatus = async (
    meetupId: string,
    wechatId: string
  ): Promise<boolean> => {
    try {
      // 若缺少微信ID，跳过预检查
      if (!wechatId) return false;

      // 统一使用已存在的RSVP函数与参数命名
      const response = await http.get('/rsvp', {
        meetup_id: meetupId,
        wechat_id: wechatId,
      });
      const rsvps = (response.data && (response.data as any).rsvps) || [];
      return Array.isArray(rsvps) && rsvps.length > 0;
    } catch (error) {
      console.error("检查报名状态失败:", error);
      return false;
    }
  };

  // 提交RSVP
  const handleSubmitRSVP = async () => {
    if (!meetup) return;

    if (!rsvpForm.name.trim()) {
      showSnackbar.warning("请输入您的姓名");
      return;
    }

    if (!rsvpForm.wechatId.trim()) {
      showSnackbar.warning("请输入您的微信号");
      return;
    }

    setSubmitStatus("loading");

    try {
      const enteredWechat = rsvpForm.wechatId.trim();
      const precheck = await checkRSVPStatus(String(meetup.id), enteredWechat);
      if (precheck) {
        // 已报名：直接视为成功并展示二维码/提示
        setSubmitStatus("success");
        setTimeout(() => {
          setShowRSVPDialog(false);
          if (meetup.qr_image_url) {
            showQRCode(meetup.qr_image_url!);
          } else {
            showSnackbar.info("您已经报名了这个活动！请联系组织者获取群聊信息。");
          }
          setSubmitStatus("initial");
        }, 500);
        return;
      }

      // 使用统一的api对象提交报名信息
      const userInfoStr =
        localStorage.getItem("userInfo") || localStorage.getItem("userData");
      let username: string | undefined;
      let user_id: number | string | undefined;
      try {
        const u = userInfoStr ? JSON.parse(userInfoStr) : null;
        username = u?.username || undefined;
        user_id = u?.id ?? undefined;
      } catch {}
      if (!user_id) {
        const uidStr = localStorage.getItem("userId");
        if (uidStr && uidStr !== "null" && uidStr !== "undefined") {
          const asNum = Number(uidStr);
          user_id = Number.isFinite(asNum) ? asNum : uidStr;
        }
      }

      const payload = {
        meetup_id: Number(meetup.id),
        wechat_id: rsvpForm.wechatId.trim(),
        name: rsvpForm.name.trim(),
        user_id,
      };

      const response = await api.rsvp.create(payload);

      if (!response.success) {
        const msg = (response as any)?.error || "报名失败";
        throw new Error(msg);
      }

      // 模拟成功响应
      setSubmitStatus("success");

      // 延迟关闭对话框
      setTimeout(() => {
        setShowRSVPDialog(false);

        // 更新报名人数
        if (meetup) {
          setMeetup((prev) =>
            prev
              ? {
                  ...prev,
                  participant_count: prev.participant_count + 1,
                }
              : null
          );
        }

        // 更新参与者列表
        setParticipants((prev) => [
          ...prev,
          { name: rsvpForm.name, wechat_id: rsvpForm.wechatId },
        ]);

        // 显示成功消息和二维码
        if (meetup.qr_image_url) {
          setTimeout(() => {
            showQRCode(meetup.qr_image_url!);
          }, 300);
        } else {
          showSnackbar.success("报名成功！请联系组织者获取群聊信息。");
        }

        // 重置提交状态
        setSubmitStatus("initial");
      }, 1000);
    } catch (error) {
      console.error("报名失败:", error);
      const serverMsg =
        (error && (error as any).error) ||
        (error && (error as any).message) ||
        "报名失败，请稍后重试";
      if (/已经报名/.test(serverMsg)) {
        setSubmitStatus("success");
        setTimeout(() => {
          setShowRSVPDialog(false);
          if (meetup?.qr_image_url) {
            showQRCode(meetup.qr_image_url!);
          } else {
            showSnackbar.info("您已经报名了这个活动！请联系组织者获取群聊信息。");
          }
          setSubmitStatus("initial");
        }, 500);
        return;
      }
      setSubmitStatus("error");
      showSnackbar.error(serverMsg);
      setTimeout(() => {
        setSubmitStatus("initial");
      }, 2000);
    }
  };

  // 显示二维码弹窗
  const showQRCode = (qrImageUrl: string) => {
    setMeetup((prev) => {
      return prev
        ? {
            ...prev,
            qr_image_url: qrImageUrl,
          }
        : null;
    });
    setShowQRModal(true);
  };

  // 查看参与者列表
  const handleViewParticipants = () => {
    setShowParticipantsModal(true);
  };

  // 格式化描述文本（支持换行）
  const formatDescription = (text: string) => {
    return text.split("\n").map((line, index) => (
      <div key={index}>
        {line}
        {index < text.split("\n").length - 1 && <br />}
      </div>
    ));
  };

  // 渲染活动详情
  const renderMeetupDetail = () => {
    if (!meetup) return null;

    const isUpcomingMeetup = isUpcoming(meetup.datetime);
    const formattedDate = formatDate(meetup.datetime);
    const formattedTime = formatTime(meetup.datetime);
    const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const weekday = weekdayNames[new Date(meetup.datetime).getDay()];
    const limitRaw = Number(
      (meetup.max_ppl ?? meetup.max_participants ?? -1) as any
    );
    const isUnlimited = !Number.isFinite(limitRaw) || limitRaw <= 0 || limitRaw === -1;

    return (
      <Box sx={{ mt: 4 }}>
        <Box
          sx={{ maxWidth: "600px", margin: "0 auto", marginBottom: "1.5rem" }}
        >
          {(() => {
            const cover = meetup.cover;
            const qr = meetup.qr_image_url;
            const isQrLike =
              typeof cover === "string" &&
              /qr|qrcode|barcode|wechat/i.test(cover);
            const shouldShow = !!cover && cover !== qr && !isQrLike;
            return shouldShow ? (
              <Box
                component="img"
                src={cover as string}
                alt={meetup.title}
                sx={{
                  width: "100%",
                  height: { xs: "180px", sm: "220px", md: "280px" },
                  objectFit: "cover",
                  display: "block",
                  backgroundColor: "#f4eee6",
                  borderRadius: "8px",
                }}
              />
            ) : null;
          })()}
          <Box sx={{ padding: { xs: "1rem", md: "1.5rem" } }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
              <Chip
                label={
                  (meetup.mode || meetup.type) === "online"
                    ? "线上活动"
                    : "线下活动"
                }
                color={
                  (meetup.mode || meetup.type) === "online"
                    ? "primary"
                    : "secondary"
                }
                size="small"
              />
              <Chip
                label={isUpcomingMeetup ? "可报名" : "已结束"}
                color={isUpcomingMeetup ? "success" : "default"}
                size="small"
              />
            </Box>

            <Typography
              variant="h1"
              component="h1"
              sx={{
                mb: 3,
                fontWeight: "bold",
                color: "#333",
                fontSize: { xs: "1.5rem", sm: "1.8rem", md: "2rem" },
              }}
            >
              {meetup.title}
            </Typography>

            {/* 基本信息 */}
            <Card sx={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.5rem", backgroundColor: "#f8f9fa" }}>
              <Typography sx={{ mb: 2, color: "#555", fontSize: "1.2rem" }}>基本信息</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#f4eee6", px: 1.25, py: 0.75, borderRadius: 1 }}>
                  <span style={{ marginRight: "0.5rem" }}>📅</span>
                  <span>{formattedDate}（{weekday}）</span>
                </Box>
                <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#f4eee6", px: 1.25, py: 0.75, borderRadius: 1 }}>
                  <span style={{ marginRight: "0.5rem" }}>🕐</span>
                  <span>{formattedTime}</span>
                </Box>
                {meetup.duration && (
                  <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#f4eee6", px: 1.25, py: 0.75, borderRadius: 1 }}>
                    <span style={{ marginRight: "0.5rem" }}>⏱️</span>
                    <span>{meetup.duration} 小时</span>
                  </Box>
                )}
                {meetup.location && (
                  <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#f4eee6", px: 1.25, py: 0.75, borderRadius: 1, maxWidth: "100%" }}>
                    <span style={{ marginRight: "0.5rem" }}>📍</span>
                    <span style={{ wordBreak: "break-all" }}>{meetup.location}</span>
                  </Box>
                )}
                {meetup.fee != null && (
                  <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#f4eee6", px: 1.25, py: 0.75, borderRadius: 1 }}>
                    <span style={{ marginRight: "0.5rem" }}>💰</span>
                    <span>{Number(meetup.fee) > 0 ? `${meetup.fee} 元` : "免费"}</span>
                  </Box>
                )}
                <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#f4eee6", px: 1.25, py: 0.75, borderRadius: 1 }}>
                  <span style={{ marginRight: "0.5rem" }}>👥</span>
                  <span>{isUnlimited ? "人数不限" : `最多 ${limitRaw} 人`}</span>
                </Box>
              </Box>
            </Card>

            {/* 活动介绍 */}
            <Card sx={{ mb: 4, borderRadius: "8px", padding: "1rem" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#555" }}>
                活动介绍
              </Typography>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 1,
                  bgcolor: "#f4eee6",
                  whiteSpace: "pre-line",
                  lineHeight: 1.8,
                }}
              >
                {meetup.description}
              </Box>
            </Card>

            {/* 组织者信息 */}
            <Card sx={{ mb: 4, padding: "1rem", borderRadius: "8px" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#555" }}>
                组织者信息
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "#f4eee6",
                  p: 3,
                  borderRadius: 1,
                }}
              >
                <Avatar sx={{ mr: 2, bgcolor: "#ff7f50" }}>
                  {meetup.creator
                    ? meetup.creator.charAt(0)
                    : meetup.organizer.charAt(0)}
                </Avatar>
                <Typography variant="h6">
                  {meetup.creator || meetup.organizer}
                </Typography>
              </Box>
            </Card>

            {/* 操作按钮 */}
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <div>
                <Button
                  variant="text"
                  onClick={handleViewParticipants}
                  startIcon={<span>👥</span>}
                  sx={{ textTransform: "none" }}
                >
                  {meetup.participant_count || 0}
                  {isUnlimited ? "" : `/${limitRaw}`} 人已报名
                </Button>
              </div>

              {isUpcomingMeetup && (
                <Button
                  variant={isUpcomingMeetup ? "contained" : "outlined"}
                  onClick={handleJoinMeetup}
                  disabled={!isUpcomingMeetup || isActionLoading}
                  startIcon={
                    isActionLoading ? <CircularProgress size={16} /> : undefined
                  }
                  sx={{
                    py: 1.2,
                    px: 5,
                    fontSize: "1rem",
                    textTransform: "none",
                    mb: 2,
                  }}
                >
                  报名参加
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff9f0" }}>
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Box sx={{ mb: 1 }}>
          <Button
            component={Link}
            to="/meetups"
            variant="text"
            startIcon={<span>←</span>}
            sx={{ textTransform: "none", color: "#333" }}
          >
            返回活动列表
          </Button>
        </Box>

        {renderContent()}
      </Container>

      {/* 报名确认对话框 */}
      <Dialog
        open={showRSVPDialog}
        onClose={() => setShowRSVPDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>确认报名</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="姓名"
              value={rsvpForm.name}
              onChange={(e) =>
                setRsvpForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="请输入您的姓名"
              margin="normal"
              disabled={
                submitStatus === "loading" || submitStatus === "success"
              }
            />
            <TextField
              fullWidth
              label="微信号"
              value={rsvpForm.wechatId}
              onChange={(e) =>
                setRsvpForm((prev) => ({ ...prev, wechatId: e.target.value }))
              }
              placeholder="请输入您的微信号"
              margin="normal"
              disabled={
                submitStatus === "loading" || submitStatus === "success"
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowRSVPDialog(false)}
            disabled={submitStatus === "loading" || submitStatus === "success"}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitRSVP}
            disabled={submitStatus === "loading" || submitStatus === "success"}
            startIcon={
              submitStatus === "loading" ? (
                <CircularProgress size={16} />
              ) : undefined
            }
            color={submitStatus === "success" ? "success" : "primary"}
          >
            {submitStatus === "loading"
              ? "提交中..."
              : submitStatus === "success"
              ? "报名成功！"
              : "确认报名"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 二维码弹窗 */}
      <Dialog
        open={showQRModal && !!meetup?.qr_image_url}
        onClose={() => setShowQRModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>扫码进群</DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          {meetup?.qr_image_url && (
            <img
              src={meetup.qr_image_url}
              alt="群聊二维码"
              style={{
                maxWidth: "80%",
                height: "auto",
                borderRadius: 8,
                marginBottom: "1.5rem",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            />
          )}
          <Typography
            variant="body1"
            sx={{ color: "var(--text-light)", mb: 2 }}
          >
            请使用微信扫描二维码加入群聊
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => setShowQRModal(false)}
            sx={{ textTransform: "none" }}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 参与者列表弹窗 */}
      <Dialog
        open={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>报名人员名单</DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 300, overflowY: "auto", mt: 2 }}>
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <Box
                  key={index}
                  sx={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Avatar sx={{ mr: 2, bgcolor: "var(--text-lighter)" }}>
                    {participant.name.charAt(0)}
                  </Avatar>
                  <Typography>{participant.name}</Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" sx={{ color: "#999" }}>
                  暂无报名人员
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => setShowParticipantsModal(false)}
            sx={{ textTransform: "none" }}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetupDetail;
