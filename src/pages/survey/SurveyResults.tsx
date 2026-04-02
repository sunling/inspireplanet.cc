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
import { useNavigate, useParams } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import surveyApi from '../../netlify/services/survey';
import { Survey } from '../../netlify/types/survey';
import Loading from '../../components/Loading';
import ErrorCard from '../../components/ErrorCard';
import { formatDateTime } from '../../utils/date';

// 颜色配置
const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
];

const SurveyResults: React.FC = () => {
  const navigate = useNavigate();
  const { id: surveyId } = useParams<{ id: string }>();

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

    // 准备图表数据
    const pieData = question.options
      ?.map((option: any, index: number) => ({
        name: option.label,
        value: optionCounts[option.value] || 0,
        fill: COLORS[index % COLORS.length],
      }))
      .filter((item: any) => item.value > 0);

    const barData = question.options
      ?.map((option: any) => ({
        name: option.label,
        count: optionCounts[option.value] || 0,
      }))
      .filter((item: any) => item.count > 0);

    const dateData = Object.entries(optionCounts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, count]) => ({
        date,
        count,
      }));

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
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  {pieData && pieData.length > 0 && (
                    <Box sx={{ height: 300, mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        选项分布 (饼图)
                      </Typography>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${((percent || 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            dataKey="value"
                          />
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  {barData && barData.length > 0 && (
                    <Box sx={{ height: 300, mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        选项分布 (柱状图)
                      </Typography>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={barData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    详细数据
                  </Typography>
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
                          <Typography variant="body2">
                            {option.label}
                          </Typography>
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
                </Grid>
              </Grid>
            </Box>
          ) : question.type === 'rating' ? (
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}
              >
                <Typography variant="body2">平均分:</Typography>
                <Rating value={averageRating || 0} precision={0.1} readOnly />
                <Typography variant="body2" color="text.secondary">
                  {averageRating.toFixed(2)}
                </Typography>
              </Box>

              {/* 评分分布柱状图 */}
              <Box sx={{ height: 300, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  评分分布
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(optionCounts).map(
                      ([score, count]) => ({
                        score,
                        count: parseInt(count.toString()),
                      })
                    )}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="score" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
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
            <Box>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ height: 300, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      日期分布 (折线图)
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dateData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ height: 300, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      日期分布 (柱状图)
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dateData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    详细数据
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>日期</TableCell>
                          <TableCell align="right">数量</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dateData.map((item) => (
                          <TableRow key={item.date}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
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
