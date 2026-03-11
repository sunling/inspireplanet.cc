import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';

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
  Tabs,
  Tab,
  Pagination,
} from '@mui/material';
import useResponsive from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';

import ErrorCard from '../../components/ErrorCard';
import Loading from '../../components/Loading';
import Empty from '../../components/Empty';

import { dateTime, user } from '@/utils/helpers';
import { formatTime, formatDate } from '../../utils';
import { Meetup, MeetupLabelMap } from '../../netlify/functions/meetup';
import { rsvpApi } from '../../netlify/config';
import meetupsApi from '../../netlify/modules/meetups';

const PAGE_SIZE = 6;

// 判断活动是否已结束（now > start + duration）
function isMeetupPast(meetup: Meetup): boolean {
  const start = new Date(meetup.datetime);
  const dur = Number(meetup.duration);
  const hasDur = Number.isFinite(dur) && dur > 0;
  const end = new Date(start.getTime() + (hasDur ? dur * 3600 * 1000 : 0));
  return new Date() > end;
}

const Meetups: React.FC = () => {
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [myRsvpIds, setMyRsvpIds] = useState<Set<string>>(new Set());

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Tab 状态：0=进行中&即将, 1=已结束
  const [activeTab, setActiveTab] = useState(0);

  // 分页状态（两个 tab 分别管理）
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  // 模态框状态
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [currentQRUrl, setCurrentQRUrl] = useState<string | null>(null);

  const { isMobile } = useResponsive();

  const [rsvpForm, setRsvpForm] = useState({ name: '', wechatId: '' });

  useEffect(() => {
    setShowCreateButton(user.isLogin());

    loadMeetups();
  }, []);

  const loadMeetups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 使用统一的api对象获取活动列表
      const response = await meetupsApi.getAll();
      if (!response.success) {
        showSnackbar.error('查询活动列表失败');
        return;
      }
      setMeetups(response.data?.meetups || []);
    } catch (err) {
      setError('加载活动失败，请稍后再试');
      showSnackbar.error('加载活动失败，请稍后再试');
      setMeetups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyRsvps();
  }, [meetups.length]);

  const loadMyRsvps = async () => {
    try {
      const userStr =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      if (!userStr) return;
      const user = JSON.parse(userStr || '{}');
      const wechat = (user?.wechat_id || '').trim();
      if (!wechat) return;
      const res = await rsvpApi.getByWechatId(wechat);
      if (res.success) {
        const ids = (res.data?.rsvps || []).map((r: any) =>
          String(r.meetup_id)
        );
        setMyRsvpIds(new Set(ids));
      }
    } catch (e) {}
  };

  // 应用搜索和类型过滤，然后按 tab 拆分
  const { upcomingMeetups, pastMeetups } = useMemo(() => {
    let filtered = [...meetups];

    if (typeFilter) {
      filtered = filtered.filter((m) => m.mode === typeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    const upcoming = filtered
      .filter((m) => !isMeetupPast(m))
      .sort(
        (a, b) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );

    const past = filtered
      .filter((m) => isMeetupPast(m))
      .sort(
        (a, b) =>
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      );

    return { upcomingMeetups: upcoming, pastMeetups: past };
  }, [meetups, searchQuery, typeFilter]);

  // 筛选条件变化时重置分页
  useEffect(() => {
    setUpcomingPage(1);
    setPastPage(1);
  }, [searchQuery, typeFilter]);

  const getStatusLabel = (meetup: Meetup): string => {
    const now = new Date();
    const start = new Date(meetup.datetime);
    const dur = Number(meetup.duration);
    const hasDur = Number.isFinite(dur) && dur > 0;
    const end = new Date(start.getTime() + (hasDur ? dur * 3600 * 1000 : 0));
    if (now < start) return '即将开始';
    if (now > end) return '已结束';
    return '进行中';
  };

  const getStatusColor = (
    meetup: Meetup
  ): 'primary' | 'success' | 'default' => {
    const label = getStatusLabel(meetup);
    if (label === '已结束') return 'default';
    return label === '即将开始' ? 'success' : 'primary';
  };

  const getTypeColor = (
    type: string
  ): 'primary' | 'success' | 'info' | 'warning' | 'default' => {
    switch (type) {
      case 'online':
        return 'primary';
      case 'offline':
        return 'success';
      case 'culture':
        return 'info';
      case 'outdoor':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleJoinMeetup = async (meetupId: string, qrImageUrl?: string) => {
    const token =
      localStorage.getItem('userToken') || localStorage.getItem('authToken');
    const userInfo =
      localStorage.getItem('userInfo') || localStorage.getItem('userData');

    if (!token || !userInfo) {
      showSnackbar.warning('请先登录后再报名参加活动');
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    try {
      const user = JSON.parse(userInfo);
      const isRSVPed = await checkRSVPStatus(meetupId);
      if (isRSVPed) {
        if (qrImageUrl) {
          showQRCode(qrImageUrl);
        } else {
          showSnackbar.info('您已经报名了这个活动！请联系组织者获取群聊信息。');
        }
        return;
      }
      setRsvpForm({ name: user.name || '', wechatId: user.wechat_id || '' });
      setCurrentMeetupId(meetupId);
      setCurrentQRUrl(qrImageUrl || null);
      setShowRSVPDialog(true);
    } catch (error) {
      showSnackbar.error('处理报名请求失败，请稍后重试');
    }
  };

  const checkRSVPStatus = async (meetupId: string): Promise<boolean> => {
    try {
      const userStr =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      if (!userStr) return false;
      const user = JSON.parse(userStr || '{}');
      const wechat = (user?.wechat_id || '').trim();
      if (!wechat) return false;

      const res = await rsvpApi.getByWechatId(wechat);
      const rsvps = res.success ? res.data?.rsvps || [] : [];
      return rsvps.some((r: any) => String(r.meetup_id) === String(meetupId));
    } catch {
      return false;
    }
  };

  const handleSubmitRSVP = async () => {
    if (!rsvpForm.name.trim()) {
      showSnackbar.warning('请输入您的姓名');
      return;
    }
    if (!currentMeetupId) return;
    try {
      const response = await rsvpApi.create({
        meetup_id: Number(currentMeetupId),
        wechat_id: rsvpForm.wechatId.trim(),
        name: rsvpForm.name.trim(),
        user_id: user.getId(),
      });
      if (!response.success) {
        const msg = (response as any)?.error || '报名失败';
        throw new Error(msg);
      }
      setShowRSVPDialog(false);
      setMeetups((prev) =>
        prev.map((m) =>
          m.id === currentMeetupId
            ? { ...m, participantCount: (m.participantCount ?? 0) + 1 }
            : m
        )
      );
      setMyRsvpIds(
        (prev) => new Set([...Array.from(prev), String(currentMeetupId)])
      );
      if (currentQRUrl) {
        setTimeout(() => showQRCode(currentQRUrl), 500);
      } else {
        showSnackbar.success('报名成功！请联系组织者获取群聊信息。');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '报名失败，请稍后重试';
      showSnackbar.error(msg);
    }
  };

  const showQRCode = (qrImageUrl: string) => {
    setCurrentQRUrl(qrImageUrl);
    setShowQRModal(true);
  };

  const renderMeetupCard = (meetup: Meetup) => {
    const isUpcomingMeetup = new Date(meetup.datetime) > new Date();
    return (
      <Card
        key={meetup.id}
        sx={{
          height: '100%',
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <CardContent
          onClick={() => navigate(`/meetup-detail?id=${meetup.id}`)}
          sx={{ cursor: 'pointer' }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 2,
            }}
          >
            <Chip
              label={MeetupLabelMap[meetup.mode]}
              color={getTypeColor(meetup.mode)}
              size={isMobile ? 'small' : 'medium'}
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                📅
              </Typography>
              <Typography variant="body2">
                {formatDate(meetup.datetime)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                🕐
              </Typography>
              <Typography variant="body2">
                {formatTime(meetup.datetime)}
              </Typography>
            </Box>
            {meetup.location && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  📍
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
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
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-all',
              overflow: 'hidden',
            }}
          >
            {meetup.description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              👤
            </Typography>
            <Typography variant="body2">组织者：{meetup.creator}</Typography>
          </Box>
        </CardContent>
        <CardActions
          sx={{
            justifyContent: 'flex-end',
            p: 2,
            borderTop: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          {getStatusLabel(meetup) !== '已结束' && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={!isUpcomingMeetup || myRsvpIds.has(String(meetup.id))}
              onClick={(e) => {
                e.stopPropagation();
                handleJoinMeetup(meetup.id!, meetup.cover);
              }}
              sx={{ fontWeight: 600 }}
            >
              {myRsvpIds.has(String(meetup.id)) ? '已报名' : '报名参加'}
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
            {meetup.participantCount}
            {Number(meetup.maxPpl) > 0 ? '/' + meetup.maxPpl : ''}
            人参加
          </Typography>
        </CardActions>
      </Card>
    );
  };

  const renderGrid = (
    items: Meetup[],
    page: number,
    onPageChange: (p: number) => void
  ) => {
    if (items.length === 0) {
      return (
        <Empty
          message="暂无活动"
          description={
            searchQuery || typeFilter
              ? '没有找到匹配的活动，请尝试其他搜索条件'
              : '暂无活动内容，敬请期待'
          }
        />
      );
    }

    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <>
        <Box
          component="ul"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            } as any,
            gap: '1.5rem',
            listStyle: 'none',
            padding: 0,
            margin: '1.5rem 0 0 0',
          }}
        >
          {pageItems.map((meetup) => (
            <li key={meetup.id}>{renderMeetupCard(meetup)}</li>
          ))}
        </Box>
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => {
                onPageChange(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 4,
        px: 2,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: 'primary.main' }}
          >
            活动列表
          </Typography>
          {showCreateButton && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/create-meetup')}
              id="createMeetupBtn"
              sx={{ fontWeight: 600, boxShadow: '0 3px 6px rgba(0,0,0,0.16)' }}
            >
              发起活动
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ flex: 1, position: 'relative' }}>
            <TextField
              fullWidth
              placeholder="搜索活动标题或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              slotProps={{
                input: {
                  endAdornment: searchQuery ? (
                    <Button
                      onClick={() => setSearchQuery('')}
                      size="small"
                      sx={{ minWidth: 'auto' }}
                    >
                      ×
                    </Button>
                  ) : undefined,
                },
              }}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)', borderRadius: 1 }}
            />
          </Box>
          <Box sx={{ width: { xs: '100%', sm: '180px' } }}>
            <Select
              fullWidth
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              displayEmpty
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)', borderRadius: 1 }}
            >
              <MenuItem value="">所有类型</MenuItem>
              <MenuItem value="online">线上活动</MenuItem>
              <MenuItem value="offline">线下活动</MenuItem>
              <MenuItem value="culture">文化活动</MenuItem>
              <MenuItem value="outdoor">户外活动</MenuItem>
            </Select>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'rgba(255,255,255,0.7)',
            borderRadius: 2,
            mb: 1,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ px: 1 }}
          >
            <Tab
              label={`进行中 & 即将开始${upcomingMeetups.length > 0 ? ` (${upcomingMeetups.length})` : ''}`}
            />
            <Tab
              label={`已结束${pastMeetups.length > 0 ? ` (${pastMeetups.length})` : ''}`}
            />
          </Tabs>
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
          ) : activeTab === 0 ? (
            renderGrid(upcomingMeetups, upcomingPage, setUpcomingPage)
          ) : (
            renderGrid(pastMeetups, pastPage, setPastPage)
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
                setRsvpForm((prev) => ({ ...prev, name: e.target.value }))
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
                setRsvpForm((prev) => ({ ...prev, wechatId: e.target.value }))
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
        <DialogTitle sx={{ fontWeight: 600, textAlign: 'center' }}>
          扫码进群
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
            }}
          >
            {currentQRUrl && (
              <Box
                sx={{
                  bgcolor: 'white',
                  p: 2,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <img
                  src={currentQRUrl}
                  alt="群聊二维码"
                  style={{ maxWidth: '200px', height: 'auto' }}
                />
              </Box>
            )}
            <Typography variant="body1" sx={{ textAlign: 'center' }}>
              请使用微信扫描二维码加入群聊
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
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
