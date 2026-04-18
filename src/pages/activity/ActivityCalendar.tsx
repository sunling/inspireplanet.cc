import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { useNavigate } from 'react-router-dom';
import { useGlobalSnackbar } from '../../context/app';
import { meetupsApi } from '../../netlify/services/meetups';
import { Meetup, MeetupMode } from '../../netlify/functions/meetup';
import dayjs from 'dayjs';
import EditForm, { formatDateTimeLocal } from './components/EditForm';
import { getUserName } from '../../utils/user';

// 活动类型定义
interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'meeting' | 'workshop' | 'social' | 'other';
  isRecurring?: boolean;
  recurrenceDay?: number; // 0-6，0表示周日，1表示周一，以此类推
  episodeStartDate?: string; // YYYY-MM-DD, date of EP1
}

function getEpisodeNumber(episodeStartDate: string, targetDate: dayjs.Dayjs): number {
  const start = dayjs(episodeStartDate).startOf('day');
  const target = targetDate.startOf('day');
  const diffWeeks = Math.round(target.diff(start, 'day') / 7);
  return diffWeeks + 1;
}

const ActivityCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showSnackbar = useGlobalSnackbar();

  // 初始化默认日期
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  // 初始表单值
  const initialValues: Meetup = {
    title: '',
    description: '',
    mode: MeetupMode.ONLINE,
    datetime: formatDateTimeLocal(tomorrow),
    location: '',
    duration: '',
    max_ppl: null,
    creator: getUserName() || '',
    wechat_id: '',
    cover: '',
  };

  // 从API加载活动数据
  const loadActivities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 获取所有活动，包括过去的
      const response = await meetupsApi.getAll({ status: 'all' });
      if (!response.success) {
        showSnackbar.error('查询活动列表失败');
        return;
      }

      const meetups = response.data?.meetups || [];
      // 过滤掉已取消的活动
      const activeMeetups = meetups.filter(
        (meetup: Meetup) => meetup.status !== 'cancelled'
      );
      // 转换Meetup数据为Activity格式
      const convertedActivities: Activity[] = activeMeetups.map(
        (meetup: Meetup) => {
          const meetupDate = dayjs(meetup.datetime);
          return {
            id: meetup.id || '',
            title: meetup.title,
            description: meetup.description,
            date: meetupDate.format('YYYY-MM-DD'),
            time: meetupDate.format('HH:mm'),
            location: meetup.location || '',
            type: 'meeting',
            isRecurring: meetup.is_recurring || false,
            recurrenceDay: meetup.recurrence_day,
            episodeStartDate: meetup.episode_start_date,
          };
        }
      );

      setActivities(convertedActivities);
    } catch (err) {
      setError('加载活动失败，请稍后再试');
      showSnackbar.error('加载活动失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载活动数据
  useEffect(() => {
    loadActivities();
  }, []);

  // 过滤选中日期的活动
  useEffect(() => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const selectedDayOfWeek = selectedDate.day(); // 0-6，0表示周日，1表示周一，以此类推

    const filtered = activities.filter((activity) => {
      // 匹配日期的活动（包括过去的活动）
      if (activity.date === dateStr) {
        return true;
      }
      // 匹配每周固定活动
      if (
        activity.isRecurring &&
        activity.recurrenceDay === selectedDayOfWeek
      ) {
        return true;
      }
      return false;
    });

    setFilteredActivities(filtered);
  }, [selectedDate, activities]);

  // 处理日期选择
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // 处理活动创建
  const handleCreateActivity = async (data: any) => {
    setSubmitLoading(true);
    try {
      // 提交活动数据
      const response = await meetupsApi.create(data);

      if (!response.success) {
        showSnackbar.error(response.error || '发布失败');
        return;
      }

      showSnackbar.success('活动发布成功！');
      setShowAddModal(false);
      // 重新加载活动数据
      await loadActivities();
    } catch (error) {
      showSnackbar.error(
        '发布失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // 处理活动详情跳转
  const handleActivityClick = (activityId: string, date?: string) => {
    const params = date ? `?id=${activityId}&date=${date}` : `?id=${activityId}`;
    navigate(`/meetup-detail${params}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
      <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          活动日历
        </Typography>

        <Grid container spacing={4}>
          {/* 日历部分 */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateCalendar
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date || dayjs())}
                    slots={{
                      day: (props) => {
                        const { day } = props;
                        if (!day) return null;

                        try {
                          // 检查是否是当月日期且不是空白位置
                          if (props.outsideCurrentMonth) {
                            return <PickersDay {...props} />;
                          }

                          const dateStr = day.format('YYYY-MM-DD');
                          const dayOfWeek = day.day();
                          const hasActivity = activities.some(
                            (activity) =>
                              activity.date === dateStr ||
                              (activity.isRecurring && activity.recurrenceDay === dayOfWeek)
                          );

                          return (
                            <PickersDay
                              sx={{ position: 'relative' }}
                              {...props}
                            >
                              {day.date()}
                              {hasActivity && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: '80%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    backgroundColor: props.selected
                                      ? 'white'
                                      : 'primary.main',
                                  }}
                                />
                              )}
                            </PickersDay>
                          );
                        } catch (error) {
                          // 如果日期对象有问题，返回默认的PickersDay
                          return <PickersDay {...props} />;
                        }
                      },
                    }}
                    sx={{
                      '& .MuiDateCalendar-root': {
                        width: '100%',
                      },
                      '& .MuiPickersDay-root': {
                        height: 40,
                        width: 40,
                        fontSize: '0.875rem',
                      },
                      '& .MuiPickersDay-today': {
                        backgroundColor: 'primary.light',
                      },
                      '& .Mui-selected': {
                        backgroundColor: 'primary.main',
                      },
                    }}
                  />
                </LocalizationProvider>
              )}
            </Paper>
          </Grid>

          {/* 活动列表部分 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Typography variant="h6">
                  {selectedDate.format('YYYY年MM月DD日')} 活动
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setShowAddModal(true)}
                >
                  添加活动
                </Button>
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredActivities.length === 0 ? (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ textAlign: 'center', py: 4 }}
                >
                  该日期暂无活动
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {filteredActivities.map((activity) => {
                    return (
                      <Card
                        key={activity.id}
                        sx={{
                          mb: 2,
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s ease',
                          },
                        }}
                        onClick={() => handleActivityClick(activity.id, activity.isRecurring ? selectedDate.format('YYYY-MM-DD') : undefined)}
                      >
                        <CardContent sx={{ position: 'relative' }}>
                          {/* 标题 + 期数 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" component="div">
                              {activity.title}
                            </Typography>
                            {activity.isRecurring && activity.episodeStartDate && (() => {
                              const ep = getEpisodeNumber(activity.episodeStartDate, selectedDate);
                              return ep > 0 ? (
                                <Chip label={`EP${ep}`} size="small" color="secondary" variant="outlined" />
                              ) : null;
                            })()}
                          </Box>

                          {/* 时间和地点 */}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            {activity.time} • {activity.location}
                          </Typography>

                          {/* 描述 */}
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {activity.description}
                          </Typography>

                          {/* 查看按钮放在右下角 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 16,
                              right: 16,
                              display: 'flex',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <Tooltip title="查看详情">
                              <Button
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivityClick(activity.id, activity.isRecurring ? selectedDate.format('YYYY-MM-DD') : undefined);
                                }}
                                sx={{ color: 'primary.main' }}
                              >
                                查看
                              </Button>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* 添加活动对话框 */}
        <Dialog
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>添加新活动</DialogTitle>
          <DialogContent sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <EditForm
              initialValues={initialValues}
              onSubmit={handleCreateActivity}
              submitText="🚀 发布活动"
              isLoading={submitLoading}
            />
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ActivityCalendar;
