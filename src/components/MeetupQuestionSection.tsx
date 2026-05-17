import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Paper,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import QuestionEditor from './QuestionEditor';
import {
  QuestionConfig,
  QuestionType,
  questionTypeLabels,
  createDefaultQuestion,
  createDefaultOption,
} from '../netlify/types/question';

interface MeetupQuestionSectionProps {
  questionText: string;
  questionType: string;
  questionOptions: string;
  questionRequired: boolean;
  onChange: (data: {
    question_text?: string;
    question_type?: string;
    question_options?: string;
    question_required?: boolean;
  }) => void;
  viewOnly?: boolean;
}

const questionTypeLabelsSimple: Record<string, string> = {
  text: '文本输入',
  single: '单选',
  multiple: '多选',
  rating: '评分',
  date: '日期',
};

const MeetupQuestionSection: React.FC<MeetupQuestionSectionProps> = ({
  questionText,
  questionType,
  questionOptions,
  questionRequired,
  onChange,
  viewOnly = false,
}) => {
  const currentType = (questionType || 'text') as QuestionType;

  const questionConfig: QuestionConfig = useMemo(() => {
    const config = createDefaultQuestion(currentType);
    config.title = questionText || '';
    config.required = questionRequired || false;

    if (currentType === 'text') {
      config.placeholder = '请输入...';
    } else if (questionOptions) {
      const options = questionOptions.split(',').map((opt, idx) => {
        const optTrim = opt.trim();
        return {
          id: `opt_${idx}`,
          text: optTrim,
          label: optTrim,
          value: optTrim,
        };
      });
      config.options =
        options.length > 0
          ? options
          : [createDefaultOption(0), createDefaultOption(1)];
    } else {
      config.options = [createDefaultOption(0), createDefaultOption(1)];
    }

    return config;
  }, [questionText, questionType, questionOptions, questionRequired]);

  const handleQuestionChange = (updated: QuestionConfig) => {
    onChange({
      question_text: updated.title,
      question_type: updated.type,
      question_required: updated.required,
      question_options: updated.options?.map((o) => o.value).join(',') || '',
    });
  };

  return (
    <Box
      sx={{
        mb: 4,
        p: 3,
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
        报名问题（可选）
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        设置报名时需要收集的问题，用于筛选参与者
      </Typography>

      <QuestionEditor
        question={questionConfig}
        onChange={handleQuestionChange}
        index={0}
        showDelete={false}
      />
    </Box>
  );
};

export default MeetupQuestionSection;
