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
import { Meetup, MeetupStatus } from '@/netlify/types';
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
  // 其他用户信息字段
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

  // 检查用户登录状态并加载活动
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
      console.log('解析用户信息:', userInfo);
      setAuthChecking(false);
      loadMyMeetups();
    } catch (error) {
      console.error('解析用户信息失败:', error);
      setAuthChecking(false);
    }
  };

  // 加载我的活动
  const loadMyMeetups = async () => {
    setLoading(true);
    setError(null);

    try {
      // 使用统一的API封装获取活动数据
      const response = await api.meetups.getAll();
      console.log('加载我的活动响应:', response);

      if (!response.success) {
        showSnackbar.error(response.error || '加载活动失败');
        return;
      }

      const meetups = response.data?.meetups || [];

      const curUser = getCurrentUser() || {};

      // 过滤出当前用户创建的活动
      const userMeetups = meetups.filter(
        (meetup: Meetup) =>
          meetup.creator === curUser?.username ||
          meetup.organizer === curUser?.name ||
          meetup.user_id === curUser?.username ||
          meetup.user_id === curUser?.name
      );

      setAllMeetups(userMeetups as Meetup[]);
    } catch (error) {
      console.error('Load my meetups error:', error);
      setError('加载活动失败，请稍后重试');
      showSnackbar.error('加载活动失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理状态筛选变更
  const handleStatusChange = (
    _: React.MouseEvent<HTMLElement>,
    newStatus: any
  ) => {
    if (newStatus !== null) {
      setCurrentStatus(newStatus);
    }
  };

  // 处理下拉选择变更
  const handleSelectChange = (newStatus: string) => {
    setCurrentStatus(newStatus as FilterStatus);
  };

  // 删除/取消活动
  const deleteMeetup = async (meetupId: string) => {
    if (!window.confirm('确定要取消这个活动吗？取消后无法恢复。')) {
      return;
    }

    try {
      // 使用统一的api对象删除活动
      const response = await api.meetups.delete(meetupId);

      if (!response.success) {
        showSnackbar.error(response.error || '删除活动失败');
        return;
      }

      // 模拟成功响应
      setAllMeetups((prev) => prev.filter((meetup) => meetup.id !== meetupId));
      showSnackbar.success('活动已取消');
    } catch (error) {
      console.error('Delete meetup error:', error);
      showSnackbar.error('取消活动失败，请稍后重试');
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      [FilterStatus.ALL]: '全部',
      [FilterStatus.ACTIVE]: '进行中',
      [FilterStatus.END]: '已结束',
      [FilterStatus.CANCEL]: '已取消',
    };
    return statusMap[status] || status;
  };

  // 根据当前状态过滤活动
  const getFilteredMeetups = () => {
    if (currentStatus === FilterStatus.ALL) {
      return allMeetups;
    }

    return allMeetups.filter((meetup) => {
      const meetupDate = new Date(meetup.datetime);
      const isUpcomingMeetup = isUpcoming(meetupDate.toISOString());

      // 计算活动的实际状态（考虑时间因素）
      let actualStatus = meetup.status;

      if (currentStatus === FilterStatus.END) {
        return (actualStatus =
          MeetupStatus.END ||
          (actualStatus === MeetupStatus.ACTIVE && !isUpcomingMeetup));
      }

      if (currentStatus === FilterStatus.ACTIVE) {
        return actualStatus === MeetupStatus.ACTIVE && isUpcomingMeetup;
      }

      // 根据实际状态进行筛选
      return (actualStatus as unknown as FilterStatus) === currentStatus;
    });
  };

  const filteredMeetups = useMemo(
    () => getFilteredMeetups(),
    [currentStatus, allMeetups]
  );
  // 渲染活动卡片
  const renderMeetupCard = (meetup: Meetup) => {
    const meetupDate = new Date(meetup.datetime);
    const isUpcomingMeetup = isUpcoming(meetupDate.toISOString());
    const formattedDate = formatDate(meetupDate.toISOString());
    const formattedTime = formatTime(meetupDate.toISOString());

    let status = meetup.status;
    if (status === MeetupStatus.ACTIVE && !isUpcomingMeetup) {
      status = MeetupStatus.END;
    }

    // 状态颜色映射
    const statusColorMap: Record<string, string> = {
      [MeetupStatus.ACTIVE]: 'success',
      [MeetupStatus.END]: 'info',
      [MeetupStatus.CANCEL]: 'error',
    };

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
          <Chip
            label={getStatusText(status)}
            color={statusColorMap[status] as any}
            size="small"
          />
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
          <Typography
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            📅 {formattedDate}
          </Typography>
          <Typography
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            🕐 {formattedTime}
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

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.5, wordBreak: 'break-all' }}
        >
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
            {status === 'active' && isUpcomingMeetup && (
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
            {meetup.max_participants ? '/' + meetup.max_participants : ''}{' '}
            人参加
          </Typography>
        </Box>
      </Paper>
    );
  };

  // 渲染加载状态
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
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/create-meetup"
          >
            发起新活动
          </Button>
        </Box>
        <Loading message="验证登录状态..." size={40} />
      </Container>
    );
  }

  // 渲染未登录状态
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
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/create-meetup"
          >
            发起新活动
          </Button>
        </Box>
        <Empty
          message="请先登录"
          description="您需要登录后才能查看和管理自己的活动"
        />
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

  // 获取适当的网格列数
  const getGridColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  // 渲染活动内容
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/create-meetup"
        >
          发起新活动
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        {isMobileScreen ? (
          // 移动端使用下拉选择器
          <FormControl fullWidth sx={{ minWidth: 120 }}>
            <InputLabel id="status-select-label">活动状态</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              value={currentStatus}
              label="活动状态"
            >
              <MenuItem value="all" onClick={() => handleSelectChange('all')}>
                全部
              </MenuItem>
              <MenuItem
                value="active"
                onClick={() => handleSelectChange('active')}
              >
                进行中
              </MenuItem>
              <MenuItem value="end" onClick={() => handleSelectChange('end')}>
                已完成
              </MenuItem>
              <MenuItem
                value="cancelled"
                onClick={() => handleSelectChange('cancelled')}
              >
                已取消
              </MenuItem>
            </Select>
          </FormControl>
        ) : (
          // 桌面端使用ToggleButtonGroup
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

      <section id="meetupsContainer">
        {loading ? (
          <Loading message="加载活动中..." size={40} />
        ) : error ? (
          <ErrorCard
            message="加载失败"
            description={error}
            onRetry={loadMyMeetups}
            retryText="重试"
          />
        ) : (
          <>
            {filteredMeetups.length === 0 ? (
              <Empty
                message={`暂无${getStatusText(currentStatus)}活动`}
                description={`您还没有${getStatusText(
                  currentStatus
                )}的活动，快去发起一个吧！`}
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
          </>
        )}
      </section>
    </Container>
  );
};

export default MyMeetups;
