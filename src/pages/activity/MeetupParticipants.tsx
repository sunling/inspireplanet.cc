import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { meetupsApi, rsvpApi, participantsApi } from '../../netlify/config';
import { Meetup } from '../../netlify/functions/meetup';
import { useGlobalSnackbar } from '../../context/app';
import { isUserLoggedIn, getUserName } from '../../utils/user';

interface RSVP {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  status: string;
  created_at: string;
  question_answer: string | null;
  application_status: 'auto' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
}

const MeetupParticipants: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showSnackbar = useGlobalSnackbar();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participants, setParticipants] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [emailNotification, setEmailNotification] = useState(false);

  // 获取活动ID
  const getMeetupId = (): string | null => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('id');
  };

  // 加载活动详情和报名列表
  const loadData = async () => {
    const meetupId = getMeetupId();
    if (!meetupId) {
      showSnackbar.error('缺少活动ID');
      return;
    }

    setIsLoading(true);
    try {
      // 获取活动详情
      const meetupResponse = await meetupsApi.getById(meetupId);
      if (meetupResponse.success && meetupResponse.data?.meetups?.length) {
        setMeetup(meetupResponse.data.meetups[0]);
      }

      // 获取报名列表（使用 participantsApi 获取完整数据）
      const participantsResponse = await participantsApi.getParticipants({
        meetup_id: Number(meetupId),
      });
      if (participantsResponse.success) {
        setParticipants(
          (participantsResponse.data?.participants || []) as RSVP[]
        );
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      showSnackbar.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserLoggedIn()) {
      navigate('/login');
      return;
    }
    loadData();
  }, []);

  // 筛选参与者
  const filteredParticipants = participants.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // 切换选择
  const toggleSelect = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedParticipants.length === filteredParticipants.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(filteredParticipants.map((p) => p.id));
    }
  };

  // 更新参与者状态
  const updateParticipantStatus = async (id: string, status: string) => {
    const applicationStatus = status === 'confirmed' ? 'approved' : 'rejected';
    const response = await rsvpApi.update(id, {
      status,
      application_status: applicationStatus,
      approved_by: 'Organizer',
      approved_at: new Date().toISOString(),
    } as any);
    if (response.success) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status,
                application_status:
                  applicationStatus as RSVP['application_status'],
              }
            : p
        )
      );
      showSnackbar.success('状态更新成功');
    } else {
      showSnackbar.error('更新失败');
    }
  };

  // 批量确认选中的参与者
  const confirmSelected = async () => {
    setShowConfirmDialog(false);
    const meetupId = getMeetupId();
    if (!meetupId) return;

    try {
      const response = await participantsApi.batchConfirm({
        meetup_id: Number(meetupId),
        rsvp_ids: selectedParticipants,
        send_email: emailNotification,
      });

      if (response.success) {
        showSnackbar.success(
          response.message || `已确认 ${selectedParticipants.length} 位参与者`
        );
        // 刷新列表
        loadData();
      } else {
        showSnackbar.error(response.error || '确认失败');
      }
    } catch (error) {
      console.error('批量确认失败:', error);
      showSnackbar.error('批量确认失败');
    }
    setSelectedParticipants([]);
    setEmailNotification(false);
  };

  // 批量拒绝选中的参与者
  const rejectSelected = async () => {
    for (const id of selectedParticipants) {
      await updateParticipantStatus(id, 'cancelled');
    }
    setSelectedParticipants([]);
    showSnackbar.success('已拒绝选中的参与者');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <CircularProgress size={40} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            加载中...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!meetup) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">活动不存在</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
          {meetup.title} - 报名管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          查看和管理活动报名人员，进行筛选和确认
        </Typography>
      </Box>

      {/* 统计信息 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {participants.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总报名人数
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {participants.filter((p) => p.status === 'confirmed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已确认
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {participants.filter((p) => p.status === 'cancelled').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已拒绝
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 筛选和操作栏 */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* 搜索框 */}
        <TextField
          label="搜索姓名或邮箱"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
        />

        {/* 状态筛选 */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={filterStatus}
            label="状态"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="confirmed">已确认</MenuItem>
            <MenuItem value="cancelled">已拒绝</MenuItem>
          </Select>
        </FormControl>

        {/* 操作按钮 */}
        {selectedParticipants.length > 0 && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={() => setShowConfirmDialog(true)}
            >
              确认选中 ({selectedParticipants.length})
            </Button>
            <Button variant="contained" color="error" onClick={rejectSelected}>
              拒绝选中 ({selectedParticipants.length})
            </Button>
          </>
        )}

        {/* 返回按钮 */}
        <Button
          variant="outlined"
          onClick={() => navigate(`/meetup?id=${meetup.id}`)}
        >
          返回活动详情
        </Button>
      </Box>

      {/* 自定义问题提示 */}
      {meetup.question_text && (
        <Card sx={{ mb: 4, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              报名问题：
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {meetup.question_text}
              {meetup.question_required && (
                <Typography component="span" color="error">
                  {' '}
                  *必填
                </Typography>
              )}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 报名列表 */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      selectedParticipants.length ===
                        filteredParticipants.length &&
                      filteredParticipants.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell>姓名</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>报名时间</TableCell>
                <TableCell>报名答案</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedParticipants.includes(participant.id)}
                      onChange={() => toggleSelect(participant.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="500">
                      {participant.name || '未知'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {participant.email || (
                      <Typography color="text.secondary" variant="body2">
                        未填写
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(participant.created_at).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        maxWidth: 200,
                        wordBreak: 'break-all',
                        maxHeight: 60,
                        overflow: 'hidden',
                      }}
                    >
                      {participant.question_answer || (
                        <Typography color="text.secondary" variant="body2">
                          无
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor:
                          participant.status === 'confirmed'
                            ? 'rgba(76, 175, 80, 0.1)'
                            : 'rgba(244, 67, 54, 0.1)',
                        color:
                          participant.status === 'confirmed'
                            ? '#4caf50'
                            : '#f44336',
                      }}
                    >
                      {participant.status === 'confirmed' ? '已确认' : '已拒绝'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        color="success"
                        onClick={() =>
                          updateParticipantStatus(participant.id, 'confirmed')
                        }
                        disabled={participant.status === 'confirmed'}
                      >
                        确认
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          updateParticipantStatus(participant.id, 'cancelled')
                        }
                        disabled={participant.status === 'cancelled'}
                      >
                        拒绝
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 空状态 */}
      {filteredParticipants.length === 0 && (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            暂无符合条件的报名人员
          </Typography>
        </Box>
      )}

      {/* 确认对话框 */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
      >
        <DialogTitle>确认选中的参与者</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            确定要确认选中的 {selectedParticipants.length} 位参与者吗？
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
              />
            }
            label="发送确认邮件通知"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>取消</Button>
          <Button variant="contained" onClick={confirmSelected}>
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MeetupParticipants;
