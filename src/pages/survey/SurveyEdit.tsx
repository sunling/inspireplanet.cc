import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { surveyApi } from '../../netlify/config';
import {
  Survey,
  SurveyQuestion,
  QuestionType,
  QuestionOption,
} from '../../netlify/types/survey';
import Loading from '../../components/Loading';
import ErrorCard from '../../components/ErrorCard';
import { useGlobalSnackbar } from '../../context/app';

const SurveyEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const showSnackbar = useGlobalSnackbar();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 问题编辑对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<Partial<SurveyQuestion> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  useEffect(() => {
    if (!id) {
      setError('缺少问卷ID');
      setLoading(false);
      return;
    }
    fetchSurvey();
  }, [id]);

  const fetchSurvey = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await surveyApi.getById(id!);
      if (response.success && response.data) {
        setSurvey(response.data);
      } else {
        setError(response.error || '加载问卷失败');
      }
    } catch (err) {
      setError('加载问卷时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!survey) return;

    setSaving(true);
    try {
      const response = await surveyApi.update(survey.id, {
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
        isActive: survey.isActive,
        allowMultipleSubmissions: survey.allowMultipleSubmissions,
        startDate: survey.startDate,
        endDate: survey.endDate,
      });

      if (response.success) {
        showSnackbar.success('问卷保存成功');
      } else {
        showSnackbar.error(response.error || '保存失败');
      }
    } catch (err) {
      showSnackbar.error('保存问卷时发生错误');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      type: 'single',
      title: '',
      description: '',
      required: false,
      options: [
        { id: '1', text: '选项1', label: '选项1', value: '1' },
        { id: '2', text: '选项2', label: '选项2', value: '2' },
      ],
    });
    setEditingIndex(-1);
    setEditDialogOpen(true);
  };

  const handleEditQuestion = (question: SurveyQuestion, index: number) => {
    setEditingQuestion({ ...question });
    setEditingIndex(index);
    setEditDialogOpen(true);
  };

  const handleDeleteQuestion = (index: number) => {
    if (!survey) return;
    const newQuestions = [...survey.questions];
    newQuestions.splice(index, 1);
    setSurvey({ ...survey, questions: newQuestions });
  };

  const handleSaveQuestion = () => {
    if (!survey || !editingQuestion) return;

    const newQuestions = [...survey.questions];
    const question = editingQuestion as SurveyQuestion;

    if (editingIndex === -1) {
      // 新增问题
      question.id = Date.now().toString();
      newQuestions.push(question);
    } else {
      // 编辑问题
      newQuestions[editingIndex] = question;
    }

    setSurvey({ ...survey, questions: newQuestions });
    setEditDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleAddOption = () => {
    if (!editingQuestion) return;
    const options = editingQuestion.options || [];
    const newId = (options.length + 1).toString();
    setEditingQuestion({
      ...editingQuestion,
      options: [
        ...options,
        {
          id: newId,
          text: `选项${newId}`,
          label: `选项${newId}`,
          value: newId,
        },
      ],
    });
  };

  const handleDeleteOption = (optionIndex: number) => {
    if (!editingQuestion?.options) return;
    const newOptions = [...editingQuestion.options];
    newOptions.splice(optionIndex, 1);
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const handleUpdateOption = (
    optionIndex: number,
    field: keyof QuestionOption,
    value: string
  ) => {
    if (!editingQuestion?.options) return;
    const newOptions = [...editingQuestion.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const renderQuestionPreview = (question: SurveyQuestion, index: number) => {
    return (
      <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ pt: 1 }}>
              <DragIcon color="action" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={500}>
                {index + 1}. {question.title}
                {question.required && (
                  <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                    *
                  </Typography>
                )}
              </Typography>
              {question.description && (
                <Typography variant="body2" color="text.secondary">
                  {question.description}
                </Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={
                    question.type === 'single'
                      ? '单选题'
                      : question.type === 'multiple'
                        ? '多选题'
                        : question.type === 'text'
                          ? '文本题'
                          : question.type === 'rating'
                            ? '评分题'
                            : '日期题'
                  }
                  sx={{ mr: 1 }}
                />
                {(question.type === 'single' || question.type === 'multiple') &&
                  question.options && (
                    <Typography variant="caption" color="text.secondary">
                      {question.options.length} 个选项
                    </Typography>
                  )}
              </Box>
            </Box>
            <Box>
              <Tooltip title="编辑">
                <IconButton
                  size="small"
                  onClick={() => handleEditQuestion(question, index)}
                >
                  <BackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteQuestion(index)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <Loading message="加载问卷..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={fetchSurvey} />;
  }

  if (!survey) {
    return (
      <ErrorCard message="问卷不存在" onRetry={() => navigate('/surveys')} />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 4, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Button
              startIcon={<BackIcon />}
              onClick={() => navigate('/surveys')}
            >
              返回列表
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存问卷'}
            </Button>
          </Box>

          <TextField
            fullWidth
            label="问卷标题"
            value={survey.title}
            onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="问卷描述"
            multiline
            rows={2}
            value={survey.description || ''}
            onChange={(e) =>
              setSurvey({ ...survey, description: e.target.value })
            }
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={survey.isActive}
                  onChange={(e) =>
                    setSurvey({ ...survey, isActive: e.target.checked })
                  }
                />
              }
              label="启用问卷"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={survey.allowMultipleSubmissions}
                  onChange={(e) =>
                    setSurvey({
                      ...survey,
                      allowMultipleSubmissions: e.target.checked,
                    })
                  }
                />
              }
              label="允许多次提交"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">问题列表</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddQuestion}
            >
              添加问题
            </Button>
          </Box>

          {survey.questions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
              <Typography color="text.secondary">
                暂无问题，点击上方按钮添加
              </Typography>
            </Paper>
          ) : (
            survey.questions.map((question, index) =>
              renderQuestionPreview(question, index)
            )
          )}
        </Paper>
      </Container>

      {/* 问题编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingIndex === -1 ? '添加问题' : '编辑问题'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="问题标题"
            value={editingQuestion?.title || ''}
            onChange={(e) =>
              setEditingQuestion({
                ...editingQuestion,
                title: e.target.value,
              })
            }
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            fullWidth
            label="问题描述（可选）"
            value={editingQuestion?.description || ''}
            onChange={(e) =>
              setEditingQuestion({
                ...editingQuestion,
                description: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>问题类型</InputLabel>
            <Select
              value={editingQuestion?.type || 'single'}
              label="问题类型"
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  type: e.target.value as QuestionType,
                })
              }
            >
              <MenuItem value="single">单选题</MenuItem>
              <MenuItem value="multiple">多选题</MenuItem>
              <MenuItem value="text">文本题</MenuItem>
              <MenuItem value="rating">评分题</MenuItem>
              <MenuItem value="date">日期题</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={editingQuestion?.required || false}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    required: e.target.checked,
                  })
                }
              />
            }
            label="必答题"
            sx={{ mb: 2 }}
          />

          {(editingQuestion?.type === 'single' ||
            editingQuestion?.type === 'multiple') && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                选项设置
              </Typography>
              {editingQuestion?.options?.map((option, index) => (
                <Box
                  key={option.id}
                  sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}
                >
                  <TextField
                    size="small"
                    label={`选项 ${index + 1}`}
                    value={option.label}
                    onChange={(e) =>
                      handleUpdateOption(index, 'label', e.target.value)
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="值"
                    value={option.value}
                    onChange={(e) =>
                      handleUpdateOption(index, 'value', e.target.value)
                    }
                    sx={{ width: 120 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteOption(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddOption}
                size="small"
              >
                添加选项
              </Button>
            </Box>
          )}

          {editingQuestion?.type === 'rating' && (
            <TextField
              fullWidth
              type="number"
              label="最高评分"
              value={editingQuestion?.maxRating || 5}
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  maxRating: parseInt(e.target.value) || 5,
                })
              }
              sx={{ mt: 2 }}
            />
          )}

          {editingQuestion?.type === 'text' && (
            <TextField
              fullWidth
              label="提示文字（可选）"
              value={editingQuestion?.placeholder || ''}
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  placeholder: e.target.value,
                })
              }
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleSaveQuestion}
            variant="contained"
            disabled={!editingQuestion?.title}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SurveyEdit;
