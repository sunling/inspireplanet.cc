import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  BarChart as BarChartIcon,
  Share as ShareIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';
import surveyApi from '../../netlify/services/survey';
import { Survey, SurveySubmission } from '../../netlify/types/survey';
import Loading from '../../components/Loading';
import ErrorCard from '../../components/ErrorCard';
import { formatDateTime } from '../../utils/date';
import { getUserId } from '../../utils/user';

const SurveyList: React.FC = () => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [mySubmissions, setMySubmissions] = useState<
    Record<string, SurveySubmission>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [shareSurvey, setShareSurvey] = useState<Survey | null>(null);
  const [qrColor, setQrColor] = useState<string>('#000000');
  const [qrBgColor, setQrBgColor] = useState<string>('#ffffff');

  // 新建问卷表单状态
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [newSurveyDescription, setNewSurveyDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // 加载问卷列表和用户的提交记录
  const fetchSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await surveyApi.getAll();
      if (response.success && response.data) {
        setSurveys(response.data.records || []);

        // 加载当前用户的提交记录
        const respondentId = getUserId();
        if (respondentId) {
          const submissionsResponse = await surveyApi.getMySubmissions({
            respondentId: String(respondentId),
          });

          if (submissionsResponse.success && submissionsResponse.data) {
            // 将提交记录转换为以 surveyId 为 key 的对象
            const submissionsMap: Record<string, SurveySubmission> = {};
            submissionsResponse.data.records.forEach((record: any) => {
              submissionsMap[record.surveyId] = record;
            });
            setMySubmissions(submissionsMap);
          }
        }
      } else {
        setError(response.error || '加载问卷列表失败');
      }
    } catch (err) {
      setError('加载问卷列表时发生错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // 创建问卷
  const handleCreate = async () => {
    if (!newSurveyTitle.trim()) {
      showSnackbar.error('请输入问卷标题');
      return;
    }

    try {
      const userId = getUserId();
      if (!userId) {
        showSnackbar.error('请先登录');
        return;
      }

      const response = await surveyApi.create({
        title: newSurveyTitle,
        description: newSurveyDescription,
        questions: [],
        isActive,
        allowMultipleSubmissions: false,
        createdBy: String(userId),
      });

      if (response.success) {
        showSnackbar.success('问卷创建成功');
        setCreateDialogOpen(false);
        setNewSurveyTitle('');
        setNewSurveyDescription('');
        // 跳转到编辑页面
        if (response.data?.id) {
          navigate(`/survey-edit/${response.data.id}`);
        } else {
          fetchSurveys();
        }
      } else {
        showSnackbar.error(response.error || '创建失败');
      }
    } catch (err) {
      showSnackbar.error('创建问卷时发生错误');
    }
  };

  // 删除问卷
  const handleDelete = async () => {
    if (!selectedSurvey) return;

    try {
      const response = await surveyApi.delete(selectedSurvey.id);
      if (response.success) {
        showSnackbar.success('问卷删除成功');
        setDeleteDialogOpen(false);
        setSelectedSurvey(null);
        fetchSurveys();
      } else {
        showSnackbar.error(response.error || '删除失败');
      }
    } catch (err) {
      showSnackbar.error('删除问卷时发生错误');
    }
  };

  // 切换问卷状态
  const handleToggleStatus = async (survey: Survey) => {
    try {
      const response = await surveyApi.toggleActive(survey.id);
      if (response.success) {
        showSnackbar.success(survey.isActive ? '问卷已禁用' : '问卷已启用');
        fetchSurveys();
      } else {
        showSnackbar.error(response.error || '操作失败');
      }
    } catch (err) {
      showSnackbar.error('操作失败');
    }
  };

  // 渲染问卷卡片
  const renderSurveyCard = (survey: Survey) => {
    const isExpired = survey.endDate && new Date(survey.endDate) < new Date();
    const hasSubmitted = !!mySubmissions[survey.id];
    const isCreator = survey.createdBy === String(getUserId());

    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={survey.id}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 1,
              }}
            >
              <Typography
                variant="h6"
                component="h2"
                noWrap
                sx={{ flex: 1, mr: 1 }}
              >
                {survey.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {hasSubmitted && (
                  <Chip
                    size="small"
                    icon={<CheckCircleIcon />}
                    label="已填写"
                    color="success"
                    variant="outlined"
                  />
                )}
                <Chip
                  size="small"
                  label={survey.isActive && !isExpired ? '进行中' : '已结束'}
                  color={survey.isActive && !isExpired ? 'success' : 'default'}
                />
              </Box>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, minHeight: 40 }}
            >
              {survey.description || '暂无描述'}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                问题数量: {survey.questions?.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                创建时间: {formatDateTime(survey.createdAt)}
              </Typography>
              {survey.endDate && (
                <Typography
                  variant="caption"
                  color={isExpired ? 'error' : 'text.secondary'}
                >
                  截止时间: {formatDateTime(survey.endDate)}
                </Typography>
              )}
            </Box>
          </CardContent>

          <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            <Box>
              {isCreator && (
                <>
                  <Tooltip title="编辑">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/survey-edit/${survey.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="查看结果">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/survey-results/${survey.id}`)}
                    >
                      <BarChartIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <Tooltip title={hasSubmitted ? '查看/修改' : '填写'}>
                <IconButton
                  size="small"
                  onClick={() => navigate(`/survey/${survey.id}`)}
                  color={hasSubmitted ? 'success' : 'default'}
                >
                  {hasSubmitted ? <CheckCircleIcon /> : <VisibilityIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="分享">
                <IconButton
                  size="small"
                  onClick={() => {
                    setShareSurvey(survey);
                    setShareDialogOpen(true);
                  }}
                >
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            </Box>
            {isCreator && (
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={survey.isActive}
                      onChange={() => handleToggleStatus(survey)}
                    />
                  }
                  label={survey.isActive ? '启用' : '禁用'}
                />
                <Tooltip title="删除">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setSelectedSurvey(survey);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  };

  if (loading) {
    return <Loading message="加载问卷列表..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={fetchSurveys} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1">
            调查问卷
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建问卷
          </Button>
        </Box>

        {surveys.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无问卷
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              点击右下角按钮创建第一个问卷
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {surveys.map(renderSurveyCard)}
          </Grid>
        )}
      </Container>

      {/* 创建问卷对话框 */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建问卷</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="问卷标题"
            fullWidth
            required
            value={newSurveyTitle}
            onChange={(e) => setNewSurveyTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="问卷描述"
            fullWidth
            multiline
            rows={3}
            value={newSurveyDescription}
            onChange={(e) => setNewSurveyDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            }
            label="立即启用"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreate} variant="contained">
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除问卷「{selectedSurvey?.title}」吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分享对话框 */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>分享问卷</span>
          <IconButton onClick={() => setShareDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {shareSurvey && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {shareSurvey.title}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="二维码颜色"
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="背景颜色"
                    type="color"
                    value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                <QRCode
                  value={`${window.location.origin}/survey/${shareSurvey.id}`}
                  size={200}
                  level="H"
                  fgColor={qrColor}
                  bgColor={qrBgColor}
                />
              </Box>
              <TextField
                fullWidth
                value={`${window.location.origin}/survey/${shareSurvey.id}`}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 3 }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  const surveyUrl = `${window.location.origin}/survey/${shareSurvey.id}`;
                  navigator.clipboard
                    .writeText(surveyUrl)
                    .then(() => {
                      showSnackbar.success('问卷链接已复制到剪贴板');
                    })
                    .catch(() => {
                      showSnackbar.error('复制链接失败，请手动复制');
                    });
                }}
              >
                复制链接
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 移动端浮动按钮 */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default SurveyList;
