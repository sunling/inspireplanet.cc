import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Meetup, MeetupStatus, Participant } from '@/netlify/types';
import { api } from '@/netlify/configs';
import {
  escapeHtml,
  formatDate,
  formatTime,
  getCurrentUser,
  isUpcoming,
} from '@/utils';
import { useGlobalSnackbar } from '@/context/app';
import useResponsive from '@/hooks/useResponsive';
import Empty from '@/components/Empty';
import ErrorCard from '@/components/ErrorCard';
import Loading from '@/components/Loading';

interface UserInfo {
  username: string;
  name: string;
}

enum FilterStatus {
  'ALL' = 'all',
  'UPCOMING' = MeetupStatus.UPCOMING,
  'ONGOING' = MeetupStatus.ONGOING,
  'ACTIVE' = MeetupStatus.ACTIVE,
  'END' = MeetupStatus.END,
  'CANCEL' = MeetupStatus.CANCEL,
}

const MyMeetups: React.FC = () => {
  const [allMeetups, setAllMeetups] = useState<Meetup[]>([]);
  const [myRsvps, setMyRsvps] = useState<Participant[]>([]);
  const [rsvpMeetups, setRsvpMeetups] = useState<Meetup[]>([]);
  const [currentStatus, setCurrentStatus] = useState<FilterStatus>(
    FilterStatus.ALL
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const showSnackbar = useGlobalSnackbar();
  const { isMobile, isTablet } = useResponsive();
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    checkAuthAndLoadMeetups();
  }, []);

  const checkAuthAndLoadMeetups = () => {
    const token = localStorage.getItem('authToken');
    const userInfoStr = localStorage.getItem('userInfo');

    if (!token || !userInfoStr) {
      setAuthChecking(false);
      return;
    }

    try {
      const userInfo = JSON.parse(userInfoStr) as UserInfo;
      setAuthChecking(false);
      loadMyMeetups();
    } catch {
      setAuthChecking(false);
    }
  };

  const loadMyMeetups = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.meetups.getAll({ status: 'all' });
      if (!response.success) {
        showSnackbar.error(response.error || '加载活动失败');
        return;
      }

      const meetups = response.data?.meetups || [];
      const curUser = getCurrentUser() || {};
      const userMeetups = meetups.filter(
        (meetup: Meetup) =>
          meetup.creator === curUser?.username ||
          meetup.organizer === curUser?.name ||
          meetup.user_id === curUser?.username ||
          meetup.user_id === curUser?.name
      );
      setAllMeetups(userMeetups as Meetup[]);

      await loadMyRsvps(meetups);
    } catch (error) {
      setError('加载活动失败，请稍后重试');
      showSnackbar.error('加载活动失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRsvps = async (allMeetupsList: Meetup[]) => {
    try {
      const uid = localStorage.getItem('userId');
      let res:
        | Awaited<ReturnType<typeof api.rsvp.getByUserId>>
        | Awaited<ReturnType<typeof api.rsvp.getByWechatId>>;
      if (uid && uid.trim()) {
        res = await api.rsvp.getByUserId(uid);
      } else {
        const curUser = getCurrentUser();
        const wechat = (curUser as any)?.wechatId;
        if (!wechat) {
          setMyRsvps([]);
          setRsvpMeetups([]);
          return;
        }
        res = await api.rsvp.getByWechatId(wechat);
      }
      if (!res.success) {
        showSnackbar.error(res.error || '获取报名信息失败');
        return;
      }
      const rsvps = (res.data?.rsvps || []).filter((r: any) => r && r.meetup_id);
      setMyRsvps(rsvps as Participant[]);

      const ids = Array.from(
        new Set(
          rsvps
            .map((r: any) => String(r.meetup_id))
            .filter((id: string) => !!id)
        )
      );

      const existingMap = new Map(
        (allMeetupsList || []).map((m) => [String(m.id), m])
      );
      const missingIds = ids.filter((id) => !existingMap.has(id));

      let fetchedMeetups: Meetup[] = [];
      if (missingIds.length > 0) {
        const results = await Promise.all(
          missingIds.map((id) => api.meetups.getById(id))
        );
        fetchedMeetups = results.flatMap((resp) =>
          resp.success ? (resp.data?.meetups || []) : []
        ) as Meetup[];
      }

      const finalMeetups = ids
        .map(
          (id) =>
            existingMap.get(id) ||
            fetchedMeetups.find((m) => String(m.id) === id)
        )
        .filter(Boolean) as Meetup[];

      setRsvpMeetups(finalMeetups);
    } catch (e) {
      // 静默错误，保持页面可用
      console.error('加载报名活动失败:', e);
    }
  };

  const handleStatusChange = (_: React.MouseEvent<HTMLElement>, newStatus: any) => {
    if (newStatus !== null) {
      setCurrentStatus(newStatus);
    }
  };

  const handleSelectChange = (newStatus: string) => {
    setCurrentStatus(newStatus as FilterStatus);
  };

  const deleteMeetup = async (meetupId: string) => {
    if (!window.confirm('确定要取消这个活动吗？取消后无法恢复。')) {
      return;
    }
    try {
      const response = await api.meetups.delete(meetupId);
      if (!response.success) {
        showSnackbar.error(response.error || '删除活动失败');
        return;
      }
      setAllMeetups((prev) => prev.filter((meetup) => meetup.id !== meetupId));
      showSnackbar.success('活动已取消');
    } catch {
      showSnackbar.error('取消活动失败，请稍后重试');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      [FilterStatus.ALL]: '全部',
      [FilterStatus.ACTIVE]: '进行中',
      [FilterStatus.END]: '已结束',
      [FilterStatus.CANCEL]: '已取消',
    };
    return statusMap[status] || status;
  };

  const getFilteredMeetups = () => {
    if (currentStatus === FilterStatus.ALL) return allMeetups;
    const now = new Date();
    return allMeetups.filter((meetup) => {
      const start = new Date(meetup.datetime);
      const dur = Number(meetup.duration);
      const hasDur = Number.isFinite(dur) && dur > 0;
      const end = new Date(start.getTime() + (hasDur ? dur * 3600 * 1000 : 0));
      const isCancelled = String(meetup.status).toLowerCase() === 'cancelled';
      if (currentStatus === FilterStatus.CANCEL) return isCancelled;
      if (currentStatus === FilterStatus.END) return now > end && !isCancelled;
      if (currentStatus === FilterStatus.ACTIVE)
        return now >= start && now <= end && !isCancelled;
      return true;
    });
  };

  const filteredMeetups = useMemo(() => getFilteredMeetups(), [currentStatus, allMeetups]);

  const renderMeetupCard = (meetup: Meetup) => {
    const start = new Date(meetup.datetime);
    const now = new Date();
    const dur = Number(meetup.duration);
    const hasDur = Number.isFinite(dur) && dur > 0;
    const end = new Date(start.getTime() + (hasDur ? dur * 3600 * 1000 : 0));
    const isCancelled = String(meetup.status).toLowerCase() === 'cancelled';

    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdayNames[start.getDay()];
    const formattedDate = formatDate(start.toISOString());
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const ampm = hours < 12 ? '上午' : '下午';
    const hour12 = hours % 12 || 12;
    const mm = String(minutes).padStart(2, '0');
    const formattedTime12 = `${ampm} ${hour12}:${mm}`;

    const statusLabel =
      isCancelled ? '已取消' : now < start ? '即将开始' : now > end ? '已结束' : '进行中';
    const statusColor = isCancelled
      ? 'error'
      : statusLabel === '已结束'
      ? 'info'
      : statusLabel === '即将开始'
      ? 'success'
      : 'primary';

    return (
      <Paper
        key={meetup.id}
        elevation={3}
        sx={{
          borderRadius: '8px',
          padding: 2,
          position: 'relative',
          mb: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Chip label={statusLabel} color={statusColor as any} size="small" />
          <Chip
            label={meetup.type === 'online' ? '线上活动' : '线下活动'}
            variant="outlined"
            size="small"
          />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
          {escapeHtml(meetup.title)}
        </Typography>

        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📅 {formattedDate}（{weekday}）
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🕐 {formattedTime12}
          </Typography>
          {meetup.location && (
            <Typography
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                wordBreak: 'break-word',
              }}
            >
              📍 {escapeHtml(meetup.location)}
            </Typography>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.5, wordBreak: 'break-all' }}>
          {escapeHtml(meetup.description)}
        </Typography>

        <Box
          sx={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size={isMobile ? 'small' : 'medium'}
              color="primary"
              variant="outlined"
              component={Link}
              to={`/meetup-detail?id=${meetup.id}`}
            >
              👁️ 查看
            </Button>
            {statusLabel !== '已结束' && !isCancelled && (
              <>
                <Button
                  size={isMobile ? 'small' : 'medium'}
                  color="secondary"
                  variant="outlined"
                  component={Link}
                  to={`/edit-meetup?id=${meetup.id}`}
                >
                  ✏️ 编辑
                </Button>
                <Button
                  size={isMobile ? 'small' : 'medium'}
                  color="error"
                  variant="outlined"
                  onClick={() => deleteMeetup(meetup.id)}
                >
                  🗑️ 取消
                </Button>
              </>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {meetup.participant_count || 0}
            {Number(meetup.max_participants) > 0 ? '/' + meetup.max_participants : ''} 人参加
          </Typography>
        </Box>
      </Paper>
    );
  };

  const cancelRsvp = async (rsvp?: Participant, meetupId?: string) => {
    if (!rsvp?.id && !meetupId) return;
    if (!window.confirm('确定要取消报名吗？')) return;
    try {
      // 优先按报名记录ID取消，失败再按活动ID+微信号取消
      let res = rsvp?.id ? await api.rsvp.cancel(rsvp.id as any) : ({ success: false, statusCode: 0 } as any);
      if (!res.success && meetupId && rsvp?.wechat_id) {
        const fallback = await api.rsvp.cancelByMeetupWechat(meetupId as any, rsvp.wechat_id as any);
        res = fallback;
      }
      if (!res.success) {
        showSnackbar.error(res.error || '取消报名失败');
        return;
      }
      const newRsvps = (myRsvps || []).filter((x) => String(x.id) !== String(rsvp?.id));
      setMyRsvps(newRsvps);
      const ids = Array.from(new Set(newRsvps.map((r) => String(r.meetup_id))));
      setRsvpMeetups((prev) => prev.filter((m) => ids.includes(String(m.id))));
      showSnackbar.success('已取消报名');
    } catch (e) {
      showSnackbar.error('取消报名失败，请稍后重试');
    }
  };

  const renderRsvpMeetupCard = (meetup: Meetup, rsvp?: Participant) => {
    const start = new Date(meetup.datetime);
    const now = new Date();
    const dur = Number(meetup.duration);
    const hasDur = Number.isFinite(dur) && dur > 0;
    const end = new Date(start.getTime() + (hasDur ? dur * 3600 * 1000 : 0));
    const isCancelled = String(meetup.status).toLowerCase() === 'cancelled';
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdayNames[start.getDay()];
    const formattedDate = formatDate(start.toISOString());
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const ampm = hours < 12 ? '上午' : '下午';
    const hour12 = hours % 12 || 12;
    const mm = String(minutes).padStart(2, '0');
    const formattedTime12 = `${ampm} ${hour12}:${mm}`;
    const statusLabel =
      isCancelled ? '已取消' : now < start ? '即将开始' : now > end ? '已结束' : '进行中';
    const statusColor = isCancelled
      ? 'error'
      : statusLabel === '已结束'
      ? 'info'
      : statusLabel === '即将开始'
      ? 'success'
      : 'primary';

    return (
      <Paper
        key={`${meetup.id}-rsvp`}
        elevation={3}
        sx={{
          borderRadius: '8px',
          padding: 2,
          position: 'relative',
          mb: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Chip label={statusLabel} color={statusColor as any} size="small" />
          <Chip
            label={meetup.type === 'online' ? '线上活动' : '线下活动'}
            variant="outlined"
            size="small"
          />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
          {escapeHtml(meetup.title)}
        </Typography>
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📅 {formattedDate}（{weekday}）
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🕐 {formattedTime12}
          </Typography>
          {meetup.location && (
            <Typography
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                wordBreak: 'break-word',
              }}
            >
              📍 {escapeHtml(meetup.location)}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.5, wordBreak: 'break-all' }}>
          {escapeHtml(meetup.description)}
        </Typography>
        <Box sx={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size={isMobile ? 'small' : 'medium'}
              color="primary"
              variant="outlined"
              component={Link}
              to={`/meetup-detail?id=${meetup.id}`}
            >
              👁️ 查看
            </Button>
            {!isCancelled && rsvp?.id && (
              <Button
                size={isMobile ? 'small' : 'medium'}
                color="error"
                variant="outlined"
                onClick={() => cancelRsvp(rsvp, String(meetup.id))}
              >
                ❌ 取消报名
              </Button>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {meetup.participant_count || 0}
            {Number(meetup.max_participants) > 0 ? '/' + meetup.max_participants : ''} 人参加
          </Typography>
        </Box>
      </Paper>
    );
  };

  if (authChecking) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            我的活动
          </Typography>
          <Button variant="contained" color="primary" component={Link} to="/create-meetup">
            发起新活动
          </Button>
        </Box>
        <Loading message="验证登录状态..." size={40} />
      </Container>
    );
  }

  if (!getCurrentUser()) {
    const redirectUrl = encodeURIComponent(window.location.href);
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            我的活动
          </Typography>
          <Button variant="contained" color="primary" component={Link} to="/create-meetup">
            发起新活动
          </Button>
        </Box>
        <Empty message="请先登录" description="您需要登录后才能查看和管理自己的活动" />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            to={`/login?redirect=${redirectUrl}`}
          >
            立即登录
          </Button>
        </Box>
      </Container>
    );
  }

  const getGridColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          我的活动
        </Typography>
        <Button variant="contained" color="primary" component={Link} to="/create-meetup">
          发起新活动
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        {isMobileScreen ? (
          <FormControl fullWidth sx={{ minWidth: 120 }}>
            <InputLabel id="status-select-label">活动状态</InputLabel>
            <Select labelId="status-select-label" id="status-select" value={currentStatus} label="活动状态">
              <MenuItem value="all" onClick={() => handleSelectChange('all')}>
                全部
              </MenuItem>
              <MenuItem value="active" onClick={() => handleSelectChange('active')}>
                进行中
              </MenuItem>
              <MenuItem value="end" onClick={() => handleSelectChange('end')}>
                已完成
              </MenuItem>
              <MenuItem value="cancelled" onClick={() => handleSelectChange('cancelled')}>
                已取消
              </MenuItem>
            </Select>
          </FormControl>
        ) : (
          <ToggleButtonGroup
            value={currentStatus}
            exclusive
            onChange={handleStatusChange}
            aria-label="活动状态筛选"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontSize: '1rem',
                borderRadius: '4px',
                marginRight: 1,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
              },
            }}
          >
            <ToggleButton value={FilterStatus.ALL}>全部</ToggleButton>
            <ToggleButton value={FilterStatus.ACTIVE}>进行中</ToggleButton>
            <ToggleButton value={FilterStatus.END}>已完成</ToggleButton>
            <ToggleButton value={FilterStatus.CANCEL}>已取消</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      <section id="meetupsContainer" style={{ flexGrow: 1 }}>
        {loading ? (
          <Loading message="加载活动中..." size={40} />
        ) : error ? (
          <ErrorCard message="加载失败" description={error} onRetry={loadMyMeetups} retryText="重试" />
        ) : (
          <>
            {filteredMeetups.length === 0 ? (
              <Empty
                message={`暂无${getStatusText(currentStatus)}活动`}
                description={`您还没有${getStatusText(currentStatus)}的活动，快去发起一个吧！`}
              />
            ) : (
              <Grid
                container
                spacing={3}
                sx={{
                  '& > .MuiGrid-item': {
                    display: 'flex',
                  },
                }}
              >
                {filteredMeetups.map((meetup) => (
                  <Grid
                    size={{
                      xs: 12,
                      sm: getGridColumns() === 1 ? 12 : 6,
                      md: 12 / getGridColumns(),
                    }}
                    key={meetup.id}
                  >
                    {renderMeetupCard(meetup)}
                  </Grid>
                ))}
              </Grid>
            )}

            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                我报名的活动
              </Typography>
              {rsvpMeetups.length === 0 ? (
                <Empty message="暂无报名" description="您还没有报名任何活动" />
              ) : (
                <Grid
                  container
                  spacing={3}
                  sx={{
                    '& > .MuiGrid-item': {
                      display: 'flex',
                    },
                  }}
                >
                  {rsvpMeetups.map((meetup) => {
                    const r = (myRsvps || []).find(
                      (x) => String(x.meetup_id) === String(meetup.id)
                    );
                    return (
                      <Grid
                        size={{
                          xs: 12,
                          sm: getGridColumns() === 1 ? 12 : 6,
                          md: 12 / getGridColumns(),
                        }}
                        key={`${meetup.id}-rsvp-card`}
                      >
                        {renderRsvpMeetupCard(meetup, r)}
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </>
        )}
      </section>
    </Container>
  );
};

export default MyMeetups;
