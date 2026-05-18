import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Add as PlusIcon, Link as LinkIcon } from '@mui/icons-material';
import { surveyApi } from '../netlify/config';
import { Survey } from '../netlify/types/survey';
import { useGlobalSnackbar } from '../context/app';

interface SurveySelectorProps {
  surveyId: string | undefined;
  onChange: (surveyId: string | undefined) => void;
  viewOnly?: boolean;
  activityTitle?: string;
}

const SurveySelector: React.FC<SurveySelectorProps> = ({
  surveyId,
  onChange,
  viewOnly = false,
  activityTitle,
}) => {
  const showSnackbar = useGlobalSnackbar();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [currentSurveyData, setCurrentSurveyData] = useState<Survey | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  // 当 surveyId 变化时，如果不在列表中，单独获取问卷信息
  useEffect(() => {
    if (surveyId && !surveys.find((s) => s.id === surveyId)) {
      loadCurrentSurvey();
    } else {
      setCurrentSurveyData(null);
    }
  }, [surveyId, surveys]);

  const loadSurveys = async () => {
    setIsLoading(true);
    try {
      const response = await surveyApi.getAll();
      if (response.success && response.data) {
        setSurveys(response.data.records || []);
      }
    } catch (error) {
      showSnackbar.error('加载问卷列表失败');
      console.error('Load surveys error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentSurvey = async () => {
    if (!surveyId) return;
    try {
      const response = await surveyApi.getById(surveyId);
      if (response.success && response.data) {
        setCurrentSurveyData(response.data);
      }
    } catch (error) {
      console.error('Load current survey error:', error);
      setCurrentSurveyData(null);
    }
  };

  const handleSurveyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string;
    onChange(value || undefined);
  };

  // 创建活动附属问卷
  const handleCreateMeetupSurvey = async () => {
    if (!activityTitle) {
      showSnackbar.error('请先填写活动名称');
      return;
    }

    setIsCreatingSurvey(true);
    try {
      const surveyTitle = `【活动附属问卷】${activityTitle}`;
      const response = await surveyApi.create({
        title: surveyTitle,
        description: `活动「${activityTitle}」的报名问卷`,
        questions: [],
        isActive: true,
        allowMultipleSubmissions: false,
        is_for_meetup: true,
      });

      if (response.success && response.data) {
        showSnackbar.success('问卷创建成功');
        onChange(response.data.id);
        loadSurveys();
      } else {
        showSnackbar.error('问卷创建失败');
      }
    } catch (error) {
      showSnackbar.error('问卷创建失败');
      console.error('Create meetup survey error:', error);
    } finally {
      setIsCreatingSurvey(false);
    }
  };

  // 当前问卷：优先从列表中找，找不到则用单独获取的
  const currentSurvey =
    surveys.find((s) => s.id === surveyId) || currentSurveyData;

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
        关联调查问卷（可选）
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        选择一个问卷作为报名问题，参与者报名时需要填写问卷
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="survey-select-label">选择问卷</InputLabel>
          <Select
            labelId="survey-select-label"
            id="survey-select"
            value={surveyId || ''}
            onChange={handleSurveyChange}
            disabled={viewOnly}
            placeholder="选择问卷"
          >
            <MenuItem value="">
              <em>不关联问卷</em>
            </MenuItem>
            {surveys.map((survey) => (
              <MenuItem key={survey.id} value={survey.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinkIcon sx={{ fontSize: '1rem' }} />
                  <span>{survey.title}</span>
                  {survey.isActive ? (
                    <Chip
                      label="启用"
                      size="small"
                      color="success"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  ) : (
                    <Chip
                      label="禁用"
                      size="small"
                      color="default"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {currentSurvey && (
        <Box
          sx={{
            p: 2,
            bgcolor: '#f4f6f8',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight="600">
            已关联问卷: {currentSurvey.title}
          </Typography>
          {currentSurvey.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {currentSurvey.description}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            问题数量: {currentSurvey.questions.length} | 状态:{' '}
            {currentSurvey.isActive ? '启用' : '禁用'}
          </Typography>
        </Box>
      )}

      {!viewOnly && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PlusIcon />}
            onClick={handleCreateMeetupSurvey}
            disabled={isCreatingSurvey || !activityTitle}
            sx={{ textTransform: 'none' }}
          >
            {isCreatingSurvey ? '创建中...' : '创建活动附属问卷'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlusIcon />}
            onClick={() => {
              // 跳转到创建问卷页面，创建完成后可以关联到活动
              window.open('/survey-edit', '_blank');
            }}
            sx={{ textTransform: 'none' }}
          >
            从现有问卷选择
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SurveySelector;
