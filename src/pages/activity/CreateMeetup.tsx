import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Card,
  CardContent,
  Grid,
  MenuItem,
} from '@mui/material';
import useResponsive from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';
import { api } from '@/netlify/configs';

interface MeetupData {
  title: string;
  description: string;
  type: string;
  datetime: string;
  location: string;
  duration: string;
  maxParticipants: string;
  organizer: string;
  contact: string;
  qrImageUrl: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

// 格式化日期时间为datetime-local格式
const formatDateTimeLocal = (date: Date): string => {
  const [year, month, day, hours, minutes] = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ];
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// 从localStorage获取用户信息
const getCurrentUser = () => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    console.error('解析用户信息失败:', error);
    return null;
  }
};

// 快捷日期时间配置
const quickTimeOptions = {
  tomorrow: { label: '明天 19:00', config: { days: 1, hours: 19 } },
  'next-week': {
    label: '下周六 14:00',
    config: {
      days: (now: { getDay: () => number }) => (6 - now.getDay() + 7) % 7 || 7,
      hours: 14,
    },
  },
  'next-sunday': {
    label: '下周日 10:00',
    config: {
      days: (now: { getDay: () => number }) => (7 - now.getDay()) % 7 || 7,
      hours: 10,
    },
  },
  weekend: {
    label: '本周末 19:00',
    config: {
      days: (now: { getDay: () => number }) =>
        now.getDay() === 0 ? 6 : now.getDay() === 6 ? 7 : 6 - now.getDay(),
      hours: 19,
    },
  },
};

