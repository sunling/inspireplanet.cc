import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  Chip,
  Avatar,
} from "@mui/material";

import useResponsive from "@/hooks/useResponsive";
import { api } from "@/netlify/configs";
import { useGlobalSnackbar } from "@/context/app";
import { DateTime } from "luxon";

type Slot = { datetime_iso: string; mode: "online" | "offline" };

const InviteDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  inviteeId: string;
}> = ({ open, onClose, inviteeId }) => {
  const show = useGlobalSnackbar();
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<Slot[]>([
    { datetime_iso: "", mode: "online" },
  ]);
  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "本地时区";
    } catch {
      return "本地时区";
    }
  }, []);
  const presets = useMemo(() => {
    const now = DateTime.local();
    const fmt = (dt: DateTime) => dt.toFormat("yyyy-LL-dd'T'HH:mm");
    const items: Array<{ label: string; value: string }> = [];
    const tonight20 = now.set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
    if (tonight20 > now) items.push({ label: "今晚 20:00", value: fmt(tonight20) });
    const tomorrow20 = now.plus({ days: 1 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
    items.push({ label: "明晚 20:00", value: fmt(tomorrow20) });
    const nextWeekdayAt = (weekday: number, hour: number, minute: number) => {
      const base = now;
      const delta = (weekday + 7 - base.weekday) % 7;
      const target = base.plus({ days: delta || 7 }).set({ hour, minute, second: 0, millisecond: 0 });
      if (delta > 0 || target > now) return target;
      return target.plus({ days: 7 });
    };
    const sat10 = nextWeekdayAt(6, 10, 0);
    const sat15 = nextWeekdayAt(6, 15, 0);
    const sun10 = nextWeekdayAt(7, 10, 0);
    items.push({ label: "周六 10:00", value: fmt(sat10) });
    items.push({ label: "周六 15:00", value: fmt(sat15) });
    items.push({ label: "周日 10:00", value: fmt(sun10) });
    return items;
  }, []);
  const canSubmit = useMemo(
    () => slots.filter((s) => s.datetime_iso && s.mode).length > 0,
    [slots]
  );
  const setSlot = (idx: number, next: Partial<Slot>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...next } : s)));
  };
  const addSlot = () => {
    if (slots.length < 3)
      setSlots((prev) => [...prev, { datetime_iso: "", mode: "online" }]);
  };
  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };
  const submit = async () => {
    try {
      const payload = {
        invitee_id: inviteeId,
        message,
        proposed_slots: slots.filter((s) => s.datetime_iso),
      };
      const res = await api.oneonone.invites.create(payload);
      if (!res.success) throw new Error(res.error || "邀请失败");
      show.success("邀请已发送");
      onClose();
    } catch (e: any) {
      show.error(e.message || "网络错误");
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>发起邀请</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="normal"
          label="邀请语"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          minRows={2}
        />
        <Box sx={{ mt: 2 }}>
          {slots.map((s, idx) => (
            <Grid container spacing={2} key={idx} alignItems="center">
              <Grid item xs={7}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  value={s.datetime_iso}
                  onChange={(e) =>
                    setSlot(idx, { datetime_iso: e.target.value })
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  时间为你的当地时间（{timeZone}）
                </Typography>
                <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {presets.map((p) => (
                    <Chip
                      key={p.label}
                      size="small"
                      label={p.label}
                      clickable
                      onClick={() => setSlot(idx, { datetime_iso: p.value })}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={3}>
                <TextField
                  select
                  fullWidth
                  value={s.mode}
                  onChange={(e) =>
                    setSlot(idx, { mode: e.target.value as any })
                  }
                >
                  <MenuItem value="online">线上</MenuItem>
                  <MenuItem value="offline">线下</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => removeSlot(idx)}
                >
                  删除
                </Button>
              </Grid>
            </Grid>
          ))}
          <Box sx={{ mt: 2 }}>
            <Button onClick={addSlot} disabled={slots.length >= 3}>
              添加时间
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={submit} disabled={!canSubmit} variant="contained">
          发送
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Directory: React.FC = () => {
  const show = useGlobalSnackbar();
  const [users, setUsers] = useState<
    Array<{
      id: string | number;
      name: string;
      username: string;
      profile?: any;
    }>
  >([]);
  const [q, setQ] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("");
  const [offeringFilter, setOfferingFilter] = useState("");
  const [seekingFilter, setSeekingFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [myProfile, setMyProfile] = useState<any>(null);
  const [openInvite, setOpenInvite] = useState<{
    open: boolean;
    inviteeId: string | null;
  }>({ open: false, inviteeId: null });
  const { isMobile } = useResponsive();

  useEffect(() => {
    const load = async () => {
      const res = await api.people.list({
        q: q || undefined,
        theme: themeFilter || undefined,
        offering: offeringFilter || undefined,
        seeking: seekingFilter || undefined,
        city: cityFilter || undefined,
      });
      if (res.success) setUsers(res.data?.users || []);
      else show.error(res.error || "加载失败");
    };
    load();
  }, [q, themeFilter, offeringFilter, seekingFilter, cityFilter]);
  useEffect(() => {
    const loadMy = async () => {
      const r = await api.profile.getMy();
      if (r.success) setMyProfile(r.data?.profile || null);
    };
    loadMy();
  }, []);
  useEffect(() => {
    const hydrate = async () => {
      const withoutProfile = users.filter((u) => !u.profile);
      if (withoutProfile.length === 0) return;
      const updates = await Promise.all(
        withoutProfile.map(async (u) => {
          const r = await api.people.getById(u.id);
          if (r.success && r.data?.users?.[0]) return r.data.users[0];
          return null;
        })
      );
      const byId: Record<string, any> = {};
      updates.forEach((u) => {
        if (u) byId[String(u.id)] = u;
      });
      setUsers((prev) =>
        prev.map((u) => (byId[String(u.id)] ? byId[String(u.id)] : u))
      );
    };
    hydrate();
  }, [users]);
  const toggleTheme = (t: string) => {
    setThemeFilter((prev) => (prev === t ? "" : t));
  };
  const toggleSameCity = () => {
    const c = myProfile?.city || "";
    setCityFilter((prev) => (prev === c ? "" : c));
  };
  const getMatchScore = (p: any) => {
    if (!p) return 0;
    const mi: string[] = Array.isArray(myProfile?.interests)
      ? myProfile.interests
      : [];
    const me: string[] = Array.isArray(myProfile?.expertise)
      ? myProfile.expertise
      : [];
    const pi: string[] = Array.isArray(p.interests) ? p.interests : [];
    const pe: string[] = Array.isArray(p.expertise) ? p.expertise : [];
    let score = 0;
    score += pe.filter((x) => me.includes(x)).length * 2;
    score += pi.filter((x) => mi.includes(x)).length;
    if (myProfile?.city && p.city && myProfile.city === p.city) score += 1;
    return score;
  };
  const sortedUsers = React.useMemo(() => {
    return [...users].sort(
      (a, b) => getMatchScore(b.profile) - getMatchScore(a.profile)
    );
  }, [users, myProfile]);
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const a = parts[0] || "";
    const b = parts[1] || "";
    const init = (a[0] || "") + (b[0] || "");
    return init || name[0];
  };
  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 6,
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      }}
    >
      <Container maxWidth="md">
        <Paper sx={{ p: 3 }}>
          {/* <Typography variant="h5" sx={{ mb: 2 }}>用户目录</Typography> */}
          <TextField
            fullWidth
            placeholder="搜索姓名或用户名"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              在这里你可以找到已注册的伙伴，基于主题进行匹配，发起一对一邀请，确认线上或线下会面。
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              <Chip
                size="small"
                label="完善资料"
                onClick={() => window.location.assign("/profile")}
              />
              <Chip size="small" label="选择主题筛选" />
              <Chip size="small" label="发起邀请" />
              <Chip
                size="small"
                label="在“我的连接”处理"
                onClick={() => window.location.assign("/connections")}
              />
              <Chip size="small" label="确认会面" />
            </Box>
          </Box>
          {/* 已移除自定义 topics 筛选（数据库已删除该列） */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            按主题筛选
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {presetTopics.map((t) => (
              <Chip
                key={t}
                label={t}
                clickable
                color={themeFilter === t ? "primary" : "default"}
                variant={themeFilter === t ? "filled" : "outlined"}
                onClick={() => toggleTheme(t)}
              />
            ))}
          </Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            高级筛选
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="可提供筛选"
                value={offeringFilter}
                onChange={(e) => setOfferingFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="寻找帮助筛选"
                value={seekingFilter}
                onChange={(e) => setSeekingFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="城市筛选"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              {!!myProfile?.city && (
                <Chip
                  size="small"
                  label={`同城：${myProfile.city}`}
                  color={cityFilter === myProfile.city ? "primary" : "default"}
                  variant={
                    cityFilter === myProfile.city ? "filled" : "outlined"
                  }
                  onClick={toggleSameCity}
                />
              )}
              <Chip
                size="small"
                sx={{ ml: 1 }}
                label="清除筛选"
                onClick={() => {
                  setOfferingFilter("");
                  setSeekingFilter("");
                  setCityFilter("");
                  setThemeFilter("");
                }}
              />
            </Grid>
          </Grid>
          {sortedUsers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">
                暂时没有匹配的用户，尝试更换筛选或关键词。
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {sortedUsers.map((u) => (
                <Grid item xs={12} sm={6} md={4} key={u.id}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar sx={{ width: 48, height: 48 }}>
                        {getInitials(String(u.name))}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{u.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{u.username}
                        </Typography>
                      </Box>
                      {u.profile && (
                        <Chip
                          size="small"
                          label={`匹配度 ${getMatchScore(u.profile)}`}
                        />
                      )}
                    </Box>
                    {u.profile && (
                      <Box sx={{ mt: 1 }}>
                        {!!(u.profile.interests || []).length && (
                          <>
                            <Typography
                              variant="caption"
                              sx={{ display: "block", fontWeight: 600 }}
                            >
                              感兴趣
                            </Typography>
                            <Box
                              sx={{
                                mt: 0.5,
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              {(u.profile.interests || [])
                                .slice(0, 6)
                                .map((t: string) => (
                                  <Chip
                                    key={t}
                                    label={t}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                            </Box>
                          </>
                        )}
                        {!!(u.profile.expertise || []).length && (
                          <>
                            <Typography
                              variant="caption"
                              sx={{ mt: 1, display: "block", fontWeight: 600 }}
                            >
                              擅长
                            </Typography>
                            <Box
                              sx={{
                                mt: 0.5,
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              {(u.profile.expertise || [])
                                .slice(0, 6)
                                .map((t: string) => (
                                  <Chip
                                    key={t}
                                    label={t}
                                    size="small"
                                    color="primary"
                                  />
                                ))}
                            </Box>
                          </>
                        )}
                        {!!u.profile.city && (
                          <Chip
                            key="city"
                            label={u.profile.city}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    )}
                    {u.profile && (
                      <Box sx={{ mt: 1 }}>
                        {!!(u.profile.offerings || []).length && (
                          <Typography variant="caption" color="text.secondary">
                            可提供：
                            {(u.profile.offerings || []).slice(0, 3).join("、")}
                            {(u.profile.offerings || []).length > 3 ? "…" : ""}
                          </Typography>
                        )}
                        {!!(u.profile.seeking || []).length && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            寻找帮助：
                            {(u.profile.seeking || []).slice(0, 3).join("、")}
                            {(u.profile.seeking || []).length > 3 ? "…" : ""}
                          </Typography>
                        )}
                        {!!u.profile.availability_text && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            可约：{u.profile.availability_text}
                          </Typography>
                        )}
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                        mt: 2,
                      }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          setOpenInvite({
                            open: true,
                            inviteeId: String(u.id),
                          })
                        }
                      >
                        邀请
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Container>
      {openInvite.inviteeId && (
        <InviteDialog
          open={openInvite.open}
          onClose={() => setOpenInvite({ open: false, inviteeId: null })}
          inviteeId={openInvite.inviteeId}
        />
      )}
    </Box>
  );
};

export default Directory;
const presetTopics = [
  "职业发展与求职",
  "个人品牌与表达",
  "内容运营与增长",
  "学习与知识管理",
  "高效协作与远程",
  "产品与创新创业",
  "工具与低代码",
  "心理健康与自我",
  "财商与生活规划",
  "社区与人脉连接",
];
