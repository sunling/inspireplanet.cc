import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
  Divider,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { surveyApi } from '../../netlify/config';
import { Survey } from '../../netlify/types/survey';
import Loading from '../../components/Loading';
import ErrorCard from '../../components/ErrorCard';
import { formatDateTime } from '../../utils/date';

const SurveyResults: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('id');

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      setError('缺少问卷ID');
      setLoading(false);
      return;
    }

    fetchData();
  }, [surveyId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const surveyRes = await surveyApi.getById(surveyId!);

      if (surveyRes.success && surveyRes.data) {
        setSurvey(surveyRes.data);
      } else {
        setError(surveyRes.error || '加载问卷失败');
      }

      const submissionsRes = await surveyApi.getSubmissions({
        surveyId: surveyId!,
      });
      if (submissionsRes.success && submissionsRes.data) {
        setSubmissions(submissionsRes.data.records || []);
      }
    } catch (err) {
      setError('加载数据时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestionStats = (question: any, index: number) => {
    // 计算该问题的回答数
    const totalResponses = submissions.filter((submission) =>
      submission.answers.some(
        (answer: any) => answer.questionId === question.id
      )
    ).length;

    // 计算选项分布
    const optionCounts: Record<string, number> = {};
    submissions.forEach((submission) => {
      const answer = submission.answers.find(
        (a: any) => a.questionId === question.id
      );
      if (answer) {
        if (Array.isArray(answer.value)) {
          // 多选题
          answer.value.forEach((value: string) => {
            optionCounts[value] = (optionCounts[value] || 0) + 1;
          });
        } else if (
          answer.value !== undefined &&
          answer.value !== null &&
          answer.value !== ''
        ) {
          // 单选题、评分题、日期题
          optionCounts[answer.value] = (optionCounts[answer.value] || 0) + 1;
        }
      }
    });

    // 计算平均分（仅评分题）
    let averageRating = 0;
    if (question.type === 'rating') {
      let totalScore = 0;
      let scoreCount = 0;
      submissions.forEach((submission) => {
        const answer = submission.answers.find(
          (a: any) => a.questionId === question.id
        );
        if (answer && typeof answer.value === 'number') {
          totalScore += answer.value;
          scoreCount++;
        }
      });
      if (scoreCount > 0) {
        averageRating = totalScore / scoreCount;
      }
    }

    // 获取文本回答
    const textResponses = submissions
      .map((submission) => {
        const answer = submission.answers.find(
          (a: any) => a.questionId === question.id
        );
        return answer && question.type === 'text' ? answer.value : null;
      })
      .filter((value: any) => value !== null && value !== '');

    return (
      <Card key={question.id} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {index + 1}. {question.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            回答数: {totalResponses}
          </Typography>

          {question.type === 'single' || question.type === 'multiple' ? (
            <Box>
              {question.options?.map((option: any) => {
                const count = optionCounts[option.value] || 0;
                const percentage =
                  totalResponses > 0 ? (count / totalResponses) * 100 : 0;

                return (
                  <Box key={option.id} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">{option.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                );
              })}
            </Box>
          ) : question.type === 'rating' ? (
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
              >
                <Typography variant="body2">平均分:</Typography>
                <Rating value={averageRating || 0} precision={0.1} readOnly />
                <Typography variant="body2" color="text.secondary">
                  {averageRating.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          ) : question.type === 'text' ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>回答内容</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {textResponses.slice(0, 20).map((response: any, i) => (
                    <TableRow key={i}>
                      <TableCell>{response}</TableCell>
                    </TableRow>
                  ))}
                  {textResponses.length > 20 && (
                    <TableRow>
                      <TableCell colSpan={1} align="center">
                        <Typography variant="body2" color="text.secondary">
                          还有 {textResponses.length - 20} 条回答...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : question.type === 'date' ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>日期</TableCell>
                    <TableCell align="right">数量</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(optionCounts)
                    .sort(
                      ([a], [b]) =>
                        new Date(a).getTime() - new Date(b).getTime()
                    )
                    .map(([date, count]) => (
                      <TableRow key={date}>
                        <TableCell>{date}</TableCell>
                        <TableCell align="right">{count}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <Loading message="加载统计结果..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => navigate('/surveys')} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 4, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {survey?.title} - 统计结果
          </Typography>
          {survey?.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {survey.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`总提交数: ${submissions.length}`} color="primary" />
            <Chip
              label={`问题数: ${survey?.questions.length || 0}`}
              variant="outlined"
            />
            <Chip
              label={`创建时间: ${survey ? formatDateTime(survey.createdAt) : '-'}`}
              variant="outlined"
            />
          </Box>
        </Paper>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          问题统计
        </Typography>

        {survey?.questions.map((question, index) =>
          renderQuestionStats(question, index)
        )}
      </Container>
    </Box>
  );
};

export default SurveyResults;