const CreateMeetup: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // 初始化默认日期
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  // 使用React状态管理表单数据
  const [formValues, setFormValues] = useState<MeetupData>({
    title: '',
    description: '',
    type: '',
    datetime: formatDateTimeLocal(tomorrow),
    location: '',
    duration: '',
    maxParticipants: '',
    organizer: getCurrentUser()?.name || '',
    contact: '',
    qrImageUrl: '',
  });

  // 表单验证函数
  const validateForm = (values: MeetupData): FormErrors => {
    const newErrors: FormErrors = {};

    // 必填字段验证
    if (!values.title.trim()) newErrors.title = '此字段为必填项';
    if (!values.description.trim()) newErrors.description = '此字段为必填项';
    if (!values.type) newErrors.type = '此字段为必填项';
    if (!values.datetime) newErrors.datetime = '此字段为必填项';
    if (!values.organizer.trim()) newErrors.organizer = '此字段为必填项';
    if (!values.contact.trim()) newErrors.contact = '此字段为必填项';
    if (!values.qrImageUrl) newErrors.qrImageUrl = '请上传活动群二维码';

    // 日期时间验证
    if (values.datetime && new Date(values.datetime) <= new Date()) {
      newErrors.datetime = '活动时间必须是未来时间';
    }
    setErrors(newErrors);

    return newErrors;
  };

  // 处理表单提交
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 验证表单
    const validationErrors = validateForm(formValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitLoading(true);
    try {
      // 上传二维码图片
      const qrImageUrl = await uploadQRImage(formValues.qrImageUrl);
      if (!qrImageUrl) return;

      // 准备活动数据
      const localDateTime = new Date(formValues.datetime);
      const user = getCurrentUser();

      const submitData = {
        ...formValues,
        datetime: localDateTime.toISOString(),
        duration: formValues.duration ? parseFloat(formValues.duration) : null,
        maxParticipants: formValues.maxParticipants
          ? parseInt(formValues.maxParticipants)
          : null,
        qrImageUrl,
        createdBy: user?.username || user?.email || null,
      };

      // 提交活动数据
      const response = await api.meetups.create(submitData as any);

      if (!response.success) {
        showSnackbar.error(response.error || '发布失败');
        return;
      }

      showSnackbar.success('活动发布成功！');
      setTimeout(() => navigate('/meetups'), 3000);
    } catch (error) {
      showSnackbar.error(
        '发布失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // 所有表单字段的处理逻辑现在已在FormField组件内部使用useCallback实现，确保函数引用稳定并优化中文输入法支持

  // 处理快捷日期时间选择
  const handleQuickDateTimeSelect = (type: string) => {
    const now = new Date();
    const result = new Date();
    const option = quickTimeOptions[type as keyof typeof quickTimeOptions];

    if (option) {
      const days =
        typeof option.config.days === 'function'
          ? option.config.days(now)
          : option.config.days;

      result.setDate(now.getDate() + days);
      result.setHours(option.config.hours, 0, 0, 0);

      setFormValues((prev) => ({
        ...prev,
        datetime: formatDateTimeLocal(result),
      }));

      // 清除datetime字段的错误
      if (errors.datetime) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.datetime;
          return newErrors;
        });
      }
    }
  };

  // 检查当前选中的日期时间是否匹配某个快捷选项
  const isQuickDateTimeActive = (type: string): boolean => {
    const now = new Date();
    const result = new Date();
    const option = quickTimeOptions[type as keyof typeof quickTimeOptions];

    if (option) {
      const days =
        typeof option.config.days === 'function'
          ? option.config.days(now)
          : option.config.days;

      result.setDate(now.getDate() + days);
      result.setHours(option.config.hours, 0, 0, 0);
      return formValues.datetime === formatDateTimeLocal(result);
    }
    return false;
  };

  // 处理二维码文件
  const handleQRFile = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        qrImageUrl: '请上传图片文件',
      }));
      showSnackbar.error('请上传图片文件');

      return;
    }

    // 验证文件大小
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        qrImageUrl: '图片大小不能超过5MB',
      }));

      showSnackbar.error('图片大小不能超过5MB');

      return;
    }

    // 读取文件并设置预览
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Image = e.target.result as string;
        setQrPreview(base64Image);
        setFormValues((prev) => ({
          ...prev,
          qrImageUrl: base64Image,
        }));
        // 清除错误
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.qrImageUrl;
          return newErrors;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // 上传二维码图片
  const uploadQRImage = async (base64Image: string): Promise<string> => {
    try {
      const response = await api.images.upload(base64Image);
      console.log('上传二维码返回：response', response);
      if (!response.success) {
        showSnackbar.error('上传二维码失败');
        return '';
      }
      return response.data?.url || '';
    } catch (error) {
      console.error('上传二维码失败:', error);
      showSnackbar.error(
        error instanceof Error ? error.message : '上传二维码失败'
      );
      return '';
    }
  };

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          maxWidth: 800,
          mx: 'auto',
          bgcolor: 'white',
          p: 4,
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography variant="body1" color="text.secondary" paragraph>
          快速创建活动，连接志同道合的朋友
        </Typography>

        <form>
          {/* 基本信息 */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
              基本信息
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                活动标题
              </Typography>
              <TextField
                fullWidth
                id="title"
                name="title"
                type="text"
                value={formValues.title}
                helperText={errors['title']}
                error={!!errors['title']}
                onChange={handleInputChange}
                required
                placeholder="输入活动标题"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                活动描述
              </Typography>
              <TextField
                fullWidth
                id="description"
                name="description"
                type="text"
                value={formValues.description}
                onChange={handleInputChange}
                error={!!errors['description']}
                helperText={errors['description']}
                required
                placeholder="详细描述活动内容、目标和亮点"
                multiline
                minRows={4}
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                活动类型
              </Typography>
              <TextField
                fullWidth
                id="type"
                name="type"
                value={formValues.type}
                onChange={handleInputChange}
                error={!!errors['type']}
                helperText={errors['type']}
                required
                select
                size={isMobile ? 'small' : 'medium'}
              >
                <MenuItem key="empty" value="">
                  选择活动类型
                </MenuItem>
                <MenuItem key="online" value="online">
                  线上活动
                </MenuItem>
                <MenuItem key="offline" value="offline">
                  线下活动
                </MenuItem>
                <MenuItem key="hybrid" value="hybrid">
                  线上线下结合
                </MenuItem>
              </TextField>
            </Box>
          </Box>

          {/* 时间地点 */}
          <Card
            sx={{ mb: 4, boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                时间地点
              </Typography>
            </Box>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                  活动时间
                </Typography>
                <TextField
                  fullWidth
                  id="datetime"
                  name="datetime"
                  type="datetime-local"
                  error={!!errors['datetime']}
                  helperText={errors['datetime']}
                  value={formValues.datetime}
                  onChange={handleInputChange}
                  required
                  size={isMobile ? 'small' : 'medium'}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  快捷选择：
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(quickTimeOptions).map(([type, option]) => (
                    <Button
                      key={type}
                      variant={
                        isQuickDateTimeActive(type) ? 'contained' : 'outlined'
                      }
                      size="small"
                      onClick={() => handleQuickDateTimeSelect(type)}
                      sx={{
                        minWidth: isMobile ? 'auto' : '120px',
                        backgroundColor: isQuickDateTimeActive(type)
                          ? 'blue'
                          : 'transparent',
                        borderColor: 'blue',
                        color: isQuickDateTimeActive(type) ? 'white' : 'blue',
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                      活动地点
                    </Typography>
                    <TextField
                      fullWidth
                      id="location"
                      name="location"
                      type="text"
                      error={!!errors['location']}
                      helperText={errors['location']}
                      value={formValues.location}
                      onChange={handleInputChange}
                      placeholder="线下活动请填写具体地址，线上活动可填写平台名称"
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                      活动时长（小时）
                    </Typography>
                    <TextField
                      fullWidth
                      id="duration"
                      name="duration"
                      type="number"
                      value={formValues.duration}
                      onChange={handleInputChange}
                      placeholder="例如：2"
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                  最大参与人数
                </Typography>
                <TextField
                  fullWidth
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  value={formValues.maxParticipants}
                  onChange={handleInputChange}
                  placeholder="不限制可留空"
                  size={isMobile ? 'small' : 'medium'}
                />
              </Box>
            </CardContent>
          </Card>

          {/* 联系方式 */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
              联系方式
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                组织者姓名
              </Typography>
              <TextField
                fullWidth
                id="organizer"
                name="organizer"
                type="text"
                error={!!errors['organizer']}
                helperText={errors['organizer']}
                value={formValues.organizer}
                onChange={handleInputChange}
                required
                placeholder="您的姓名"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                微信号
              </Typography>
              <TextField
                fullWidth
                id="contact"
                name="contact"
                type="text"
                error={!!errors['contact']}
                helperText={errors['contact']}
                value={formValues.contact}
                onChange={handleInputChange}
                required
                placeholder="请输入微信号"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                活动群二维码
              </Typography>
              <Box
                className={`qr-upload ${dragover ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragover(true);
                }}
                onDragLeave={() => setDragover(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragover(false);
                  if (e.dataTransfer.files.length > 0)
                    handleQRFile(e.dataTransfer.files[0]);
                }}
                sx={{
                  border: !!errors['qrImageUrl']
                    ? '2px dashed #d32f2f'
                    : '2px dashed #ddd',
                  borderRadius: 1,
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragover
                    ? 'rgba(255, 127, 80, 0.05)'
                    : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 127, 80, 0.05)',
                  },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleQRFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                {qrPreview ? (
                  <Box
                    component="img"
                    src={qrPreview}
                    alt="二维码预览"
                    sx={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      margin: '0 auto',
                      borderRadius: 1,
                    }}
                  />
                ) : (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      请点击上传群二维码
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      支持拖拽上传，JPG/PNG格式
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={submitLoading}
            onClick={handleSubmit}
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(255, 127, 80, 0.3)',
              '&:disabled': {
                bgcolor: '#ccc',
                boxShadow: 'none',
              },
            }}
          >
            {submitLoading ? '发布中...' : '🚀 发布活动'}
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default CreateMeetup;
