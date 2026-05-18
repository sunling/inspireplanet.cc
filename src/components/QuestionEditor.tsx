import React, { useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  SurveyQuestion,
  QuestionType,
  QuestionOption,
} from '../netlify/types/survey';

interface QuestionEditorProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
  viewOnly?: boolean;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  questions,
  onChange,
  viewOnly = false,
}) => {
  // 问题编辑对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<Partial<SurveyQuestion> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

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
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    onChange(newQuestions);
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion) return;

    const newQuestions = [...questions];
    const question = editingQuestion as SurveyQuestion;

    if (editingIndex === -1) {
      // 新增问题
      question.id = Date.now().toString();
      newQuestions.push(question);
    } else {
      // 编辑问题
      newQuestions[editingIndex] = question;
    }

    onChange(newQuestions);
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

  const getQuestionTypeName = (type: QuestionType) => {
    switch (type) {
      case 'single':
        return '单选题';
      case 'multiple':
        return '多选题';
      case 'text':
        return '文本题';
      case 'rating':
        return '评分题';
      case 'date':
        return '日期题';
      default:
        return '未知';
    }
  };

  const renderQuestionPreview = (question: SurveyQuestion, index: number) => {
    return (
      <Paper key={question.id} variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
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
                  label={getQuestionTypeName(question.type)}
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
            {!viewOnly && (
              <Box>
                <IconButton
                  size="small"
                  onClick={() => handleEditQuestion(question, index)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteQuestion(index)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">报名问题</Typography>
        {!viewOnly && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
          >
            添加问题
          </Button>
        )}
      </Box>

      {questions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
          <Typography color="text.secondary">
            暂无问题，点击上方按钮添加
          </Typography>
        </Paper>
      ) : (
        questions.map((question, index) =>
          renderQuestionPreview(question, index)
        )
      )}

      {/* 问题编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingQuestion(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingIndex === -1 ? '添加问题' : '编辑问题'}
        </DialogTitle>
        <DialogContent>
          {editingQuestion && (
            <Box sx={{ mt: 2 }}>
              {/* 问题类型 */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>问题类型</InputLabel>
                <Select
                  value={editingQuestion.type || 'single'}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      type: e.target.value as QuestionType,
                      options:
                        e.target.value === 'single' ||
                        e.target.value === 'multiple'
                          ? editingQuestion.options || [
                              {
                                id: '1',
                                text: '选项1',
                                label: '选项1',
                                value: '1',
                              },
                              {
                                id: '2',
                                text: '选项2',
                                label: '选项2',
                                value: '2',
                              },
                            ]
                          : undefined,
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

              {/* 问题标题 */}
              <TextField
                fullWidth
                label="问题标题"
                value={editingQuestion.title || ''}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    title: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
                required
              />

              {/* 问题描述 */}
              <TextField
                fullWidth
                label="问题描述（可选）"
                multiline
                rows={2}
                value={editingQuestion.description || ''}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    description: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />

              {/* 是否必填 */}
              <FormControlLabel
                control={
                  <Switch
                    checked={editingQuestion.required || false}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        required: e.target.checked,
                      })
                    }
                  />
                }
                label="必填"
                sx={{ mb: 2 }}
              />

              {/* 选项配置（单选/多选） */}
              {(editingQuestion.type === 'single' ||
                editingQuestion.type === 'multiple') && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    选项列表
                  </Typography>
                  {(editingQuestion.options || []).map((option, index) => (
                    <Box
                      key={option.id}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <TextField
                        fullWidth
                        value={option.text || ''}
                        onChange={(e) =>
                          handleUpdateOption(index, 'text', e.target.value)
                        }
                        placeholder={`选项${index + 1}`}
                      />
                      {!viewOnly && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteOption(index)}
                          disabled={(editingQuestion.options || []).length <= 2}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  {!viewOnly && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddOption}
                      sx={{ mt: 1 }}
                    >
                      添加选项
                    </Button>
                  )}
                </Box>
              )}

              {/* 评分题配置 */}
              {editingQuestion.type === 'rating' && (
                <TextField
                  fullWidth
                  label="最大评分值"
                  type="number"
                  value={editingQuestion.maxRating || 5}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      maxRating: Number(e.target.value),
                    })
                  }
                  sx={{ mb: 2 }}
                  inputProps={{ min: 1, max: 10 }}
                />
              )}

              {/* 文本题配置 */}
              {editingQuestion.type === 'text' && (
                <TextField
                  fullWidth
                  label="占位提示（可选）"
                  value={editingQuestion.placeholder || ''}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      placeholder: e.target.value,
                    })
                  }
                  sx={{ mb: 2 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingQuestion(null);
            }}
          >
            取消
          </Button>
          <Button onClick={handleSaveQuestion} color="primary">
            {editingIndex === -1 ? '添加' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestionEditor;
