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
  Divider,
  useMediaQuery,
  ListItemText,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack,
  CalendarTodayOutlined,
  EmailOutlined,
  GroupAddOutlined,
} from '@mui/icons-material';
import {
  meetupsApi,
  rsvpApi,
  participantsApi,
  surveyApi,
} from '../../netlify/config';
import { Meetup } from '../../netlify/functions/meetup';
import { useGlobalSnackbar } from '../../context/app';
import { getUserName, isUserLoggedIn } from '../../utils/user';
import {
  RSVPStatus,
  ApprovalStatus,
  getRSVPStatusLabel,
  getRSVPStatusStyle,
  getApprovalStatusLabel,
  getApprovalStatusStyle,
  RSVP,
} from '../../netlify/types/rsvp';
import { Survey } from '../../netlify/types/survey';
import StatsCard from '../../components/StatsCard';
import TextCollapse from '../../components/TextCollapse';
import { parseSurveyAnswers } from '../../utils/meetup';
import { ParticipantWritingGroup } from '../../netlify/services/participants';

const MeetupParticipants: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showSnackbar = useGlobalSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participants, setParticipants] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  // 问卷相关状态
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  // 审批操作loading状态 - 分开管理通过和拒绝
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [writingGroups, setWritingGroups] = useState<ParticipantWritingGroup[]>(
    []
  );
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [addingToGroup, setAddingToGroup] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    cancelled: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const pageSize = 10;

  // 获取活动ID
  const getMeetupId = (): string | null => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('id');
  };
  const meetupId = getMeetupId();

  // 加载问卷信息
  const loadSurvey = async (surveyId: string) => {
    setSurveyLoading(true);
    try {
      const response = await surveyApi.getById(surveyId);
      if (response.success && response.data) {
        setSurvey(response.data);
      }
    } catch (error) {
      console.error('加载问卷失败:', error);
    } finally {
      setSurveyLoading(false);
    }
  };

  // 加载活动详情和报名列表
  const loadData = async (page = 1) => {
    if (!meetupId) {
      showSnackbar.error('缺少活动ID');
      return;
    }

    setIsLoading(true);
    try {
      // 获取活动详情
      const meetupResponse = await meetupsApi.getById(meetupId);
      if (meetupResponse.success && meetupResponse.data?.meetups?.length) {
        const meetupData = meetupResponse.data.meetups[0];
        setMeetup(meetupData);

        // 如果活动关联了问卷，加载问卷信息
        if (meetupData.survey_id) {
          await loadSurvey(meetupData.survey_id);
        } else {
          setSurvey(null);
        }
      }

      // 获取报名列表（使用 participantsApi 获取完整数据，支持分页）
      const participantsResponse = await participantsApi.getParticipants({
        meetup_id: Number(meetupId),
        page,
        limit: pageSize,
      });
      if (participantsResponse.success) {
        const participantsList = (participantsResponse.data?.participants ||
          []) as RSVP[];
        setParticipants(participantsList);
        const data = participantsResponse.data;
        setTotalCount(data?.total || 0);
        setStats({
          total: data?.total || 0,
          confirmed: data?.confirmedCount || 0,
          cancelled: data?.cancelledCount || 0,
          pending: data?.pendingCount || 0,
          approved: data?.approvedCount || 0,
          rejected: data?.rejectedCount || 0,
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      showSnackbar.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新统计数据（不重新加载整个页面）
  const refreshStats = async () => {
    try {
      const participantsResponse = await participantsApi.getParticipants({
        meetup_id: Number(meetupId),
        page: currentPage,
        limit: pageSize,
      });
      if (participantsResponse.success) {
        const participantsList = (participantsResponse.data?.participants ||
          []) as RSVP[];
        setParticipants(participantsList);
        const data = participantsResponse.data;
        setTotalCount(data?.total || 0);
        setStats({
          total: data?.total || 0,
          confirmed: data?.confirmedCount || 0,
          cancelled: data?.cancelledCount || 0,
          pending: data?.pendingCount || 0,
          approved: data?.approvedCount || 0,
          rejected: data?.rejectedCount || 0,
        });
      }
    } catch (error) {
      console.error('刷新统计数据失败:', error);
    }
  };

  useEffect(() => {
    if (!meetupId) {
      // 没有活动ID，跳转到活动列表
      navigate('/meetup-participants-list');
      return;
    }
    if (!isUserLoggedIn()) {
      // 未登录，保存当前URL并跳转登录
      const redirect = `${window.location.pathname}${window.location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
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
  const selectableFilteredParticipants = filteredParticipants.filter(
    (p) => p.status !== RSVPStatus.CANCELLED
  );
  const selectedPendingCount = selectedParticipants.filter((id) => {
    const participant = participants.find((p) => p.id === id);
    return (
      participant?.status === RSVPStatus.CONFIRMED &&
      participant.application_status === ApprovalStatus.PENDING
    );
  }).length;

  // 切换选择
  const toggleSelect = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const selectableIds = selectableFilteredParticipants.map((p) => p.id);
    if (selectableIds.every((id) => selectedParticipants.includes(id))) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(selectableIds);
    }
  };

  // 批量通过选中的待审批参与者
  const approveSelected = async () => {
    setShowApproveDialog(false);
    if (!meetupId) return;

    const pendingParticipants = selectedParticipants.filter((id) => {
      const participant = participants.find((p) => p.id === id);
      return (
        participant?.status === RSVPStatus.CONFIRMED &&
        participant.application_status === ApprovalStatus.PENDING
      );
    });

    if (pendingParticipants.length === 0) {
      showSnackbar.info('没有待审批的参与者');
      setSelectedParticipants([]);
      return;
    }

    setIsBatchApproving(true);
    try {
      const response = await participantsApi.batchConfirm({
        meetup_id: Number(meetupId),
        rsvp_ids: pendingParticipants.map((id) => Number(id)),
        send_email: true,
        approved_by: getUserName() || '',
      });
      if (response.success) {
        showSnackbar.success(
          response.message || `已通过 ${pendingParticipants.length} 位参与者`
        );
        await loadData(currentPage);
      } else {
        showSnackbar.error(response.error || '批量通过失败');
      }
    } catch (error) {
      console.error('批量通过失败:', error);
      showSnackbar.error('批量通过失败');
    } finally {
      setIsBatchApproving(false);
      setSelectedParticipants([]);
    }
  };

  // 审批通过单个参与者
  const approveParticipant = async (id: string) => {
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      const response = await rsvpApi.update(id, {
        application_status: ApprovalStatus.APPROVED,
        approved_by: getUserName(),
        approved_at: new Date().toISOString(),
        send_email: true,
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
        await refreshStats();
        showSnackbar.success('审批通过');
      } else {
        showSnackbar.error('审批失败');
      }
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 拒绝单个参与者
  const rejectParticipant = async (id: string) => {
    setRejectingIds((prev) => new Set(prev).add(id));
    try {
      const response = await rsvpApi.update(id, {
        application_status: ApprovalStatus.REJECTED,
        approved_by: getUserName(),
        approved_at: new Date().toISOString(),
        send_email: true,
      } as any);
      if (response.success) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  application_status: ApprovalStatus.REJECTED,
                }
              : p
          )
        );
        await refreshStats();
        showSnackbar.success('已拒绝');
      } else {
        showSnackbar.error('操作失败');
      }
    } finally {
      setRejectingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 批量拒绝选中的参与者
  const rejectSelected = async () => {
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
        send_email: true,
        approved_by: getUserName() || '',
      });

      if (response.success) {
        showSnackbar.success(
          response.message || `已拒绝 ${joinedParticipants.length} 位参与者`
        );
        // 刷新列表
        loadData();
      } else {
        showSnackbar.error(response.error || '拒绝失败');
      }
    } catch (error) {
      console.error('批量拒绝失败:', error);
      showSnackbar.error('批量拒绝失败');
    }
    setSelectedParticipants([]);
  };

  const openGroupDialog = async () => {
    setShowGroupDialog(true);
    if (writingGroups.length > 0) return;
    setGroupsLoading(true);
    try {
      const response = await participantsApi.getWritingGroups();
      if (response.success && response.data) {
        setWritingGroups(response.data.groups);
        if (response.data.groups.length === 1)
          setSelectedGroupId(response.data.groups[0].id);
      } else {
        showSnackbar.error(response.error || '加载讨论组失败');
      }
    } catch (error) {
      console.error('加载讨论组失败:', error);
      showSnackbar.error('加载讨论组失败');
    } finally {
      setGroupsLoading(false);
    }
  };

  const addParticipantsToGroup = async () => {
    if (!meetupId || !selectedGroupId) return;
    setAddingToGroup(true);
    try {
      const response = await participantsApi.addToWritingGroup(
        Number(meetupId),
        Number(selectedGroupId)
      );
      if (response.success && response.data) {
        const { added_count, existing_count, skipped_count } = response.data;
        showSnackbar.success(
          `同步完成：新增 ${added_count} 人，已有 ${existing_count} 人，未绑定账号 ${skipped_count} 人`
        );
        setShowGroupDialog(false);
      } else {
        showSnackbar.error(response.error || '添加到讨论组失败');
      }
    } catch (error) {
      console.error('添加到讨论组失败:', error);
      showSnackbar.error('添加到讨论组失败');
    } finally {
      setAddingToGroup(false);
    }
  };

  if (!meetup && !isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">活动不存在</Alert>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}
    >
      {/* 页面标题 */}
      <Box
        sx={{
          mb: { xs: 3, sm: 4 },
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <IconButton onClick={() => navigate('/meetup-participants-list')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ mb: 0.5, fontSize: { xs: '1.35rem', sm: '2.125rem' } }}
          >
            {meetup?.title || '加载中...'} - 报名管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            查看和管理活动报名人员，进行筛选和确认
          </Typography>
        </Box>
      </Box>

      {/* 统计信息 */}
      <StatsCard stats={stats} showApprovalStats={!!meetup?.survey_id} />

      {/* 筛选和操作栏 */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          '& > *': {
            width: { xs: '100%', sm: 'auto' },
          },
        }}
      >
        {/* 搜索框 */}
        <TextField
          label="搜索当前页姓名或邮箱"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: { sm: 200 } }}
        />

        {/* 状态筛选 */}
        <FormControl size="small" sx={{ minWidth: { sm: 150 } }}>
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => setShowApproveDialog(true)}
              disabled={isBatchApproving || selectedPendingCount === 0}
            >
              批量通过 ({selectedPendingCount})
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isBatchApproving}
            >
              批量拒绝 ({selectedParticipants.length})
            </Button>
          </Box>
        )}

        {/* 返回按钮 */}
        <Button
          variant="contained"
          startIcon={<GroupAddOutlined />}
          onClick={openGroupDialog}
          disabled={!meetup || stats.confirmed === 0}
        >
          一键加入讨论组
        </Button>

        {/* 返回按钮 */}
        <Button
          variant="outlined"
          onClick={() => navigate(`/meetup-detail?id=${meetup?.id}`)}
          disabled={!meetup}
        >
          返回活动详情
        </Button>
      </Box>

      {/* 问卷/问题提示 */}
      {survey && survey.questions.length > 0 && meetup && (
        <Card sx={{ mb: 4, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 2 }}>
              {'报名问卷'}：
            </Typography>
            {surveyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              survey &&
              survey.questions.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {survey.questions.map((q) => (
                    <Typography
                      key={q.id}
                      variant="body2"
                      color="text.secondary"
                    >
                      {q.title}{' '}
                      {q.required && (
                        <Typography component="span" color="error">
                          *
                        </Typography>
                      )}
                      {q.options && q.options.length > 0 && (
                        <Typography component="span" sx={{ ml: 1 }}>
                          ({q.options.map((o) => o.text).join(' / ')})
                        </Typography>
                      )}
                    </Typography>
                  ))}
                </Box>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* 报名列表 */}
      <Card
        sx={{
          overflow: 'visible',
          bgcolor: { xs: 'transparent', sm: 'background.paper' },
          boxShadow: { xs: 'none', sm: 1 },
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={40} />
          </Box>
        ) : isMobile ? (
          <Box sx={{ p: { xs: 0, sm: 2 } }}>
            {filteredParticipants.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  px: { xs: 0.5, sm: 1 },
                }}
              >
                <Checkbox
                  checked={
                    selectedParticipants.length ===
                      filteredParticipants.length &&
                    filteredParticipants.length > 0
                  }
                  indeterminate={
                    selectedParticipants.length > 0 &&
                    selectedParticipants.length < filteredParticipants.length
                  }
                  onChange={toggleSelectAll}
                />
                <Typography variant="body2" fontWeight={600}>
                  {selectedParticipants.length > 0
                    ? `已选择 ${selectedParticipants.length} 人`
                    : `全选当前 ${filteredParticipants.length} 人`}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {filteredParticipants.map((participant) => {
                const answerItems =
                  participant.survey_answers && survey
                    ? parseSurveyAnswers(participant.survey_answers, survey)
                    : [];

                return (
                  <Card
                    key={participant.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      borderColor: selectedParticipants.includes(participant.id)
                        ? 'primary.main'
                        : 'divider',
                      bgcolor: 'background.paper',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxShadow: selectedParticipants.includes(participant.id)
                        ? 2
                        : 0,
                    }}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        '&:last-child': { pb: { xs: 2, sm: 2.5 } },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        <Checkbox
                          sx={{ p: 0.5, ml: -0.5, mt: -0.25 }}
                          checked={selectedParticipants.includes(
                            participant.id
                          )}
                          onChange={() => toggleSelect(participant.id)}
                          disabled={participant.status === RSVPStatus.CANCELLED}
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography fontWeight={700} fontSize="1.05rem">
                            {participant.name || '未知'}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                              mt: 1,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Box
                              sx={{
                                px: 1.25,
                                py: 0.5,
                                borderRadius: 10,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: getRSVPStatusStyle(
                                  participant.status
                                ).backgroundColor,
                                color: getRSVPStatusStyle(participant.status)
                                  .color,
                              }}
                            >
                              {getRSVPStatusLabel(participant.status)}
                            </Box>
                            <Box
                              sx={{
                                px: 1.25,
                                py: 0.5,
                                borderRadius: 10,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: getApprovalStatusStyle(
                                  participant.application_status
                                ).backgroundColor,
                                color: getApprovalStatusStyle(
                                  participant.application_status
                                ).color,
                              }}
                            >
                              {getApprovalStatusLabel(
                                participant.application_status
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          color: 'text.secondary',
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <EmailOutlined sx={{ fontSize: 18, flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            sx={{ overflowWrap: 'anywhere' }}
                          >
                            {participant.email || '未填写邮箱'}
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <CalendarTodayOutlined
                            sx={{ fontSize: 17, flexShrink: 0 }}
                          />
                          <Typography variant="body2">
                            {new Date(participant.created_at).toLocaleString(
                              'zh-CN'
                            )}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                        >
                          报名答案
                        </Typography>
                        {answerItems.length > 0 ? (
                          <TextCollapse
                            text=""
                            maxItems={3}
                            sx={{
                              mt: 0.75,
                              pl: 2.25,
                              fontSize: '0.875rem',
                            }}
                          >
                            {answerItems.map((item, idx) => (
                              <Box
                                component="li"
                                key={idx}
                                sx={{ mb: 0.5, lineHeight: 1.5 }}
                              >
                                <Typography
                                  component="span"
                                  variant="body2"
                                  sx={{ fontWeight: 500 }}
                                >
                                  {item.title}
                                </Typography>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  ：{item.answer}
                                </Typography>
                              </Box>
                            ))}
                          </TextCollapse>
                        ) : participant.survey_answers ? (
                          <Typography
                            variant="body2"
                            sx={{ mt: 0.75, overflowWrap: 'anywhere' }}
                          >
                            {participant.survey_answers}
                          </Typography>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.75 }}
                          >
                            无
                          </Typography>
                        )}
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 1,
                        }}
                      >
                        {participant.application_status ===
                          ApprovalStatus.PENDING && (
                          <>
                            <Button
                              variant="outlined"
                              color="success"
                              onClick={() => approveParticipant(participant.id)}
                              loading={approvingIds.has(participant.id)}
                              loadingPosition="start"
                            >
                              通过
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => rejectParticipant(participant.id)}
                              loading={rejectingIds.has(participant.id)}
                              loadingPosition="start"
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
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ tableLayout: 'fixed', minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selectedParticipants.length ===
                          selectableFilteredParticipants.length &&
                        selectableFilteredParticipants.length > 0
                      }
                      indeterminate={
                        selectedParticipants.length > 0 &&
                        selectedParticipants.length <
                          selectableFilteredParticipants.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 220 }}>报名用户</TableCell>
                  <TableCell sx={{ width: '38%' }}>报名答案</TableCell>
                  <TableCell sx={{ width: 100 }}>报名状态</TableCell>
                  <TableCell sx={{ width: 100 }}>审批状态</TableCell>
                  <TableCell sx={{ width: 120 }}>操作</TableCell>
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
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      <Typography fontWeight="600">
                        {participant.name || '未知'}
                      </Typography>
                      <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ mt: 0.5, overflowWrap: 'anywhere' }}
                      >
                        {participant.email || '未填写邮箱'}
                      </Typography>
                      <Typography
                        color="text.secondary"
                        variant="caption"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {new Date(participant.created_at).toLocaleString(
                          'zh-CN'
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      {participant.survey_answers && survey ? (
                        (() => {
                          const answerItems = parseSurveyAnswers(
                            participant.survey_answers,
                            survey
                          );

                          if (answerItems.length === 0) {
                            return (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {participant.survey_answers}
                              </Typography>
                            );
                          }

                          return (
                            <TextCollapse
                              text=""
                              maxItems={3}
                              sx={{ width: '100%', fontSize: '0.875rem' }}
                            >
                              {answerItems.map((item, idx) => (
                                <Box
                                  component="li"
                                  key={idx}
                                  sx={{ mb: 0.5, lineHeight: 1.5 }}
                                >
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {item.title}
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    ：{item.answer}
                                  </Typography>
                                </Box>
                              ))}
                            </TextCollapse>
                          );
                        })()
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          无
                        </Typography>
                      )}
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
                          backgroundColor: getRSVPStatusStyle(
                            participant.status
                          ).backgroundColor,
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
                              loading={approvingIds.has(participant.id)}
                              loadingPosition="start"
                            >
                              通过
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => rejectParticipant(participant.id)}
                              loading={rejectingIds.has(participant.id)}
                              loadingPosition="start"
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
        )}

        {/* 分页组件 */}
        {totalCount > pageSize && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pb: 4 }}>
            <Pagination
              count={Math.ceil(totalCount / pageSize)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="small"
              siblingCount={0}
            />
          </Box>
        )}
      </Card>

      {/* 空状态 */}
      {!isLoading && filteredParticipants.length === 0 && (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            暂无符合条件的报名人员
          </Typography>
        </Box>
      )}

      {/* 确认对话框 */}
      <Dialog
        open={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
      >
        <DialogTitle>批量通过</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            确定要通过选中的 {selectedPendingCount}{' '}
            位待审批参与者吗？通过后将发送报名确认邮件。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveDialog(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={approveSelected}>
            确认通过
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
      >
        <DialogTitle>批量拒绝</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            确定要拒绝选中的 {selectedParticipants.length} 位参与者吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={rejectSelected}>
            确认拒绝
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showGroupDialog}
        onClose={() => !addingToGroup && setShowGroupDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>将活动报名人员加入讨论组</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将同步本活动所有已报名且绑定了站内账号的人员，不受当前分页或筛选影响。已有成员不会重复添加。
          </Typography>
          {groupsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : writingGroups.length === 0 ? (
            <Alert severity="info">
              暂无启用中的讨论组，请先在书写管理中创建。
            </Alert>
          ) : (
            <FormControl fullWidth>
              <InputLabel id="participant-writing-group-label">
                选择讨论组
              </InputLabel>
              <Select
                labelId="participant-writing-group-label"
                label="选择讨论组"
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
              >
                {writingGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    <ListItemText
                      primary={group.name}
                      secondary={group.description}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowGroupDialog(false)}
            disabled={addingToGroup}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={addParticipantsToGroup}
            disabled={!selectedGroupId || groupsLoading || addingToGroup}
          >
            {addingToGroup ? '正在同步…' : '确认加入'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MeetupParticipants;
