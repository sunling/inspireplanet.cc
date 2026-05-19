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
import { SurveyQuestion } from '../netlify/types/survey';
import {
  convertFromMeetupType,
  convertToMeetupType,
  createQuestionFromMeetup,
  convertQuestionToMeetup,
} from '../utils/questionType';

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
  const questionConfig: SurveyQuestion = useMemo(() => {
    if (!questionText) {
      // 如果没有问题文本，创建一个默认的文本题
      return {
        id: `q_${Date.now()}`,
        type: 'text',
        title: '',
        description: '',
        required: false,
        placeholder: '请输入...',
        sortOrder: 0,
      };
    }
    return createQuestionFromMeetup(
      questionText,
      questionType,
      questionOptions,
      questionRequired
    );
  }, [questionText, questionType, questionOptions, questionRequired]);

  const handleQuestionsChange = (updatedQuestions: SurveyQuestion[]) => {
    const updated = updatedQuestions[0];
    if (updated) {
      onChange(convertQuestionToMeetup(updated));
    }
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
        questions={[questionConfig]}
        onChange={handleQuestionsChange}
      />
    </Box>
  );
};

export default MeetupQuestionSection;
