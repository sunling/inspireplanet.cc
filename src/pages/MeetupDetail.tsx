import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  useMediaQuery,
  useTheme,
  Paper,
} from '@mui/material';

interface Meetup {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'offline' | 'culture' | 'outdoor';
  mode?: 'online' | 'offline';
  datetime: string;
  location?: string;
  fee: string | number | null | undefined;
  max_ppl?: number;
  max_participants?: number;
  duration?: number;
  organizer: string;
  creator?: string;
  contact: string;
  qr_image_url?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  created_at: string;
  participant_count: number;
  cover?: string;
}

interface Participant {
  name: string;
  wechat_id?: string;
  created_at?: string;
}

interface UserInfo {
  name?: string;
  wechat_id?: string;
  username?: string;
}

const MeetupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

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
    name: '',
    wechatId: '',
  });

  // 提交状态
  const [submitStatus, setSubmitStatus] = useState<
    'initial' | 'loading' | 'success' | 'error'
  >('initial');

  // 加载活动详情
  useEffect(() => {
    if (!id) {
      setError('缺少活动ID参数');
      setIsLoading(false);
      return;
    }

    loadMeetupDetail(id);
  }, [id]);

  // 加载活动详情数据
  const loadMeetupDetail = async (meetupId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 模拟API调用
      // 实际环境中应该使用: fetch(`/.netlify/functions/meetupHandler?id=${meetupId}`)
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟数据
      const mockMeetup: Meetup = {
        id: meetupId,
        title: '技术交流分享会',
        description:
          '一起探讨前沿技术发展趋势，分享项目经验和技术心得。无论你是技术专家还是刚入门的学习者，都欢迎参与讨论！\n\n本次活动将涵盖：\n- 前端框架最新进展\n- 后端架构设计\n- DevOps实践\n- AI在软件开发中的应用\n\n欢迎大家积极参与！',
        type: 'online',
        datetime: '2024-02-15T19:00:00',
        duration: 2,
        fee: 0,
        max_ppl: 50,
        organizer: '张三',
        contact: 'zhangsan@example.com',
        qr_image_url: '/images/wechat-sl.jpg',
        status: 'upcoming',
        created_at: '2024-01-20T10:00:00Z',
        participant_count: 25,
        cover: '/images/tech-meetup.jpg',
      };

      setMeetup(mockMeetup);

      // 加载参与者信息
      loadParticipants(meetupId);
    } catch (err) {
      console.error('加载活动详情失败:', err);
      setError('加载活动详情失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载参与者信息
  const loadParticipants = async (meetupId: string) => {
    try {
      // 模拟API调用
      // 实际环境中应该使用: fetch(`/.netlify/functions/rsvpHandler?meetup_id=${meetupId}`)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟参与者数据
      const mockParticipants: Participant[] = [
        { name: '王五' },
        { name: '赵六' },
        { name: '钱七' },
        { name: '孙八' },
        { name: '周九' },
      ];

      setParticipants(mockParticipants);
    } catch (err) {
      console.error('加载参与者信息失败:', err);
    }
  };

  // 报名参加活动
  const handleJoinMeetup = async () => {
    if (!meetup) return;

    const token =
      localStorage.getItem('userToken') || localStorage.getItem('authToken');
    const userInfoStr =
      localStorage.getItem('userInfo') || localStorage.getItem('userData');

    if (!token || !userInfoStr) {
      alert('请先登录后再报名参加活动');
      navigate('/login', { state: { redirect: window.location.pathname } });
      return;
    }

    setIsActionLoading(true);

    try {
      const userInfo: UserInfo = JSON.parse(userInfoStr);

      // 检查是否已经报名
      const isAlreadyRegistered = await checkRSVPStatus(
        meetup.id,
        userInfo.wechat_id || ''
      );
      if (isAlreadyRegistered) {
        if (meetup.qr_image_url) {
          showQRCode(meetup.qr_image_url);
        } else {
          alert('您已经报名了这个活动！请联系组织者获取群聊信息。');
        }
        return;
      }

      // 显示报名确认对话框
      setRsvpForm({
        name: userInfo.name || '',
        wechatId: userInfo.wechat_id || '',
      });
      setShowRSVPDialog(true);
    } catch (error) {
      console.error('处理报名失败:', error);
      alert('处理报名请求失败，请稍后重试');
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
    if (!meetup) return;

    if (!rsvpForm.name.trim()) {
      alert('请输入您的姓名');
      return;
    }

    setSubmitStatus('loading');

    try {
      const userInfoStr =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      const userInfo: UserInfo = userInfoStr ? JSON.parse(userInfoStr) : {};

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟成功响应
      setSubmitStatus('success');

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
          alert('报名成功！请联系组织者获取群聊信息。');
        }

        // 重置提交状态
        setSubmitStatus('initial');
      }, 1000);
    } catch (error) {
      console.error('报名失败:', error);
      setSubmitStatus('error');

      // 恢复提交状态
      setTimeout(() => {
        setSubmitStatus('initial');
      }, 2000);
    }
  };

  // 显示二维码弹窗
  const showQRCode = (qrImageUrl: string) => {
    setShowQRModal(true);
  };

  // 查看参与者列表
  const handleViewParticipants = () => {
    setShowParticipantsModal(true);
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

  // HTML转义
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 格式化描述文本（支持换行）
  const formatDescription = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // 检查活动是否即将举行
  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  // 渲染活动详情
  const renderMeetupDetail = () => {
    if (!meetup) return null;

    const meetupDate = new Date(meetup.datetime);
    const isUpcomingMeetup = isUpcoming(meetup.datetime);
    const formattedDate = formatDate(meetup.datetime);
    const formattedTime = formatTime(meetup.datetime);

    return (
      <Box sx={{ mt: 4 }}>
        <Card elevation={0} sx={{ mb: 4, overflow: 'hidden', borderRadius: 2 }}>
          {meetup.cover && (
            <CardMedia
              component="img"
              height="200"
              image={meetup.cover}
              alt={meetup.title}
              sx={{
                height: { xs: '180px', sm: '220px', md: '280px' },
                objectFit: 'cover',
              }}
            />
          )}
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
              <Chip
                label={
                  (meetup.mode || meetup.type) === 'online'
                    ? '线上活动'
                    : '线下活动'
                }
                color={
                  (meetup.mode || meetup.type) === 'online'
                    ? 'primary'
                    : 'secondary'
                }
                size="small"
              />
              <Chip
                label={isUpcomingMeetup ? '可报名' : '已结束'}
                color={isUpcomingMeetup ? 'success' : 'default'}
                size="small"
              />
            </Box>

            <Typography
              variant="h4"
              component="h1"
              sx={{
                mb: 3,
                fontWeight: 'bold',
                color: '#333',
                fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' },
              }}
            >
              {meetup.title}
            </Typography>

            {/* 基本信息 */}
            <Box sx={{ mb: 4, p: 3, bgColor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                基本信息
              </Typography>

              <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                <Typography sx={{ mr: 2, minWidth: '30px' }}>📅</Typography>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#666' }}>
                    活动日期
                  </Typography>
                  <Typography>{formattedDate}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                <Typography sx={{ mr: 2, minWidth: '30px' }}>🕐</Typography>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#666' }}>
                    活动时间
                  </Typography>
                  <Typography>{formattedTime}</Typography>
                </Box>
              </Box>

              {meetup.duration && (
                <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                  <Typography sx={{ mr: 2, minWidth: '30px' }}>⏱️</Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#666' }}>
                      活动时长
                    </Typography>
                    <Typography>{meetup.duration} 小时</Typography>
                  </Box>
                </Box>
              )}

              {meetup.location && (
                <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                  <Typography sx={{ mr: 2, minWidth: '30px' }}>📍</Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#666' }}>
                      活动地点
                    </Typography>
                    <Typography>{meetup.location}</Typography>
                  </Box>
                </Box>
              )}

              {meetup.fee !== null && meetup.fee !== undefined && (
                <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                  <Typography sx={{ mr: 2, minWidth: '30px' }}>💰</Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#666' }}>
                      活动费用
                    </Typography>
                    <Typography>
                      {Number(meetup.fee) > 0 ? `${meetup.fee} 元` : '免费'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {(meetup.max_ppl || meetup.max_participants) && (
                <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                  <Typography sx={{ mr: 2, minWidth: '30px' }}>👥</Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#666' }}>
                      人数限制
                    </Typography>
                    <Typography>
                      最多 {meetup.max_ppl || meetup.max_participants} 人
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* 活动介绍 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                活动介绍
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 1,
                  bgcolor: '#fafafa',
                  whiteSpace: 'pre-line',
                }}
              >
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  {meetup.description}
                </Typography>
              </Paper>
            </Box>

            {/* 组织者信息 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                组织者信息
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ mr: 2, bgcolor: '#ff7f50' }}>
                  {meetup.creator
                    ? meetup.creator.charAt(0)
                    : meetup.organizer.charAt(0)}
                </Avatar>
                <Typography variant="h6">
                  {meetup.creator || meetup.organizer}
                </Typography>
              </Box>
            </Box>

            {/* 操作按钮 */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, color: '#666' }}>
                {isUpcomingMeetup ? '立即报名参加' : '活动已结束'}
              </Typography>
              <Button
                variant={isUpcomingMeetup ? 'contained' : 'outlined'}
                onClick={handleJoinMeetup}
                disabled={!isUpcomingMeetup || isActionLoading}
                startIcon={
                  isActionLoading ? <CircularProgress size={16} /> : undefined
                }
                sx={{
                  py: 1.2,
                  px: 5,
                  fontSize: '1rem',
                  textTransform: 'none',
                  mb: 2,
                }}
              >
                {isUpcomingMeetup ? '报名参加' : '已结束'}
              </Button>
              <Button
                variant="text"
                onClick={handleViewParticipants}
                startIcon={<span>👥</span>}
                sx={{ textTransform: 'none' }}
              >
                {meetup.participant_count || 0}
                {meetup.max_ppl ? `/${meetup.max_ppl}` : ''} 人已报名
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            component={Link}
            to="/meetups"
            variant="text"
            startIcon={<span>←</span>}
            sx={{ textTransform: 'none', color: '#333' }}
          >
            返回活动列表
          </Button>
        </Box>

        <Typography
          variant="h3"
          component="h1"
          sx={{
            mb: 4,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#333',
          }}
        >
          活动详情
        </Typography>

        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 10,
            }}
          >
            <CircularProgress size={60} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 10,
            }}
          >
            <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
              {error}
            </Alert>
            <Button
              component={Link}
              to="/meetups"
              variant="contained"
              sx={{ textTransform: 'none' }}
            >
              返回活动列表
            </Button>
          </Box>
        ) : (
          renderMeetupDetail()
        )}
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
                submitStatus === 'loading' || submitStatus === 'success'
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
                submitStatus === 'loading' || submitStatus === 'success'
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowRSVPDialog(false)}
            disabled={submitStatus === 'loading' || submitStatus === 'success'}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitRSVP}
            disabled={submitStatus === 'loading' || submitStatus === 'success'}
            startIcon={
              submitStatus === 'loading' ? (
                <CircularProgress size={16} />
              ) : undefined
            }
            color={submitStatus === 'success' ? 'success' : 'primary'}
          >
            {submitStatus === 'loading'
              ? '提交中...'
              : submitStatus === 'success'
              ? '报名成功！'
              : '确认报名'}
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
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {meetup?.qr_image_url && (
            <img
              src={meetup.qr_image_url}
              alt="群聊二维码"
              style={{
                maxWidth: '80%',
                height: 'auto',
                borderRadius: 8,
                marginBottom: '1.5rem',
                border: '1px solid #e0e0e0',
              }}
            />
          )}
          <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
            请使用微信扫描二维码加入群聊
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => setShowQRModal(false)}
            sx={{ textTransform: 'none' }}
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
          <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 2 }}>
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <Box
                  key={index}
                  sx={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Avatar sx={{ mr: 2, bgcolor: '#e0e0e0' }}>
                    {participant.name.charAt(0)}
                  </Avatar>
                  <Typography>{participant.name}</Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ color: '#999' }}>
                  暂无报名人员
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => setShowParticipantsModal(false)}
            sx={{ textTransform: 'none' }}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetupDetail;
