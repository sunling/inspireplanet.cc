import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Rating,
  Button,
  CircularProgress,
  LinearProgress,
  FormControl,
  FormLabel,
  FormHelperText,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { surveyApi } from '../../netlify/config';
import {
  Survey,
  SurveyQuestion,
  QuestionAnswer,
} from '../../netlify/types/survey';
import Loading from '../../components/Loading';
import ErrorCard from '../../components/ErrorCard';
import { useGlobalSnackbar } from '../../context/app';
import { getUserId } from '../../utils/user';

const SurveyDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('id');
  const showSnackbar = useGlobalSnackbar();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<
    Record<string, QuestionAnswer['value']>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!surveyId) {
      setError('缺少问卷ID');
      setLoading(false);
      return;
    }

    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await surveyApi.getById(surveyId!);
      if (response.success && response.data) {
        setSurvey(response.data);
        if (!response.data.isActive) {
          setError('该问卷已结束');
        }
      } else {
        setError(response.error || '加载问卷失败');
      }
    } catch (err) {
      setError('加载问卷时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (
    questionId: string,
    value: QuestionAnswer['value']
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateAnswers = (): boolean => {
    if (!survey) return false;

    const newErrors: Record<string, string> = {};
    survey.questions.forEach((question) => {
      if (question.required) {
        const answer = answers[question.id];
        if (
          answer === undefined ||
          answer === null ||
          answer === '' ||
          (Array.isArray(answer) && answer.length === 0)
        ) {
          newErrors[question.id] = '此题为必答题';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!survey || !validateAnswers()) {
      showSnackbar.error('请完成所有必答题');
      return;
    }

    setSubmitting(true);
    try {
      const respondentId = getUserId();
      if (!respondentId) {
        showSnackbar.error('请先登录后再提交问卷');
        setSubmitting(false);
        return;
      }

      const submitAnswers: QuestionAnswer[] = Object.entries(answers).map(
        ([questionId, value]) => ({ questionId, value })
      );

      const response = await surveyApi.submit({
        surveyId: survey.id,
        answers: submitAnswers,
        respondentId,
      });

      if (response.success) {
        setSubmitted(true);
        showSnackbar.success('提交成功');
      } else {
        showSnackbar.error(response.error || '提交失败');
      }
    } catch (err) {
      showSnackbar.error('提交时发生错误');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: SurveyQuestion, index: number) => {
    const hasError = !!errors[question.id];

    switch (question.type) {
      case 'single':
        return (
          <FormControl
            key={question.id}
            error={hasError}
            sx={{ width: '100%', mb: 3 }}
          >
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
              {index + 1}. {question.title}
              {question.required && (
                <Typography component="span" color="error">
                  {' '}
                  *
                </Typography>
              )}
            </FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {question.description}
              </Typography>
            )}
            <RadioGroup
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              {question.options?.map((option) => (
                <FormControlLabel
                  key={option.id}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {hasError && <FormHelperText>{errors[question.id]}</FormHelperText>}
          </FormControl>
        );

      case 'multiple':
        const selectedValues = (answers[question.id] as string[]) || [];
        return (
          <FormControl
            key={question.id}
            error={hasError}
            sx={{ width: '100%', mb: 3 }}
          >
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
              {index + 1}. {question.title}
              {question.required && (
                <Typography component="span" color="error">
                  {' '}
                  *
                </Typography>
              )}
            </FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {question.description}
              </Typography>
            )}
            <Box>
              {question.options?.map((option) => (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...selectedValues, option.value]
                          : selectedValues.filter((v) => v !== option.value);
                        handleAnswerChange(question.id, newValues);
                      }}
                    />
                  }
                  label={option.label}
                />
              ))}
            </Box>
            {hasError && <FormHelperText>{errors[question.id]}</FormHelperText>}
          </FormControl>
        );

      case 'text':
        return (
          <FormControl
            key={question.id}
            error={hasError}
            sx={{ width: '100%', mb: 3 }}
          >
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
              {index + 1}. {question.title}
              {question.required && (
                <Typography component="span" color="error">
                  {' '}
                  *
                </Typography>
              )}
            </FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {question.description}
              </Typography>
            )}
            <TextField
              multiline
              rows={4}
              placeholder={question.placeholder}
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              error={hasError}
              helperText={hasError ? errors[question.id] : ''}
            />
          </FormControl>
        );

      case 'rating':
        return (
          <FormControl
            key={question.id}
            error={hasError}
            sx={{ width: '100%', mb: 3 }}
          >
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
              {index + 1}. {question.title}
              {question.required && (
                <Typography component="span" color="error">
                  {' '}
                  *
                </Typography>
              )}
            </FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {question.description}
              </Typography>
            )}
            <Rating
              max={question.maxRating || 5}
              value={(answers[question.id] as number) || 0}
              onChange={(_, value) =>
                handleAnswerChange(question.id, value || 0)
              }
            />
            {hasError && <FormHelperText>{errors[question.id]}</FormHelperText>}
          </FormControl>
        );

      case 'date':
        return (
          <FormControl
            key={question.id}
            error={hasError}
            sx={{ width: '100%', mb: 3 }}
          >
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
              {index + 1}. {question.title}
              {question.required && (
                <Typography component="span" color="error">
                  {' '}
                  *
                </Typography>
              )}
            </FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {question.description}
              </Typography>
            )}
            <TextField
              type="date"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              error={hasError}
              helperText={hasError ? errors[question.id] : ''}
              InputLabelProps={{ shrink: true }}
            />
          </FormControl>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <Loading message="加载问卷..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => navigate('/')} />;
  }

  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom color="success.main">
              提交成功
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              感谢您的参与！
            </Typography>
            <Button variant="contained" onClick={() => navigate('/surveys')}>
              返回问卷列表
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const progress = survey
    ? (Object.keys(answers).length / survey.questions.length) * 100
    : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            {survey?.title}
          </Typography>
          {survey?.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {survey.description}
            </Typography>
          )}

          <Box sx={{ mb: 3 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                完成进度
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Box>

          <Box sx={{ mt: 3 }}>
            {survey?.questions.map((question, index) =>
              renderQuestion(question, index)
            )}
          </Box>

          <Box
            sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}
          >
            <Button variant="outlined" onClick={() => navigate('/surveys')}>
              取消
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? '提交中...' : '提交问卷'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SurveyDetail;
