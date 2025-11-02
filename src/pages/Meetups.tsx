import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useMediaQuery,
  useTheme,
  CircularProgress,
  Chip,
} from '@mui/material';

interface Meetup {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'offline' | 'culture' | 'outdoor';
  datetime: string;
  location?: string;
  fee: string;
  max_participants?: number;
  organizer: string;
  contact: string;
  qr_image_url?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  created_at: string;
  participant_count: number;
  cover?: string;
}

const Meetups: React.FC = () => {
  const navigate = useNavigate();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [filteredMeetups, setFilteredMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateButton, setShowCreateButton] = useState(false);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // 模态框状态
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [currentQRUrl, setCurrentQRUrl] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // RSVP表单状态
  const [rsvpForm, setRsvpForm] = useState({
    name: '',
    wechatId: '',
  });

  // 检查用户登录状态并显示创建按钮
  useEffect(() => {
    const checkAuthAndShowCreateButton = () => {
      try {
        const token =
          localStorage.getItem('userToken') ||
          localStorage.getItem('authToken');
        if (token) {
          setShowCreateButton(true);
        }
      } catch (error) {
        console.error('检查认证状态失败:', error);
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
      // 模拟API调用
      // 实际环境中应该使用: fetch('/.netlify/functions/meetupHandler')
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟数据
      const mockMeetups: Meetup[] = [
        {
          id: '1',
          title: '技术交流分享会',
          description:
            '一起探讨前沿技术发展趋势，分享项目经验和技术心得。无论你是技术专家还是刚入门的学习者，都欢迎参与讨论！',
          type: 'online',
          datetime: '2024-02-15T19:00:00',
          fee: '免费',
          max_participants: 50,
          organizer: '张三',
          contact: 'zhangsan@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-20T10:00:00Z',
          participant_count: 25,
        },
        {
          id: '2',
          title: '周末户外徒步活动',
          description:
            '一起去香山徒步，享受大自然的美景，锻炼身体，结交朋友。适合所有体能水平的朋友参加。',
          type: 'outdoor',
          datetime: '2024-02-18T08:00:00',
          location: '香山公园',
          fee: '30元',
          max_participants: 20,
          organizer: '李四',
          contact: 'lisi@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-22T15:30:00Z',
          participant_count: 12,
        },
        {
          id: '3',
          title: '读书分享：《人类简史》',
          description:
            '一起阅读和讨论尤瓦尔·赫拉利的经典作品《人类简史》，分享读书心得，探讨人类文明的发展历程。',
          type: 'culture',
          datetime: '2024-02-20T14:00:00',
          location: '三里屯书店',
          fee: '免费',
          max_participants: 15,
          organizer: '王五',
          contact: 'wangwu@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-25T09:15:00Z',
          participant_count: 8,
        },
        {
          id: '4',
          title: '线上冥想课程',
          description:
            '在繁忙的生活中给自己留出一些宁静的时光，通过冥想放松身心，提升专注力和幸福感。',
          type: 'online',
          datetime: '2024-02-22T20:00:00',
          fee: '免费',
          max_participants: 30,
          organizer: '赵六',
          contact: 'zhaoliu@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-28T18:45:00Z',
          participant_count: 15,
        },
      ];

      setMeetups(mockMeetups);
      setFilteredMeetups(mockMeetups);
    } catch (err) {
      console.error('加载活动失败:', err);
      setError('加载活动失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  // 应用过滤器
  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, meetups]);

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
    setSearchQuery('');
  };

  // 处理类型过滤变化
  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  // 报名参加活动
  const handleJoinMeetup = async (meetupId: string, qrImageUrl?: string) => {
    const token =
      localStorage.getItem('userToken') || localStorage.getItem('authToken');
    const userInfo =
      localStorage.getItem('userInfo') || localStorage.getItem('userData');

    if (!token || !userInfo) {
      alert('请先登录后再报名参加活动');
      navigate('/login', { state: { redirect: window.location.pathname } });
      return;
    }

    try {
      const user = JSON.parse(userInfo);

      // 检查是否已经报名
      const isAlreadyRegistered = await checkRSVPStatus(
        meetupId,
        user.wechat_id || ''
      );
      if (isAlreadyRegistered) {
        if (qrImageUrl) {
          showQRCode(qrImageUrl);
        } else {
          alert('您已经报名了这个活动！请联系组织者获取群聊信息。');
        }
        return;
      }

      // 显示报名确认对话框
      setRsvpForm({
        name: user.name || '',
        wechatId: user.wechat_id || '',
      });
      setCurrentMeetupId(meetupId);
      setCurrentQRUrl(qrImageUrl || null);
      setShowRSVPDialog(true);
    } catch (error) {
      console.error('处理报名失败:', error);
      alert('处理报名请求失败，请稍后重试');
    }
  };

  // 检查RSVP状态
  const checkRSVPStatus = async (
    meetupId: string,
    wechatId: string
  ): Promise<boolean> => {
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 模拟返回未报名状态
      return false;
    } catch (error) {
      console.error('检查报名状态失败:', error);
      return false;
    }
  };

  // 提交RSVP
  const handleSubmitRSVP = async () => {
    if (!rsvpForm.name.trim()) {
      alert('请输入您的姓名');
      return;
    }

    if (!currentMeetupId) return;

    try {
      const userInfo =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      const user = userInfo ? JSON.parse(userInfo) : {};

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 关闭对话框
      setShowRSVPDialog(false);

      // 更新本地数据
      setMeetups((prev) =>
        prev.map((meetup) =>
          meetup.id === currentMeetupId
            ? { ...meetup, participant_count: meetup.participant_count + 1 }
            : meetup
        )
      );

      // 显示成功消息和二维码
      if (currentQRUrl) {
        setTimeout(() => {
          showQRCode(currentQRUrl);
        }, 500);
      } else {
        alert('报名成功！请联系组织者获取群聊信息。');
      }
    } catch (error) {
      console.error('报名失败:', error);
      alert('报名失败，请稍后重试');
    }
  };

  // 显示二维码弹窗
  const showQRCode = (qrImageUrl: string) => {
    setCurrentQRUrl(qrImageUrl);
    setShowQRModal(true);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return date.toLocaleDateString('zh-CN', options);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 检查活动是否即将举行
  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  // 获取活动类型标签
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'online':
        return '线上活动';
      case 'offline':
        return '线下活动';
      case 'culture':
        return '文化活动';
      case 'outdoor':
        return '户外活动';
      default:
        return '其他活动';
    }
  };

  // 获取活动类型颜色
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

  // 获取活动状态标签
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'upcoming':
        return '即将开始';
      case 'ongoing':
        return '进行中';
      case 'ended':
        return '已结束';
      default:
        return '未知状态';
    }
  };

  // 获取活动状态颜色
  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'default' => {
    switch (status) {
      case 'upcoming':
        return 'success';
      case 'ongoing':
        return 'primary';
      case 'ended':
        return 'default';
      default:
        return 'default';
    }
  };

  // 渲染活动列表
  const renderMeetups = () => {
    if (filteredMeetups.length === 0) {
      return (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            borderRadius: 2,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography variant="h5" component="h3" gutterBottom>
            暂无活动
          </Typography>
          <Typography variant="body1">
            还没有符合条件的活动，快来发起第一个活动吧！
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
          mt: 3,
        }}
      >
        {filteredMeetups.map((meetup) => {
          const isUpcomingMeetup = isUpcoming(meetup.datetime);
          const formattedDate = formatDate(meetup.datetime);
          const formattedTime = formatTime(meetup.datetime);
          const typeColor = getTypeColor(meetup.type);

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
                onClick={() => navigate(`/meetup-detail/${meetup.id}`)}
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
                    label={getTypeLabel(meetup.type)}
                    color={typeColor}
                    size={isMobile ? 'small' : 'medium'}
                  />
                  <Chip
                    label={getStatusLabel(meetup.status)}
                    color={getStatusColor(meetup.status)}
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
                    <Typography variant="body2">{formattedDate}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      🕐
                    </Typography>
                    <Typography variant="body2">{formattedTime}</Typography>
                  </Box>
                  {meetup.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        📍
                      </Typography>
                      <Typography variant="body2">{meetup.location}</Typography>
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
                    overflow: 'hidden',
                  }}
                >
                  {meetup.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                  justifyContent: 'space-between',
                  p: 2,
                  borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={!isUpcomingMeetup}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinMeetup(meetup.id, meetup.qr_image_url);
                  }}
                  sx={{ fontWeight: 600 }}
                >
                  {isUpcomingMeetup ? '报名参加' : '已结束'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/meetup-detail/${meetup.id}`);
                  }}
                >
                  查看详情
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {meetup.participant_count}
                  {meetup.max_participants
                    ? '/' + meetup.max_participants
                    : ''}{' '}
                  人参加
                </Typography>
              </CardActions>
            </Card>
          );
        })}
      </Box>
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
            mb: 4,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ flex: 1, position: 'relative' }}>
            <TextField
              fullWidth
              id="searchInput"
              placeholder="搜索活动标题或描述..."
              value={searchQuery}
              onChange={handleSearchChange}
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                endAdornment: searchQuery ? (
                  <Button
                    onClick={handleClearSearch}
                    size="small"
                    sx={{ minWidth: 'auto' }}
                  >
                    ×
                  </Button>
                ) : undefined,
              }}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)', borderRadius: 1 }}
            />
          </Box>
          <Box sx={{ width: { xs: '100%', sm: '180px' } }}>
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
              size={isMobile ? 'small' : 'medium'}
              id="typeFilter"
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

        <Box id="meetupsContainer">
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 10,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: 2,
              }}
            >
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                正在加载活动...
              </Typography>
            </Box>
          ) : error ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                px: 2,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" color="error">
                {error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                sx={{ mt: 2 }}
                onClick={loadMeetups}
              >
                重试
              </Button>
            </Box>
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
