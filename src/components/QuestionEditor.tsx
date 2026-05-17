import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  QuestionConfig,
  QuestionType,
  questionTypeLabels,
  createDefaultOption,
} from '../netlify/types/question';

interface QuestionEditorProps {
  question: QuestionConfig;
  onChange: (question: QuestionConfig) => void;
  onDelete?: () => void;
  index: number;
  showDelete?: boolean;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onChange,
  onDelete,
  index,
  showDelete = true,
}) => {
  const [newOption, setNewOption] = useState('');

  const handleTypeChange = (type: QuestionType) => {
    const updated: QuestionConfig = {
      ...question,
      type,
      options:
        type === 'text'
          ? undefined
          : question.options || [
              createDefaultOption(0),
              createDefaultOption(1),
            ],
    };
    onChange(updated);
  };

  const handleTitleChange = (title: string) => {
    onChange({ ...question, title });
  };

  const handleDescriptionChange = (description: string) => {
    onChange({ ...question, description });
  };

  const handleRequiredChange = (required: boolean) => {
    onChange({ ...question, required });
  };

  const handlePlaceholderChange = (placeholder: string) => {
    onChange({ ...question, placeholder });
  };

  const handleMaxRatingChange = (maxRating: number) => {
    onChange({ ...question, maxRating });
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    const newOpt = createDefaultOption(question.options?.length || 0);
    newOpt.text = newOption.trim();
    newOpt.label = newOption.trim();
    newOpt.value = newOption.trim();
    onChange({
      ...question,
      options: [...(question.options || []), newOpt],
    });
    setNewOption('');
  };

  const updateOption = (optionId: string, newText: string) => {
    if (!question.options) return;
    onChange({
      ...question,
      options: question.options.map((opt) =>
        opt.id === optionId
          ? { ...opt, text: newText, label: newText, value: newText }
          : opt
      ),
    });
  };

  const removeOption = (optionId: string) => {
    if (!question.options) return;
    onChange({
      ...question,
      options: question.options.filter((opt) => opt.id !== optionId),
    });
  };

  const showOptions =
    question.type === 'single' || question.type === 'multiple';
  const showPlaceholder = question.type === 'text';
  const showMaxRating = question.type === 'rating';

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chip label={`Q${index + 1}`} size="small" color="primary" />
        <Typography variant="subtitle2" color="text.secondary">
          {questionTypeLabels[question.type]}
        </Typography>
        {showDelete && onDelete && (
          <IconButton
            size="small"
            color="error"
            onClick={onDelete}
            sx={{ ml: 'auto' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>问题类型</InputLabel>
          <Select
            value={question.type}
            label="问题类型"
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
          >
            {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
              <MenuItem key={type} value={type}>
                {questionTypeLabels[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="问题标题"
          value={question.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          size="small"
          required
        />

        <TextField
          fullWidth
          label="问题描述（可选）"
          value={question.description || ''}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          size="small"
          placeholder="补充说明..."
        />

        {showPlaceholder && (
          <TextField
            fullWidth
            label="占位提示文字"
            value={question.placeholder || ''}
            onChange={(e) => handlePlaceholderChange(e.target.value)}
            size="small"
            placeholder="请输入..."
          />
        )}

        {showMaxRating && (
          <TextField
            fullWidth
            type="number"
            label="最高评分"
            value={question.maxRating || 5}
            onChange={(e) => handleMaxRatingChange(Number(e.target.value))}
            size="small"
            inputProps={{ min: 3, max: 10 }}
          />
        )}

        {showOptions && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              选项
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {question.options?.map((option, optIndex) => (
                <Box
                  key={option.id}
                  sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 24 }}
                  >
                    {String.fromCharCode(65 + optIndex)}.
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeOption(option.id)}
                    disabled={(question.options?.length || 0) <= 2}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  size="small"
                  placeholder="输入新选项..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addOption()}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={addOption}
                  disabled={!newOption.trim()}
                >
                  添加
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={question.required}
              onChange={(e) => handleRequiredChange(e.target.checked)}
            />
          }
          label="必填"
        />
      </Box>
    </Paper>
  );
};

export default QuestionEditor;
