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
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { useGlobalSnackbar } from '../../context/app';
import { meetupsApi } from '../../netlify/services/meetups';
import { Meetup } from '../../netlify/functions/meetup';
import dayjs from 'dayjs';

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
}

const ActivityCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newActivity, setNewActivity] = useState<Activity>({
    id: '',
    title: '',
    description: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '10:00 AM',
    location: '',
    type: 'meeting',
    isRecurring: false,
    recurrenceDay: 1, // 默认周一
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const showSnackbar = useGlobalSnackbar();

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
            type: 'meeting', // 默认为会议类型
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

  // 处理添加活动
  const handleAddActivity = () => {
    if (!newActivity.title || !newActivity.date) {
      setError('请填写活动标题和日期');
      return;
    }

    const activity: Activity = {
      ...newActivity,
      id: Date.now().toString(),
    };

    setActivities([...activities, activity]);
    setShowAddModal(false);
    setNewActivity({
      title: '',
      description: '',
      date: dayjs().format('YYYY-MM-DD'),
      time: '12:00 PM',
      location: '',
      type: 'meeting',
      isRecurring: false,
      recurrenceDay: 1,
    });
    setError(null);
  };

  // 获取活动类型的显示信息
  const getActivityTypeInfo = (type: Activity['type']) => {
    const typeMap = {
      meeting: { label: '会议', color: 'primary' },
      workshop: { label: '工作坊', color: 'secondary' },
      social: { label: '社交', color: 'success' },
      other: { label: '其他', color: 'info' },
    };
    return typeMap[type];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
                      const { day, selected, isDayOutsideMonth, ...other } =
                        props;
                      if (!day) return null;

                      try {
                        // 检查是否是当月日期且不是空白位置
                        if (isDayOutsideMonth) {
                          return <PickersDay {...props} />;
                        }

                        const dateStr = day.format('YYYY-MM-DD');
                        const hasActivity = activities.some(
                          (activity) => activity.date === dateStr
                        );

                        return (
                          <PickersDay
                            sx={{ position: 'relative' }}
                            {...other}
                            day={day}
                            selected={selected}
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
                                  backgroundColor: selected
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
                  const typeInfo = getActivityTypeInfo(activity.type);
                  return (
                    <Card key={activity.id} sx={{ mb: 2, borderRadius: 1 }}>
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1,
                            flexWrap: 'wrap',
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{ flex: 1 }}
                          >
                            {activity.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={typeInfo.label}
                              color={typeInfo.color as any}
                              size="small"
                            />
                            {activity.isRecurring && (
                              <Chip
                                label="每周固定"
                                color="info"
                                size="small"
                              />
                            )}
                          </Box>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {activity.time} • {activity.location}
                        </Typography>
                        <Typography variant="body2">
                          {activity.description}
                        </Typography>
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加新活动</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="活动标题"
            value={newActivity.title}
            onChange={(e) =>
              setNewActivity({ ...newActivity, title: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="活动描述"
            multiline
            rows={3}
            value={newActivity.description}
            onChange={(e) =>
              setNewActivity({ ...newActivity, description: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="日期"
            type="date"
            value={newActivity.date}
            onChange={(e) =>
              setNewActivity({ ...newActivity, date: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="时间"
            type="time"
            value={newActivity.time}
            onChange={(e) =>
              setNewActivity({ ...newActivity, time: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="地点"
            value={newActivity.location}
            onChange={(e) =>
              setNewActivity({ ...newActivity, location: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>活动类型</InputLabel>
            <Select
              value={newActivity.type}
              label="活动类型"
              onChange={(e) =>
                setNewActivity({
                  ...newActivity,
                  type: e.target.value as Activity['type'],
                })
              }
            >
              <MenuItem value="meeting">会议</MenuItem>
              <MenuItem value="workshop">工作坊</MenuItem>
              <MenuItem value="social">社交</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={newActivity.isRecurring}
                onChange={(e) =>
                  setNewActivity({
                    ...newActivity,
                    isRecurring: e.target.checked,
                  })
                }
                name="isRecurring"
              />
            }
            label="每周固定活动"
            sx={{ mb: 2 }}
          />

          {newActivity.isRecurring && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>每周几</InputLabel>
              <Select
                value={newActivity.recurrenceDay}
                label="每周几"
                onChange={(e) =>
                  setNewActivity({
                    ...newActivity,
                    recurrenceDay: e.target.value as number,
                  })
                }
              >
                <MenuItem value={0}>周日</MenuItem>
                <MenuItem value={1}>周一</MenuItem>
                <MenuItem value={2}>周二</MenuItem>
                <MenuItem value={3}>周三</MenuItem>
                <MenuItem value={4}>周四</MenuItem>
                <MenuItem value={5}>周五</MenuItem>
                <MenuItem value={6}>周六</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddActivity}>
            添加
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActivityCalendar;
