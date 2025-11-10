import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Grid,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import { api } from '../netlify/configs';
import { Meetup } from '../netlify/types/index';
import { isUpcoming, formatTime, escapeHtml, formatDate } from '../utils';
import Error from '../components/Error';
import Loading from '../components/Loading';
import Empty from '../components/Empty';

interface UserInfo {
  username: string;
  name: string;
  // 其他用户信息字段
}

const MyMeetups: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [allMeetups, setAllMeetups] = useState<Meetup[]>([]);
  const [currentStatus, setCurrentStatus] = useState<
    'active' | 'completed' | 'cancelled' | 'all'
  >('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 检查用户登录状态并加载活动
  useEffect(() => {
    checkAuthAndLoadMeetups();
  }, []);

  const checkAuthAndLoadMeetups = () => {
    const token = localStorage.getItem('userToken');
    const userInfoStr = localStorage.getItem('userInfo');

    if (!token || !userInfoStr) {
      setAuthChecking(false);
      return;
    }

    try {
      const userInfo = JSON.parse(userInfoStr) as UserInfo;
      setCurrentUser(userInfo);
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

      if (response.success && Array.isArray(response.data)) {
        // 过滤出当前用户创建的活动
        const userMeetups = response.data.filter(
          (meetup: any) =>
            meetup.created_by === currentUser?.username ||
            meetup.organizer === currentUser?.name
        );
        setAllMeetups(userMeetups as Meetup[]);
      } else {
        console.error('加载活动失败:', response.error);
        setError(response.error || '加载活动失败');
      }
    } catch (error) {
      console.error('Load my meetups error:', error);
      setError('加载活动失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 切换标签页
  const handleTabChange = (
    status: 'active' | 'completed' | 'cancelled' | 'all'
  ) => {
    setCurrentStatus(status);
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
        throw new Error(response.error || '删除活动失败');
      }

      // 模拟成功响应
      setAllMeetups((prev) => prev.filter((meetup) => meetup.id !== meetupId));
      alert('活动已取消');
    } catch (error) {
      console.error('Delete meetup error:', error);
      alert('取消活动失败，请稍后重试');
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '进行中',
      completed: '已完成',
      cancelled: '已取消',
      all: '全部',
    };
    return statusMap[status] || status;
  };

  // 根据当前状态过滤活动
  const getFilteredMeetups = () => {
    if (currentStatus === 'all') {
      return allMeetups;
    }

    return allMeetups.filter((meetup) => {
      const meetupDate = new Date(meetup.date + 'T' + meetup.time);
      if (currentStatus === 'active') {
        return meetup.status === 'active' && isUpcoming(meetupDate);
      }
      if (currentStatus === 'completed') {
        return meetup.status === 'active' && !isUpcoming(meetupDate);
      }
      return meetup.status === currentStatus;
    });
  };

  // 渲染活动卡片
  const renderMeetupCard = (meetup: Meetup) => {
    const meetupDate = new Date(meetup.date + 'T' + meetup.time);
    const isUpcomingMeetup = isUpcoming(meetupDate);
    const formattedDate = formatDate(meetup.date);
    const formattedTime = formatTime(meetup.time);

    let status = meetup.status;
    if (status === 'active' && !isUpcomingMeetup) {
      status = 'completed';
    }

    // 状态颜色映射
    const statusColorMap: Record<string, string> = {
      active: 'success',
      completed: 'info',
      cancelled: 'error',
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
          sx={{ mb: 3, lineHeight: 1.5 }}
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
        <Loading message="验证登录状态..." size="large" />
      </Container>
    );
  }

  // 渲染未登录状态
  if (!currentUser) {
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
    if (isMedium) return 2;
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
        <Tabs
          value={currentStatus}
          onChange={(_, newValue) => handleTabChange(newValue as any)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: isMobile ? '0.9rem' : '1rem',
            },
            '& .Mui-selected': {
              fontWeight: 'bold',
            },
          }}
        >
          <Tab value="active" label="进行中" />
          <Tab value="completed" label="已完成" />
          <Tab value="cancelled" label="已取消" />
          <Tab value="all" label="全部" />
        </Tabs>
      </Box>

      <section id="meetupsContainer">
        {loading ? (
          <Loading message="加载活动中..." size="large" />
        ) : error ? (
          <Error
            message="加载失败"
            description={error}
            onRetry={loadMyMeetups}
            retryText="重试"
          />
        ) : (
          <>
            {getFilteredMeetups().length === 0 ? (
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
                {getFilteredMeetups().map((meetup) => (
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
