import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
} from "@mui/material";
import { api } from "@/netlify/configs";
import { useGlobalSnackbar } from "@/context/app";

type SelectSlot = {
  datetime_iso: string;
  mode: "online" | "offline";
  meeting_url?: string;
  location_text?: string;
};

const AcceptDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  invite: any | null;
}> = ({ open, onClose, invite }) => {
  const show = useGlobalSnackbar();
  const [slot, setSlot] = useState<SelectSlot>({
    datetime_iso: "",
    mode: "online",
  });
  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "本地时区";
    } catch {
      return "本地时区";
    }
  }, []);
  const canSubmit = useMemo(() => {
    if (!slot.datetime_iso || !slot.mode) return false;
    const t = new Date(slot.datetime_iso).getTime();
    if (isNaN(t) || t <= Date.now()) return false;
    return true;
  }, [slot]);
  const submit = async () => {
    try {
      const iso = new Date(slot.datetime_iso).toISOString();
      const createRes = await api.oneonone.meetings.create({
        invite_id: String(invite?.id),
        final_datetime_iso: iso,
        mode: slot.mode,
        meeting_url: slot.meeting_url || null,
        location_text: slot.location_text || null,
      });
      if (!createRes.success) throw new Error(createRes.error || "确认失败");
      show.success("已确认日程");
      onClose();
    } catch (e: any) {
      show.error(e.message || "网络错误");
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>确认会面</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {!!(invite?.proposed_slots || []).length && (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Typography
                sx={{ width: 88 }}
                variant="body2"
                color="text.secondary"
              >
                候选时间
              </Typography>
              <Box sx={{ flex: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {(invite?.proposed_slots || []).map((s: any, idx: number) => {
                  const d = new Date(s.datetime_iso);
                  const label = `${d.toLocaleString()} · ${
                    s.mode === "online" ? "线上" : "线下"
                  }`;
                  const selected =
                    slot.datetime_iso === s.datetime_iso &&
                    slot.mode === s.mode;
                  return (
                    <Chip
                      key={idx}
                      label={label}
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      onClick={() =>
                        setSlot({
                          datetime_iso: s.datetime_iso,
                          mode: s.mode,
                          meeting_url: slot.meeting_url,
                          location_text: slot.location_text,
                        })
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Typography
              sx={{ width: 88 }}
              variant="body2"
              color="text.secondary"
            >
              选择时间
            </Typography>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                type="datetime-local"
                value={slot.datetime_iso}
                onChange={(e) =>
                  setSlot((prev) => ({ ...prev, datetime_iso: e.target.value }))
                }
                inputProps={{
                  min: (() => {
                    const d = new Date();
                    const pad = (n: number) => String(n).padStart(2, "0");
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
                      d.getDate()
                    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  })(),
                }}
                error={
                  !!slot.datetime_iso &&
                  new Date(slot.datetime_iso).getTime() <= Date.now()
                }
                helperText={
                  !!slot.datetime_iso &&
                  new Date(slot.datetime_iso).getTime() <= Date.now()
                    ? "会面时间不能早于当前时间"
                    : "时间为你的当地时间（" + timeZone + ")"
                }
              />
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Typography
              sx={{ width: 88 }}
              variant="body2"
              color="text.secondary"
            >
              会面方式
            </Typography>
            <Box sx={{ flex: 1 }}>
              <TextField
                select
                fullWidth
                value={slot.mode}
                onChange={(e) =>
                  setSlot((prev) => ({ ...prev, mode: e.target.value as any }))
                }
              >
                <MenuItem value="online">线上</MenuItem>
                <MenuItem value="offline">线下</MenuItem>
              </TextField>
            </Box>
          </Box>
          {slot.mode === "online" ? (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Typography
                sx={{ width: 88 }}
                variant="body2"
                color="text.secondary"
              >
                会议链接
              </Typography>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  placeholder="https://..."
                  value={slot.meeting_url || ""}
                  onChange={(e) =>
                    setSlot((prev) => ({
                      ...prev,
                      meeting_url: e.target.value,
                    }))
                  }
                  multiline
                  minRows={2}
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Typography
                sx={{ width: 88 }}
                variant="body2"
                color="text.secondary"
              >
                线下地点
              </Typography>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  placeholder="具体地址或地点描述"
                  value={slot.location_text || ""}
                  onChange={(e) =>
                    setSlot((prev) => ({
                      ...prev,
                      location_text: e.target.value,
                    }))
                  }
                  multiline
                  minRows={3}
                />
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={submit} disabled={!canSubmit} variant="contained">
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MyConnections: React.FC = () => {
  const show = useGlobalSnackbar();
  const [tab, setTab] = useState<"received" | "sent" | "meetings">("received");
  const [invitesReceived, setInvitesReceived] = useState<any[]>([]);
  const [invitesSent, setInvitesSent] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [recvStatusFilter, setRecvStatusFilter] = useState<
    "" | "pending" | "accepted" | "declined" | "cancelled"
  >("");
  const [sentStatusFilter, setSentStatusFilter] = useState<
    "" | "pending" | "accepted" | "declined" | "cancelled"
  >("");
  const [acceptState, setAcceptState] = useState<{
    open: boolean;
    invite: any | null;
  }>({ open: false, invite: null });
  const [peopleMap, setPeopleMap] = useState<
    Record<string, { name: string; username: string }>
  >({});
  const loadInvites = async () => {
    const [recv, sent] = await Promise.all([
      api.oneonone.invites.list("invitee", recvStatusFilter || undefined),
      api.oneonone.invites.list("inviter", sentStatusFilter || undefined),
    ]);
    if (recv.success) setInvitesReceived(recv.data?.invites || []);
    else show.error(recv.error || "加载收到的邀请失败");
    if (sent.success) setInvitesSent(sent.data?.invites || []);
    else show.error(sent.error || "加载发出的邀请失败");
  };
  const loadMeetings = async () => {
    const res = await api.oneonone.meetings.list();
    if (res.success) {
      const all = res.data?.meetings || [];
      setMeetings(all);
    } else show.error(res.error || "加载会面失败");
  };
  useEffect(() => {
    loadInvites();
    loadMeetings();
  }, []);
  useEffect(() => {
    const loadMy = async () => {
      const r = await api.profile.getMy();
      if (r.success) setMyProfile(r.data?.profile || null);
    };
    loadMy();
  }, []);
  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "本地时区";
    } catch {
      return "本地时区";
    }
  }, []);
  useEffect(() => {
    loadInvites();
  }, [recvStatusFilter, sentStatusFilter]);
  const lastMissingRef = React.useRef<string>("");
  useEffect(() => {
    const hydrate = async () => {
      const ids = new Set<string>([] as any);
      invitesReceived.forEach((i) => ids.add(String(i.inviter_id)));
      invitesSent.forEach((i) => ids.add(String(i.invitee_id)));
      const missing = Array.from(ids).filter((id) => !peopleMap[id]);
      if (missing.length === 0) return;
      const missingStr = [...missing].sort().join(",");
      if (missingStr === lastMissingRef.current) return;
      lastMissingRef.current = missingStr;
      const r = await api.people.getByIds(missing);
      const results = r.success ? r.data?.users || [] : [];
      const next = { ...peopleMap };
      results.forEach((u: any) => {
        if (u) next[String(u.id)] = { name: u.name, username: u.username };
      });
      setPeopleMap(next);
    };
    hydrate();
  }, [invitesReceived, invitesSent]);
  const displayName = (id: string | number) => {
    const u = peopleMap[String(id)];
    if (!u) return String(id);
    return u.name || `@${u.username}`;
  };
  const decline = async (id: string) => {
    const res = await api.oneonone.invites.update(id, { status: "declined" });
    if (res.success) {
      show.success("已拒绝");
      loadInvites();
    } else show.error(res.error || "操作失败");
  };
  const [updateState, setUpdateState] = useState<{
    open: boolean;
    meeting: any | null;
  }>({ open: false, meeting: null });
  const UpdateDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    meeting: any;
  }> = ({ open, onClose, meeting }) => {
    const [time, setTime] = useState<string>(meeting?.final_datetime_iso || "");
    const [mode, setMode] = useState<"online" | "offline">(
      meeting?.mode || "online"
    );
    const [url, setUrl] = useState<string>(meeting?.meeting_url || "");
    const [loc, setLoc] = useState<string>(meeting?.location_text || "");
    const timeZone = useMemo(() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "本地时区";
      } catch {
        return "本地时区";
      }
    }, []);
    const canSave = useMemo(() => {
      if (!time) return false;
      const t = new Date(time).getTime();
      return !isNaN(t) && t > Date.now();
    }, [time]);
    const save = async () => {
      const iso = time ? new Date(time).toISOString() : undefined;
      const res = await api.oneonone.meetings.update(meeting.id, {
        final_datetime_iso: iso,
        mode,
        meeting_url: url || null,
        location_text: loc || null,
      });
      if (res.success) {
        show.success("会面信息已更新");
        onClose();
        loadMeetings();
      } else show.error(res.error || "更新失败");
    };
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>修改会面信息</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Typography
                sx={{ width: 88 }}
                variant="body2"
                color="text.secondary"
              >
                选择时间
              </Typography>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  inputProps={{
                    min: (() => {
                      const d = new Date();
                      const pad = (n: number) => String(n).padStart(2, "0");
                      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
                        d.getDate()
                      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    })(),
                  }}
                  error={!!time && new Date(time).getTime() <= Date.now()}
                  helperText={
                    !!time && new Date(time).getTime() <= Date.now()
                      ? "会面时间不能早于当前时间"
                      : "时间为你的当地时间（" + timeZone + ")"
                  }
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Typography
                sx={{ width: 88 }}
                variant="body2"
                color="text.secondary"
              >
                会面方式
              </Typography>
              <Box sx={{ flex: 1 }}>
                <TextField
                  select
                  fullWidth
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                >
                  <MenuItem value="online">线上</MenuItem>
                  <MenuItem value="offline">线下</MenuItem>
                </TextField>
              </Box>
            </Box>
            {mode === "online" ? (
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Typography
                  sx={{ width: 88 }}
                  variant="body2"
                  color="text.secondary"
                >
                  会议链接
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    multiline
                    minRows={2}
                  />
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Typography
                  sx={{ width: 88 }}
                  variant="body2"
                  color="text.secondary"
                >
                  线下地点
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="具体地址或地点描述"
                    value={loc}
                    onChange={(e) => setLoc(e.target.value)}
                    multiline
                    minRows={3}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={save} disabled={!canSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  const cancelSent = async (id: string) => {
    const res = await api.oneonone.invites.update(id, { status: "cancelled" });
    if (res.success) {
      show.success("已取消邀请");
      loadInvites();
    } else show.error(res.error || "操作失败");
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
          <Typography variant="h5" sx={{ mb: 2 }}>
            我的连接
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab value="received" label="收到的邀请" />
            <Tab value="sent" label="我发出的邀请" />
            <Tab value="meetings" label="会面" />
          </Tabs>
          {tab === "received" && (
            <Box>
              <Box sx={{ mb: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {(
                  ["", "pending", "accepted", "declined", "cancelled"] as const
                ).map((st) => (
                  <Chip
                    key={st || "all"}
                    size="small"
                    label={st ? statusLabel(st) : "全部"}
                    clickable
                    color={recvStatusFilter === st ? "primary" : "default"}
                    variant={recvStatusFilter === st ? "filled" : "outlined"}
                    onClick={() => setRecvStatusFilter(st)}
                  />
                ))}
              </Box>
              {invitesReceived.map((i) => (
                <Box
                  key={i.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.5,
                    borderBottom: "1px solid #eee",
                    opacity:
                      i.status === "cancelled" || i.status === "declined"
                        ? 0.7
                        : 1,
                    backgroundColor: rowBg(i.status),
                    borderRadius: 1,
                    px: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      邀请来自 {displayName(i.inviter_id)}
                    </Typography>
                    {!!i.message && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        邀请语：{i.message}
                      </Typography>
                    )}
                    {!!(i.proposed_slots || []).length && (
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {(i.proposed_slots || [])
                          .slice(0, 3)
                          .map((s: any, idx: number) => (
                            <Chip
                              key={idx}
                              size="small"
                              variant="outlined"
                              label={formatSlot(s)}
                            />
                          ))}
                      </Box>
                    )}
                    <Box sx={{ mt: 0.5 }}>
                      {i.status === "accepted" ? (
                        <Chip size="small" color="success" label="已接受" />
                      ) : i.status === "declined" ? (
                        <Chip size="small" variant="outlined" label="已拒绝" />
                      ) : i.status === "cancelled" ? (
                        <Chip size="small" variant="outlined" label="已取消" />
                      ) : (
                        <Chip size="small" variant="outlined" label="待处理" />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {i.status === "pending" ? (
                      <>
                        <Button
                          variant="contained"
                          onClick={() =>
                            setAcceptState({ open: true, invite: i })
                          }
                        >
                          接受
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => decline(i.id)}
                        >
                          拒绝
                        </Button>
                      </>
                    ) : i.status === "accepted" ? (
                      <Button
                        variant="outlined"
                        onClick={() => setTab("meetings")}
                      >
                        查看会面
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {tab === "sent" && (
            <Box>
              <Box sx={{ mb: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {(
                  ["", "pending", "accepted", "declined", "cancelled"] as const
                ).map((st) => (
                  <Chip
                    key={st || "all"}
                    size="small"
                    label={st ? statusLabel(st) : "全部"}
                    clickable
                    color={sentStatusFilter === st ? "primary" : "default"}
                    variant={sentStatusFilter === st ? "filled" : "outlined"}
                    onClick={() => setSentStatusFilter(st)}
                  />
                ))}
              </Box>
              {invitesSent.map((i) => (
                <Box
                  key={i.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.5,
                    borderBottom: "1px solid #eee",
                    opacity:
                      i.status === "cancelled" || i.status === "declined"
                        ? 0.7
                        : 1,
                    backgroundColor: rowBg(i.status),
                    borderRadius: 1,
                    px: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      邀请给 {displayName(i.invitee_id)}
                    </Typography>
                    {!!i.message && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        邀请语：{i.message}
                      </Typography>
                    )}
                    {!!(i.proposed_slots || []).length && (
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {(i.proposed_slots || [])
                          .slice(0, 3)
                          .map((s: any, idx: number) => (
                            <Chip
                              key={idx}
                              size="small"
                              variant="outlined"
                              label={formatSlot(s)}
                            />
                          ))}
                      </Box>
                    )}
                    <Box sx={{ mt: 0.5 }}>
                      {i.status === "accepted" ? (
                        <Chip size="small" color="success" label="已接受" />
                      ) : i.status === "declined" ? (
                        <Chip size="small" variant="outlined" label="已拒绝" />
                      ) : i.status === "cancelled" ? (
                        <Chip size="small" variant="outlined" label="已取消" />
                      ) : (
                        <Chip size="small" variant="outlined" label="待处理" />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {i.status === "pending" ? (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => cancelSent(i.id)}
                      >
                        取消邀请
                      </Button>
                    ) : i.status === "accepted" ? (
                      <Button
                        variant="outlined"
                        onClick={() => setTab("meetings")}
                      >
                        查看会面
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {tab === "meetings" && (
            <Box>
              {meetings.map((m) => (
                <Box
                  key={m.id}
                  sx={{
                    py: 1,
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    与{" "}
                    {(() => {
                      const inv = m.one_on_one_invites;
                      const me = myProfile?.user_id;
                      const other = inv
                        ? me && String(inv.inviter_id) === String(me)
                          ? inv.invitee_id
                          : inv.inviter_id
                        : "?";
                      return displayName(other);
                    })()}{" "}
                    在{" "}
                    {m.mode === "online" ? (
                      m.meeting_url ? (
                        <>
                          线上会议（
                          <a
                            href={m.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {m.meeting_url}
                          </a>
                          ）
                        </>
                      ) : (
                        "线上会议"
                      )
                    ) : (
                      m.location_text || "线下地点未提供"
                    )}{" "}
                    于 {new Date(m.final_datetime_iso).toLocaleString()}{" "}
                    会面（当地时区：{timeZone}）
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {m.status === "cancelled" ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label="已取消会面"
                      />
                    ) : (
                      <Chip size="small" variant="outlined" label="已安排" />
                    )}
                    {new Date(m.final_datetime_iso).getTime() > Date.now() &&
                      m.status !== "cancelled" && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() =>
                            setUpdateState({ open: true, meeting: m })
                          }
                        >
                          修改
                        </Button>
                      )}
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      disabled={m.status === "cancelled"}
                      onClick={async () => {
                        const res = await api.oneonone.meetings.update(m.id, {
                          status: "cancelled",
                        });
                        if (res.success) {
                          show.success("会面已取消");
                          loadMeetings();
                        } else show.error(res.error || "取消失败");
                      }}
                    >
                      取消
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {updateState.open && updateState.meeting && (
            <UpdateDialog
              open={updateState.open}
              onClose={() => setUpdateState({ open: false, meeting: null })}
              meeting={updateState.meeting}
            />
          )}
        </Paper>
      </Container>
      {acceptState.invite && (
        <AcceptDialog
          open={acceptState.open}
          onClose={() => {
            setAcceptState({ open: false, invite: null });
            loadInvites();
            loadMeetings();
          }}
          invite={acceptState.invite}
        />
      )}
    </Box>
  );
};

export default MyConnections;
const formatSlot = (s: {
  datetime_iso: string;
  mode: "online" | "offline";
}) => {
  try {
    const d = new Date(s.datetime_iso);
    const t = d.toLocaleString();
    return `${t} · ${s.mode === "online" ? "线上" : "线下"}`;
  } catch {
    return `${s.datetime_iso} · ${s.mode}`;
  }
};
const rowBg = (status: string) => {
  if (status === "pending") return "rgba(255, 215, 0, 0.08)";
  if (status === "accepted") return "rgba(46, 204, 113, 0.08)";
  if (status === "declined" || status === "cancelled")
    return "rgba(149, 165, 166, 0.15)";
  return "transparent";
};
const statusLabel = (
  s: "pending" | "accepted" | "declined" | "cancelled" | string
) => {
  if (s === "pending") return "待处理";
  if (s === "accepted") return "已接受";
  if (s === "declined") return "已拒绝";
  if (s === "cancelled") return "已取消";
  return s;
};
