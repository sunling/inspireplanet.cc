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
  IconButton,
  Pagination,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { meetupsApi, rsvpApi, participantsApi } from '../../netlify/config';
import { Meetup } from '../../netlify/functions/meetup';
import { useGlobalSnackbar } from '../../context/app';
import { isUserLoggedIn } from '../../utils/user';
import {
  RSVPStatus,
  ApprovalStatus,
  getRSVPStatusLabel,
  getRSVPStatusStyle,
  getApprovalStatusLabel,
  getApprovalStatusStyle,
} from '../../netlify/types/rsvp';

interface RSVP {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  status: RSVPStatus;
  application_status: ApprovalStatus;
  created_at: string;
  question_answer: string | null;
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

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    joined: 0,
    cancelled: 0,
  });
  const pageSize = 10;

  // 获取活动ID
  const getMeetupId = (): string | null => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('id');
  };

  // 加载活动详情和报名列表
  const loadData = async (page = 1) => {
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

      // 获取报名列表（使用 participantsApi 获取完整数据，支持分页）
      const participantsResponse = await participantsApi.getParticipants({
        meetup_id: Number(meetupId),
        page,
        limit: pageSize,
      });
      if (participantsResponse.success) {
        setParticipants(
          (participantsResponse.data?.participants || []) as RSVP[]
        );
        setTotalCount(participantsResponse.data?.total || 0);
        setStats({
          total: participantsResponse.data?.total || 0,
          joined: participantsResponse.data?.joinedCount || 0,
          cancelled: participantsResponse.data?.cancelledCount || 0,
        });
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
    loadData(1);
  }, []);

  // 分页变化时重新加载
  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
    loadData(page);
    setSelectedParticipants([]);
  };

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
  const updateParticipantStatus = async (id: string, status: RSVPStatus) => {
    const response = await rsvpApi.update(id, {
      status,
    } as any);
    if (response.success) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status,
              }
            : p
        )
      );
      showSnackbar.success(status === RSVPStatus.CONFIRMED ? '已报名' : '已取消');
    } else {
      showSnackbar.error('更新失败');
    }
  };

  // 审批通过单个参与者
  const approveParticipant = async (id: string) => {
    const response = await rsvpApi.update(id, {
      application_status: ApprovalStatus.APPROVED,
      approved_by: 'Organizer',
      approved_at: new Date().toISOString(),
    } as any);
    if (response.success) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                application_status: ApprovalStatus.APPROVED,
              }
            : p
        )
      );
      showSnackbar.success('审批通过');
    } else {
      showSnackbar.error('审批失败');
    }
  };

  // 拒绝单个参与者
  const rejectParticipant = async (id: string) => {
    const response = await rsvpApi.update(id, {
      status: RSVPStatus.CANCELLED,
      application_status: ApprovalStatus.REJECTED,
      approved_by: 'Organizer',
      approved_at: new Date().toISOString(),
    } as any);
    if (response.success) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: RSVPStatus.CANCELLED,
                application_status: ApprovalStatus.REJECTED,
              }
            : p
        )
      );
      showSnackbar.success('已拒绝');
    } else {
      showSnackbar.error('操作失败');
    }
  };

  // 批量取消选中的参与者
  const cancelSelected = async () => {
    setShowConfirmDialog(false);
    const meetupId = getMeetupId();
    if (!meetupId) return;

    // 只处理已报名状态的参与者
    const joinedParticipants = selectedParticipants.filter(
      (id) =>
        participants.find((p) => p.id === id)?.status === RSVPStatus.CONFIRMED
    );

    if (joinedParticipants.length === 0) {
      showSnackbar.info('没有已报名的参与者');
      setSelectedParticipants([]);
      return;
    }

    try {
      const response = await participantsApi.batchReject({
        meetup_id: Number(meetupId),
        rsvp_ids: joinedParticipants.map((id) => Number(id)),
      });

      if (response.success) {
        showSnackbar.success(
          response.message || `已取消 ${joinedParticipants.length} 位参与者`
        );
        // 刷新列表
        loadData();
      } else {
        showSnackbar.error(response.error || '取消失败');
      }
    } catch (error) {
      console.error('批量取消失败:', error);
      showSnackbar.error('批量取消失败');
    }
    setSelectedParticipants([]);
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
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/meetup-participants-list')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
            {meetup.title} - 报名管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            查看和管理活动报名人员，进行筛选和确认
          </Typography>
        </Box>
      </Box>

      {/* 统计信息 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总报名人数
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {stats.joined}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已报名
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {stats.cancelled}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已取消
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
            <MenuItem value={RSVPStatus.CONFIRMED}>已报名</MenuItem>
            <MenuItem value={RSVPStatus.CANCELLED}>已取消</MenuItem>
          </Select>
        </FormControl>

        {/* 操作按钮 */}
        {selectedParticipants.length > 0 && (
          <Button
            variant="contained"
            color="error"
            onClick={() => setShowConfirmDialog(true)}
          >
            取消选中 ({selectedParticipants.length})
          </Button>
        )}

        {/* 返回按钮 */}
        <Button
          variant="outlined"
          onClick={() => navigate(`/meetup-detail?id=${meetup.id}`)}
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
                <TableCell>报名状态</TableCell>
                <TableCell>审批状态</TableCell>
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
                      disabled={participant.status === RSVPStatus.CANCELLED}
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
                        textAlign: 'center',
                        backgroundColor: getRSVPStatusStyle(participant.status)
                          .backgroundColor,
                        color: getRSVPStatusStyle(participant.status).color,
                      }}
                    >
                      {getRSVPStatusLabel(participant.status)}
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
                        textAlign: 'center',
                        backgroundColor: getApprovalStatusStyle(
                          participant.application_status
                        ).backgroundColor,
                        color: getApprovalStatusStyle(
                          participant.application_status
                        ).color,
                      }}
                    >
                      {getApprovalStatusLabel(participant.application_status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {participant.application_status ===
                        ApprovalStatus.PENDING && (
                        <>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => approveParticipant(participant.id)}
                          >
                            通过
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => rejectParticipant(participant.id)}
                          >
                            拒绝
                          </Button>
                        </>
                      )}
                      {participant.application_status ===
                        ApprovalStatus.APPROVED && (
                        <Typography variant="body2" color="text.secondary">
                          已审批通过
                        </Typography>
                      )}
                      {participant.application_status ===
                        ApprovalStatus.REJECTED && (
                        <Typography variant="body2" color="text.secondary">
                          已拒绝
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 分页组件 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pb: 4 }}>
          <Pagination
            count={Math.ceil(totalCount / pageSize)}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
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
        <DialogTitle>取消报名</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            确定要取消选中的 {selectedParticipants.length} 位参与者的报名吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={cancelSelected}>
            确认取消
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MeetupParticipants;
