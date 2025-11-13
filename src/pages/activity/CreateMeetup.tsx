import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import useResponsive from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';
import { http } from '@/netlify/configs/http';
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

const CreateMeetup: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [meetupData, setMeetupData] = useState<MeetupData>({
    title: '',
    description: '',
    type: '',
    datetime: '',
    location: '',
    duration: '',
    maxParticipants: '',
    organizer: '',
    contact: '',
    qrImageUrl: '',
  });

  // 初始化表单
  useEffect(() => {
    // 设置默认活动时间为明天19:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);

    setMeetupData((prev) => ({
      ...prev,
      datetime: formatDateTimeLocal(tomorrow),
    }));
    checkUserLoginAndFillOrganizer();
  }, []);

  // 从localStorage获取用户信息
  const checkUserLoginAndFillOrganizer = () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        if (user.name) {
          setMeetupData((prev) => ({ ...prev, organizer: user.name }));
        }
      }
    } catch (error) {
      console.error('解析用户信息失败:', error);
    }
  };

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

  // 处理快捷日期时间选择
  const handleQuickDateTimeSelect = (type: string) => {
    const now = new Date();
    const result = new Date();

    switch (type) {
      case 'tomorrow':
        result.setDate(now.getDate() + 1);
        result.setHours(19, 0, 0, 0);
        break;
      case 'next-week':
        const daysUntilNextSaturday = (6 - now.getDay() + 7) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSaturday);
        result.setHours(14, 0, 0, 0);
        break;
      case 'next-sunday':
        const daysUntilNextSunday = (7 - now.getDay()) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSunday);
        result.setHours(10, 0, 0, 0);
        break;
      case 'weekend':
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0) result.setDate(now.getDate() + 6); // 下周六
        else if (dayOfWeek === 6) result.setDate(now.getDate() + 7); // 下周日
        else result.setDate(now.getDate() + (6 - dayOfWeek)); // 本周六
        result.setHours(19, 0, 0, 0);
        break;
      default:
        return;
    }

    setMeetupData((prev) => ({
      ...prev,
      datetime: formatDateTimeLocal(result),
    }));
  };

  // 检查当前选中的日期时间是否匹配某个快捷选项
  const isQuickDateTimeActive = (type: string): boolean => {
    const now = new Date();
    const result = new Date();

    switch (type) {
      case 'tomorrow':
        result.setDate(now.getDate() + 1);
        result.setHours(19, 0, 0, 0);
        break;
      case 'next-week':
        const daysUntilNextSaturday = (6 - now.getDay() + 7) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSaturday);
        result.setHours(14, 0, 0, 0);
        break;
      case 'next-sunday':
        const daysUntilNextSunday = (7 - now.getDay()) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSunday);
        result.setHours(10, 0, 0, 0);
        break;
      case 'weekend':
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0) result.setDate(now.getDate() + 6);
        else if (dayOfWeek === 6) result.setDate(now.getDate() + 7);
        else result.setDate(now.getDate() + (6 - dayOfWeek));
        result.setHours(19, 0, 0, 0);
        break;
      default:
        return false;
    }

    return meetupData.datetime === formatDateTimeLocal(result);
  };

  // 处理表单输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setMeetupData((prev) => ({ ...prev, [name]: value }));

    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 处理二维码文件
  const handleQRFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, qr: '请上传图片文件' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, qr: '图片大小不能超过5MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Image = e.target.result as string;
        setQrPreview(base64Image);
        setMeetupData((prev) => ({ ...prev, qrImageUrl: base64Image }));

        // 清除错误信息
        if (errors.qr) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.qr;
            return newErrors;
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const {
      title,
      description,
      type,
      datetime,
      organizer,
      contact,
      qrImageUrl,
    } = meetupData;

    // 验证必填字段
    if (!title.trim()) newErrors.title = '此字段为必填项';
    if (!description.trim()) newErrors.description = '此字段为必填项';
    if (!type) newErrors.type = '此字段为必填项';
    if (!datetime) newErrors.datetime = '此字段为必填项';
    if (!organizer.trim()) newErrors.organizer = '此字段为必填项';
    if (!contact.trim()) newErrors.contact = '此字段为必填项';
    if (!qrImageUrl) newErrors.qr = '请上传活动群二维码';

    // 验证日期时间不能是过去
    if (datetime && new Date(datetime) <= new Date()) {
      newErrors.datetime = '活动时间必须是未来时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 上传二维码图片
  const uploadQRImage = async (base64Image: string): Promise<string> => {
    try {
      const response = await api.images.upload(base64Image);

      if (!response.success) {
        showSnackbar.error(response.error || '上传二维码失败');
        return '';
      }

      return response.data?.imageUrl || '';
    } catch (error) {
      console.error('上传二维码失败:', error);
      showSnackbar.error(
        error instanceof Error ? error.message : '上传二维码失败'
      );
      return '';
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitLoading(true);

    try {
      // 上传二维码图片
      const qrImageUrl = await uploadQRImage(meetupData.qrImageUrl);

      // 准备活动数据
      const localDateTime = new Date(meetupData.datetime);
      const userInfo = localStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;

      const submitData = {
        ...meetupData,
        datetime: localDateTime.toISOString(),
        duration: meetupData.duration ? parseFloat(meetupData.duration) : null,
        maxParticipants: meetupData.maxParticipants
          ? parseInt(meetupData.maxParticipants)
          : null,
        qrImageUrl,
        createdBy: user?.username || user?.email || null,
      };

      // 提交活动数据
      const response = await http.post(
        '/.netlify/functions/meetupHandler',
        submitData
      );

      if (response.success) {
        showSnackbar.success('活动发布成功！');

        // 重置表单并跳转
        setTimeout(() => {
          navigate('/meetups');
        }, 3000);
      } else {
        throw new Error(response.error || '发布失败');
      }
    } catch (error) {
      showSnackbar.error(
        '发布失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // 表单字段组件
  const FormField = ({
    name,
    label,
    type = 'text',
    required = false,
    placeholder = '',
    multiline = false,
    select = false,
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <TextField
        fullWidth
        id={name}
        name={name}
        type={type}
        value={meetupData[name]}
        onChange={handleInputChange}
        required={required}
        placeholder={placeholder}
        multiline={multiline}
        minRows={multiline ? 4 : 1}
        error={!!errors[name]}
        helperText={errors[name]}
        select={select}
        size={isMobile ? 'small' : 'medium'}
        SelectProps={
          select
            ? {
                native: true,
              }
            : undefined
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#ff7f50',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ff7f50',
              boxShadow: '0 0 0 3px rgba(255, 127, 80, 0.1)',
            },
          },
        }}
      >
        {select && (
          <>
            <option value="">选择活动类型</option>
            <option value="online">线上活动</option>
            <option value="offline">线下活动</option>
            <option value="hybrid">线上线下结合</option>
          </>
        )}
      </TextField>
    </Box>
  );

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

        <form onSubmit={handleSubmit}>
          {/* 基本信息 */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#f8f9fa',
              borderRadius: 1,
              borderLeft: '4px solid #ff7f50',
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
              基本信息
            </Typography>
            <FormField
              name="title"
              label="活动标题"
              required
              placeholder="输入活动标题"
            />
            <FormField
              name="description"
              label="活动描述"
              required
              placeholder="详细描述活动内容、目标和亮点"
              multiline
            />
            <FormField name="type" label="活动类型" required select />
          </Box>

          {/* 时间地点 */}
          <Card
            sx={{ mb: 4, boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}
          >
            <Box sx={{ bgcolor: '#ff7f50', p: 2 }}>
              <Typography variant="h6" color="white" fontWeight="bold">
                时间地点
              </Typography>
            </Box>
            <CardContent>
              <FormField
                name="datetime"
                label="活动时间"
                type="datetime-local"
                required
              />

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  快捷选择：
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {['tomorrow', 'next-week', 'next-sunday', 'weekend'].map(
                    (type) => (
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
                            ? '#ff7f50'
                            : 'transparent',
                          borderColor: '#ff7f50',
                          color: isQuickDateTimeActive(type)
                            ? 'white'
                            : '#ff7f50',
                          '&:hover': {
                            backgroundColor: isQuickDateTimeActive(type)
                              ? '#e66942'
                              : 'rgba(255, 127, 80, 0.05)',
                            borderColor: '#e66942',
                          },
                        }}
                      >
                        {
                          {
                            tomorrow: '明天 19:00',
                            'next-week': '下周六 14:00',
                            'next-sunday': '下周日 10:00',
                            weekend: '本周末 19:00',
                          }[type]
                        }
                      </Button>
                    )
                  )}
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name="location"
                    label="活动地点"
                    placeholder="线下活动请填写具体地址，线上活动可填写平台名称"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name="duration"
                    label="活动时长（小时）"
                    type="number"
                    placeholder="例如：2"
                  />
                </Grid>
              </Grid>

              <FormField
                name="maxParticipants"
                label="最大参与人数"
                type="number"
                placeholder="不限制可留空"
              />
            </CardContent>
          </Card>

          {/* 联系方式 */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#f8f9fa',
              borderRadius: 1,
              borderLeft: '4px solid #ff7f50',
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
              联系方式
            </Typography>
            <FormField
              name="organizer"
              label="组织者姓名"
              required
              placeholder="您的姓名"
            />
            <FormField
              name="contact"
              label="微信号"
              required
              placeholder="请输入微信号"
            />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                活动群二维码
              </Typography>
              <div
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
                style={{
                  border: '2px dashed #ddd',
                  borderRadius: 4,
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderColor: dragover ? '#ff7f50' : '#ddd',
                  backgroundColor: dragover
                    ? 'rgba(255, 127, 80, 0.05)'
                    : 'transparent',
                  transition: 'all 0.2s',
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
                  <img
                    src={qrPreview}
                    alt="二维码预览"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      margin: '0 auto',
                      borderRadius: 4,
                    }}
                  />
                ) : (
                  <>
                    <p style={{ marginBottom: '0.5rem' }}>点击上传群二维码</p>
                    <p style={{ color: '#999', fontSize: '0.875rem' }}>
                      支持拖拽上传，JPG/PNG格式
                    </p>
                  </>
                )}
              </div>
              {errors.qr && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 1, display: 'block' }}
                >
                  {errors.qr}
                </Typography>
              )}
            </Box>
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={submitLoading}
            sx={{
              bgcolor: '#ff7f50',
              '&:hover': { bgcolor: '#e66942' },
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
